package org.example.auth.service;

import java.time.LocalDate;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.example.auth.OAuth2Attributes;
import org.example.auth.enums.SocialProvider;
import org.example.auth.google.GooglePeopleApiClient;
import org.example.config.JwtTokenProvider;
import org.example.user.dto.LoginResponse;
import org.example.user.entity.User;
import org.example.user.repository.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClient;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClientService;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class SocialLoginService {

    private static final LocalDate DEFAULT_BIRTH = LocalDate.of(2000, 1, 1);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final GooglePeopleApiClient googlePeopleApiClient;
    private final OAuth2AuthorizedClientService authorizedClientService;

    @Transactional
    public LoginResponse loginFromOAuth(Authentication authentication, String registrationId) {
        return login(resolveAttributes(authentication, registrationId));
    }

    @Transactional
    public LoginResponse login(OAuth2Attributes attributes) {
        validateAttributes(attributes);

        User user = userRepository
                .findByProviderAndProviderId(attributes.provider(), attributes.providerId())
                .map(existing -> syncSocialProfile(existing, attributes))
                .orElseGet(() -> createOrLinkUser(attributes));

        String token = jwtTokenProvider.createToken(user.getId(), user.getEmail());
        return new LoginResponse("소셜 로그인에 성공했습니다.", "200", token);
    }

    private OAuth2Attributes resolveAttributes(Authentication authentication, String registrationId) {
        if (!(authentication.getPrincipal() instanceof OAuth2User oauth2User)) {
            throw new IllegalArgumentException("OAuth2 사용자 정보를 확인할 수 없습니다.");
        }

        OAuth2Attributes attributes = OAuth2Attributes.from(registrationId, oauth2User);
        if (attributes.provider() != SocialProvider.GOOGLE) {
            return attributes;
        }

        GooglePeopleApiClient.PeopleProfile peopleProfile = googlePeopleApiClient.fetchProfile(
                extractAccessToken(authentication)
        );
        return attributes.mergeGoogleProfile(peopleProfile);
    }

    private String extractAccessToken(Authentication authentication) {
        if (!(authentication instanceof OAuth2AuthenticationToken oauthToken)) {
            return null;
        }

        OAuth2AuthorizedClient authorizedClient = authorizedClientService.loadAuthorizedClient(
                oauthToken.getAuthorizedClientRegistrationId(),
                oauthToken.getName()
        );

        if (authorizedClient == null || authorizedClient.getAccessToken() == null) {
            return null;
        }

        return authorizedClient.getAccessToken().getTokenValue();
    }

    private void validateAttributes(OAuth2Attributes attributes) {
        if (attributes.provider() == SocialProvider.LOCAL) {
            throw new IllegalArgumentException("지원하지 않는 소셜 로그인 제공자입니다.");
        }
        if (attributes.providerId() == null || attributes.providerId().isBlank()) {
            throw new IllegalArgumentException("소셜 로그인 사용자 식별자를 확인할 수 없습니다.");
        }
        if (attributes.email() == null || attributes.email().isBlank()) {
            if (attributes.provider() == SocialProvider.LINE) {
                throw new IllegalArgumentException(
                        "LINE에서 이메일을 받지 못했습니다. LINE Developers 콘솔에서 이메일 제공 권한을 신청·승인했는지, "
                                + "LINE 계정에 이메일이 등록되어 있는지 확인해주세요."
                );
            }
            throw new IllegalArgumentException("소셜 로그인 이메일 정보를 확인할 수 없습니다.");
        }
    }

    private User createOrLinkUser(OAuth2Attributes attributes) {
        userRepository.findByEmail(attributes.email()).ifPresent(existing -> {
            if (existing.getProvider() != attributes.provider()) {
                throw new IllegalArgumentException(
                        "이미 가입된 이메일입니다. 기존 로그인 방식을 이용해주세요."
                );
            }
        });

        User user = User.builder()
                .userName(firstNonBlank(attributes.name(), "소셜 사용자"))
                .userNickname(resolveUniqueNickname(attributes))
                .password(passwordEncoder.encode(UUID.randomUUID().toString()))
                .email(attributes.email())
                .phone(resolvePhone(attributes))
                .birth(resolveBirth(attributes))
                .sex(attributes.sex())
                .isAdmin(false)
                .provider(attributes.provider())
                .providerId(attributes.providerId())
                .build();

        user.markCreated(null);
        return userRepository.save(user);
    }

    private LocalDate resolveBirth(OAuth2Attributes attributes) {
        if (attributes.birth() != null) {
            return attributes.birth();
        }
        if (attributes.provider() == SocialProvider.LINE) {
            return null;
        }
        return DEFAULT_BIRTH;
    }

    private String resolveUniqueNickname(OAuth2Attributes attributes) {
        String base = firstNonBlank(
                attributes.nickname(),
                attributes.name(),
                attributes.email().split("@")[0]
        );

        base = sanitizeNickname(base);
        String nickname = base;
        int suffix = 1;

        while (userRepository.existsByUserNickname(nickname)) {
            nickname = base + suffix++;
        }

        return nickname;
    }

    private User syncSocialProfile(User user, OAuth2Attributes attributes) {
        String phone = resolvePhoneForExistingUser(user, attributes);
        LocalDate birth = resolveBirthForExistingUser(user, attributes);
        Boolean sex = attributes.sex() != null ? attributes.sex() : user.getSex();
        String userName = firstNonBlank(attributes.name(), user.getUserName());

        user.updateSocialProfile(userName, phone, birth, sex);
        user.markUpdated(user.getId());
        return user;
    }

    private LocalDate resolveBirthForExistingUser(User user, OAuth2Attributes attributes) {
        if (attributes.birth() != null) {
            return attributes.birth();
        }
        return user.getBirth();
    }

    private String resolvePhone(OAuth2Attributes attributes) {
        String oauthPhone = normalizePhone(attributes.phone());
        if (oauthPhone == null || oauthPhone.isBlank()) {
            return null;
        }
        if (userRepository.existsByPhone(oauthPhone)) {
            return null;
        }
        return oauthPhone;
    }

    private String resolvePhoneForExistingUser(User user, OAuth2Attributes attributes) {
        String oauthPhone = normalizePhone(attributes.phone());
        if (oauthPhone == null || oauthPhone.isBlank()) {
            return null;
        }
        if (oauthPhone.equals(user.getPhone()) || !userRepository.existsByPhone(oauthPhone)) {
            return oauthPhone;
        }
        return user.getPhone();
    }

    private String normalizePhone(String phone) {
        if (phone == null || phone.isBlank()) {
            return null;
        }
        return phone.replaceAll("[^0-9]", "");
    }

    private String sanitizeNickname(String nickname) {
        String sanitized = nickname.replaceAll("[^a-zA-Z0-9가-힣_]", "");
        if (sanitized.isBlank()) {
            sanitized = "user";
        }
        return sanitized.length() > 20 ? sanitized.substring(0, 20) : sanitized;
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return null;
    }
}

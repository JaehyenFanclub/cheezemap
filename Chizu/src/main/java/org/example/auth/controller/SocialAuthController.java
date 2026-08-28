package org.example.auth.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.example.auth.dto.OAuthProviderResponse;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/user/auth/oauth2")
@RequiredArgsConstructor
@Tag(name = "Social Auth", description = "소셜 로그인 API")
public class SocialAuthController {

    private final ClientRegistrationRepository clientRegistrationRepository;

    @Operation(
            summary = "소셜 로그인 제공자 목록",
            description = "등록된 OAuth2 제공자와 인증 시작 URL을 반환합니다."
    )
    @GetMapping("/providers")
    public List<OAuthProviderResponse> getProviders() {
        if (!(clientRegistrationRepository instanceof Iterable<?> registrations)) {
            return List.of();
        }

        return java.util.stream.StreamSupport.stream(registrations.spliterator(), false)
                .filter(ClientRegistration.class::isInstance)
                .map(ClientRegistration.class::cast)
                .map(this::toResponse)
                .toList();
    }

    private OAuthProviderResponse toResponse(ClientRegistration registration) {
        return new OAuthProviderResponse(
                registration.getRegistrationId(),
                resolveDisplayName(registration.getRegistrationId()),
                "/oauth2/authorization/" + registration.getRegistrationId()
        );
    }

    private String resolveDisplayName(String registrationId) {
        return switch (registrationId.toLowerCase()) {
            case "google" -> "Google";
            case "naver" -> "Naver";
            case "line" -> "LINE";
            default -> registrationId;
        };
    }
}

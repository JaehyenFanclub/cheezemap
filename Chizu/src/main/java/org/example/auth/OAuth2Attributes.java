package org.example.auth;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.Map;

import org.example.auth.enums.SocialProvider;
import org.example.auth.google.GooglePeopleApiClient;
import org.springframework.security.oauth2.core.user.OAuth2User;

public record OAuth2Attributes(
        SocialProvider provider,
        String providerId,
        String email,
        String name,
        String nickname,
        String profileImageUrl,
        String phone,
        LocalDate birth,
        Boolean sex
) {

    public static OAuth2Attributes from(String registrationId, OAuth2User oauth2User) {
        SocialProvider provider = SocialProvider.valueOf(registrationId.toUpperCase());
        Map<String, Object> attributes = oauth2User.getAttributes();

        return switch (provider) {
            case GOOGLE -> ofGoogle(provider, attributes);
            case NAVER -> ofNaver(provider, attributes);
            case LINE -> ofLine(provider, attributes);
            case LOCAL -> throw new IllegalArgumentException("LOCAL provider는 OAuth2 로그인에 사용할 수 없습니다.");
        };
    }

    public OAuth2Attributes mergeGoogleProfile(GooglePeopleApiClient.PeopleProfile profile) {
        if (profile == null || provider != SocialProvider.GOOGLE) {
            return this;
        }

        return new OAuth2Attributes(
                provider,
                providerId,
                email,
                name,
                nickname,
                profileImageUrl,
                firstNonBlank(profile.phone(), phone),
                profile.birth() != null ? profile.birth() : birth,
                profile.sex() != null ? profile.sex() : sex
        );
    }

    @SuppressWarnings("unchecked")
    private static OAuth2Attributes ofGoogle(SocialProvider provider, Map<String, Object> attributes) {
        return new OAuth2Attributes(
                provider,
                String.valueOf(attributes.get("sub")),
                stringValue(attributes.get("email")),
                stringValue(attributes.get("name")),
                stringValue(attributes.get("name")),
                stringValue(attributes.get("picture")),
                normalizePhone(stringValue(attributes.get("google_phone"))),
                parseGoogleBirth(stringValue(attributes.get("google_birth"))),
                parseGoogleSex(attributes.get("google_sex"))
        );
    }

    private static LocalDate parseGoogleBirth(String birth) {
        if (birth == null || birth.isBlank()) {
            return null;
        }

        try {
            return LocalDate.parse(birth);
        } catch (DateTimeParseException ex) {
            return null;
        }
    }

    private static Boolean parseGoogleSex(Object sex) {
        if (sex instanceof Boolean booleanSex) {
            return booleanSex;
        }
        return null;
    }

    @SuppressWarnings("unchecked")
    private static OAuth2Attributes ofNaver(SocialProvider provider, Map<String, Object> attributes) {
        Map<String, Object> response = (Map<String, Object>) attributes.get("response");
        if (response == null) {
            throw new IllegalArgumentException("네이버 사용자 정보를 가져오지 못했습니다.");
        }

        String providerId = String.valueOf(response.get("id"));
        String email = firstNonBlank(
                stringValue(response.get("email")),
                providerId + "@naver.oauth.cheezemap.local"
        );

        return new OAuth2Attributes(
                provider,
                providerId,
                email,
                stringValue(response.get("name")),
                firstNonBlank(
                        stringValue(response.get("nickname")),
                        stringValue(response.get("name"))
                ),
                stringValue(response.get("profile_image")),
                normalizePhone(stringValue(response.get("mobile"))),
                parseNaverBirth(
                        stringValue(response.get("birthyear")),
                        stringValue(response.get("birthday"))
                ),
                parseNaverGender(stringValue(response.get("gender")))
        );
    }

    private static OAuth2Attributes ofLine(SocialProvider provider, Map<String, Object> attributes) {
        String providerId = firstNonBlank(
                stringValue(attributes.get("sub")),
                stringValue(attributes.get("userId"))
        );
        String displayName = firstNonBlank(
                stringValue(attributes.get("name")),
                stringValue(attributes.get("displayName"))
        );
        String pictureUrl = firstNonBlank(
                stringValue(attributes.get("picture")),
                stringValue(attributes.get("pictureUrl"))
        );
        String email = stringValue(attributes.get("email"));

        return new OAuth2Attributes(
                provider,
                providerId,
                email,
                displayName,
                displayName,
                pictureUrl,
                null,
                null,
                null
        );
    }

    private static String normalizePhone(String phone) {
        if (phone == null || phone.isBlank()) {
            return null;
        }
        return phone.replaceAll("[^0-9]", "");
    }

    private static LocalDate parseNaverBirth(String birthyear, String birthday) {
        if (birthyear == null || birthyear.isBlank() || birthday == null || birthday.isBlank()) {
            return null;
        }

        try {
            return LocalDate.parse(
                    birthyear + "-" + birthday,
                    DateTimeFormatter.ofPattern("yyyy-MM-dd")
            );
        } catch (DateTimeParseException ex) {
            return null;
        }
    }

    private static Boolean parseNaverGender(String gender) {
        if (gender == null || gender.isBlank()) {
            return null;
        }
        return switch (gender.trim().toUpperCase()) {
            case "M" -> true;
            case "F" -> false;
            default -> null;
        };
    }

    private static String stringValue(Object value) {
        return value == null ? null : String.valueOf(value).trim();
    }

    private static String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return null;
    }
}

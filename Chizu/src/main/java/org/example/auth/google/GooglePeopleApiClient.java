package org.example.auth.google;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

@Slf4j
@Component
public class GooglePeopleApiClient {

    private static final String PEOPLE_ME_URL = "https://people.googleapis.com/v1/people/me";

    private final RestTemplate restTemplate = new RestTemplate();

    public PeopleProfile fetchProfile(String accessToken) {
        if (accessToken == null || accessToken.isBlank()) {
            return PeopleProfile.empty();
        }

        String url = UriComponentsBuilder
                .fromUriString(PEOPLE_ME_URL)
                .queryParam("personFields", "birthdays,genders,phoneNumbers")
                .build(true)
                .toUriString();

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(accessToken);

            ResponseEntity<Map> response = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    new HttpEntity<>(headers),
                    Map.class
            );

            Map<String, Object> body = response.getBody();
            if (body == null) {
                return PeopleProfile.empty();
            }

            PeopleProfile profile = new PeopleProfile(
                    extractPhone(body),
                    extractBirth(body),
                    extractGender(body)
            );
            log.debug(
                    "Google People API 조회 완료: phone={}, birth={}, sex={}",
                    profile.phone() != null,
                    profile.birth(),
                    profile.sex()
            );
            return profile;
        } catch (RestClientResponseException ex) {
            log.warn(
                    "Google People API 조회 실패: {} - {}",
                    ex.getStatusCode(),
                    ex.getResponseBodyAsString()
            );
            return PeopleProfile.empty();
        } catch (RestClientException ex) {
            log.warn("Google People API 조회 실패: {}", ex.getMessage());
            return PeopleProfile.empty();
        }
    }

    @SuppressWarnings("unchecked")
    private String extractPhone(Map<String, Object> body) {
        List<Map<String, Object>> phoneNumbers = castList(body.get("phoneNumbers"));
        if (phoneNumbers.isEmpty()) {
            return null;
        }

        Object value = phoneNumbers.get(0).get("value");
        if (value == null) {
            return null;
        }

        return String.valueOf(value).replaceAll("[^0-9]", "");
    }

    @SuppressWarnings("unchecked")
    private LocalDate extractBirth(Map<String, Object> body) {
        List<Map<String, Object>> birthdays = castList(body.get("birthdays"));
        for (Map<String, Object> birthday : birthdays) {
            Map<String, Object> date = castMap(birthday.get("date"));
            if (date == null || date.get("year") == null) {
                continue;
            }

            int year = toInt(date.get("year"));
            int month = date.get("month") != null ? toInt(date.get("month")) : 1;
            int day = date.get("day") != null ? toInt(date.get("day")) : 1;

            if (year <= 0) {
                continue;
            }

            try {
                return LocalDate.of(year, month, day);
            } catch (RuntimeException ex) {
                log.warn("Google 생년월일 파싱 실패: {}-{}-{}", year, month, day);
            }
        }

        return null;
    }

    @SuppressWarnings("unchecked")
    private Boolean extractGender(Map<String, Object> body) {
        List<Map<String, Object>> genders = castList(body.get("genders"));
        if (genders.isEmpty()) {
            return null;
        }

        String value = String.valueOf(genders.get(0).get("value")).trim().toLowerCase();
        return switch (value) {
            case "male" -> true;
            case "female" -> false;
            default -> null;
        };
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> castList(Object value) {
        if (!(value instanceof List<?> list)) {
            return List.of();
        }
        return list.stream()
                .filter(Map.class::isInstance)
                .map(item -> (Map<String, Object>) item)
                .toList();
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> castMap(Object value) {
        if (value instanceof Map<?, ?> map) {
            return (Map<String, Object>) map;
        }
        return null;
    }

    private int toInt(Object value) {
        return ((Number) value).intValue();
    }

    public record PeopleProfile(
            String phone,
            LocalDate birth,
            Boolean sex
    ) {
        public static PeopleProfile empty() {
            return new PeopleProfile(null, null, null);
        }
    }
}

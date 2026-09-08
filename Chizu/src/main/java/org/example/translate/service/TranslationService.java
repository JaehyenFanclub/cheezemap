package org.example.translate.service;

import java.util.List;
import java.util.Map;
import java.util.Set;
import org.example.translate.dto.TranslateResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

@Service
public class TranslationService {

    private static final Set<String> SUPPORTED_LANGUAGES = Set.of("ko", "ja", "en");
    private static final String TRANSLATE_URL =
            "https://translation.googleapis.com/language/translate/v2";

    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${google.api.key}")
    private String googleApiKey;

    @SuppressWarnings("unchecked")
    public TranslateResponse translate(String text, String targetLanguage) {
        if (text == null || text.isBlank()) {
            throw new IllegalArgumentException("번역할 텍스트는 필수입니다.");
        }

        String normalizedTarget = normalizeLanguage(targetLanguage);
        if (!SUPPORTED_LANGUAGES.contains(normalizedTarget)) {
            throw new IllegalArgumentException("지원하지 않는 목표 언어입니다. (ko, ja, en)");
        }

        String url = UriComponentsBuilder
                .fromUriString(TRANSLATE_URL)
                .queryParam("key", googleApiKey)
                .toUriString();

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> body = Map.of(
                "q", text,
                "target", normalizedTarget,
                "format", "text"
        );

        try {
            ResponseEntity<Map> response = restTemplate.exchange(
                    url,
                    HttpMethod.POST,
                    new HttpEntity<>(body, headers),
                    Map.class
            );

            Map<String, Object> responseBody = response.getBody();
            if (responseBody == null) {
                throw new IllegalArgumentException("번역 결과를 받지 못했습니다.");
            }

            Map<String, Object> data = (Map<String, Object>) responseBody.get("data");
            if (data == null) {
                throw new IllegalArgumentException("번역 결과가 비어 있습니다.");
            }

            List<Map<String, Object>> translations =
                    (List<Map<String, Object>>) data.get("translations");
            if (translations == null || translations.isEmpty()) {
                throw new IllegalArgumentException("번역 결과가 비어 있습니다.");
            }

            Map<String, Object> first = translations.get(0);
            String translatedText = String.valueOf(first.getOrDefault("translatedText", ""));
            String detectedSourceLanguage = first.get("detectedSourceLanguage") == null
                    ? null
                    : String.valueOf(first.get("detectedSourceLanguage"));

            return new TranslateResponse(
                    translatedText,
                    detectedSourceLanguage,
                    normalizedTarget
            );
        } catch (HttpStatusCodeException ex) {
            String detail = extractGoogleErrorMessage(ex.getResponseBodyAsString());
            throw new IllegalArgumentException(
                    detail != null && !detail.isBlank()
                            ? detail
                            : "Google 번역 API 호출에 실패했습니다: " + ex.getStatusCode().value()
            );
        } catch (IllegalArgumentException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new IllegalArgumentException("번역 중 오류가 발생했습니다.");
        }
    }

    private String normalizeLanguage(String language) {
        if (language == null) {
            return "";
        }
        return language.trim().toLowerCase();
    }

    @SuppressWarnings("unchecked")
    private String extractGoogleErrorMessage(String responseBody) {
        if (responseBody == null || responseBody.isBlank()) {
            return null;
        }
        try {
            Map<String, Object> parsed = new com.fasterxml.jackson.databind.ObjectMapper()
                    .readValue(responseBody, Map.class);
            Map<String, Object> error = (Map<String, Object>) parsed.get("error");
            if (error == null) {
                return null;
            }
            Object message = error.get("message");
            if (message == null) {
                return null;
            }
            String text = String.valueOf(message);
            if (text.contains("API_KEY_SERVICE_BLOCKED")
                    || text.toLowerCase().contains("blocked")
                    || text.contains("PERMISSION_DENIED")) {
                return "Cloud Translation API가 활성화되지 않았거나 API 키에서 차단되었습니다. "
                        + "Google Cloud Console에서 Translation API를 켠 뒤 키 제한에 translate.googleapis.com을 허용해주세요.";
            }
            return text;
        } catch (Exception ignored) {
            return null;
        }
    }
}

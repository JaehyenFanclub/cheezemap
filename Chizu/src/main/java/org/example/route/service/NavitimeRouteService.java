package org.example.route.service;

import java.net.URI;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

@Service
public class NavitimeRouteService {

    private static final ZoneId TOKYO = ZoneId.of("Asia/Tokyo");
    private static final DateTimeFormatter START_TIME_FORMAT =
            DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");
    private static final ParameterizedTypeReference<Map<String, Object>> MAP_TYPE =
            new ParameterizedTypeReference<>() {};

    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${navitime.api.key:}")
    private String configuredApiKey;

    @Value("${navitime.api.host:navitime-route-totalnavi.p.rapidapi.com}")
    private String apiHost;

    @Value("${navitime.api.url:https://navitime-route-totalnavi.p.rapidapi.com/route_transit}")
    private String apiUrl;

    public Map<String, Object> searchTransit(
            String start,
            String goal,
            String startTime
    ) {
        String apiKey = resolveApiKey();
        if (apiKey.isBlank()) {
            throw new IllegalArgumentException(
                    "NAVITIME API 키가 설정되지 않았습니다. .env의 NAVITIME_API_KEY를 확인해주세요."
            );
        }

        String normalizedStart = requireCoord(start, "start");
        String normalizedGoal = requireCoord(goal, "goal");
        String resolvedStartTime = resolveStartTime(startTime);

        // RapidAPI Basic에는 Multilingual(lang) 옵션이 없어 lang 파라미터를 넣지 않는다.
        URI uri = UriComponentsBuilder
                .fromUriString(apiUrl)
                .queryParam("start", normalizedStart)
                .queryParam("goal", normalizedGoal)
                .queryParam("start_time", resolvedStartTime)
                .queryParam("shape", "true")
                .queryParam("shape_color", "railway_line")
                .queryParam("limit", 5)
                .queryParam("order", "time_optimized")
                .queryParam("datum", "wgs84")
                .queryParam("coord_unit", "degree")
                .build()
                .encode()
                .toUri();

        HttpHeaders headers = new HttpHeaders();
        headers.set("X-RapidAPI-Key", apiKey);
        headers.set("X-RapidAPI-Host", apiHost);

        try {
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                    uri,
                    HttpMethod.GET,
                    new HttpEntity<>(headers),
                    MAP_TYPE
            );

            Map<String, Object> body = response.getBody();
            if (body == null || body.isEmpty()) {
                throw new IllegalArgumentException("NAVITIME 경로 결과가 비어 있습니다.");
            }
            return body;
        } catch (HttpStatusCodeException ex) {
            // getResponseBodyAsString()은 null이 아니라 빈 문자열을 반환할 수 있다.
            String detail = ex.getResponseBodyAsString();
            if (detail.length() > 300) {
                detail = detail.substring(0, 297) + "...";
            }
            throw new IllegalArgumentException(
                    "NAVITIME 경로 검색 실패 (" + ex.getStatusCode().value() + ")"
                            + (detail.isBlank() ? "" : ": " + detail)
            );
        }
    }

    private String resolveApiKey() {
        String fromEnv = System.getenv("NAVITIME_API_KEY");
        if (fromEnv != null && !fromEnv.isBlank()) {
            return fromEnv.trim();
        }
        return configuredApiKey == null ? "" : configuredApiKey.trim();
    }

    private String requireCoord(String value, String fieldName) {
        String text = value == null ? "" : value.trim();
        if (text.isBlank()) {
            throw new IllegalArgumentException(fieldName + " 좌표는 필수입니다. (lat,lng)");
        }

        String[] parts = text.split(",");
        if (parts.length != 2) {
            throw new IllegalArgumentException(fieldName + " 형식은 lat,lng 입니다.");
        }

        try {
            double lat = Double.parseDouble(parts[0].trim());
            double lng = Double.parseDouble(parts[1].trim());
            if (!Double.isFinite(lat) || !Double.isFinite(lng)) {
                throw new IllegalArgumentException(fieldName + " 좌표가 올바르지 않습니다.");
            }
            return lat + "," + lng;
        } catch (NumberFormatException ex) {
            throw new IllegalArgumentException(fieldName + " 형식은 lat,lng 입니다.");
        }
    }

    private String resolveStartTime(String startTime) {
        if (startTime != null && !startTime.isBlank()) {
            return startTime.trim();
        }
        return LocalDateTime.now(TOKYO).format(START_TIME_FORMAT);
    }
}

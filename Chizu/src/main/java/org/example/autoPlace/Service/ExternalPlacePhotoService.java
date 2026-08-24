package org.example.autoPlace.Service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.example.autoPlace.DTO.ExternalPhotoResponseDto;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class ExternalPlacePhotoService {

    private static final int GEO_RADIUS_METERS = 50;
    private static final double MIN_NAME_SIMILARITY = 0.70;
    private static final int MAX_GEO_CANDIDATES = 10;
    private static final int THUMB_WIDTH_PX = 700;

    // 같은 POI를 다시 열었을 때 Wikimedia를 재호출하지 않도록 서버 메모리에 캐시한다.
    private final Map<String, ExternalPhotoResponseDto> photoCache = new ConcurrentHashMap<>();

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * Wikimedia Commons 대표사진 정책
     * - Google Place Photos는 사용하지 않는다.
     * - 실제 POI 이름이 있을 때만 조회한다.
     * - POI 좌표 50m 이내의 Commons 사진만 후보로 받는다.
     * - 파일명/설명 등의 문자열이 POI 이름과 70% 이상 유사할 때만 사용한다.
     * - 조건을 만족하는 사진이 없으면 "사진 없음"으로 반환한다.
     */
    public ExternalPhotoResponseDto findBestPhoto(String name, Double lat, Double lng, String address) {
        String safeName = cleanName(name);

        if (isPlaceholderName(safeName)) {
            System.out.println("[WikimediaPhoto] 실제 POI 이름이 없어 조회 생략 / name=" + safeName);
            return ExternalPhotoResponseDto.empty();
        }

        if (lat == null || lng == null || !Double.isFinite(lat) || !Double.isFinite(lng)) {
            System.out.println("[WikimediaPhoto] 좌표가 없어 조회 생략 / name=" + safeName);
            return ExternalPhotoResponseDto.empty();
        }

        String cacheKey = buildCacheKey(safeName, lat, lng);
        ExternalPhotoResponseDto cached = photoCache.get(cacheKey);
        if (cached != null) {
            System.out.println("[WikimediaPhoto] 캐시 사용 / name=" + safeName);
            return cached;
        }

        ExternalPhotoResponseDto result = findStrictGeoMatchedPhoto(safeName, lat, lng);
        if (result.getUrl() != null && !result.getUrl().isBlank()) {
            photoCache.put(cacheKey, result);
            return result;
        }

        System.out.println("[WikimediaPhoto] 정확히 매칭되는 사진 없음 / name=" + safeName
                + " / radius=" + GEO_RADIUS_METERS + "m / threshold=" + MIN_NAME_SIMILARITY);
        ExternalPhotoResponseDto empty = ExternalPhotoResponseDto.empty();
        // 사진이 없는 POI도 캐시해서 같은 장소를 다시 열 때 불필요한 Commons 재검색을 막는다.
        photoCache.put(cacheKey, empty);
        return empty;
    }

    private ExternalPhotoResponseDto findStrictGeoMatchedPhoto(String placeName, double lat, double lng) {
        try {
            URI uri = UriComponentsBuilder
                    .fromUriString("https://commons.wikimedia.org/w/api.php")
                    .queryParam("action", "query")
                    .queryParam("format", "json")
                    .queryParam("formatversion", 2)
                    .queryParam("generator", "geosearch")
                    .queryParam("ggsprimary", "all")
                    .queryParam("ggsnamespace", 6)
                    .queryParam("ggsradius", GEO_RADIUS_METERS)
                    .queryParam("ggslimit", MAX_GEO_CANDIDATES)
                    .queryParam("ggscoord", lat + "|" + lng)
                    .queryParam("prop", "imageinfo")
                    .queryParam("iiprop", "url|extmetadata|mime")
                    .queryParam("iiurlwidth", THUMB_WIDTH_PX)
                    .build()
                    .encode()
                    .toUri();

            System.out.println("[WikimediaPhoto] 엄격 검색 시작 / name=" + placeName
                    + " / lat=" + lat + " / lng=" + lng + " / radius=" + GEO_RADIUS_METERS + "m");

            return fetchBestStrictMatch(uri, placeName);
        } catch (Exception e) {
            System.err.println("[WikimediaPhoto] 엄격 검색 실패: " + e.getMessage());
            return ExternalPhotoResponseDto.empty();
        }
    }

    private ExternalPhotoResponseDto fetchBestStrictMatch(URI uri, String placeName) throws Exception {
        HttpHeaders headers = new HttpHeaders();
        headers.set("User-Agent", "CheeseMap/1.0 (Wikimedia Commons place photo)");
        headers.set("Accept", "application/json");

        String raw = exchangeString(uri, headers);
        if (raw == null || raw.isBlank()) {
            return ExternalPhotoResponseDto.empty();
        }

        JsonNode root = objectMapper.readTree(raw);
        JsonNode pages = root.path("query").path("pages");
        if (!pages.isArray() || pages.isEmpty()) {
            System.out.println("[WikimediaPhoto] 50m 이내 Commons 사진 후보 0개");
            return ExternalPhotoResponseDto.empty();
        }

        System.out.println("[WikimediaPhoto] 50m 이내 후보=" + pages.size() + "개");

        MatchCandidate best = null;

        for (JsonNode page : pages) {
            JsonNode imageInfo = page.path("imageinfo");
            if (!imageInfo.isArray() || imageInfo.isEmpty()) continue;

            JsonNode info = imageInfo.get(0);
            String mime = info.path("mime").asText("");
            if (!mime.isBlank() && !mime.startsWith("image/")) continue;

            String thumbUrl = info.path("thumburl").asText("");
            String originalUrl = info.path("url").asText("");
            String url = !thumbUrl.isBlank() ? thumbUrl : originalUrl;
            if (url.isBlank()) continue;

            JsonNode metadata = info.path("extmetadata");
            String title = stripFilePrefix(page.path("title").asText(""));
            String objectName = htmlToPlainText(metadata.path("ObjectName").path("value").asText(""));
            String imageDescription = htmlToPlainText(metadata.path("ImageDescription").path("value").asText(""));
            String categories = htmlToPlainText(metadata.path("Categories").path("value").asText(""));

            List<String> texts = new ArrayList<>();
            texts.add(title);
            texts.add(objectName);
            texts.add(imageDescription);
            texts.add(categories);

            double score = 0.0;
            String matchedText = title;
            for (String text : texts) {
                double current = nameSimilarity(placeName, text);
                if (current > score) {
                    score = current;
                    matchedText = text;
                }
            }

            System.out.printf(Locale.ROOT,
                    "[WikimediaPhoto] 후보 검사 / place=%s / candidate=%s / score=%.2f%n",
                    placeName, title, score);

            if (score < MIN_NAME_SIMILARITY) continue;

            String artist = htmlToPlainText(metadata.path("Artist").path("value").asText(""));
            String license = htmlToPlainText(metadata.path("LicenseShortName").path("value").asText(""));
            String attribution = "Wikimedia Commons";
            if (!artist.isBlank()) attribution = artist + " / Wikimedia Commons";
            if (!license.isBlank()) attribution += " / " + license;

            MatchCandidate candidate = new MatchCandidate(url, attribution, title, matchedText, score);
            if (best == null || candidate.score > best.score) {
                best = candidate;
            }
        }

        if (best == null) {
            System.out.println("[WikimediaPhoto] 이름 유사도 70% 이상 후보 없음 → 사진 표시 안 함");
            return ExternalPhotoResponseDto.empty();
        }

        System.out.printf(Locale.ROOT,
                "[WikimediaPhoto] 최종 선택 / file=%s / score=%.2f / matchedText=%s%n",
                best.title, best.score, best.matchedText);

        return ExternalPhotoResponseDto.builder()
                .url(best.url)
                .source("wikimedia")
                .attribution(best.attribution)
                .matchedName(best.title)
                .build();
    }


    private String buildCacheKey(String name, double lat, double lng) {
        // 약 10m 단위로 좌표를 묶어 같은 POI의 미세한 좌표 차이를 캐시 적중으로 처리한다.
        long latKey = Math.round(lat * 10000);
        long lngKey = Math.round(lng * 10000);
        return normalize(name) + "|" + latKey + "|" + lngKey;
    }

    private double nameSimilarity(String placeName, String candidateText) {
        String a = normalize(placeName);
        String b = normalize(candidateText);
        if (a.isBlank() || b.isBlank()) return 0.0;

        // 충분히 긴 이름이 서로 포함되는 경우는 강한 일치로 본다.
        if (a.length() >= 4 && b.contains(a)) return 1.0;
        if (b.length() >= 4 && a.contains(b)) return 1.0;

        // 공백 단위 토큰이 존재하는 언어는 토큰 Jaccard도 함께 본다.
        Set<String> aTokens = tokens(placeName);
        Set<String> bTokens = tokens(candidateText);
        double tokenScore = jaccard(aTokens, bTokens);

        // 한글/일본어처럼 공백이 적은 문자열을 위해 정규화 문자열의 Levenshtein 유사도도 사용한다.
        int maxLen = Math.max(a.length(), b.length());
        int distance = levenshtein(a, b);
        double editScore = maxLen == 0 ? 0.0 : 1.0 - ((double) distance / maxLen);

        return Math.max(tokenScore, editScore);
    }

    private Set<String> tokens(String value) {
        Set<String> result = new HashSet<>();
        if (value == null) return result;
        String cleaned = Normalizer.normalize(value, Normalizer.Form.NFKC)
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^\\p{L}\\p{N}]+", " ")
                .trim();
        if (cleaned.isBlank()) return result;
        for (String token : cleaned.split("\\s+")) {
            if (token.length() >= 2) result.add(token);
        }
        return result;
    }

    private double jaccard(Set<String> a, Set<String> b) {
        if (a.isEmpty() || b.isEmpty()) return 0.0;
        Set<String> intersection = new HashSet<>(a);
        intersection.retainAll(b);
        Set<String> union = new HashSet<>(a);
        union.addAll(b);
        return union.isEmpty() ? 0.0 : (double) intersection.size() / union.size();
    }

    private int levenshtein(String a, String b) {
        int[] prev = new int[b.length() + 1];
        int[] curr = new int[b.length() + 1];
        for (int j = 0; j <= b.length(); j++) prev[j] = j;

        for (int i = 1; i <= a.length(); i++) {
            curr[0] = i;
            for (int j = 1; j <= b.length(); j++) {
                int cost = a.charAt(i - 1) == b.charAt(j - 1) ? 0 : 1;
                curr[j] = Math.min(
                        Math.min(curr[j - 1] + 1, prev[j] + 1),
                        prev[j - 1] + cost
                );
            }
            int[] tmp = prev;
            prev = curr;
            curr = tmp;
        }
        return prev[b.length()];
    }

    private String normalize(String value) {
        if (value == null) return "";
        return Normalizer.normalize(value, Normalizer.Form.NFKC)
                .toLowerCase(Locale.ROOT)
                .replaceFirst("(?i)^file:", "")
                .replaceAll("\\.[a-zA-Z0-9]{2,5}$", "")
                .replaceAll("[^\\p{L}\\p{N}]", "")
                .trim();
    }

    private String cleanName(String name) {
        return name == null ? "" : name.trim();
    }

    private boolean isPlaceholderName(String name) {
        if (name == null || name.isBlank()) return true;
        String normalized = normalize(name);
        return normalized.equals(normalize("선택한 장소"))
                || normalized.equals(normalize("選択した場所"))
                || normalized.equals("place")
                || normalized.equals("selectedplace")
                || normalized.equals("장소");
    }

    private String stripFilePrefix(String title) {
        if (title == null) return "";
        String result = title.replaceFirst("(?i)^File:", "");
        return result.replaceFirst("\\.[a-zA-Z0-9]{2,5}$", "").trim();
    }

    private String exchangeString(URI uri, HttpHeaders headers) {
        try {
            ResponseEntity<String> response = restTemplate.exchange(
                    uri,
                    HttpMethod.GET,
                    new HttpEntity<>(headers),
                    String.class
            );
            return response.getBody();
        } catch (RestClientException e) {
            System.err.println("[WikimediaPhoto] HTTP 실패: " + e.getMessage());
            return null;
        }
    }

    private String htmlToPlainText(String value) {
        if (value == null || value.isBlank()) return "";
        return value.replaceAll("<[^>]+>", " ")
                .replace("&amp;", "&")
                .replace("&quot;", "\"")
                .replace("&#39;", "'")
                .replace("&lt;", "<")
                .replace("&gt;", ">")
                .replaceAll("\\s+", " ")
                .trim();
    }

    private static class MatchCandidate {
        final String url;
        final String attribution;
        final String title;
        final String matchedText;
        final double score;

        MatchCandidate(String url, String attribution, String title, String matchedText, double score) {
            this.url = url;
            this.attribution = attribution;
            this.title = title;
            this.matchedText = matchedText;
            this.score = score;
        }
    }
}

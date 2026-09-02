package org.example.autoPlace.Service;


import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.example.autoPlace.DTO.AutoPlaceResponseDto;
import org.example.autoPlace.DTO.GooglePlaceResponseDTO;
import org.example.autoPlace.Entity.AutoPlace;
import org.example.autoPlace.Entity.AutoPlacePhoto;
import org.example.autoPlace.Repository.AutoPlaceRepository;
import org.example.place.domain.Place;
import org.example.place.repository.PlaceRepository;
import org.example.place.service.PlaceService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@Service
@RequiredArgsConstructor
public class AutoPlaceService {

    private final AutoPlaceRepository autoPlaceRepository;
    private final PlaceRepository placeRepository; // 👈 추가: Place 존재 여부 '단순 조회'용
    private final PlaceService placeService;
    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    // 동일 Google Place ID가 동시에 들어와 중복 INSERT 되는 것을 막는 스트라이프 락
    private final Object[] placeLocks = createPlaceLocks(64);

    private static Object[] createPlaceLocks(int size) {
        Object[] locks = new Object[size];
        for (int i = 0; i < size; i++) {
            locks[i] = new Object();
        }
        return locks;
    }

    private Object lockFor(String placeId) {
        int hash = placeId == null ? 0 : placeId.hashCode();
        return placeLocks[(hash & 0x7fffffff) % placeLocks.length];
    }

    @Value("${google.api.key}")
    private String googleApikey;

    @Transactional
    public AutoPlaceResponseDto getOrFetchPlace(String placeId) {
        if (placeId == null || placeId.isBlank()) {
            throw new IllegalArgumentException("Place ID가 비어있습니다.");
        }

        String normalizedPlaceId = placeId.trim();
        if (normalizedPlaceId.startsWith("places/")) {
            normalizedPlaceId = normalizedPlaceId.substring("places/".length());
        }

        synchronized (lockFor(normalizedPlaceId)) {
            Optional<AutoPlace> existing = autoPlaceRepository.findById(normalizedPlaceId);

            if (existing.isPresent()) {
                AutoPlace place = existing.get();

                // 역 POI는 Google 지도에서 클릭되는 Place ID가 출입구/환승 노드 등 하위 엔티티인 경우가 있어
                // Details 호출은 성공해도 photos / rating / userRatingCount가 비어 있을 수 있습니다.
                if (needsGoogleEnrichment(place)) {
                    GooglePlaceResponseDTO googleData = fetchFromGoogleApi(normalizedPlaceId);
                    if (googleData != null) {
                        GooglePlaceResponseDTO enriched = enrichSparsePlaceData(googleData);
                        applyGoogleData(place, enriched);
                        place = autoPlaceRepository.saveAndFlush(place);
                    }
                }

                return toResponse(place);
            }

            GooglePlaceResponseDTO googleData = fetchFromGoogleApi(normalizedPlaceId);

            if (googleData == null) {
                throw new IllegalArgumentException(
                        "Google API에서 해당 Place ID의 정보를 가져올 수 없습니다: " + normalizedPlaceId
                );
            }

            googleData = enrichSparsePlaceData(googleData);

            AutoPlace place = AutoPlace.builder()
                    .autoPlaceId(normalizedPlaceId)
                    .build();

            applyGoogleData(place, googleData);

            AutoPlace savedAutoPlace = autoPlaceRepository.saveAndFlush(place);
            return toResponse(savedAutoPlace);
        }
    }

    private AutoPlaceResponseDto toResponse(AutoPlace autoPlace) {
        // 이제 Google Place ID 검증을 통과한 경우에만 안전하게 Place가 생성/조회됩니다.
        Place place = placeService.getOrCreateFromAutoPlace(autoPlace);
        return AutoPlaceResponseDto.fromEntity(autoPlace, place);
    }

    private boolean needsGoogleEnrichment(AutoPlace place) {
        return !hasPhotos(place)
                || place.getRating() == null
                || place.getUserRatingCount() == null
                || place.getUserRatingCount() <= 0;
    }

    private void applyGoogleData(AutoPlace place, GooglePlaceResponseDTO googleData) {
        if (googleData == null) {
            throw new IllegalArgumentException("Google API 응답 데이터가 null입니다.");
        }

        // 1. 장소 이름 추출 및 검증
        String name = (googleData.getDisplayName() != null && googleData.getDisplayName().getText() != null)
                ? googleData.getDisplayName().getText().trim()
                : null;

        // 2. 주소 추출 및 검증
        String address = (googleData.getFormattedAddress() != null)
                ? googleData.getFormattedAddress().trim()
                : null;

        // 3. 필수 정보(이름, 주소) 누락 시 저장 차단 (예외 발생)
        if (name == null || name.isBlank() || address == null || address.isBlank()) {
            throw new IllegalArgumentException(
                    "유효하지 않은 장소 데이터입니다. 필수 정보 누락 - [이름: " + name + ", 주소: " + address + "]"
            );
        }

        // 검증 통과 시 필드 세팅
        place.setName(name);
        place.setAddress(address);

        // 카테고리 세팅
        if (googleData.getTypes() != null && !googleData.getTypes().isEmpty()) {
            place.setCategory(googleData.getTypes().get(0));
        } else if (place.getCategory() == null || place.getCategory().isBlank()) {
            place.setCategory("establishment");
        }

        // 위치 정보
        if (googleData.getLocation() != null) {
            place.setAutoLatitude(googleData.getLocation().getLatitude());
            place.setAutoLongitude(googleData.getLocation().getLongitude());
        }

        // 평점 및 리뷰 수
        if (googleData.getRating() != null) {
            place.setRating(googleData.getRating());
        }
        if (googleData.getUserRatingCount() != null) {
            place.setUserRatingCount(googleData.getUserRatingCount());
        }

        // 기존 사진이 없을 때만 추가하여 중복 저장 방지
        if (!hasPhotos(place)) {
            applyPhotosFromGoogle(place, googleData);
        }
    }

    /**
     * Place Details가 성공했더라도 사진/리뷰 정보가 비어 있으면 장소명 + 좌표로 Text Search를 한 번 더 수행합니다.
     * 특히 역/환승시설처럼 Google 지도 내부에서 여러 Place 엔티티가 겹치는 경우 parent 성격의 역 결과를 찾기 위함입니다.
     */
    private GooglePlaceResponseDTO enrichSparsePlaceData(GooglePlaceResponseDTO original) {
        if (original == null) return null;

        boolean hasPhotos = original.getPhotos() != null && !original.getPhotos().isEmpty();
        boolean hasRating = original.getRating() != null;
        boolean hasReviews = original.getUserRatingCount() != null && original.getUserRatingCount() > 0;

        if (hasPhotos && hasRating && hasReviews) {
            return original;
        }

        String name = original.getDisplayName() != null
                ? original.getDisplayName().getText()
                : null;

        if (name == null || name.isBlank()) {
            return original;
        }

        try {
            // 1차: 현재 표시 언어(한국어) 이름으로 주변 Text Search
            GooglePlaceResponseDTO fallback = fetchRichTextSearchCandidate(
                    name,
                    original.getLocation(),
                    "ko"
            );
            mergeRichFields(original, fallback);

            // 2차: 역 POI인데 사진/리뷰가 아직 비어 있으면
            // 같은 Place ID를 일본어로 다시 읽어 일본어 정식 역명을 얻은 뒤 재검색합니다.
            // 예: 도쿄역 -> (Place Details ja) 東京駅 -> Text Search ja
            if (isStationLike(original) && needsRichGoogleFields(original)) {
                GooglePlaceResponseDTO japaneseDetails = fetchJapaneseDetailsForSamePlace(original);
                String japaneseName = japaneseDetails != null && japaneseDetails.getDisplayName() != null
                        ? japaneseDetails.getDisplayName().getText()
                        : null;

                if (japaneseName != null && !japaneseName.isBlank()) {
                    System.out.println(">>> [역 일본어 Fallback] " + name + " -> " + japaneseName);
                    GooglePlaceResponseDTO japaneseFallback = fetchRichTextSearchCandidate(
                            japaneseName,
                            original.getLocation(),
                            "ja"
                    );
                    mergeRichFields(original, japaneseFallback);
                }
            }

            // 3차: 일본어 이름 검색까지 실패했을 때는 좌표 주변의 역 엔티티를 직접 검색합니다.
            // 사용자가 한글 UI를 쓰더라도 내부 후보 탐색은 일본어로 수행하므로 언어에 덜 의존합니다.
            if (isStationLike(original) && needsRichGoogleFields(original)) {
                GooglePlaceResponseDTO nearbyStation = fetchNearbyStationCandidate(original.getLocation());
                mergeRichFields(original, nearbyStation);
            }

            return original;
        } catch (Exception e) {
            System.err.println("[역/POI 보강 검색 실패] " + name + " | " + e.getMessage());
            return original;
        }
    }

    private boolean needsRichGoogleFields(GooglePlaceResponseDTO place) {
        if (place == null) return true;
        boolean hasPhotos = place.getPhotos() != null && !place.getPhotos().isEmpty();
        boolean hasReviews = place.getUserRatingCount() != null && place.getUserRatingCount() > 0;
        return !hasPhotos || !hasReviews;
    }

    private boolean isStationLike(GooglePlaceResponseDTO place) {
        if (place == null) return false;

        if (place.getTypes() != null) {
            for (String type : place.getTypes()) {
                if ("train_station".equals(type)
                        || "subway_station".equals(type)
                        || "transit_station".equals(type)) {
                    return true;
                }
            }
        }

        String name = place.getDisplayName() != null ? place.getDisplayName().getText() : "";
        if (name == null) name = "";
        String lower = name.toLowerCase(Locale.ROOT);
        return name.endsWith("역") || name.endsWith("駅") || lower.contains("station");
    }

    private void mergeRichFields(GooglePlaceResponseDTO target, GooglePlaceResponseDTO source) {
        if (target == null || source == null) return;

        if ((target.getPhotos() == null || target.getPhotos().isEmpty())
                && source.getPhotos() != null && !source.getPhotos().isEmpty()) {
            target.setPhotos(source.getPhotos());
        }

        if (target.getRating() == null && source.getRating() != null) {
            target.setRating(source.getRating());
        }

        if ((target.getUserRatingCount() == null || target.getUserRatingCount() <= 0)
                && source.getUserRatingCount() != null && source.getUserRatingCount() > 0) {
            target.setUserRatingCount(source.getUserRatingCount());
        }
    }

    private GooglePlaceResponseDTO fetchJapaneseDetailsForSamePlace(GooglePlaceResponseDTO original) {
        if (original == null || original.getId() == null || original.getId().isBlank()) {
            return null;
        }

        String rawId = original.getId().trim();
        if (rawId.startsWith("places/")) {
            rawId = rawId.substring(7);
        }

        String url = "https://places.googleapis.com/v1/places/" + rawId + "?languageCode=ja";

        HttpHeaders headers = new HttpHeaders();
        headers.set("X-Goog-Api-Key", googleApikey);
        headers.set(
                "X-Goog-FieldMask",
                "id,displayName,formattedAddress,location,photos.name,types,rating,userRatingCount"
        );

        try {
            ResponseEntity<GooglePlaceResponseDTO> response = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    new HttpEntity<Void>(headers),
                    GooglePlaceResponseDTO.class
            );
            return response.getBody();
        } catch (Exception e) {
            System.err.println("[일본어 Place Details 조회 실패] " + rawId + " | " + e.getMessage());
            return null;
        }
    }

    @SuppressWarnings("unchecked")
    private GooglePlaceResponseDTO fetchNearbyStationCandidate(GooglePlaceResponseDTO.Location origin) {
        if (origin == null
                || origin.getLatitude() == null
                || origin.getLongitude() == null) {
            return null;
        }

        String url = "https://places.googleapis.com/v1/places:searchNearby";

        HttpHeaders headers = new HttpHeaders();
        headers.set("X-Goog-Api-Key", googleApikey);
        headers.set(
                "X-Goog-FieldMask",
                "places.id,places.displayName,places.formattedAddress,places.location,places.photos.name,places.types,places.rating,places.userRatingCount"
        );

        Map<String, Object> center = new HashMap<>();
        center.put("latitude", origin.getLatitude());
        center.put("longitude", origin.getLongitude());

        Map<String, Object> circle = new HashMap<>();
        circle.put("center", center);
        circle.put("radius", 500.0);

        Map<String, Object> locationRestriction = new HashMap<>();
        locationRestriction.put("circle", circle);

        Map<String, Object> body = new HashMap<>();
        body.put("includedTypes", List.of("train_station", "subway_station", "transit_station"));
        body.put("maxResultCount", 12);
        body.put("languageCode", "ja");
        body.put("locationRestriction", locationRestriction);

        try {
            ResponseEntity<Map> response = restTemplate.exchange(
                    url,
                    HttpMethod.POST,
                    new HttpEntity<>(body, headers),
                    Map.class
            );

            if (response.getBody() == null || !response.getBody().containsKey("places")) {
                return null;
            }

            List<Map<String, Object>> rawPlaces = (List<Map<String, Object>>) response.getBody().get("places");
            if (rawPlaces == null || rawPlaces.isEmpty()) return null;

            return rawPlaces.stream()
                    .map(raw -> objectMapper.convertValue(raw, GooglePlaceResponseDTO.class))
                    .filter(Objects::nonNull)
                    .max(Comparator.comparingDouble(candidate -> nearbyStationScore(origin, candidate)))
                    .orElse(null);
        } catch (Exception e) {
            System.err.println("[주변 역 Fallback 실패] " + e.getMessage());
            return null;
        }
    }

    private double nearbyStationScore(
            GooglePlaceResponseDTO.Location origin,
            GooglePlaceResponseDTO candidate
    ) {
        if (candidate == null || candidate.getLocation() == null) return -10000;

        double score = 0;
        if (candidate.getPhotos() != null && !candidate.getPhotos().isEmpty()) score += 80;
        if (candidate.getUserRatingCount() != null && candidate.getUserRatingCount() > 0) score += 60;
        if (candidate.getRating() != null) score += 20;

        if (candidate.getTypes() != null) {
            if (candidate.getTypes().contains("train_station")) score += 30;
            if (candidate.getTypes().contains("subway_station")) score += 30;
            if (candidate.getTypes().contains("transit_station")) score += 15;
        }

        if (candidate.getLocation().getLatitude() != null
                && candidate.getLocation().getLongitude() != null) {
            double distance = haversineMeters(
                    origin.getLatitude(),
                    origin.getLongitude(),
                    candidate.getLocation().getLatitude(),
                    candidate.getLocation().getLongitude()
            );

            if (distance <= 50) score += 100;
            else if (distance <= 120) score += 75;
            else if (distance <= 250) score += 40;
            else if (distance <= 500) score += 10;
            else score -= 100;
        }

        return score;
    }

    private boolean hasPhotos(AutoPlace place) {
        return place.getPhotos() != null && !place.getPhotos().isEmpty();
    }

    private void applyPhotosFromGoogle(AutoPlace place, GooglePlaceResponseDTO googleData) {
        if (googleData.getPhotos() == null || googleData.getPhotos().isEmpty()) {
            return;
        }

        System.out.println(
                "=== [DEBUG] Google API 사진 데이터 수신 성공 | 수신된 개수: "
                        + googleData.getPhotos().size() + " ==="
        );

        for (GooglePlaceResponseDTO.AutoPhotoDto autoPhotoDto : googleData.getPhotos()) {
            if (autoPhotoDto != null && autoPhotoDto.getName() != null) {
                String photoMediaUrl = "https://places.googleapis.com/v1/" + autoPhotoDto.getName()
                        + "/media?key=" + googleApikey + "&maxHeightPx=400";

                AutoPlacePhoto photo = AutoPlacePhoto.builder()
                        .photoUrl(photoMediaUrl)
                        .build();

                place.addPhoto(photo);
            }
        }
    }

    /**
     * Places API (New) Place Details 단건 조회
     */
    private GooglePlaceResponseDTO fetchFromGoogleApi(String placeId) {
        if (placeId == null || placeId.isBlank()) {
            throw new IllegalArgumentException("Place ID 또는 검색어가 비어있습니다.");
        }

        String rawId = placeId.trim().replace("\"", "").replace("'", "");

        if (!rawId.startsWith("ChIJ") && !rawId.startsWith("places/")) {
            System.out.println(">>> [장소명 검색어 감지] Text Search를 바로 실행합니다: " + rawId);
            return fetchByTextSearchFallback(rawId);
        }

        if (rawId.startsWith("places/")) {
            rawId = rawId.substring(7);
        }

        String formattedPlaceName = "places/" + rawId;
        String newUrl = "https://places.googleapis.com/v1/" + formattedPlaceName + "?languageCode=ko";

        HttpHeaders headers = new HttpHeaders();
        headers.set("X-Goog-Api-Key", googleApikey);
        headers.set("X-Goog-FieldMask", "id,displayName,formattedAddress,location,photos.name,types,rating,userRatingCount");

        HttpEntity<Void> requestEntity = new HttpEntity<>(headers);

        try {
            System.out.println("==================================================");
            System.out.println(">>> [Places API New] Place Details 조회를 시도합니다.");
            System.out.println(">>> [DEBUG] 요청 Place ID : " + formattedPlaceName);
            System.out.println("==================================================");

            ResponseEntity<GooglePlaceResponseDTO> response = restTemplate.exchange(
                    newUrl,
                    HttpMethod.GET,
                    requestEntity,
                    GooglePlaceResponseDTO.class
            );

            return response.getBody();

        } catch (HttpStatusCodeException e) {
            System.err.println("=== [Places API New Details 조회 실패] ===");
            System.err.println("HTTP Status Code : " + e.getStatusCode());
            System.err.println("Error Response   : " + e.getResponseBodyAsString());

            if (e.getStatusCode().value() == 404 || e.getStatusCode().value() == 400) {
                System.out.println(">>> [Place ID 단건 조회 실패] DB에서 기존 장소명을 찾아 재검색을 시도합니다. ID: " + rawId);

                String fallbackSearchQuery = autoPlaceRepository.findById(rawId)
                        .map(AutoPlace::getName)
                        .orElse(rawId);

                System.out.println(">>> [Fallback 실행] 최종 검색어: " + fallbackSearchQuery);
                return fetchByTextSearchFallback(fallbackSearchQuery);
            }

            throw new IllegalArgumentException("Google API 호출 오류: " + e.getResponseBodyAsString(), e);
        }
    }

    private GooglePlaceResponseDTO fetchRichTextSearchCandidate(
            String searchQuery,
            GooglePlaceResponseDTO.Location origin,
            String languageCode
    ) {
        String searchUrl = "https://places.googleapis.com/v1/places:searchText";

        HttpHeaders headers = new HttpHeaders();
        headers.set("X-Goog-Api-Key", googleApikey);
        headers.set(
                "X-Goog-FieldMask",
                "places.id,places.displayName,places.formattedAddress,places.location,places.photos.name,places.types,places.rating,places.userRatingCount"
        );

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("textQuery", searchQuery);
        requestBody.put("languageCode", languageCode == null || languageCode.isBlank() ? "ko" : languageCode);
        requestBody.put("maxResultCount", 8);

        if (origin != null && origin.getLatitude() != null && origin.getLongitude() != null) {
            Map<String, Object> center = new HashMap<>();
            center.put("latitude", origin.getLatitude());
            center.put("longitude", origin.getLongitude());

            Map<String, Object> circle = new HashMap<>();
            circle.put("center", center);
            circle.put("radius", 1200.0);

            Map<String, Object> locationBias = new HashMap<>();
            locationBias.put("circle", circle);
            requestBody.put("locationBias", locationBias);
        }

        HttpEntity<Map<String, Object>> requestEntity = new HttpEntity<>(requestBody, headers);
        ResponseEntity<Map> response = restTemplate.exchange(
                searchUrl,
                HttpMethod.POST,
                requestEntity,
                Map.class
        );

        if (response.getBody() == null || !response.getBody().containsKey("places")) {
            return null;
        }

        List<Map<String, Object>> rawPlaces = (List<Map<String, Object>>) response.getBody().get("places");
        if (rawPlaces == null || rawPlaces.isEmpty()) return null;

        List<GooglePlaceResponseDTO> candidates = rawPlaces.stream()
                .map(raw -> objectMapper.convertValue(raw, GooglePlaceResponseDTO.class))
                .filter(Objects::nonNull)
                .toList();

        return candidates.stream()
                .max(Comparator.comparingDouble(candidate -> richCandidateScore(searchQuery, origin, candidate)))
                .orElse(null);
    }

    private double richCandidateScore(
            String searchQuery,
            GooglePlaceResponseDTO.Location origin,
            GooglePlaceResponseDTO candidate
    ) {
        double score = 0.0;

        String query = normalizePlaceName(searchQuery);
        String candidateName = candidate.getDisplayName() != null
                ? normalizePlaceName(candidate.getDisplayName().getText())
                : "";

        if (!query.isBlank() && !candidateName.isBlank()) {
            if (candidateName.equals(query)) score += 100;
            else if (candidateName.contains(query) || query.contains(candidateName)) score += 65;
        }

        if (candidate.getPhotos() != null && !candidate.getPhotos().isEmpty()) score += 35;
        if (candidate.getRating() != null) score += 15;
        if (candidate.getUserRatingCount() != null && candidate.getUserRatingCount() > 0) {
            score += 20 + Math.min(20, Math.log10(candidate.getUserRatingCount() + 1) * 5);
        }

        if (candidate.getTypes() != null) {
            if (candidate.getTypes().contains("train_station")) score += 25;
            if (candidate.getTypes().contains("subway_station")) score += 25;
            if (candidate.getTypes().contains("transit_station")) score += 20;
        }

        if (origin != null && candidate.getLocation() != null
                && origin.getLatitude() != null && origin.getLongitude() != null
                && candidate.getLocation().getLatitude() != null && candidate.getLocation().getLongitude() != null) {
            double distance = haversineMeters(
                    origin.getLatitude(), origin.getLongitude(),
                    candidate.getLocation().getLatitude(), candidate.getLocation().getLongitude()
            );

            if (distance <= 80) score += 35;
            else if (distance <= 250) score += 25;
            else if (distance <= 600) score += 10;
            else if (distance > 1500) score -= 80;
        }

        return score;
    }

    private String normalizePlaceName(String value) {
        if (value == null) return "";
        return value.toLowerCase(Locale.ROOT)
                .replace("駅", "")
                .replace("station", "")
                .replace("역", "")
                .replaceAll("\\s+", "")
                .trim();
    }

    private double haversineMeters(double lat1, double lon1, double lat2, double lon2) {
        double earthRadius = 6371000.0;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return earthRadius * c;
    }

    /**
     * Places API (New) Text Search Fallback
     */
    private GooglePlaceResponseDTO fetchByTextSearchFallback(String searchQuery) {
        if (searchQuery != null && searchQuery.startsWith("ChIJ")) {
            throw new IllegalArgumentException("DB에 장소 이름이 없고, Google API에서 만료된 Place ID입니다: " + searchQuery);
        }

        String searchUrl = "https://places.googleapis.com/v1/places:searchText";

        HttpHeaders headers = new HttpHeaders();
        headers.set("X-Goog-Api-Key", googleApikey);
        headers.set("X-Goog-FieldMask", "places.id,places.displayName,places.formattedAddress,places.location,places.photos.name,places.types,places.rating,places.userRatingCount");

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("textQuery", searchQuery);
        requestBody.put("languageCode", "ko");

        HttpEntity<Map<String, Object>> requestEntity = new HttpEntity<>(requestBody, headers);

        try {
            System.out.println("==================================================");
            System.out.println(">>> [Places API New] Text Search Fallback을 시도합니다.");
            System.out.println(">>> [DEBUG] 검색어 (textQuery): " + searchQuery);
            System.out.println("==================================================");

            ResponseEntity<Map> response = restTemplate.exchange(
                    searchUrl,
                    HttpMethod.POST,
                    requestEntity,
                    Map.class
            );

            System.out.println(">>> [성공] Text Search 응답 코드: " + response.getStatusCode());

            if (response.getBody() != null && response.getBody().containsKey("places")) {
                List<Map<String, Object>> places = (List<Map<String, Object>>) response.getBody().get("places");
                if (places != null && !places.isEmpty()) {
                    GooglePlaceResponseDTO result = objectMapper.convertValue(places.get(0), GooglePlaceResponseDTO.class);

                    System.out.println("=== [DEBUG] Text Search Fallback 성공! ===");
                    System.out.println(">>> 장소명: " + (result.getDisplayName() != null ? result.getDisplayName().getText() : "N/A"));
                    System.out.println(">>> 갱신된 최신 Place ID: " + result.getId());

                    return result;
                }
            }
        } catch (HttpStatusCodeException ex) {
            System.err.println("=== [Text Search Fallback HTTP 오류] ===");
            System.err.println("HTTP Status Code : " + ex.getStatusCode());
            System.err.println("Error Response   : " + ex.getResponseBodyAsString());
        } catch (Exception ex) {
            System.err.println("=== [Text Search Fallback 연동 예외] ===");
            ex.printStackTrace();
        }

        throw new IllegalArgumentException("Google API에서 장소를 찾을 수 없습니다: " + searchQuery);
    }
}
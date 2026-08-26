package org.example.autoPlace.Service;


import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.example.autoPlace.DTO.AutoPlaceResponseDto;
import org.example.autoPlace.DTO.GooglePlaceResponseDTO;
import org.example.autoPlace.Entity.AutoPlace;
import org.example.autoPlace.Entity.AutoPlacePhoto;
import org.example.autoPlace.Repository.AutoPlaceRepository;
import org.example.place.domain.Place;
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

        /*
         * 지도 카드/리뷰/그룹 렌더링이 거의 동시에 같은 장소를 요청할 수 있습니다.
         * 기존 코드는 두 요청이 모두 'DB에 없음'을 확인한 뒤 같은 PK로 INSERT하여
         * Duplicate entry 500이 발생했습니다. 동일 ID 처리를 한 번에 하나만 수행합니다.
         */
        synchronized (lockFor(normalizedPlaceId)) {
            Optional<AutoPlace> existing = autoPlaceRepository.findById(normalizedPlaceId);
            if (existing.isPresent()) {
                AutoPlace place = existing.get();
                // 사진은 이미 있으면 유지하고, 비어 있을 때만 Google에서 다시 채웁니다.
                if (hasPhotos(place)) {
                    return toResponse(place);
                }

                GooglePlaceResponseDTO googleData = fetchFromGoogleApi(normalizedPlaceId);
                if (googleData != null) {
                    applyPhotosFromGoogle(place, googleData);
                    AutoPlace saved = autoPlaceRepository.saveAndFlush(place);
                    return toResponse(saved);
                }
                return toResponse(place);
            }

            GooglePlaceResponseDTO googleData = fetchFromGoogleApi(normalizedPlaceId);

            if (googleData == null) {
                throw new IllegalArgumentException(
                        "Google API에서 해당 Place ID의 정보를 가져올 수 없습니다: " + normalizedPlaceId
                );
            }

            AutoPlace place = AutoPlace.builder()
                    .autoPlaceId(normalizedPlaceId)
                    .build();

            if (googleData.getDisplayName() != null && googleData.getDisplayName().getText() != null) {
                place.setName(googleData.getDisplayName().getText());
            } else {
                place.setName("이름 없음");
            }

            place.setAddress(googleData.getFormattedAddress());

            if (googleData.getTypes() != null && !googleData.getTypes().isEmpty()) {
                place.setCategory(googleData.getTypes().get(0));
            } else {
                place.setCategory("establishment");
            }

            if (googleData.getLocation() != null) {
                place.setAutoLatitude(googleData.getLocation().getLatitude());
                place.setAutoLongitude(googleData.getLocation().getLongitude());
            }

            place.setRating(googleData.getRating());
            place.setUserRatingCount(googleData.getUserRatingCount());
            applyPhotosFromGoogle(place, googleData);

            AutoPlace savedAutoPlace = autoPlaceRepository.saveAndFlush(place);
            return toResponse(savedAutoPlace);
        }
    }

    private AutoPlaceResponseDto toResponse(AutoPlace autoPlace) {
        Place place = placeService.getOrCreateFromAutoPlace(autoPlace);
        return AutoPlaceResponseDto.fromEntity(autoPlace, place);
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

        // 1. 입력값이 Place ID 형식(ChIJ...)이 아니고 일반 장소명인 경우 바로 Text Search 실행
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
        // FieldMask에 rating, userRatingCount 추가
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

            // 2. 404(만료) 또는 400(잘못된 ID) 발생 시 DB에서 장소명을 먼저 찾은 후 Fallback 시도
            if (e.getStatusCode().value() == 404 || e.getStatusCode().value() == 400) {
                System.out.println(">>> [Place ID 단건 조회 실패] DB에서 기존 장소명을 찾아 재검색을 시도합니다. ID: " + rawId);

                // DB에서 기존 저장된 장소 이름 조회 (AutoPlace 또는 Place Repository 활용)
                String fallbackSearchQuery = autoPlaceRepository.findById(rawId)
                        .map(AutoPlace::getName)
                        .orElse(rawId); // DB에 저장된 이름이 없으면 rawId 그대로 사용

                System.out.println(">>> [Fallback 실행] 최종 검색어: " + fallbackSearchQuery);
                return fetchByTextSearchFallback(fallbackSearchQuery);
            }

            throw new IllegalArgumentException("Google API 호출 오류: " + e.getResponseBodyAsString(), e);
        }
    }

    /**
     * Places API (New) Text Search Fallback
     */
    private GooglePlaceResponseDTO fetchByTextSearchFallback(String searchQuery) {
        // 만약 DB에도 이름이 없고 'ChIJ'로 시작하는 만료 ID가 그대로 들어왔다면 Text Search 불가능
        if (searchQuery != null && searchQuery.startsWith("ChIJ")) {
            throw new IllegalArgumentException("DB에 장소 이름이 없고, Google API에서 만료된 Place ID입니다: " + searchQuery);
        }

        String searchUrl = "https://places.googleapis.com/v1/places:searchText";

        HttpHeaders headers = new HttpHeaders();
        headers.set("X-Goog-Api-Key", googleApikey);
        // FieldMask에 places.rating, places.userRatingCount 추가
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
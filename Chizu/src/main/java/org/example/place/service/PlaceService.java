package org.example.place.service;


import io.jsonwebtoken.JwtException;
import lombok.RequiredArgsConstructor;
import org.example.config.JwtTokenProvider;
import org.example.autoPlace.Entity.AutoPlace;
import org.example.place.domain.Place;
import org.example.place.dto.PlaceCreateRequest;
import org.example.place.dto.PlaceResponse;
import org.example.place.dto.PlaceUpdateRequest;
import org.example.place.repository.PlaceRepository;
import org.example.user.entity.User;
import org.example.user.repository.UserRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Date;

@Service
@RequiredArgsConstructor
public class PlaceService {


    private final PlaceRepository placeRepository;
    private final UserRepository userRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final PlacePreferenceService placePreferenceService;


    @Transactional
    public Place getOrCreateFromAutoPlace(AutoPlace autoPlace) {
        if (autoPlace == null || autoPlace.getAutoPlaceId() == null || autoPlace.getAutoPlaceId().isBlank()) {
            throw new IllegalArgumentException("AutoPlace 정보가 올바르지 않습니다.");
        }

        String googlePlaceId = autoPlace.getAutoPlaceId().trim();
        Place existing = findExistingForAutoPlace(googlePlaceId);
        if (existing != null) {
            existing.attachSourceKey(googlePlaceId);
            return syncPlaceFromAutoPlace(existing, autoPlace);
        }
        return createPlaceFromAutoPlace(autoPlace, googlePlaceId);
    }

    @Transactional
    public PlaceResponse createPlace(PlaceCreateRequest request, String token){
        Long userId = Long.parseLong(jwtTokenProvider.getSubject(token));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 유저입니다."));

        String sourceKey = blankToNull(request.getGooglePlaceId());
        Place existing = findExistingPlace(sourceKey, request.getPlaceInformation());
        if (existing == null && sourceKey != null) {
            existing = findExistingForAutoPlace(sourceKey);
        }
        if (existing != null) {
            existing.attachSourceKey(sourceKey);
            return PlaceResponse.from(existing);
        }

        Place place = Place.builder()
                .googlePlaceId(sourceKey)
                .placeName(request.getPlaceName())
                .placeCategory(request.getPlaceCategory())
                .placeAddress(request.getPlaceAddress())
                .placePhone(request.getPlacePhone())
                .placeInformation(request.getPlaceInformation())
                .placeDate(request.getPlaceDate())
                .placeLatitude(request.getPlaceLatitude())
                .placeLongitude(request.getPlaceLongitude())
                .user(user)
                .build();

        try {
            Place savePlace = placeRepository.save(place);
            return PlaceResponse.from(savePlace);
        } catch (DataIntegrityViolationException ex) {
            Place duplicated = findExistingPlace(sourceKey, request.getPlaceInformation());
            if (duplicated == null) {
                throw ex;
            }
            return PlaceResponse.from(duplicated);
        }

    }

    @Transactional
    public PlaceResponse getPlace(Long placeId, String token){
        Place place = placeRepository.findById(placeId)
                .orElseThrow(() -> new IllegalArgumentException("해당 장소가 존재하지 않습니다."));

        if (token != null && !token.isBlank() && jwtTokenProvider.validateToken(token)) {
            try {
                Long userId = Long.valueOf(jwtTokenProvider.getSubject(token));
                userRepository.findById(userId).ifPresent(user ->
                        placePreferenceService.increase(user, place, PlacePreferenceService.WEIGHT_VIEW));
            } catch (JwtException | NumberFormatException ignored) {
                // 공개 조회이므로 잘못된 토큰은 무시한다.
            }
        }

        return convertToDTO(place);
    }

    @Transactional
    public void recordPreference(Long placeId, String token, String action) {
        int weight = weightOf(action);
        Place place = placeRepository.findById(placeId)
                .orElseThrow(() -> new IllegalArgumentException("해당 장소가 존재하지 않습니다."));

        try {
            if (token == null || token.isBlank() || !jwtTokenProvider.validateToken(token)) {
                throw new IllegalArgumentException("유효하지 않은 토큰입니다.");
            }
            Long userId = Long.valueOf(jwtTokenProvider.getSubject(token));
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 유저입니다."));
            placePreferenceService.increase(user, place, weight);
        } catch (JwtException | NumberFormatException ex) {
            throw new IllegalArgumentException("유효하지 않은 토큰입니다.");
        }
    }

    private static int weightOf(String action) {
        if (action == null || action.isBlank()) {
            throw new IllegalArgumentException("선호도 액션이 비어 있습니다.");
        }
        return switch (action.trim().toLowerCase()) {
            case "view" -> PlacePreferenceService.WEIGHT_VIEW;
            case "like" -> PlacePreferenceService.WEIGHT_LIKE;
            case "save" -> PlacePreferenceService.WEIGHT_SAVE;
            default -> throw new IllegalArgumentException("지원하지 않는 선호도 액션입니다.");
        };
    }

    @Transactional
    public PlaceResponse updatePlace(Long placeId, PlaceUpdateRequest updateDTO, String token){
        Place place = placeRepository.findById(placeId)
                .orElseThrow(() -> new IllegalArgumentException("해당 장소가 존재하지 않습니다."));

        Long userId = Long.parseLong(jwtTokenProvider.getSubject(token));

        if (place.getUser() == null || !place.getUser().getId().equals(userId)) {
            throw new IllegalArgumentException("해당 장소를 수정할 권한이 없습니다.");
        }

        place.updatePlaceInfo(updateDTO);
        return convertToDTO(place);

    }

    @Transactional
    public void deletePlace(Long placeId, String token){
        Place place = placeRepository.findById(placeId)
                .orElseThrow(() -> new IllegalArgumentException("해당 장소가 존재하지 않습니다."));

        Long userId = Long.parseLong(jwtTokenProvider.getSubject(token));

        if (place.getUser() == null || !place.getUser().getId().equals(userId)) {
            throw new IllegalArgumentException("해당 장소를 삭제할 권한이 없습니다.");
        }

        placeRepository.delete(place);
    }


    private Place createPlaceFromAutoPlace(AutoPlace autoPlace, String googlePlaceId) {
        Place place = Place.builder()
                .googlePlaceId(googlePlaceId)
                .placeName(defaultAutoPlaceName(autoPlace.getName()))
                .placeCategory(defaultAutoPlaceCategory(autoPlace.getCategory()))
                .placeAddress(autoPlace.getAddress())
                .placeInformation("Google Maps POI / " + googlePlaceId)
                .placeDate(new Date())
                .placeLatitude(autoPlace.getAutoLatitude())
                .placeLongitude(autoPlace.getAutoLongitude())
                .build();

        try {
            return placeRepository.saveAndFlush(place);
        } catch (DataIntegrityViolationException ex) {
            Place existing = findExistingForAutoPlace(googlePlaceId);
            if (existing == null) {
                throw ex;
            }
            existing.attachSourceKey(googlePlaceId);
            return syncPlaceFromAutoPlace(existing, autoPlace);
        }
    }

    private Place syncPlaceFromAutoPlace(Place place, AutoPlace autoPlace) {
        place.updateFromGoogle(
                defaultAutoPlaceName(autoPlace.getName()),
                defaultAutoPlaceCategory(autoPlace.getCategory()),
                autoPlace.getAddress(),
                autoPlace.getAutoLatitude(),
                autoPlace.getAutoLongitude()
        );
        return place;
    }

    private static String defaultAutoPlaceName(String name) {
        if (name == null || name.isBlank()) {
            return "이름 없음";
        }
        return name.trim();
    }

    private static String defaultAutoPlaceCategory(String category) {
        if (category == null || category.isBlank()) {
            return "establishment";
        }
        return category.trim();
    }

    private Place findExistingForAutoPlace(String googlePlaceId) {
        Place byGoogleId = placeRepository.findByGooglePlaceId(googlePlaceId).orElse(null);
        if (byGoogleId != null) {
            return byGoogleId;
        }

        Place byGoogleInfo = placeRepository
                .findFirstByPlaceInformationOrderByPlaceIdAsc("Google Maps POI / " + googlePlaceId)
                .orElse(null);
        if (byGoogleInfo != null) {
            return byGoogleInfo;
        }

        // 예전 프론트: google_* 키를 정적 장소로 오인해 POST 한 orphan
        return placeRepository
                .findFirstByPlaceInformationEndingWithOrderByPlaceIdAsc("CHEESE MAP / google_" + googlePlaceId)
                .orElse(null);
    }

    private Place findExistingPlace(String sourceKey, String placeInformation) {
        if (sourceKey != null) {
            Place byKey = placeRepository.findByGooglePlaceId(sourceKey).orElse(null);
            if (byKey != null) {
                return byKey;
            }
        }
        if (placeInformation != null && !placeInformation.isBlank()) {
            return placeRepository.findFirstByPlaceInformationOrderByPlaceIdAsc(placeInformation).orElse(null);
        }
        return null;
    }

    private static String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private PlaceResponse convertToDTO(Place place){
        return PlaceResponse.builder()
                .placeId(place.getPlaceId())
                .googlePlaceId(place.getGooglePlaceId())
                .placeName(place.getPlaceName())
                .placeCategory(place.getPlaceCategory())
                .placeAddress(place.getPlaceAddress())
                .placePhone(place.getPlacePhone())
                .placeInformation(place.getPlaceInformation())
                .placeDate(place.getPlaceDate())
                .placeLatitude(place.getPlaceLatitude())
                .placeLongitude(place.getPlaceLongitude())
                .avgRating(place.getAvgRating())
                .reviewCount(place.getReviewCount())
                .userId(place.getUser() != null ? place.getUser().getId() : null)
                .build();

    }

}

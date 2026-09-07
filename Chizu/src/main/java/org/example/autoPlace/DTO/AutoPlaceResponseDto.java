package org.example.autoPlace.DTO;


import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.example.autoPlace.Entity.AutoPlace;
import org.example.autoPlace.Entity.AutoPlacePhoto;
import org.example.place.domain.Place;

import java.time.LocalTime;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AutoPlaceResponseDto {

    private String autoPlaceId;
    private Long placeId;
    private String googlePlaceId;
    private String name;
    private String category;
    private String address;
    private LocalTime openTime;
    private LocalTime closeTime;
    private Double autoLatitude;
    private Double autoLongitude;

    // Google AutoPlace 평점 (참고용)
    private Double rating;
    private Integer userRatingCount;

    // Cheese Map Place 평점/리뷰
    private Double avgRating;
    private Integer reviewCount;

    private List<String> photoUrls;

    public static AutoPlaceResponseDto fromEntity(AutoPlace autoPlace, Place place) {
        List<String> photoUrls = (autoPlace != null && autoPlace.getPhotos() != null)
                ? autoPlace.getPhotos().stream()
                .map(AutoPlacePhoto::getPhotoUrl)
                .collect(Collectors.toList())
                : Collections.emptyList();

        // 1. AutoPlace 기본 정보 추출
        String autoPlaceId = autoPlace != null ? autoPlace.getAutoPlaceId() : null;

        // 2. 장소 이름/카테고리/주소: Place가 존재하면 Place 값 우선, 없으면 AutoPlace 값 사용
        String name = (place != null && place.getPlaceName() != null && !place.getPlaceName().isBlank())
                ? place.getPlaceName()
                : (autoPlace != null ? autoPlace.getName() : null);

        String category = (place != null && place.getPlaceCategory() != null && !place.getPlaceCategory().isBlank())
                ? place.getPlaceCategory()
                : (autoPlace != null ? autoPlace.getCategory() : null);

        String address = (place != null && place.getPlaceAddress() != null && !place.getPlaceAddress().isBlank())
                ? place.getPlaceAddress()
                : (autoPlace != null ? autoPlace.getAddress() : null);

        // 3. Cheese Map 자체 평점/리뷰 수 Null-Safe 처리
        Double avgRating = (place != null) ? place.getAvgRating() : 0.0;
        Integer reviewCount = (place != null) ? place.getReviewCount() : 0;

        return AutoPlaceResponseDto.builder()
                .autoPlaceId(autoPlaceId)
                .placeId(place != null ? place.getPlaceId() : null)
                .googlePlaceId(place != null ? place.getGooglePlaceId() : autoPlaceId)
                .name(name)
                .category(category)
                .address(address)
                .openTime(autoPlace != null ? autoPlace.getOpenTime() : null)
                .closeTime(autoPlace != null ? autoPlace.getCloseTime() : null)
                .autoLatitude(autoPlace != null ? autoPlace.getAutoLatitude() : null)
                .autoLongitude(autoPlace != null ? autoPlace.getAutoLongitude() : null)
                .rating(autoPlace != null ? autoPlace.getRating() : null)
                .userRatingCount(autoPlace != null ? autoPlace.getUserRatingCount() : null)
                .avgRating(avgRating)
                .reviewCount(reviewCount)
                .photoUrls(photoUrls)
                .build();
    }
}
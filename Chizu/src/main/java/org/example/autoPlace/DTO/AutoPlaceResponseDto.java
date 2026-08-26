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
        List<String> photoUrls = (autoPlace.getPhotos() != null)
                ? autoPlace.getPhotos().stream()
                .map(AutoPlacePhoto::getPhotoUrl)
                .collect(Collectors.toList())
                : Collections.emptyList();

        return AutoPlaceResponseDto.builder()
                .autoPlaceId(autoPlace.getAutoPlaceId())
                .placeId(place != null ? place.getPlaceId() : null)
                .googlePlaceId(place != null ? place.getGooglePlaceId() : autoPlace.getAutoPlaceId())
                .name(autoPlace.getName())
                .category(autoPlace.getCategory())
                .address(autoPlace.getAddress())
                .openTime(autoPlace.getOpenTime())
                .closeTime(autoPlace.getCloseTime())
                .autoLatitude(autoPlace.getAutoLatitude())
                .autoLongitude(autoPlace.getAutoLongitude())
                .rating(autoPlace.getRating())
                .userRatingCount(autoPlace.getUserRatingCount())
                .avgRating(place != null ? place.getAvgRating() : 0.0)
                .reviewCount(place != null ? place.getReviewCount() : 0)
                .photoUrls(photoUrls)
                .build();
    }
}
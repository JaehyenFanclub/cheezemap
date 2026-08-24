package org.example.autoPlace.DTO;


import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.example.autoPlace.Entity.AutoPlace;
import org.example.autoPlace.Entity.AutoPlacePhoto;

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
    private String name;
    private String category;
    private String address;
    private LocalTime openTime;
    private LocalTime closeTime;
    private Double autoLatitude;
    private Double autoLongitude;

    // 추가된 필드
    private Double rating;            // 평점 (예: 4.5)
    private Integer userRatingCount;  // 리뷰 수 (예: 1250)

    private List<String> photoUrls;

    public static AutoPlaceResponseDto fromEntity(AutoPlace autoPlace) {
        List<String> photoUrls = (autoPlace.getPhotos() != null)
                ? autoPlace.getPhotos().stream()
                .map(AutoPlacePhoto::getPhotoUrl)
                .collect(Collectors.toList())
                : Collections.emptyList();

        return AutoPlaceResponseDto.builder()
                .autoPlaceId(autoPlace.getAutoPlaceId())
                .name(autoPlace.getName())
                .category(autoPlace.getCategory())
                .address(autoPlace.getAddress())
                .openTime(autoPlace.getOpenTime())
                .closeTime(autoPlace.getCloseTime())
                .autoLatitude(autoPlace.getAutoLatitude())
                .autoLongitude(autoPlace.getAutoLongitude())

                // 추가된 매핑
                .rating(autoPlace.getRating())
                .userRatingCount(autoPlace.getUserRatingCount())

                .photoUrls(photoUrls)
                .build();
    }
}
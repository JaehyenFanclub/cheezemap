package org.example.autoPlace.DTO;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public class GooglePlaceResponseDTO {

    private String id;

    @JsonProperty("displayName")
    private LocalizedText displayName;

    @JsonProperty("formattedAddress")
    private String formattedAddress;

    private List<String> types;

    @JsonProperty("location")
    private Location location;

    @JsonProperty("photos")
    private List<AutoPhotoDto> photos;

    // 추가: 평점 (예: 4.5)
    @JsonProperty("rating")
    private Double rating;

    // 추가: 총 리뷰 수 (예: 1250)
    @JsonProperty("userRatingCount")
    private Integer userRatingCount;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class LocalizedText {
        private String text;
        private String languageCode;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Location {
        @JsonProperty("latitude")
        private Double latitude;

        @JsonProperty("longitude")
        private Double longitude;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class AutoPhotoDto {

        @JsonProperty("name")
        private String name;

        @JsonProperty("widthPx")
        private Integer widthPx;

        @JsonProperty("heightPx")
        private Integer heightPx;
    }
}
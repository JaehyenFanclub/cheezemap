package org.example.place.domain;

import jakarta.persistence.*;
import lombok.*;
import org.example.place.dto.PlaceUpdateRequest;

import java.util.Date;

@Entity
@Table(name = "place")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Place {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "placeId")
    private Long placeId;

    @Column(name = "googlePlaceId", unique = true, length = 255)
    private String googlePlaceId;

    @Column(name = "placeName")
    private String placeName;

    @Column(name = "placeCategory")
    private  String placeCategory;

    @Column(name = "placeAddress")
    private String placeAddress;

    @Column(name = "placePhone")
    private String placePhone;

    @Column(name = "placeInformation")
    private String placeInformation;

    @Column(name = "placeDate")
    private Date placeDate;

    @Column(name = "placeLatitude")
    private Double placeLatitude;

    @Column(name = "placeLongitude")
    private Double placeLongitude;

    @Builder.Default
    @Column(nullable = false, columnDefinition = "double not null default 0")
    private double avgRating = 0.0;

    @Builder.Default
    @Column(nullable = false, columnDefinition = "int not null default 0")
    private int reviewCount = 0;

    public void updatePlaceInfo(PlaceUpdateRequest dto){
        this.placeName = dto.getPlaceName();
        this.placeCategory = dto.getPlaceCategory();
        this.placeAddress = dto.getPlaceAddress();
        this.placePhone = dto.getPlacePhone();
        this.placeInformation = dto.getPlaceInformation();
        this.placeDate = dto.getPlaceDate();
        this.placeLatitude = dto.getPlaceLatitude();
        this.placeLongitude = dto.getPlaceLongitude();

    }

    public void attachSourceKey(String sourceKey) {
        if (sourceKey == null || sourceKey.isBlank()) {
            return;
        }
        if (this.googlePlaceId == null || this.googlePlaceId.isBlank()) {
            this.googlePlaceId = sourceKey;
        }
    }

    public void updateFromGoogle(
            String name,
            String category,
            String address,
            Double latitude,
            Double longitude
    ) {
        this.placeName = name;
        this.placeCategory = category;
        this.placeAddress = address;
        this.placeLatitude = latitude;
        this.placeLongitude = longitude;
    }

    public void updateReviewStats(double avgRating, int reviewCount) {
        this.avgRating = reviewCount <= 0 ? 0.0 : avgRating;
        this.reviewCount = Math.max(reviewCount, 0);
    }

}

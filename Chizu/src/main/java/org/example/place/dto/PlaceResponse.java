package org.example.place.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.example.place.domain.Place;

import java.util.Date;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PlaceResponse {

    private Long placeId;
    private String googlePlaceId;
    private String placeName;
    private String placeCategory;
    private String placeAddress;
    private String placePhone;
    private String placeInformation;
    private Date placeDate;
    private Double placeLatitude;
    private Double placeLongitude;
    private Long userId;

    public static PlaceResponse from(Place place) {
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
                .userId(place.getUser() != null ? place.getUser().getId() : null)
                .build();
    }

}

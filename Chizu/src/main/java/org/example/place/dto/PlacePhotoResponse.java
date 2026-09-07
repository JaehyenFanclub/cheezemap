package org.example.place.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.example.place.domain.Place;
import org.example.place.domain.PlacePhoto;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor

public class PlacePhotoResponse {

    private Long photoId;
    private LocalDateTime photoDate;
    private String photoUrl;
    private Long placeId;

    public static PlacePhotoResponse from (PlacePhoto placePhoto){

        return PlacePhotoResponse.builder()
                .photoId(placePhoto.getPlacePhotoId())
                .photoDate(placePhoto.getPhotoDate())
                .photoUrl(placePhoto.getPhotoUrl())
                .placeId(placePhoto.getPlace() != null ? placePhoto.getPlace().getPlaceId() : null)
                .build();
    }
}

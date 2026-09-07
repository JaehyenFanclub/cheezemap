package org.example.place.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.example.place.domain.PlaceLike;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PlaceLikeResponse {

    private Long placeLikeId;
    private Long userId;
    private Long placeId;

    public static PlaceLikeResponse from(PlaceLike placeLike){
        return PlaceLikeResponse.builder()
                .placeLikeId(placeLike.getPlaceLikeId())
                .userId(placeLike.getUser().getId())
                .placeId(placeLike.getPlace().getPlaceId())
                .build();
    }
}

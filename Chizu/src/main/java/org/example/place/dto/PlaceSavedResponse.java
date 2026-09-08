package org.example.place.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.example.place.domain.PlaceSaved;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PlaceSavedResponse {

    private Long placeSavedId;
    private Long userId;
    private Long placeId;

    public static PlaceSavedResponse from(PlaceSaved placeSaved){
        return PlaceSavedResponse.builder()
                .placeSavedId(placeSaved.getPlaceSavedId())
                .userId(placeSaved.getUser().getId())
                .placeId(placeSaved.getPlace().getPlaceId())
                .build();
    }
}

package org.example.autoPlace.DTO;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class GooglePlaceLinkRequestDto {
    private String placeId;
    private String name;
    private String category;
    private String address;
    private Double lat;
    private Double lng;
}

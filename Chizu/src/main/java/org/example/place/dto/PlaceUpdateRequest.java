package org.example.place.dto;


import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.Date;

@Getter
@NoArgsConstructor
public class PlaceUpdateRequest {

    private String placeName;
    private String placeCategory;
    private String placeAddress;
    private String placePhone;
    private String placeInformation;
    private Date placeDate;
    private Double placeLatitude;
    private Double placeLongitude;

}

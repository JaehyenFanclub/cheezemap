package org.example.place.dto;

public record PlaceRecommendResponse(
        Long placeId,
        String placeName,
        String placeCategory,
        String placeAddress,
        Double placeLatitude,
        Double placeLongitude,
        double avgRating,
        int reviewCount,
        int hitCount,
        double distanceMeters,
        double score
) {
}

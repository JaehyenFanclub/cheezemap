package org.example.place.service;

import io.jsonwebtoken.JwtException;
import lombok.RequiredArgsConstructor;
import org.example.common.enums.AgeGroup;
import org.example.common.enums.GenderGroup;
import org.example.config.JwtTokenProvider;
import org.example.config.TokenBlacklist;
import org.example.place.domain.Place;
import org.example.place.domain.PlacePreference;
import org.example.place.dto.PlaceRecommendResponse;
import org.example.place.repository.PlacePreferenceRepository;
import org.example.place.repository.PlaceRepository;
import org.example.review.repository.ReviewRepository;
import org.example.review.repository.ReviewRepository.PlaceReviewStats;
import org.example.user.entity.User;
import org.example.user.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PlaceRecommendService {

    private static final double W_RATING = 0.4;
    private static final double W_REVIEW = 0.2;
    private static final double W_HIT = 0.4;
    private static final double RATING_PRIOR_WEIGHT = 10.0;
    private static final double FALLBACK_PRIOR_RATING = 3.5;
    private static final int CANDIDATE_LIMIT = 100;
    private static final int DEFAULT_LIMIT = 20;
    private static final double EARTH_RADIUS_M = 6_371_000.0;
    private static final double METERS_PER_DEGREE = 111_000.0;

    private final PlaceRepository placeRepository;
    private final PlacePreferenceRepository placePreferenceRepository;
    private final ReviewRepository reviewRepository;
    private final UserRepository userRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final TokenBlacklist tokenBlacklist;

    @Transactional(readOnly = true)
    public List<PlaceRecommendResponse> recommend(
            String token,
            double lat,
            double lng,
            double radiusMeters,
            Integer limit
    ) {
        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            throw new IllegalArgumentException("위도/경도 값이 올바르지 않습니다.");
        }
        if (radiusMeters <= 0) {
            throw new IllegalArgumentException("반경은 0보다 커야 합니다.");
        }

        int topN = (limit == null || limit <= 0) ? DEFAULT_LIMIT : Math.min(limit, CANDIDATE_LIMIT);
        User user = findUserByToken(token);
        AgeGroup ageGroup = AgeGroup.fromBirth(user.getBirth());
        GenderGroup gender = GenderGroup.fromSex(user.getSex());

        List<Place> candidates = findNearbyPlaces(lat, lng, radiusMeters);
        if (candidates.isEmpty()) {
            return List.of();
        }

        Map<Long, Integer> hitCountByPlaceId = loadHitCounts(candidates, ageGroup, gender);
        Map<Long, PlaceReviewStats> reviewStatsByPlaceId = loadReviewStats(candidates);
        double priorRating = candidates.stream()
                .filter(place -> reviewCountOf(place, reviewStatsByPlaceId) > 0)
                .mapToDouble(place -> avgRatingOf(place, reviewStatsByPlaceId))
                .average()
                .orElse(FALLBACK_PRIOR_RATING);

        double minLogReview = Double.POSITIVE_INFINITY;
        double maxLogReview = Double.NEGATIVE_INFINITY;
        int minHit = Integer.MAX_VALUE;
        int maxHit = Integer.MIN_VALUE;
        for (Place place : candidates) {
            double logReview = Math.log(reviewCountOf(place, reviewStatsByPlaceId) + 1.0);
            minLogReview = Math.min(minLogReview, logReview);
            maxLogReview = Math.max(maxLogReview, logReview);
            int hitCount = hitCountByPlaceId.getOrDefault(place.getPlaceId(), 0);
            minHit = Math.min(minHit, hitCount);
            maxHit = Math.max(maxHit, hitCount);
        }

        final double prior = priorRating;
        final double minLog = minLogReview;
        final double maxLog = maxLogReview;
        final int hitMin = minHit;
        final int hitMax = maxHit;

        return candidates.stream()
                .map(place -> {
                    int hitCount = hitCountByPlaceId.getOrDefault(place.getPlaceId(), 0);
                    int reviewCount = reviewCountOf(place, reviewStatsByPlaceId);
                    double avgRating = avgRatingOf(place, reviewStatsByPlaceId);
                    double distanceMeters = haversineMeters(
                            lat, lng, place.getPlaceLatitude(), place.getPlaceLongitude());
                    double score = score(
                            avgRating,
                            reviewCount,
                            hitCount,
                            prior,
                            minLog,
                            maxLog,
                            hitMin,
                            hitMax
                    );
                    return toResponse(place, avgRating, reviewCount, hitCount, distanceMeters, score);
                })
                .sorted(Comparator.comparingDouble(PlaceRecommendResponse::score).reversed()
                        .thenComparingDouble(PlaceRecommendResponse::distanceMeters)
                        .thenComparing(PlaceRecommendResponse::placeId))
                .limit(topN)
                .toList();
    }

    private List<Place> findNearbyPlaces(double lat, double lng, double radiusMeters) {
        double deltaLat = radiusMeters / METERS_PER_DEGREE;
        double cosLat = Math.cos(Math.toRadians(lat));
        double deltaLng = radiusMeters / (METERS_PER_DEGREE * Math.max(Math.abs(cosLat), 0.01));

        return placeRepository.findWithinBounds(
                        lat - deltaLat,
                        lat + deltaLat,
                        lng - deltaLng,
                        lng + deltaLng
                ).stream()
                .filter(place -> haversineMeters(
                        lat, lng, place.getPlaceLatitude(), place.getPlaceLongitude()) <= radiusMeters)
                .sorted(Comparator.comparingDouble(place ->
                        haversineMeters(lat, lng, place.getPlaceLatitude(), place.getPlaceLongitude())))
                .limit(CANDIDATE_LIMIT)
                .toList();
    }

    private Map<Long, Integer> loadHitCounts(
            List<Place> candidates,
            AgeGroup ageGroup,
            GenderGroup gender
    ) {
        if (ageGroup == AgeGroup.UNKNOWN || gender == GenderGroup.UNKNOWN) {
            return Map.of();
        }

        List<Long> placeIds = candidates.stream()
                .map(Place::getPlaceId)
                .toList();
        if (placeIds.isEmpty()) {
            return Map.of();
        }

        return placePreferenceRepository
                .findByPlaceIdsAndAgeGroupAndGender(placeIds, ageGroup, gender)
                .stream()
                .collect(Collectors.toMap(
                        preference -> preference.getPlace().getPlaceId(),
                        PlacePreference::getHitCount,
                        (left, right) -> left
                ));
    }

    private Map<Long, PlaceReviewStats> loadReviewStats(List<Place> candidates) {
        List<Long> placeIds = candidates.stream()
                .map(Place::getPlaceId)
                .toList();
        if (placeIds.isEmpty()) {
            return Map.of();
        }

        return reviewRepository.findStatsByPlaceIds(placeIds).stream()
                .filter(stats -> stats.getPlaceId() != null)
                .collect(Collectors.toMap(
                        PlaceReviewStats::getPlaceId,
                        stats -> stats,
                        (left, right) -> left
                ));
    }

    private double score(
            double avgRating,
            int reviewCount,
            int hitCount,
            double priorRating,
            double minLogReview,
            double maxLogReview,
            int minHit,
            int maxHit
    ) {
        double confidence = reviewCount / (reviewCount + RATING_PRIOR_WEIGHT);
        double shrunkRating = confidence * avgRating + (1 - confidence) * priorRating;
        double logReview = Math.log(reviewCount + 1.0);

        return W_RATING * (shrunkRating / 5.0)
                + W_REVIEW * minMaxNormalize(logReview, minLogReview, maxLogReview)
                + W_HIT * minMaxNormalize(hitCount, minHit, maxHit);
    }

    private static double minMaxNormalize(double value, double min, double max) {
        if (max == min) {
            return max == 0.0 ? 0.0 : 1.0;
        }
        return (value - min) / (max - min);
    }

    private static double avgRatingOf(Place place, Map<Long, PlaceReviewStats> reviewStatsByPlaceId) {
        PlaceReviewStats stats = reviewStatsByPlaceId.get(place.getPlaceId());
        if (stats != null && stats.getAvgRating() != null) {
            return stats.getAvgRating();
        }
        return place.getAvgRating();
    }

    private static int reviewCountOf(Place place, Map<Long, PlaceReviewStats> reviewStatsByPlaceId) {
        PlaceReviewStats stats = reviewStatsByPlaceId.get(place.getPlaceId());
        if (stats != null && stats.getReviewCount() != null) {
            return stats.getReviewCount().intValue();
        }
        return place.getReviewCount();
    }

    private PlaceRecommendResponse toResponse(
            Place place,
            double avgRating,
            int reviewCount,
            int hitCount,
            double distanceMeters,
            double score
    ) {
        return new PlaceRecommendResponse(
                place.getPlaceId(),
                place.getPlaceName(),
                place.getPlaceCategory(),
                place.getPlaceAddress(),
                place.getPlaceLatitude(),
                place.getPlaceLongitude(),
                avgRating,
                reviewCount,
                hitCount,
                distanceMeters,
                score
        );
    }

    private static double haversineMeters(double lat1, double lng1, double lat2, double lng2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1.0, Math.sqrt(a)));
    }

    private User findUserByToken(String token) {
        if (token == null || token.isBlank()) {
            throw new IllegalArgumentException("토큰은 필수입니다.");
        }
        if (tokenBlacklist.contains(token)) {
            throw new IllegalArgumentException("이미 로그아웃된 토큰입니다.");
        }
        try {
            if (!jwtTokenProvider.validateToken(token)) {
                throw new IllegalArgumentException("유효하지 않은 토큰입니다.");
            }
            Long userId = Long.valueOf(jwtTokenProvider.getSubject(token));
            return userRepository.findById(userId)
                    .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));
        } catch (JwtException | NumberFormatException ex) {
            throw new IllegalArgumentException("유효하지 않은 토큰입니다.");
        }
    }
}

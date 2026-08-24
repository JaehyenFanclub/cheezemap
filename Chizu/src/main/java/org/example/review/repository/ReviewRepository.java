package org.example.review.repository;

import java.util.Collection;
import java.util.List;
import org.example.review.entity.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ReviewRepository extends JpaRepository<Review, Long> {

    @Query("""
            select r from Review r
            join fetch r.user
            join fetch r.place
            where r.place.placeId = :placeId
            order by r.createdAt desc
            """)
    List<Review> findByPlace_PlaceIdOrderByCreatedAtDesc(@Param("placeId") Long placeId);

    @Query("""
            select coalesce(avg(r.rating), 0.0) as avgRating, count(r) as reviewCount
            from Review r
            where r.place.placeId = :placeId
            """)
    RatingSummary findStatsByPlaceId(@Param("placeId") Long placeId);

    @Query("""
            select r.place.placeId as placeId,
                   avg(r.rating) as avgRating,
                   count(r) as reviewCount
            from Review r
            where r.place.placeId in :placeIds
            group by r.place.placeId
            """)
    List<PlaceReviewStats> findStatsByPlaceIds(@Param("placeIds") Collection<Long> placeIds);

    interface RatingSummary {
        Double getAvgRating();
        Long getReviewCount();
    }

    interface PlaceReviewStats {
        Long getPlaceId();
        Double getAvgRating();
        Long getReviewCount();
    }
}

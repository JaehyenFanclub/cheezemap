package org.example.review.repository;

import java.util.List;
import org.example.review.entity.ReviewPhoto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ReviewPhotoRepository extends JpaRepository<ReviewPhoto, Long> {

    List<ReviewPhoto> findByReviewId(Long reviewId);

    @Query("select p from ReviewPhoto p join fetch p.review where p.review.id in :reviewIds")
    List<ReviewPhoto> findByReviewIdIn(@Param("reviewIds") List<Long> reviewIds);

    void deleteByReviewId(Long reviewId);
}

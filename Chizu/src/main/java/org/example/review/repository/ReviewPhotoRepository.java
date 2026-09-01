package org.example.review.repository;

import java.util.List;
import org.example.review.entity.ReviewPhoto;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReviewPhotoRepository extends JpaRepository<ReviewPhoto, Long> {

    List<ReviewPhoto> findByReview_Id(Long reviewId);

    List<ReviewPhoto> findByReview_IdIn(List<Long> reviewIds);

    void deleteByReview_Id(Long reviewId);
}

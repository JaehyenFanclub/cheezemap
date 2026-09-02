package org.example.review.service;


import io.jsonwebtoken.JwtException;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.example.common.service.ImageStorageService;
import org.example.common.service.ImageStorageService.ImageFolder;
import org.example.config.JwtTokenProvider;
import org.example.config.TokenBlacklist;
import org.example.place.domain.Place;
import org.example.place.repository.PlaceRepository;
import org.example.place.service.PlacePreferenceService;
import org.example.review.repository.ReviewRepository.RatingSummary;
import org.example.review.dto.CreateReviewRequest;
import org.example.review.dto.ReviewResponse;
import org.example.review.dto.UpdateReviewRequest;
import org.example.review.entity.Review;
import org.example.review.entity.ReviewLike;
import org.example.review.entity.ReviewPhoto;
import org.example.review.repository.ReviewLikeRepository;
import org.example.review.repository.ReviewPhotoRepository;
import org.example.review.repository.ReviewRepository;
import org.example.user.service.UserDisplayNames;
import org.example.user.entity.User;
import org.example.user.entity.UserPhoto;
import org.example.user.repository.UserPhotoRepository;
import org.example.user.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final ReviewPhotoRepository reviewPhotoRepository;
    private final ReviewLikeRepository reviewLikeRepository;
    private final PlaceRepository placeRepository;
    private final PlacePreferenceService placePreferenceService;
    private final UserRepository userRepository;
    private final UserPhotoRepository userPhotoRepository;
    private final ImageStorageService imageStorageService;
    private final JwtTokenProvider jwtTokenProvider;
    private final TokenBlacklist tokenBlacklist;

    @Transactional(readOnly = true)
    public List<ReviewResponse> getReviews(long placeId) {
        findPlaceById(placeId);
        return toReviewResponses(
                reviewRepository.findByPlace_PlaceIdOrderByCreatedAtDesc(placeId)
        );
    }

    @Transactional(readOnly = true)
    public List<ReviewResponse> getMyReviews(String token) {
        User user = findUserByToken(token);
        return toReviewResponses(
                reviewRepository.findByUser_IdOrderByCreatedAtDesc(user.getId())
        );
    }

    private List<ReviewResponse> toReviewResponses(List<Review> reviews) {
        if (reviews.isEmpty()) {
            return List.of();
        }

        List<Long> reviewIds = reviews.stream().map(Review::getId).toList();
        Map<Long, List<String>> photoUrlsByReviewId = reviewPhotoRepository.findByReview_IdIn(reviewIds).stream()
                .collect(Collectors.groupingBy(
                        photo -> photo.getReview().getId(),
                        Collectors.mapping(ReviewPhoto::getPhotoUrl, Collectors.toList())
                ));

        List<Long> userIds = reviews.stream()
                .map(review -> review.getUser().getId())
                .distinct()
                .toList();
        Map<Long, String> userPhotoUrlByUserId = userPhotoRepository.findByUser_IdIn(userIds).stream()
                .collect(Collectors.toMap(
                        photo -> photo.getUser().getId(),
                        UserPhoto::getPhotoUrl,
                        (first, ignored) -> first
                ));

        return reviews.stream()
                .map(review -> new ReviewResponse(
                        review.getId(),
                        review.getPlace().getPlaceId(),
                        review.getUser().getId(),
                        UserDisplayNames.nickname(review.getUser()),
                        review.getUser().isDeleted()
                                ? null
                                : userPhotoUrlByUserId.get(review.getUser().getId()),
                        review.getContents(),
                        review.getRating(),
                        review.getLikeCount(),
                        photoUrlsByReviewId.getOrDefault(review.getId(), Collections.emptyList()),
                        review.getCreatedAt()
                ))
                .toList();
    }

    @Transactional
    public void createReview(long placeId, String token, CreateReviewRequest request) {
        User user = findUserByToken(token);
        Place place = findPlaceById(placeId);

        Review review = Review.builder()
                .contents(request.getContent())
                .rating(request.getRating())
                .place(place)
                .user(user)
                .build();

        review.markCreated(user.getId());
        reviewRepository.save(review);
        refreshPlaceReviewStats(place);
        applyReviewPreference(user, place, PlacePreferenceService.reviewWeightFromRating(request.getRating()));

        savePhotos(review, request.getImages(), user.getId());
    }

    @Transactional
    public void updateReview(long placeId, long reviewId, String token, UpdateReviewRequest request) {
        if (request.getContent() != null && request.getContent().isBlank()) {
            throw new IllegalArgumentException("내용은 공백일 수 없습니다.");
        }

        User user = findUserByToken(token);
        Review review = findOwnedReview(placeId, reviewId, user);

        double previousRating = review.getRating();
        review.update(request.getRating(), request.getContent());
        review.markUpdated(user.getId());
        refreshPlaceReviewStats(review.getPlace());
        applyReviewPreferenceDelta(
                user,
                review.getPlace(),
                previousRating,
                review.getRating()
        );

        deletePhotos(review, request.getDeleteImageIds());
        savePhotos(review, request.getImages(), user.getId());
    }

    @Transactional
    public void deleteReview(long placeId, long reviewId, String token) {
        User user = findUserByToken(token);
        Review review = findOwnedReview(placeId, reviewId, user);

        List<ReviewPhoto> photos = reviewPhotoRepository.findByReview_Id(review.getId());
        for (ReviewPhoto photo : photos) {
            imageStorageService.deleteByStoredPath(photo.getPhotoUrl());
        }
        reviewPhotoRepository.deleteByReview_Id(review.getId());
        reviewLikeRepository.deleteByReviewId(review.getId());
        Place place = review.getPlace();
        applyReviewPreference(user, place, -PlacePreferenceService.reviewWeightFromRating(review.getRating()));
        reviewRepository.delete(review);
        refreshPlaceReviewStats(place);
    }

    @Transactional
    public boolean toggleLike(long placeId, long reviewId, String token) {
        User user = findUserByToken(token);
        Review review = findReviewByPlace(placeId, reviewId);

        if (review.getUser().getId().equals(user.getId())) {
            throw new IllegalArgumentException("본인의 글에는 좋아요를 누르지 못합니다.");
        }

        return reviewLikeRepository.findByUserIdAndReviewId(user.getId(), review.getId())
                .map(existing -> {
                    reviewLikeRepository.delete(existing);
                    review.decreaseLike();
                    return false;
                })
                .orElseGet(() -> {
                    ReviewLike reviewLike = ReviewLike.builder()
                            .user(user)
                            .review(review)
                            .build();
                    reviewLike.markCreated(user.getId());
                    reviewLikeRepository.save(reviewLike);
                    review.increaseLike();
                    return true;
                });
    }

    private Review findReviewByPlace(long placeId, long reviewId) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new IllegalArgumentException("리뷰를 찾을 수 없습니다."));

        if (!review.getPlace().getPlaceId().equals(placeId)) {
            throw new IllegalArgumentException("해당 장소의 리뷰가 아닙니다.");
        }
        return review;
    }

    private Review findOwnedReview(long placeId, long reviewId, User user) {
        Review review = findReviewByPlace(placeId, reviewId);
        if (!review.getUser().getId().equals(user.getId())) {
            throw new IllegalArgumentException("본인이 작성한 리뷰만 처리할 수 있습니다.");
        }
        return review;
    }

    private void savePhotos(Review review, List<MultipartFile> images, Long userId) {
        if (images == null || images.isEmpty()) {
            return;
        }

        for (MultipartFile image : images) {
            if (image == null || image.isEmpty()) {
                continue;
            }

            String storedPath = imageStorageService.store(image, ImageFolder.REVIEW);
            ReviewPhoto photo = ReviewPhoto.builder()
                    .photoUrl(storedPath)
                    .review(review)
                    .build();
            photo.markCreated(userId);
            reviewPhotoRepository.save(photo);
        }
    }

    private void deletePhotos(Review review, List<Long> deleteImageIds) {
        if (deleteImageIds == null || deleteImageIds.isEmpty()) {
            return;
        }

        List<ReviewPhoto> photos = reviewPhotoRepository.findAllById(deleteImageIds);
        if (photos.size() != deleteImageIds.size()) {
            throw new IllegalArgumentException("삭제할 사진을 찾을 수 없습니다.");
        }

        for (ReviewPhoto photo : photos) {
            if (!photo.getReview().getId().equals(review.getId())) {
                throw new IllegalArgumentException("해당 리뷰의 사진이 아닙니다.");
            }
            imageStorageService.deleteByStoredPath(photo.getPhotoUrl());
        }

        reviewPhotoRepository.deleteAll(photos);
    }

    private void applyReviewPreference(User user, Place place, int weight) {
        placePreferenceService.increase(user, place, weight);
    }

    private void applyReviewPreferenceDelta(User user, Place place, double previousRating, double newRating) {
        int delta = PlacePreferenceService.reviewWeightFromRating(newRating)
                - PlacePreferenceService.reviewWeightFromRating(previousRating);
        applyReviewPreference(user, place, delta);
    }

    private void refreshPlaceReviewStats(Place place) {
        reviewRepository.flush();
        RatingSummary stats = reviewRepository.findStatsByPlaceId(place.getPlaceId());
        double avgRating = stats == null || stats.getAvgRating() == null ? 0.0 : stats.getAvgRating();
        int reviewCount = stats == null || stats.getReviewCount() == null ? 0 : stats.getReviewCount().intValue();
        place.updateReviewStats(avgRating, reviewCount);
    }

    private Place findPlaceById(long placeId) {
        return placeRepository.findById(placeId)
                .orElseThrow(() -> new IllegalArgumentException("해당 장소가 존재하지 않습니다."));
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

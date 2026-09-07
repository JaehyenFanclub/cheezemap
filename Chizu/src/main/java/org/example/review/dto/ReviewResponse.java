package org.example.review.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import java.util.List;

@Schema(description = "리뷰 목록 항목 응답")
public record ReviewResponse(
        @Schema(description = "리뷰 ID", example = "1")
        Long reviewId,

        @Schema(description = "장소 ID", example = "1")
        Long placeId,

        @Schema(description = "작성자 ID", example = "1")
        Long userId,

        @Schema(description = "작성자 닉네임", example = "길동이")
        String userNickname,

        @Schema(description = "작성자 프로필 사진 URL (없으면 null)", example = "/uploads/user/xxx.jpg")
        String userPhotoUrl,

        @Schema(description = "리뷰 내용", example = "치즈가 맛있어요.")
        String content,

        @Schema(description = "별점", example = "4.5")
        Double rating,

        @Schema(description = "좋아요 수", example = "3")
        int likeCount,

        @Schema(description = "리뷰 사진 URL 목록")
        List<String> photoUrls,

        @Schema(description = "리뷰 사진 ID 목록 (photoUrls와 동일한 순서)")
        List<Long> photoIds,

        @Schema(description = "작성 시각")
        LocalDateTime createdAt
) {
}

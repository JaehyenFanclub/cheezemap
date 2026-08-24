package org.example.review.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.enums.ParameterIn;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.beans.PropertyEditorSupport;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.example.common.dto.MsgResponse;
import org.example.config.JwtAuthenticationFilter;
import org.example.review.dto.CreateReviewRequest;
import org.example.review.dto.ReviewResponse;
import org.example.review.dto.UpdateReviewRequest;
import org.example.review.service.ReviewService;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.WebDataBinder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.InitBinder;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/place/{placeId}/review")
@RequiredArgsConstructor
@Tag(name = "Review", description = "리뷰 API")
public class ReviewController {

    private final ReviewService reviewService;

    @InitBinder
    public void initBinder(WebDataBinder binder) {
        binder.registerCustomEditor(MultipartFile.class, new PropertyEditorSupport() {
            @Override
            public void setAsText(String text) {
                setValue(null);
            }
        });
    }

    @Operation(
            summary = "리뷰 목록 조회",
            description = "해당 장소에 등록된 리뷰 목록을 최신순으로 반환합니다.",
            parameters = {
                    @Parameter(
                            name = "placeId",
                            description = "장소 ID",
                            required = true,
                            in = ParameterIn.PATH,
                            schema = @Schema(type = "integer", format = "int64")
                    )
            },
            responses = {
                    @ApiResponse(
                            responseCode = "200",
                            description = "리뷰 목록 조회 성공",
                            content = @Content(schema = @Schema(implementation = ReviewResponse.class))
                    ),
                    @ApiResponse(
                            responseCode = "400",
                            description = "장소를 찾을 수 없음",
                            content = @Content(schema = @Schema(implementation = MsgResponse.class))
                    )
            }
    )
    @GetMapping
    public List<ReviewResponse> getReviews(@PathVariable("placeId") long placeId) {
        return reviewService.getReviews(placeId);
    }

    @Operation(
            summary = "리뷰 생성",
            description = "장소에 대한 리뷰를 등록합니다. multipart/form-data로 전송하며 images 파일 필드로 사진을 업로드할 수 있습니다.",
            parameters = {
                    @Parameter(
                            name = "placeId",
                            description = "장소 ID",
                            required = true,
                            in = ParameterIn.PATH,
                            schema = @Schema(type = "integer", format = "int64")
                    ),
                    @Parameter(
                            name = JwtAuthenticationFilter.TOKEN_HEADER,
                            description = "jwt 토큰",
                            required = true,
                            in = ParameterIn.HEADER,
                            schema = @Schema(type = "string")
                    )
            },
            requestBody = @io.swagger.v3.oas.annotations.parameters.RequestBody(
                    required = true,
                    content = @Content(
                            mediaType = MediaType.MULTIPART_FORM_DATA_VALUE,
                            schema = @Schema(implementation = CreateReviewRequest.class)
                    )
            ),
            responses = {
                    @ApiResponse(
                            responseCode = "201",
                            description = "리뷰 생성 성공",
                            content = @Content(schema = @Schema(implementation = MsgResponse.class))
                    ),
                    @ApiResponse(
                            responseCode = "400",
                            description = "요청 값 검증 실패 또는 토큰 오류",
                            content = @Content(schema = @Schema(implementation = MsgResponse.class))
                    )
            }
    )
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public MsgResponse createReview(
            @PathVariable("placeId") long placeId,
            @RequestHeader(JwtAuthenticationFilter.TOKEN_HEADER) String token,
            @Valid @ModelAttribute CreateReviewRequest request
    ) {
        reviewService.createReview(placeId, token, request);
        return new MsgResponse("리뷰가 등록되었습니다.", "201");
    }

    @Operation(
            summary = "리뷰 수정",
            description = "장소에 등록된 리뷰를 수정합니다. multipart/form-data로 전송하며 images로 사진을 추가하고 deleteImageIds로 삭제할 수 있습니다.",
            parameters = {
                    @Parameter(
                            name = "placeId",
                            description = "장소 ID",
                            required = true,
                            in = ParameterIn.PATH,
                            schema = @Schema(type = "integer", format = "int64")
                    ),
                    @Parameter(
                            name = "reviewId",
                            description = "리뷰 ID",
                            required = true,
                            in = ParameterIn.PATH,
                            schema = @Schema(type = "integer", format = "int64")
                    ),
                    @Parameter(
                            name = JwtAuthenticationFilter.TOKEN_HEADER,
                            description = "jwt 토큰",
                            required = true,
                            in = ParameterIn.HEADER,
                            schema = @Schema(type = "string")
                    )
            },
            requestBody = @io.swagger.v3.oas.annotations.parameters.RequestBody(
                    required = true,
                    content = @Content(
                            mediaType = MediaType.MULTIPART_FORM_DATA_VALUE,
                            schema = @Schema(implementation = UpdateReviewRequest.class)
                    )
            ),
            responses = {
                    @ApiResponse(
                            responseCode = "200",
                            description = "리뷰 수정 성공",
                            content = @Content(schema = @Schema(implementation = MsgResponse.class))
                    ),
                    @ApiResponse(
                            responseCode = "400",
                            description = "요청 값 검증 실패 또는 토큰 오류",
                            content = @Content(schema = @Schema(implementation = MsgResponse.class))
                    )
            }
    )
    @PutMapping(value = "/{reviewId}/edit", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public MsgResponse updateReview(
            @PathVariable("placeId") long placeId,
            @PathVariable("reviewId") long reviewId,
            @RequestHeader(JwtAuthenticationFilter.TOKEN_HEADER) String token,
            @Valid @ModelAttribute UpdateReviewRequest request
    ) {
        reviewService.updateReview(placeId, reviewId, token, request);
        return new MsgResponse("리뷰가 수정되었습니다.", "200");
    }

    @Operation(
            summary = "리뷰 삭제",
            description = "장소에 등록된 리뷰를 삭제합니다.",
            parameters = {
                    @Parameter(
                            name = "placeId",
                            description = "장소 ID",
                            required = true,
                            in = ParameterIn.PATH,
                            schema = @Schema(type = "integer", format = "int64")
                    ),
                    @Parameter(
                            name = "reviewId",
                            description = "리뷰 ID",
                            required = true,
                            in = ParameterIn.PATH,
                            schema = @Schema(type = "integer", format = "int64")
                    ),
                    @Parameter(
                            name = JwtAuthenticationFilter.TOKEN_HEADER,
                            description = "jwt 토큰",
                            required = true,
                            in = ParameterIn.HEADER,
                            schema = @Schema(type = "string")
                    )
            },
            responses = {
                    @ApiResponse(
                            responseCode = "200",
                            description = "리뷰 삭제 성공",
                            content = @Content(schema = @Schema(implementation = MsgResponse.class))
                    ),
                    @ApiResponse(
                            responseCode = "400",
                            description = "요청 값 검증 실패 또는 토큰 오류",
                            content = @Content(schema = @Schema(implementation = MsgResponse.class))
                    )
            }
    )
    @DeleteMapping("/{reviewId}/delete")
    public MsgResponse deleteReview(
            @PathVariable("placeId") long placeId,
            @PathVariable("reviewId") long reviewId,
            @RequestHeader(JwtAuthenticationFilter.TOKEN_HEADER) String token
    ) {
        reviewService.deleteReview(placeId, reviewId, token);
        return new MsgResponse("리뷰가 삭제되었습니다.", "200");
    }

    @Operation(
            summary = "리뷰 좋아요 토글",
            description = "리뷰에 좋아요가 없으면 등록하고, 이미 있으면 취소합니다.",
            parameters = {
                    @Parameter(
                            name = "placeId",
                            description = "장소 ID",
                            required = true,
                            in = ParameterIn.PATH,
                            schema = @Schema(type = "integer", format = "int64")
                    ),
                    @Parameter(
                            name = "reviewId",
                            description = "리뷰 ID",
                            required = true,
                            in = ParameterIn.PATH,
                            schema = @Schema(type = "integer", format = "int64")
                    ),
                    @Parameter(
                            name = JwtAuthenticationFilter.TOKEN_HEADER,
                            description = "jwt 토큰",
                            required = true,
                            in = ParameterIn.HEADER,
                            schema = @Schema(type = "string")
                    )
            },
            responses = {
                    @ApiResponse(
                            responseCode = "200",
                            description = "좋아요 등록 또는 취소 성공",
                            content = @Content(schema = @Schema(implementation = MsgResponse.class))
                    ),
                    @ApiResponse(
                            responseCode = "400",
                            description = "요청 값 검증 실패 또는 토큰 오류",
                            content = @Content(schema = @Schema(implementation = MsgResponse.class))
                    )
            }
    )
    @PostMapping("/{reviewId}/like")
    public MsgResponse likeReview(
            @PathVariable("placeId") long placeId,
            @PathVariable("reviewId") long reviewId,
            @RequestHeader(JwtAuthenticationFilter.TOKEN_HEADER) String token
    ) {
        boolean liked = reviewService.toggleLike(placeId, reviewId, token);
        if (liked) {
            return new MsgResponse("리뷰에 좋아요를 남겼습니다.", "200");
        }
        return new MsgResponse("리뷰 좋아요를 취소했습니다.", "200");
    }
}

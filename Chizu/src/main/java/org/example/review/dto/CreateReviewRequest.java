package org.example.review.dto;

import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import lombok.Getter;
import lombok.Setter;
import org.springframework.web.multipart.MultipartFile;

@Getter
@Setter
@Schema(description = "리뷰 생성 요청 (multipart/form-data)")
public class CreateReviewRequest {

    @NotNull(message = "별점은 필수입니다.")
    @DecimalMin(value = "0.0", message = "별점은 0 이상이어야 합니다.")
    @DecimalMax(value = "5.0", message = "별점은 5 이하여야 합니다.")
    @Schema(description = "별점", example = "4.5")
    private Double rating;

    @NotBlank(message = "내용은 필수입니다.")
    @Schema(description = "내용", example = "치즈가 맛있어요.")
    private String content;

    @ArraySchema(schema = @Schema(type = "string", format = "binary"))
    @Schema(description = "업로드할 리뷰 사진 파일 목록")
    private List<MultipartFile> images;
}

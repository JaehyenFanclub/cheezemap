package org.example.translate.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@Schema(description = "리뷰 번역 요청")
public class TranslateRequest {

    @NotBlank(message = "번역할 텍스트는 필수입니다.")
    @Schema(description = "번역할 원문", example = "치즈가 맛있어요.")
    private String text;

    @NotBlank(message = "목표 언어는 필수입니다.")
    @Schema(description = "목표 언어 코드 (ko, ja, en)", example = "en")
    private String targetLanguage;
}

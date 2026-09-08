package org.example.translate.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "리뷰 번역 응답")
public record TranslateResponse(
        @Schema(description = "번역된 텍스트", example = "It's delicious.")
        String translatedText,

        @Schema(description = "감지된 원문 언어 코드", example = "ko")
        String detectedSourceLanguage,

        @Schema(description = "목표 언어 코드", example = "en")
        String targetLanguage
) {
}

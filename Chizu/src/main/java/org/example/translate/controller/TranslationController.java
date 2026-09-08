package org.example.translate.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.common.dto.MsgResponse;
import org.example.translate.dto.TranslateRequest;
import org.example.translate.dto.TranslateResponse;
import org.example.translate.service.TranslationService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/translate")
@RequiredArgsConstructor
@Tag(name = "Translate", description = "리뷰 번역 API")
public class TranslationController {

    private final TranslationService translationService;

    @Operation(
            summary = "텍스트 번역",
            description = "Google Cloud Translation API로 텍스트를 목표 언어(ko, ja, en)로 번역합니다.",
            responses = {
                    @ApiResponse(
                            responseCode = "200",
                            description = "번역 성공",
                            content = @Content(schema = @Schema(implementation = TranslateResponse.class))
                    ),
                    @ApiResponse(
                            responseCode = "400",
                            description = "요청 값 검증 실패 또는 번역 API 오류",
                            content = @Content(schema = @Schema(implementation = MsgResponse.class))
                    )
            }
    )
    @PostMapping
    public TranslateResponse translate(@Valid @RequestBody TranslateRequest request) {
        return translationService.translate(
                request.getText(),
                request.getTargetLanguage()
        );
    }
}

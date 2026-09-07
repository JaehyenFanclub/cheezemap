package org.example.message.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

@Schema(description = "메시지 수정 요청")
public record UpdateMessage(
        @Schema(description = "메시지 내용 수정", example = "수정")
        @NotBlank(message = "수정 내용이 비어있으면 안 됩니다.")
        String content
) {
}

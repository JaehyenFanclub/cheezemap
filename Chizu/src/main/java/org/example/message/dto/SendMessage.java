package org.example.message.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

@Schema(description = "메시지 송신 요청")
public record SendMessage(
        @Schema(description = "송신 내용")
        @NotBlank
        String content
) {
}

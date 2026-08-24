package org.example.message.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

@Schema(description = "대화 상대 조회 요청 응답")
public record GetChatterResponse(
        @Schema(description = "대화 상대 목록", example = "[1, 2, 3]")
        String Chatter,

        @Schema(description = "마지막 대화 내용", example = "마지막 대화")
        String content,

        @Schema(description = "마지막 대화 시각", example = "2026-08-10 19:50:30")
        @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd HH:mm:ss")
        LocalDateTime lastMessage,

        @Schema(description = "대화 상대 id", example="1")
        Long userId
) {
}

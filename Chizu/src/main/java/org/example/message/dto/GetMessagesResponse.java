package org.example.message.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

@Schema(description = "송신자와 수신자의 메시지를 조회해서 리스트의 형태로 반환함")
public record GetMessagesResponse(
        @Schema(description = "메시지 id", example = "1")
        Long messageId,

        @Schema(description = "메시지가 생성된 시각", example = "2026-08-05 19:50:30")
        @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd HH:mm:ss")
        LocalDateTime messageDate,

        @Schema(description = "메시지 내용", example = "안녕하세요")
        String content,

        @Schema(description = "수정되었는지 여부", example = "false")
        Boolean isEdited,

        @Schema(description = "누가 보냈는지", example = "true")
        Boolean whoSend
) {
}

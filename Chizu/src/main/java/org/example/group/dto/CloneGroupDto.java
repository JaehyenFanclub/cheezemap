package org.example.group.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

@Schema(description = "그룹 복제 요청")
public record CloneGroupDto(
        @Schema(description = "복제 요청 시간", example = "2026-08-03 11:40:30")
        @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd HH:mm:ss")
        LocalDateTime groupDate,

        @Schema(description = "메모된 내용", example = "내용")
        String groupMemo,

        @Schema(description = "그룹의 이름", example = "이름")
        String groupName
) {
}

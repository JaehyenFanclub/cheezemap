package org.example.group.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;

@Schema(description = "수정 요청 dto")
public record EditGroupDto(
        @Schema(description = "수정 요청 시간", example = "2026-08-05 19:50:30")
        @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd HH:mm:ss")
        @NotNull(message = "수정 시각은 필수입니다.")
        LocalDateTime groupDate,

        @Schema(description = "메모된 내용", example = "수정시 대상이 가지고 있던 내용")
        String groupMemo,

        @Schema(description = "그룹의 이름", example = "수정시 대상이 가지고 있던 이름")
        @NotBlank(message = "그룹 이름은 필수입니다.")
        String groupName
) {
}

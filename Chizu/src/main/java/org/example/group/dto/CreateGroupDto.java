package org.example.group.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;

@Schema(description = "그룹 생성 dto")
public record CreateGroupDto(
    @Schema(description = "그룹 생성 시간", example = "2026-08-03 11:40:30")
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd HH:mm:ss")
    @NotNull(message = "생성시각은 필수입니다.")
    LocalDateTime groupDate,
    
    @Schema(description = "그룹 메모", example = "별점 3이상 모음")
    String groupMemo,

    @Schema(description = "그룹 이름", example = "오사카 라멘집 이름")
    @NotBlank(message = "그룹 이름은 필수입니다.")
    String groupName
){

}
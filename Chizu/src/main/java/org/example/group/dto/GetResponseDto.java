package org.example.group.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;
import java.util.List;

@Schema(description = "조회 요청 응답")
public record GetResponseDto(
        @Schema(description = "그룹 생성 시간", example = "2026-08-03 11:40:30")
        @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd HH:mm:ss")
        LocalDateTime groupDate,

        @Schema(description = "그룹 메모", example = "별점 3이상 모음")
        String groupMemo,

        @Schema(description = "그룹 이름", example = "오사카 라멘집 이름")
        String groupName,

        @Schema(description = "생성한 유저ID", example = "111")
        List<Long> placeId
) {

}

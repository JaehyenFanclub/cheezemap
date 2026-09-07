package org.example.group.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;
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

        @JsonProperty("placeIds")
        @Schema(description = "그룹에 저장된 장소 ID 목록", example = "[11, 12]")
        List<Long> placeId,

        @Schema(description = "공유 링크를 통해 다른 사용자가 이 그룹을 저장한 횟수", example = "3")
        Long cloneCount
) {

}

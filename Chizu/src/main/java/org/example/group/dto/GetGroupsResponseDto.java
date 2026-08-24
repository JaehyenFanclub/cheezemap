package org.example.group.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;


public record GetGroupsResponseDto(
        @Schema(description = "그룹ID의 리스트를 반환합니다", example = "[]")
        List<Long> groups
) {

}
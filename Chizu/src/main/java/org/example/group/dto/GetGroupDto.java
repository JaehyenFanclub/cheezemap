package org.example.group.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "그룹 조회 dto")
public record GetGroupDto(
        @Schema(description = "조회하려는 그룹 ID", example = "13")
        Long groupId
) {

}

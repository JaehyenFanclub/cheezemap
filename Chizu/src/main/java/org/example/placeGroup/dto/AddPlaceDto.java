package org.example.placeGroup.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

@Schema(description = "그룹에 장소 추가 dto")
public record AddPlaceDto(
        @Schema(description = "장소ID", example = "11")
        @NotNull(message = "추가하려는 장소의 ID는 필수입니다.")
        Long placeId,

        @Schema(description = "그룹ID", example = "111")
        @NotNull(message = "추가하려는 대상의 그룹ID는 필수입니다.")
        Long groupId
) {
}

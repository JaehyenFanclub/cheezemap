package org.example.group.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "그룹 생성 응답")
public record CreateResponseDto(
        @Schema(description = "결과 메시지", example = "그룹 생성 완료")
        String message,

        @Schema(description = "상태 코드", example = "201")
        String stat,

        @Schema(description = "생성된 그룹 id", example = "1")
        Long groupId
) {
}

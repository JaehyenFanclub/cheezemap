package org.example.group.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "그룹 생성 dto")
public record ShareResponseDto(
        @Schema(description = "결과 메세지", example = "groupID의 공유가 성공했습니다!")
        String message,

        @Schema(description = "그룹 이름", example = "/groupID")
        String url
){

}
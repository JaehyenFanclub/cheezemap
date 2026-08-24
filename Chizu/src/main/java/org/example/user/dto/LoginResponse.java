package org.example.user.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "로그인 응답")
public record LoginResponse(
        @Schema(description = "결과 메시지", example = "로그인에 성공했습니다.")
        String msg,

        @Schema(description = "상태 코드", example = "200")
        String status,

        @Schema(description = "로그인 토큰", example = "eyJhbGciOiJIUzI1NiJ9...")
        String token
) {
}

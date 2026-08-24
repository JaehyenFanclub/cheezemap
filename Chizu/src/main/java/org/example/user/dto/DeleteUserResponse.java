package org.example.user.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "유저 삭제 응답")
public record DeleteUserResponse(
        @Schema(description = "결과 메시지", example = "회원 탈퇴가 완료되었습니다.")
        String msg,

        @Schema(description = "상태코드", example = "200")
        String stat
) {
}

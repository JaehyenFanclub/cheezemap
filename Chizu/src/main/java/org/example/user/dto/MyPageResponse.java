package org.example.user.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDate;

@Schema(description = "마이페이지 응답")
public record MyPageResponse(
        @Schema(description = "이메일", example = "hong@example.com")
        String userEmail,

        @Schema(description = "유저 이름", example = "홍길동")
        String userName,

        @Schema(description = "유저 닉네임", example = "길동이")
        String userNickname,

        @Schema(description = "전화번호", example = "01012345678")
        String userPhone,

        @Schema(description = "생년월일", example = "1990-01-01")
        LocalDate birth,

        @Schema(description = "성별", example = "true")
        @JsonProperty("SEX")
        Boolean sex,

        @Schema(description = "프로필 사진 경로 (null이면 기본 이미지 사용)", example = "/userImg/uuid.jpg")
        String photoUrl
) {
}

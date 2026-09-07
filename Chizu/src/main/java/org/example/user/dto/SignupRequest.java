package org.example.user.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

@Schema(description = "회원가입 요청")
public record SignupRequest(
        @Schema(description = "유저 이름", example = "홍길동")
        @NotBlank(message = "유저 이름은 필수입니다.")
        String userName,

        @Schema(description = "유저 닉네임", example = "길동이")
        @NotBlank(message = "유저 닉네임은 필수입니다.")
        String userNickname,

        @Schema(description = "유저 비밀번호", example = "password123")
        @NotBlank(message = "비밀번호는 필수입니다.")
        String password,

        @Schema(description = "이메일", example = "hong@example.com")
        @NotBlank(message = "이메일은 필수입니다.")
        @Email(message = "이메일 형식이 올바르지 않습니다.")
        String email,

        @Schema(description = "전화번호", example = "01012345678")
        @NotBlank(message = "전화번호는 필수입니다.")
        String phone,

        @Schema(description = "생년월일", example = "1990-01-01")
        @NotNull(message = "생년월일은 필수입니다.")
        LocalDate birth,

        @Schema(description = "성별", example = "true")
        @JsonProperty("SEX")
        Boolean sex,

        @Schema(description = "관리자 권한 여부", example = "false")
        @NotNull(message = "권한 여부는 필수입니다.")
        Boolean isAdmin
) {
}

package org.example.user.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDate;
import org.springframework.web.multipart.MultipartFile;

@Getter
@Setter
@Schema(description = "마이페이지 수정 요청 (multipart/form-data)")
public class MyPageEditRequest {

    @Schema(description = "변경할 유저 닉네임", example = "새로운닉네임")
    private String userNickname;

    @Schema(description = "변경할 전화번호", example = "01099998888")
    private String userPhone;

    @Schema(description = "변경할 이름", example = "홍길동")
    private String userName;

    @Schema(description = "생년월일 (기존 값이 없을 때만 설정 가능)", example = "2000-01-01")
    private LocalDate birth;

    @Schema(description = "현재 비밀번호 (비밀번호 변경 시에만 전달)", example = "password123")
    private String currentPassword;

    @Schema(description = "변경할 비밀번호 (비밀번호 변경 시에만 전달)", example = "newPassword123")
    private String newPassword;

    @Schema(description = "변경할 비밀번호 확인 (비밀번호 변경 시에만 전달)", example = "newPassword123")
    private String newPasswordConfirm;

    @Schema(description = "프로필 사진 파일", type = "string", format = "binary")
    private MultipartFile photo;
}

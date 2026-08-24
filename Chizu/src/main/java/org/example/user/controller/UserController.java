package org.example.user.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.enums.ParameterIn;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.common.dto.MsgResponse;
import org.example.config.JwtAuthenticationFilter;
import org.example.user.dto.*;
import org.example.user.service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/user")
@RequiredArgsConstructor
@Tag(name = "User", description = "유저 API")
public class UserController {

    private final UserService userService;

    @Operation(
            summary = "회원가입",
            description = "새로운 유저를 등록합니다.",
            responses = {
                    @ApiResponse(
                            responseCode = "201",
                            description = "회원가입 성공",
                            content = @Content(schema = @Schema(implementation = MsgResponse.class))
                    ),
                    @ApiResponse(
                            responseCode = "400",
                            description = "요청 값 검증 실패 또는 중복 데이터",
                            content = @Content(schema = @Schema(implementation = MsgResponse.class))
                    )
            }
    )
    @PostMapping("/signup")
    @ResponseStatus(HttpStatus.CREATED)
    public MsgResponse signup(@Valid @RequestBody SignupRequest request) {
        userService.signup(request);
        return new MsgResponse("회원가입이 완료되었습니다.", "201");
    }

    @Operation(
            summary = "로그인",
            description = "이메일과 비밀번호로 로그인하고 토큰을 발급합니다.",
            responses = {
                    @ApiResponse(
                            responseCode = "200",
                            description = "로그인 성공",
                            content = @Content(schema = @Schema(implementation = LoginResponse.class))
                    ),
                    @ApiResponse(
                            responseCode = "400",
                            description = "요청 값 검증 실패 또는 인증 실패",
                            content = @Content(schema = @Schema(implementation = MsgResponse.class))
                    )
            }
    )
    @PostMapping("/auth/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest request) {
        return userService.login(request);
    }

    @Operation(
            summary = "로그아웃",
            description = "JWT 토큰을 무효화하여 로그아웃합니다.",
            parameters = {
                    @Parameter(
                            name = JwtAuthenticationFilter.TOKEN_HEADER,
                            description = "jwt 토큰",
                            required = true,
                            in = ParameterIn.HEADER,
                            schema = @Schema(type = "string")
                    )
            },
            responses = {
                    @ApiResponse(
                            responseCode = "200",
                            description = "로그아웃 성공",
                            content = @Content(schema = @Schema(implementation = MsgResponse.class))
                    ),
                    @ApiResponse(
                            responseCode = "400",
                            description = "토큰이 없거나 유효하지 않음",
                            content = @Content(schema = @Schema(implementation = MsgResponse.class))
                    ),
                    @ApiResponse(
                            responseCode = "401",
                            description = "인증 실패"
                    )
            }
    )
    @PostMapping("/auth/logout")
    public MsgResponse logout(
            @RequestHeader(JwtAuthenticationFilter.TOKEN_HEADER) String token){
        userService.logout(token);
        return new MsgResponse("로그아웃이 완료되었습니다.", "200");
    }

    @Operation(
            summary = "마이페이지",
            description = "JWT 토큰으로 로그인한 유저의 마이페이지 정보를 조회합니다. 프로필 사진이 없으면 photoUrl은 null이며 기본 이미지를 사용합니다.",
            parameters = {
                    @Parameter(
                            name = JwtAuthenticationFilter.TOKEN_HEADER,
                            description = "jwt 토큰",
                            required = true,
                            in = ParameterIn.HEADER,
                            schema = @Schema(type = "string")
                    )
            },
            responses = {
                    @ApiResponse(
                            responseCode = "200",
                            description = "조회 성공",
                            content = @Content(schema = @Schema(implementation = MyPageResponse.class))
                    ),
                    @ApiResponse(
                            responseCode = "400",
                            description = "토큰이 없거나 유효하지 않음",
                            content = @Content(schema = @Schema(implementation = MsgResponse.class))
                    ),
                    @ApiResponse(
                            responseCode = "401",
                            description = "인증 실패"
                    )
            }
    )
    @GetMapping("/mypage")
    public MyPageResponse myPage(
            @RequestHeader(JwtAuthenticationFilter.TOKEN_HEADER) String token) {
        return userService.mypage(token);
    }

    @Operation(
            summary = "마이페이지 수정",
            description = "JWT 토큰으로 로그인한 유저의 닉네임, 전화번호, 이름, 프로필 사진을 수정합니다. multipart/form-data로 전송하며, photo 파일 필드를 전달하면 프로필 사진을 저장합니다.",
            parameters = {
                    @Parameter(
                            name = JwtAuthenticationFilter.TOKEN_HEADER,
                            description = "jwt 토큰",
                            required = true,
                            in = ParameterIn.HEADER,
                            schema = @Schema(type = "string")
                    )
            },
            requestBody = @io.swagger.v3.oas.annotations.parameters.RequestBody(
                    required = true,
                    content = @Content(
                            mediaType = MediaType.MULTIPART_FORM_DATA_VALUE,
                            schema = @Schema(implementation = MyPageEditRequest.class)
                    )
            ),
            responses = {
                    @ApiResponse(
                            responseCode = "200",
                            description = "수정 성공",
                            content = @Content(schema = @Schema(implementation = MsgResponse.class))
                    ),
                    @ApiResponse(
                            responseCode = "400",
                            description = "토큰이 없거나 유효하지 않음, 입력값 검증 실패",
                            content = @Content(schema = @Schema(implementation = MsgResponse.class))
                    ),
                    @ApiResponse(
                            responseCode = "401",
                            description = "인증 실패"
                    )
            }
    )
    @PutMapping(value = "/mypage/edit", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public MsgResponse editMyPage(
            @RequestHeader(JwtAuthenticationFilter.TOKEN_HEADER) String token,
            @ModelAttribute MyPageEditRequest request) {
        userService.editMyPage(token, request);
        return new MsgResponse("마이페이지 수정이 완료되었습니다.", "200");
    }

    @Operation(
            summary = "유저 삭제",
            description = "JWT 토큰으로 인증된 유저 계정을 삭제합니다.",
            parameters = {
                    @Parameter(
                            name = JwtAuthenticationFilter.TOKEN_HEADER,
                            description = "jwt 토큰",
                            required = true,
                            in = ParameterIn.HEADER,
                            schema = @Schema(type = "string")
                    )
            },
            responses = {
                    @ApiResponse(
                            responseCode = "200",
                            description = "삭제 성공",
                            content = @Content(schema = @Schema(implementation = DeleteUserResponse.class))
                    ),
                    @ApiResponse(
                            responseCode = "400",
                            description = "토큰이 없거나 유효하지 않음",
                            content = @Content(schema = @Schema(implementation = MsgResponse.class))
                    ),
                    @ApiResponse(
                            responseCode = "401",
                            description = "인증 실패"
                    )
            }
    )
    @DeleteMapping("/delete")
    public DeleteUserResponse deleteUser(
            @RequestHeader(JwtAuthenticationFilter.TOKEN_HEADER) String token) {
        userService.deleteUser(token);
        return new DeleteUserResponse("회원 탈퇴가 완료되었습니다.", "200");
    }
}

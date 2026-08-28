package org.example.auth.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "소셜 로그인 제공자 정보")
public record OAuthProviderResponse(
        @Schema(description = "제공자 ID", example = "google")
        String id,

        @Schema(description = "제공자 표시 이름", example = "Google")
        String name,

        @Schema(description = "OAuth2 인증 시작 URL", example = "/oauth2/authorization/google")
        String authorizationUrl
) {
}

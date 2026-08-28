package org.example.auth;

import jakarta.servlet.http.HttpServletRequest;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import org.springframework.util.StringUtils;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;
import org.springframework.web.util.UriComponentsBuilder;

final class OAuth2RedirectSupport {

    private OAuth2RedirectSupport() {
    }

    static String resolveRedirectUri(HttpServletRequest request, String configuredUri) {
        if (StringUtils.hasText(configuredUri)) {
            return configuredUri;
        }

        return ServletUriComponentsBuilder
                .fromContextPath(request)
                .path("/")
                .build()
                .toUriString();
    }

    static String buildRedirectUri(
            HttpServletRequest request,
            String configuredUri,
            String queryParamName,
            String queryParamValue
    ) {
        return UriComponentsBuilder
                .fromUriString(resolveRedirectUri(request, configuredUri))
                .queryParam(queryParamName, queryParamValue)
                .build(true)
                .toUriString();
    }

    static String encodeOAuthError(String message) {
        String resolved = message != null && !message.isBlank()
                ? message
                : "소셜 로그인에 실패했습니다.";
        return URLEncoder.encode(resolved, StandardCharsets.UTF_8);
    }

    static String extractRegistrationId(HttpServletRequest request) {
        String uri = request.getRequestURI();
        String prefix = "/login/oauth2/code/";
        if (uri.startsWith(prefix)) {
            return uri.substring(prefix.length());
        }
        throw new IllegalArgumentException("OAuth2 registrationId를 확인할 수 없습니다.");
    }
}

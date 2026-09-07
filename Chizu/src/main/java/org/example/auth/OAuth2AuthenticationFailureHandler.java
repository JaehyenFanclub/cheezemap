package org.example.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationFailureHandler;
import org.springframework.stereotype.Component;

@Component
public class OAuth2AuthenticationFailureHandler extends SimpleUrlAuthenticationFailureHandler {

    private final String failureRedirectUri;

    public OAuth2AuthenticationFailureHandler(
            @Value("${app.oauth2.failure-redirect-uri:/}") String failureRedirectUri
    ) {
        this.failureRedirectUri = failureRedirectUri;
    }

    @Override
    public void onAuthenticationFailure(
            HttpServletRequest request,
            HttpServletResponse response,
            AuthenticationException exception
    ) throws IOException {
        getRedirectStrategy().sendRedirect(
                request,
                response,
                OAuth2RedirectSupport.buildRedirectUri(
                        request,
                        failureRedirectUri,
                        "oauth_error",
                        OAuth2RedirectSupport.encodeOAuthError(exception.getMessage())
                )
        );
    }
}

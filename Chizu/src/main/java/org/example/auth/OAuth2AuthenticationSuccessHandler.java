package org.example.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;

import org.example.auth.service.SocialLoginService;
import org.example.user.dto.LoginResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

@Component
public class OAuth2AuthenticationSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final String successRedirectUri;
    private final String failureRedirectUri;
    private final SocialLoginService socialLoginService;

    public OAuth2AuthenticationSuccessHandler(
            @Value("${app.oauth2.success-redirect-uri:/}") String successRedirectUri,
            @Value("${app.oauth2.failure-redirect-uri:/}") String failureRedirectUri,
            SocialLoginService socialLoginService
    ) {
        this.successRedirectUri = successRedirectUri;
        this.failureRedirectUri = failureRedirectUri;
        this.socialLoginService = socialLoginService;
    }

    @Override
    public void onAuthenticationSuccess(
            HttpServletRequest request,
            HttpServletResponse response,
            Authentication authentication
    ) throws IOException {
        clearAuthenticationAttributes(request);

        try {
            String registrationId = OAuth2RedirectSupport.extractRegistrationId(request);
            LoginResponse loginResponse = socialLoginService.loginFromOAuth(authentication, registrationId);

            getRedirectStrategy().sendRedirect(
                    request,
                    response,
                    OAuth2RedirectSupport.buildRedirectUri(
                            request,
                            successRedirectUri,
                            "token",
                            loginResponse.token()
                    )
            );
        } catch (RuntimeException ex) {
            getRedirectStrategy().sendRedirect(
                    request,
                    response,
                    OAuth2RedirectSupport.buildRedirectUri(
                            request,
                            failureRedirectUri,
                            "oauth_error",
                            OAuth2RedirectSupport.encodeOAuthError(ex.getMessage())
                    )
            );
        }
    }
}

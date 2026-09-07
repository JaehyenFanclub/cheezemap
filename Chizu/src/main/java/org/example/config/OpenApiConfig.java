package org.example.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.info.Info;
import org.springframework.context.annotation.Configuration;

@Configuration
@OpenAPIDefinition(
        info = @Info(
                title = "Cheezemap API",
                version = "v1",
                description = "Cheezemap 유저 서비스 API 문서"
        )
)
public class OpenApiConfig {
}

package org.example.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addViewControllers(ViewControllerRegistry registry) {
        registry.addViewController("/").setViewName("forward:/html/index.html");
        registry.addViewController("/signup").setViewName("forward:/html/signup.html");
        registry.addViewController("/profile-edit").setViewName("forward:/html/profile-edit.html");
        registry.addViewController("/complete-profile").setViewName("forward:/html/complete-profile.html");
    }
}

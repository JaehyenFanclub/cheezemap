package org.example.config;

import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/public")
public class ClientConfigController {

    @Value("${google.api.key:}")
    private String googleApiKey;

    @GetMapping("/config")
    public Map<String, String> getClientConfig() {
        return Map.of(
                "googleMapsApiKey",
                googleApiKey == null ? "" : googleApiKey.trim()
        );
    }
}

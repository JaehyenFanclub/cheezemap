package org.example.autoPlace.DTO;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ExternalPhotoResponseDto {
    private String url;
    private String source;
    private String attribution;
    private String matchedName;

    public static ExternalPhotoResponseDto empty() {
        return ExternalPhotoResponseDto.builder()
                .url(null)
                .source("none")
                .attribution(null)
                .matchedName(null)
                .build();
    }
}

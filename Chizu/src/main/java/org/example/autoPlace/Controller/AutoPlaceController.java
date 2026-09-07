package org.example.autoPlace.Controller;


import lombok.RequiredArgsConstructor;
import org.example.autoPlace.DTO.AutoPlaceResponseDto;
import org.example.autoPlace.DTO.GooglePlaceResponseDTO;
import org.example.autoPlace.Service.AutoPlaceService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;

@RestController
@RequestMapping("/api/places")
@RequiredArgsConstructor
public class AutoPlaceController {

    private final AutoPlaceService autoPlaceService;

    @Value("${google.api.key}")
    private String googleApiKey;

    /**
     * Google Place ID 기반 장소 상세 정보 조회 및 저장
     */
    @GetMapping("/{placeId}")
    public ResponseEntity<AutoPlaceResponseDto> getPlace(@PathVariable("placeId") String placeId) {
        AutoPlaceResponseDto place = autoPlaceService.getOrFetchPlace(placeId);
        return ResponseEntity.ok(place);
    }

    /**
     * [선택사항] 신버전 Places API Photo Name 기반 이미지 리다이렉트
     * 서비스에서 photoUrls에 전체 Media URL을 담아주므로, 프론트에서 photoUrl을 직접 <img> 태그 src로 사용하는 것을 권장합니다.
     */
    @GetMapping("/photo")
    public ResponseEntity<Void> redirectToGooglePhoto(
            @RequestParam("photoName") String photoName,
            @RequestParam(defaultValue = "400") int maxHeight) {

        // 신버전 Places API (New) Media URL 구성
        String cleanPhotoName = photoName.trim();
        if (cleanPhotoName.startsWith("places/")) {
            // photoName이 이미 full name인 경우
        }

        String googlePhotoUrl = String.format(
                "https://places.googleapis.com/v1/%s/media?key=%s&maxHeightPx=%d",
                cleanPhotoName, googleApiKey, maxHeight
        );

        return ResponseEntity.status(HttpStatus.FOUND)
                .location(URI.create(googlePhotoUrl))
                .build();
    }
}
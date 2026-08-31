package org.example.place.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.enums.ParameterIn;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.RequiredArgsConstructor;
import org.example.config.JwtAuthenticationFilter;
import org.example.place.dto.PlaceLikeResponse;
import org.example.place.service.PlaceLikeService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/places")
@RequiredArgsConstructor
public class PlaceLikeController {

    private final PlaceLikeService placeLikeService;

    @Operation(
            summary = "장소 좋아요 토글 (등록 / 취소)",
            parameters = {
                    @Parameter(
                            name = JwtAuthenticationFilter.TOKEN_HEADER,
                            description = "JWT 토큰 (필수)",
                            required = true,
                            in = ParameterIn.HEADER,
                            schema = @Schema(type = "string")
                    )
            }
    )
    @PostMapping("/{placeId}/like")
    public ResponseEntity<?> toggleLike(
            @PathVariable("placeId") Long placeId,
            @RequestHeader(JwtAuthenticationFilter.TOKEN_HEADER) String token
    ) {
        PlaceLikeResponse response = placeLikeService.toggleLike(placeId, token);

        // 서비스에서 이미 좋아요가 등록되어 있어 취소(delete)된 경우 null 반환
        if (response == null) {
            return ResponseEntity.ok(Map.of(
                    "message", "장소 좋아요가 취소되었습니다.",
                    "isLiked", false
            ));
        }

        // 새로 좋아요가 등록된 경우
        return ResponseEntity.ok(Map.of(
                "message", "장소 좋아요가 등록되었습니다.",
                "isLiked", true,
                "data", response
        ));
    }
}
package org.example.place.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.enums.ParameterIn;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.RequiredArgsConstructor;
import org.example.config.JwtAuthenticationFilter;
import org.example.place.dto.PlaceResponse;
import org.example.place.dto.PlaceSavedResponse;
import org.example.place.service.PlaceSavedService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/places")
@RequiredArgsConstructor
public class PlaceSavedController {

    private final PlaceSavedService placeSavedService;

    @Operation(
            summary = "장소 저장 토글 (저장 / 취소)",
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
    @PostMapping("/{placeId}/save")
    public ResponseEntity<?> toggleSave(
            @PathVariable("placeId") Long placeId,
            @RequestHeader(JwtAuthenticationFilter.TOKEN_HEADER) String token
    ) {
        PlaceSavedResponse response = placeSavedService.toggleSave(placeId, token);

        // 저장 취소(삭제)된 경우
        if (response == null) {
            return ResponseEntity.ok(Map.of(
                    "message", "장소 저장이 취소되었습니다.",
                    "isSaved", false
            ));
        }

        // 저장 신규 등록된 경우
        return ResponseEntity.ok(Map.of(
                "message", "장소가 저장되었습니다.",
                "isSaved", true,
                "data", response
        ));
    }

    @Operation(
            summary = "내가 저장한 장소 목록 조회",
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
    @GetMapping("/me/saved")
    public ResponseEntity<List<PlaceResponse>> getMySavedPlaces(
            @RequestHeader(JwtAuthenticationFilter.TOKEN_HEADER) String token
    ) {
        List<PlaceResponse> response = placeSavedService.getMySavedPlaces(token);
        return ResponseEntity.ok(response);
    }
}

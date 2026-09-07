package org.example.place.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.enums.ParameterIn;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.RequiredArgsConstructor;
import org.example.common.enums.GenderGroup;
import org.example.config.JwtAuthenticationFilter;
import org.example.place.dto.PlaceCreateRequest;
import org.example.place.dto.PlaceRecommendResponse;
import org.example.place.dto.PlaceResponse;
import org.example.place.dto.PlaceUpdateRequest;
import org.example.place.service.PlaceRecommendService;
import org.example.place.service.PlaceService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/place")
@RequiredArgsConstructor
public class PlaceController {

    private final PlaceService placeService;
    private final PlaceRecommendService placeRecommendService;

    @Operation(
            summary = "주변 장소 추천",
            description = "현재 위치 반경 내 장소를 평점·리뷰 수·세그먼트 선호도로 정렬해 반환합니다. radius 단위는 미터입니다.",
            parameters = {
                    @Parameter(
                            name = JwtAuthenticationFilter.TOKEN_HEADER,
                            description = "jwt 토큰",
                            required = true,
                            in = ParameterIn.HEADER,
                            schema = @Schema(type = "string")
                    )
            }
    )
    @GetMapping("/recommend")
    public List<PlaceRecommendResponse> recommendPlaces(
            @RequestHeader(JwtAuthenticationFilter.TOKEN_HEADER) String token,
            @RequestParam double lat,
            @RequestParam double lng,
            @RequestParam double radius,
            @RequestParam(required = false) Integer limit
    ) {
        return placeRecommendService.recommend(token, lat, lng, radius, limit);
    }

    @Operation(
            summary = "성별 기반 주변 장소 추천",
            description = "현재 위치 반경 내 장소를 평점·리뷰 수·성별 선호도(hit_count 합산)로 정렬해 반환합니다. radius 단위는 미터입니다."
    )
    @GetMapping("/recommend/gender")
    public List<PlaceRecommendResponse> recommendByGender(
            @RequestParam("gender") GenderGroup gender,
            @RequestParam("lat") double lat,
            @RequestParam("lng") double lng,
            @RequestParam("radius") double radius,
            @RequestParam(value = "limit", required = false) Integer limit
    ) {
        return placeRecommendService.recommendByGender(gender, lat, lng, radius, limit);
    }

    @Operation(
            summary = "장소 등록")
    @PostMapping
    public ResponseEntity<PlaceResponse> createPlace(
            @RequestHeader(JwtAuthenticationFilter.TOKEN_HEADER) String token,
            @RequestBody PlaceCreateRequest request){

        PlaceResponse response = placeService.createPlace(request, token);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @Operation(
            summary = "장소 조회",
            parameters = {
                    @Parameter(
                            name = JwtAuthenticationFilter.TOKEN_HEADER,
                            description = "jwt 토큰 (선택)",
                            required = false,
                            in = ParameterIn.HEADER,
                            schema = @Schema(type = "string")
                    )
            }
    )
    @GetMapping("/{placeId}")
    public ResponseEntity<PlaceResponse> getPlace(
            @PathVariable("placeId") Long placeId,
            @RequestHeader(value = JwtAuthenticationFilter.TOKEN_HEADER, required = false) String token){
     PlaceResponse placeDTO = placeService.getPlace(placeId, token);
     return ResponseEntity.ok(placeDTO);
    }

    @Operation(
            summary = "장소 선호도 기록",
            description = "like(좋아요 2), save(저장 3) 가중치를 해당 사용자 연령/성별 세그먼트의 hit_count에 누적합니다. 단순 조회(view)는 선호도에 반영하지 않습니다.",
            parameters = {
                    @Parameter(
                            name = JwtAuthenticationFilter.TOKEN_HEADER,
                            description = "jwt 토큰",
                            required = true,
                            in = ParameterIn.HEADER,
                            schema = @Schema(type = "string")
                    )
            }
    )
    @PostMapping("/{placeId}/preference/{action}")
    public ResponseEntity<Void> recordPreference(
            @PathVariable("placeId") Long placeId,
            @PathVariable("action") String action,
            @RequestHeader(JwtAuthenticationFilter.TOKEN_HEADER) String token) {
        placeService.recordPreference(placeId, token, action);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "장소 수정")
    @PutMapping("/{placeId}")
    public ResponseEntity<PlaceResponse> updatePlace(
            @PathVariable("placeId") Long placeId,
            @RequestBody PlaceUpdateRequest updateDTO,
            @RequestHeader(JwtAuthenticationFilter.TOKEN_HEADER) String token) {

        PlaceResponse updatedPlace = placeService.updatePlace(placeId, updateDTO, token);
        return ResponseEntity.ok(updatedPlace);
    }

    @Operation(summary = "장소 삭제")
    @DeleteMapping("/{placeId}")
    public ResponseEntity<String> deletePlace(
            @PathVariable("placeId") Long placeId,
            @RequestHeader(JwtAuthenticationFilter.TOKEN_HEADER) String token) {

        placeService.deletePlace(placeId, token);
        return ResponseEntity.ok("장소 삭제 완료");
    }

}

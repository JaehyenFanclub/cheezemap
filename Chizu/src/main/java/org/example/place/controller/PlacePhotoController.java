package org.example.place.controller;


import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import org.example.config.JwtAuthenticationFilter;
import org.example.place.dto.PlacePhotoCreateRequest;
import org.example.place.dto.PlacePhotoResponse;
import org.example.place.service.PlacePhotoService;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/place/{placeId}/photo")
@RequiredArgsConstructor
public class PlacePhotoController {

    private final PlacePhotoService placePhotoService;

    @Operation(summary = "사진 등록")
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<PlacePhotoResponse> createPlacePhoto(
            @PathVariable("placeId") Long placeId,
            @RequestHeader(JwtAuthenticationFilter.TOKEN_HEADER) String token,
            @ModelAttribute PlacePhotoCreateRequest request) {

        PlacePhotoResponse response = placePhotoService.createPhoto(request, placeId, token);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);

    }

    @Operation(summary = "사진 조회")
    @GetMapping("/{photoId}")
    public ResponseEntity<PlacePhotoResponse> getPlacePhoto(@PathVariable("photoId") Long photoId){
        PlacePhotoResponse photoDTO = placePhotoService.getPhoto(photoId);
        return ResponseEntity.ok(photoDTO);
    }

    @Operation(summary = "사진 삭제")
    @DeleteMapping("/{photoId}")
    public ResponseEntity<String> deletePhoto(
            @PathVariable("photoId") Long photoId,
            @RequestHeader(JwtAuthenticationFilter.TOKEN_HEADER) String token){
        
        placePhotoService.deletePhoto(photoId, token);
        return ResponseEntity.ok("사진 삭제 완료");
    }


}

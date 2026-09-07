package org.example.menu.controller;


import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import org.example.config.JwtAuthenticationFilter;
import org.example.menu.dto.MenuPhotoCreateRequest;
import org.example.menu.dto.MenuPhotoResponse;
import org.example.menu.service.MenuPhotoService;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/place/{placeId}/menu/{menuId}/photo")
@RequiredArgsConstructor
public class MenuPhotoController {

    private final MenuPhotoService menuPhotoService;

    @Operation(summary = "사진 등록")
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<MenuPhotoResponse> createMenuPhoto(
            @PathVariable("menuId") Long menuId,
            @RequestHeader(JwtAuthenticationFilter.TOKEN_HEADER) String token,
            @ModelAttribute MenuPhotoCreateRequest request){

        MenuPhotoResponse response = menuPhotoService.createPhoto(request, menuId, token);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @Operation(summary = "사진 조회")
    @GetMapping("/{photoId}")
    public ResponseEntity<MenuPhotoResponse> getMenuPhoto(@PathVariable("photoId") Long photoId){
        MenuPhotoResponse photoDTO = menuPhotoService.getPhoto(photoId);
        return ResponseEntity.ok(photoDTO);
    }

    @Operation(summary = "사진 삭제")
    @DeleteMapping("/{photoId}")
    public ResponseEntity<String> deletePhoto(
            @PathVariable("photoId") Long photoId,
            @RequestHeader(JwtAuthenticationFilter.TOKEN_HEADER) String token){

        menuPhotoService.deletePhoto(photoId, token);
        return ResponseEntity.ok("사진 삭제 완료");
    }

}

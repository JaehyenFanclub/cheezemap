package org.example.menu.controller;


import io.swagger.v3.oas.annotations.Operation;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.example.config.JwtAuthenticationFilter;
import org.example.config.JwtTokenProvider;
import org.example.menu.dto.MenuCreateRequest;
import org.example.menu.dto.MenuResponse;
import org.example.menu.dto.MenuUpdateRequest;
import org.example.menu.service.MenuService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/place/{placeId}/menu")
@RequiredArgsConstructor
public class MenuController {

    private final MenuService menuService;

    @Operation(
            summary = "메뉴등록"
    )
    @PostMapping
    public ResponseEntity<MenuResponse> createMenu(
            @RequestHeader(JwtAuthenticationFilter.TOKEN_HEADER) String token,
            @RequestBody MenuCreateRequest request,
            @PathVariable("placeId") Long placeId
            ){
        MenuResponse response = menuService.createMenu(request, token, placeId);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @Operation(
            summary = "메뉴 조회"
    )
    @GetMapping("/{menuId}")
    public ResponseEntity<MenuResponse> getMenu(
        @PathVariable("menuId") Long menuId){
        MenuResponse menuDTO = menuService.getMenu(menuId);
        return ResponseEntity.ok(menuDTO);
    }

    @Operation(summary = "메뉴 수정")
    @PutMapping("/{menuId}")
    public ResponseEntity<MenuResponse> updateMenu(
        @PathVariable("menuId") Long menuId,
        @RequestBody MenuUpdateRequest updateDTO,
        @RequestHeader(JwtAuthenticationFilter.TOKEN_HEADER) String token){

        MenuResponse updateMenu = menuService.updateMenu(menuId, updateDTO, token);
        return ResponseEntity.ok(updateMenu);
    }

    @Operation(summary = "메뉴 삭제")
    @DeleteMapping("/{menuId}")
    public ResponseEntity<String> deleteMenu(
            @PathVariable("menuId") Long menuId,
            @RequestHeader(JwtAuthenticationFilter.TOKEN_HEADER) String token){
        menuService.deleteMenu(menuId, token);
        return ResponseEntity.ok("메뉴 삭제 완료");
    }

}

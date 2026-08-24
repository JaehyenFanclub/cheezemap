package org.example.menu.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.example.menu.domain.MenuPhoto;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor

public class MenuPhotoResponse {

    private Long menuPhotoId;
    private LocalDateTime photoDate;
    private String photoUrl;
    private Long menuId;

    public static MenuPhotoResponse from (MenuPhoto menuPhoto){
        return MenuPhotoResponse.builder()
                .menuPhotoId(menuPhoto.getMenuPhotoId())
                .photoDate(menuPhoto.getPhotoDate())
                .photoUrl(menuPhoto.getPhotoUrl())
                .menuId(menuPhoto.getMenu().getMenuId() != null ? menuPhoto.getMenu().getMenuId() : null)
                .build();
    }

}

package org.example.menu.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.example.menu.domain.Menu;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MenuResponse {

    private Long menuId;
    private String menuName;
    private String menuValue;
    private String menuInfo;
    private Long placeId;

    public static MenuResponse from (Menu menu){

        return MenuResponse.builder()
                .menuId(menu.getMenuId())
                .menuName(menu.getMenuName())
                .menuValue(menu.getMenuValue())
                .menuInfo(menu.getMenuInfo())
                .placeId(menu.getPlace() != null ? menu.getPlace().getPlaceId() : null)
                .build();
    }

}

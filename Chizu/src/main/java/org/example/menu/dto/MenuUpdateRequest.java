package org.example.menu.dto;


import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class MenuUpdateRequest {

    private String menuName;
    private String menuValue;
    private String menuInfo;
}

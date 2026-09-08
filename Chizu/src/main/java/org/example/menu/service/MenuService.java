package org.example.menu.service;


import lombok.RequiredArgsConstructor;
import org.example.menu.domain.Menu;
import org.example.menu.dto.MenuCreateRequest;
import org.example.menu.dto.MenuResponse;
import org.example.menu.dto.MenuUpdateRequest;
import org.example.menu.repository.MenuRepository;
import org.example.place.domain.Place;
import org.example.place.repository.PlaceRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class MenuService {

    private final MenuRepository menuRepository;
    private final PlaceRepository placeRepository;

    @Transactional
    public MenuResponse createMenu(MenuCreateRequest request, String token, Long placeId){
        Place place = placeRepository.findById(placeId)
                .orElseThrow(() -> new IllegalArgumentException("없는 장소"));

        Menu menu = Menu.builder()
                .menuName(request.getMenuName())
                .menuValue(request.getMenuValue())
                .menuInfo(request.getMenuInfo())
                .place(place)
                .build();

        Menu saveMenu = menuRepository.save(menu);

        return MenuResponse.from(saveMenu);

    }

    public MenuResponse getMenu(Long menuId){
        Menu menu = menuRepository.findById(menuId)
                .orElseThrow(() -> new IllegalArgumentException("해당 메뉴 없음"));

        return convertToDTO(menu);
    }

    @Transactional
    public MenuResponse updateMenu(Long menuId, MenuUpdateRequest updateDTO, String token){
        Menu menu = menuRepository.findById(menuId)
                .orElseThrow(() -> new IllegalArgumentException("해당 메뉴 없음"));

        menu.updateMenuInfo(updateDTO);
        return convertToDTO(menu);

    }

    @Transactional
    public void deleteMenu(Long menuId, String token){
        Menu menu = menuRepository.findById(menuId)
                .orElseThrow(() -> new IllegalArgumentException("해당 메뉴 없음"));

        menuRepository.delete(menu);

    }



    private MenuResponse convertToDTO(Menu menu){
        return MenuResponse.builder()
                .menuId(menu.getMenuId())
                .menuName(menu.getMenuName())
                .menuValue(menu.getMenuValue())
                .menuInfo(menu.getMenuInfo())
                .placeId(menu.getPlace().getPlaceId())
                .build();
    }
}

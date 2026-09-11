package org.example.menu.service;


import lombok.RequiredArgsConstructor;
import org.example.common.service.ImageStorageService;
import org.example.common.service.ImageStorageService.ImageFolder;
import org.example.menu.domain.Menu;
import org.example.menu.domain.MenuPhoto;
import org.example.menu.dto.MenuPhotoCreateRequest;
import org.example.menu.dto.MenuPhotoResponse;
import org.example.menu.repository.MenuPhotoRepository;
import org.example.menu.repository.MenuRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
public class MenuPhotoService {

    private final MenuPhotoRepository menuPhotoRepository;
    private final MenuRepository menuRepository;
    private final ImageStorageService imageStorageService;

    @Transactional
    public MenuPhotoResponse createPhoto(MenuPhotoCreateRequest dto, Long menuId, String token){
        Menu menu = menuRepository.findById(menuId)
                .orElseThrow(() -> new IllegalArgumentException("없는 메뉴"));

        MultipartFile file = dto.getFile();
        String photoUrl = imageStorageService.store(file, ImageFolder.MENU);

        MenuPhoto menuPhoto = MenuPhoto.builder()
                .photoUrl(photoUrl)
                .menu(menu)
                .build();

        MenuPhoto saveMenuPhoto = menuPhotoRepository.save(menuPhoto);
        return MenuPhotoResponse.from(saveMenuPhoto);
    }

    public MenuPhotoResponse getPhoto(Long menuPhotoId){
        MenuPhoto menuPhoto = menuPhotoRepository.findById(menuPhotoId)
                .orElseThrow(() -> new IllegalArgumentException("해당 사진 없음"));

        return convertToDTO(menuPhoto);
    }

    @Transactional
    public void deletePhoto(Long menuPhotoId, String token){
        MenuPhoto menuPhoto = menuPhotoRepository.findById(menuPhotoId)
                .orElseThrow(() -> new IllegalArgumentException("사진 없음"));

        imageStorageService.deleteByStoredPath(menuPhoto.getPhotoUrl());
        menuPhotoRepository.delete(menuPhoto);

    }



    private MenuPhotoResponse convertToDTO(MenuPhoto menuPhoto){
        return MenuPhotoResponse.builder()
                .menuPhotoId(menuPhoto.getMenuPhotoId())
                .photoUrl(menuPhoto.getPhotoUrl())
                .photoDate(menuPhoto.getPhotoDate())
                .menuId(menuPhoto.getMenu().getMenuId())
                .build();
    }
}

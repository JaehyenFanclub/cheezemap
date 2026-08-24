package org.example.menu.service;


import lombok.RequiredArgsConstructor;
import org.example.config.JwtTokenProvider;
import org.example.menu.domain.Menu;
import org.example.menu.domain.MenuPhoto;
import org.example.menu.dto.MenuPhotoCreateRequest;
import org.example.menu.dto.MenuPhotoResponse;
import org.example.menu.repository.MenuPhotoRepository;
import org.example.menu.repository.MenuRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MenuPhotoService {

    private final MenuPhotoRepository menuPhotoRepository;
    private final MenuRepository menuRepository;
    private final JwtTokenProvider jwtTokenProvider;

    @Transactional
    public MenuPhotoResponse createPhoto(MenuPhotoCreateRequest dto, Long menuId, String token){
        Menu menu = menuRepository.findById(menuId)
                .orElseThrow(() -> new IllegalArgumentException("없는 메뉴"));

        Long userId = Long.parseLong(jwtTokenProvider.getSubject(token));
        if(!menu.getPlace().getUser().getId().equals(userId)){
            throw new IllegalArgumentException("해당 사진을 추가할 권한 없음");
        }

        MultipartFile file = dto.getFile();

        if (file == null || file.isEmpty()){
            throw new IllegalArgumentException("업로드할 파일이 없음");
        }

        String uploadDir = System.getProperty("user.dir") + "/MenuPhoto/";
        File dir = new File(uploadDir);
        if(!dir.exists()){
            dir.mkdirs();
        }

        String originalFilename = file.getOriginalFilename();
        String storeFileName = UUID.randomUUID() + "-" + originalFilename;
        String fullPath = uploadDir + storeFileName;

        try {
            file.transferTo(new File(fullPath));
        } catch (IOException e) {
            throw new RuntimeException("파일 저장 중 오류가 발생했습니다.", e);
        }

        String photoUrl = "/images/" + storeFileName;

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

        Long userId = Long.parseLong(jwtTokenProvider.getSubject(token));

        if (!menuPhoto.getMenu().getPlace().getUser().getId().equals(userId)){
            throw new IllegalArgumentException("해당 사진을 삭제 할 권한이 없습니다.");
        }
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

package org.example.place.service;

import org.example.config.JwtTokenProvider;
import org.example.place.domain.Place;
import org.example.place.domain.PlacePhoto;
import org.example.place.dto.PlacePhotoCreateRequest;
import org.example.place.dto.PlacePhotoResponse;
import org.example.place.repository.PlacePhotoRepository;
import org.example.place.repository.PlaceRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PlacePhotoService {

    private final PlacePhotoRepository placePhotoRepository;
    private final PlaceRepository placeRepository;
    private final JwtTokenProvider jwtTokenProvider;

    @Transactional
    public PlacePhotoResponse createPhoto(PlacePhotoCreateRequest dto, Long placeId, String token) {
        Place place = placeRepository.findById(placeId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 장소"));

        Long userId = Long.parseLong(jwtTokenProvider.getSubject(token));

        if (!place.getUser().getId().equals(userId)){
            throw new IllegalArgumentException("해당 사진을 추가 할 권한이 없습니다.");
        }

        MultipartFile file = dto.getFile();

        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("업로드할 이미지 파일이 없습니다.");
        }

        String uploadDir = System.getProperty("user.dir") + "/PlacePhoto/";
        File dir = new File(uploadDir);
        if (!dir.exists()) {
            dir.mkdirs();
        }

        String originalFilename = file.getOriginalFilename();
        String storeFileName = UUID.randomUUID() + "_" + originalFilename;
        String fullPath = uploadDir + storeFileName;

        try {
            file.transferTo(new File(fullPath));
        } catch (IOException e) {
            throw new RuntimeException("파일 저장 중 오류가 발생했습니다.", e);
        }

        String photoUrl = "/images/" + storeFileName;

        PlacePhoto placePhoto = PlacePhoto.builder()
                .photoUrl(photoUrl)
                .place(place)
                .build();

        PlacePhoto savePlacePhoto = placePhotoRepository.save(placePhoto);

        return PlacePhotoResponse.from(savePlacePhoto);
    }

    public PlacePhotoResponse getPhoto(Long placePhotoId){
        PlacePhoto placePhoto = placePhotoRepository.findById(placePhotoId)
                .orElseThrow(() -> new IllegalArgumentException("해당 사진 없음"));

        return convertToDTO(placePhoto);
    }

    @Transactional
    public void deletePhoto(Long placePhotoId, String token){
        PlacePhoto placePhoto = placePhotoRepository.findById(placePhotoId)
                .orElseThrow(() -> new IllegalArgumentException("사진 없음"));

        Long userId = Long.parseLong(jwtTokenProvider.getSubject(token));

        if (!placePhoto.getPlace().getUser().getId().equals(userId)){
            throw new IllegalArgumentException("해당 사진을 삭제 할 권한이 없습니다.");
        }

        placePhotoRepository.delete(placePhoto);

    }



    private PlacePhotoResponse convertToDTO(PlacePhoto placePhoto){
        return PlacePhotoResponse.builder()
                .photoId(placePhoto.getPlacePhotoId())
                .photoUrl(placePhoto.getPhotoUrl())
                .photoDate(placePhoto.getPhotoDate())
                .placeId(placePhoto.getPlace().getPlaceId())
                .build();
    }
}

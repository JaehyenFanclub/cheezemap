package org.example.place.service;

import lombok.RequiredArgsConstructor;
import org.example.common.service.ImageStorageService;
import org.example.common.service.ImageStorageService.ImageFolder;
import org.example.place.domain.Place;
import org.example.place.domain.PlacePhoto;
import org.example.place.dto.PlacePhotoCreateRequest;
import org.example.place.dto.PlacePhotoResponse;
import org.example.place.repository.PlacePhotoRepository;
import org.example.place.repository.PlaceRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
public class PlacePhotoService {

    private final PlacePhotoRepository placePhotoRepository;
    private final PlaceRepository placeRepository;
    private final ImageStorageService imageStorageService;

    @Transactional
    public PlacePhotoResponse createPhoto(PlacePhotoCreateRequest dto, Long placeId, String token) {
        Place place = placeRepository.findById(placeId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 장소"));

        MultipartFile file = dto.getFile();
        String photoUrl = imageStorageService.store(file, ImageFolder.PLACE);

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

        imageStorageService.deleteByStoredPath(placePhoto.getPhotoUrl());
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

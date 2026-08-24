package org.example.place.repository;

import org.example.place.domain.PlacePhoto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PlacePhotoRepository extends JpaRepository<PlacePhoto, Long> {

    List<PlacePhoto> findByPlace_PlaceId(Long placeId);
    List<PlacePhoto> findByPlacePhotoId(Long placePhotoId);

}

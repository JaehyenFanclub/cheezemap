package org.example.place.repository;

import java.util.List;
import java.util.Optional;

import org.example.place.domain.Place;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface PlaceRepository extends JpaRepository<Place, Long> {
    Optional<Place> findByGooglePlaceId(String googlePlaceId);

    Optional<Place> findFirstByPlaceInformationOrderByPlaceIdAsc(String placeInformation);

    /** 예전 프론트가 google_* 키를 정적 장소로 POST 할 때 생긴 orphan 조회용 */
    Optional<Place> findFirstByPlaceInformationEndingWithOrderByPlaceIdAsc(String placeInformationSuffix);

    @Query("""
            select p from Place p
            where p.placeLatitude is not null
              and p.placeLongitude is not null
              and p.placeLatitude between :minLat and :maxLat
              and p.placeLongitude between :minLng and :maxLng
            """)
    List<Place> findWithinBounds(
            @Param("minLat") double minLat,
            @Param("maxLat") double maxLat,
            @Param("minLng") double minLng,
            @Param("maxLng") double maxLng
    );
}

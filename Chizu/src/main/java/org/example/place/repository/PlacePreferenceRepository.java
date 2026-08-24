package org.example.place.repository;

import org.example.common.enums.AgeGroup;
import org.example.common.enums.GenderGroup;
import org.example.place.domain.PlacePreference;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface PlacePreferenceRepository extends JpaRepository<PlacePreference, Long> {

    Optional<PlacePreference> findByPlace_PlaceIdAndAgeGroupAndGender(
            Long placeId,
            AgeGroup ageGroup,
            GenderGroup gender
    );

    @Query("""
            select pp from PlacePreference pp
            join fetch pp.place p
            where p.placeId in :placeIds
              and pp.ageGroup = :ageGroup
              and pp.gender = :gender
            """)
    List<PlacePreference> findByPlaceIdsAndAgeGroupAndGender(
            @Param("placeIds") Collection<Long> placeIds,
            @Param("ageGroup") AgeGroup ageGroup,
            @Param("gender") GenderGroup gender
    );
}

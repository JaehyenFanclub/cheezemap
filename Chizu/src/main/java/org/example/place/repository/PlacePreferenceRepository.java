package org.example.place.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.example.common.enums.AgeGroup;
import org.example.common.enums.GenderGroup;
import org.example.place.domain.PlacePreference;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PlacePreferenceRepository extends JpaRepository<PlacePreference, Long> {

    Optional<PlacePreference> findByPlace_PlaceIdAndAgeGroupAndGender(
            Long placeId,
            AgeGroup ageGroup,
            GenderGroup gender
    );

    @EntityGraph(attributePaths = {"place"})
    List<PlacePreference> findByPlace_PlaceIdInAndAgeGroupAndGender(
            Collection<Long> placeIds,
            AgeGroup ageGroup,
            GenderGroup gender
    );

    @EntityGraph(attributePaths = {"place"})
    List<PlacePreference> findByPlace_PlaceIdInAndGender(
            Collection<Long> placeIds,
            GenderGroup gender
    );
}

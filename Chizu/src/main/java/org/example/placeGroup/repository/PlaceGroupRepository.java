package org.example.placeGroup.repository;

import org.example.placeGroup.entity.PlaceGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface PlaceGroupRepository extends JpaRepository<PlaceGroup, Long> {
    @Query("SELECT p FROM PlaceGroup p WHERE p.group.groupId = :groupId")
    List<PlaceGroup> findByGroupId(@Param("groupId") Long groupId);

    @Query("SELECT p FROM PlaceGroup p WHERE p.group.groupId = :groupId AND p.place.id = :placeId")
    PlaceGroup findByGroupIdAndPlaceId(@Param("groupId") Long groupId,
                                       @Param("placeId") Long placeId);
}

package org.example.place.repository;

import org.example.place.domain.Place;
import org.example.place.domain.PlaceSaved;
import org.example.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PlaceSavedRepository extends JpaRepository<PlaceSaved, Long> {

    // 특정 유저와 장소의 저장 여부 조회
    Optional<PlaceSaved> findByUserAndPlace(User user, Place place);

    // 특정 유저가 저장한 전체 목록 조회
    List<PlaceSaved> findAllByUser(User user);
}
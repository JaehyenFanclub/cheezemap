package org.example.place.repository;

import org.example.place.domain.Place;
import org.example.place.domain.PlaceLike;
import org.example.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PlaceLikeRepository extends JpaRepository<PlaceLike, Long> {
    Optional<PlaceLike> findByUserAndPlace(User user, Place place);
    List<PlaceLike> findAllByUser(User user);
}

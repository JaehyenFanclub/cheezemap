package org.example.user.repository;

import java.util.Optional;
import org.example.user.entity.UserPhoto;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserPhotoRepository extends JpaRepository<UserPhoto, Long> {

    Optional<UserPhoto> findByUserId(Long userId);
}

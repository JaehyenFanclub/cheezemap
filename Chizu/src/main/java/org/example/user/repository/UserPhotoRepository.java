package org.example.user.repository;

import java.util.List;
import java.util.Optional;
import org.example.user.entity.UserPhoto;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserPhotoRepository extends JpaRepository<UserPhoto, Long> {

    Optional<UserPhoto> findByUser_Id(Long userId);

    List<UserPhoto> findByUser_IdIn(List<Long> userIds);
}

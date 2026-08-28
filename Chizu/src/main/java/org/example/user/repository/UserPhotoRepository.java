package org.example.user.repository;

import java.util.List;
import java.util.Optional;
import org.example.user.entity.UserPhoto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserPhotoRepository extends JpaRepository<UserPhoto, Long> {

    Optional<UserPhoto> findByUserId(Long userId);

    @Query("select p from UserPhoto p join fetch p.user where p.user.id in :userIds")
    List<UserPhoto> findByUserIdIn(@Param("userIds") List<Long> userIds);
}

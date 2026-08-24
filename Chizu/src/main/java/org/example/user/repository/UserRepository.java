package org.example.user.repository;

import java.util.Optional;

import org.example.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long> {

    boolean existsByEmail(String email);

    boolean existsByUserNickname(String userNickname);

    boolean existsByPhone(String phone);

    Optional<User> findByEmail(String email);

    Optional<User> findByUserNickname(String userNickname);
}

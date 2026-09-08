package org.example.user.repository;

import java.util.Optional;
import org.example.auth.enums.SocialProvider;
import org.example.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long> {

    boolean existsByEmailAndDeletedFalse(String email);

    boolean existsByUserNicknameAndDeletedFalse(String userNickname);

    boolean existsByPhoneAndDeletedFalse(String phone);

    Optional<User> findByEmailAndDeletedFalse(String email);

    Optional<User> findByUserNicknameAndDeletedFalse(String userNickname);

    Optional<User> findByProviderAndProviderIdAndDeletedFalse(
            SocialProvider provider,
            String providerId
    );
}

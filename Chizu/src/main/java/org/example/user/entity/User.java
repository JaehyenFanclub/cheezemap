package org.example.user.entity;

import org.example.auth.enums.SocialProvider;
import org.example.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDate;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(
        name = "users",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_users_provider_provider_id",
                columnNames = {"provider", "provider_id"}
        )
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class User extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String userName;

    @Column(nullable = false, unique = true)
    private String userNickname;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(unique = true)
    private String phone;

    @Column
    private LocalDate birth;

    @Column(name = "sex")
    private Boolean sex;

    @Column(nullable = false)
    private boolean isAdmin;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SocialProvider provider = SocialProvider.LOCAL;

    @Column(name = "provider_id")
    private String providerId;

    @Builder
    private User(
            String userName,
            String userNickname,
            String password,
            String email,
            String phone,
            LocalDate birth,
            Boolean sex,
            boolean isAdmin,
            SocialProvider provider,
            String providerId
    ) {
        this.userName = userName;
        this.userNickname = userNickname;
        this.password = password;
        this.email = email;
        this.phone = phone;
        this.birth = birth;
        this.sex = sex;
        this.isAdmin = isAdmin;
        this.provider = provider != null ? provider : SocialProvider.LOCAL;
        this.providerId = normalizeProviderId(this.provider, providerId);
    }

    private static String normalizeProviderId(SocialProvider provider, String providerId) {
        if (provider == SocialProvider.LOCAL) {
            return null;
        }
        if (providerId == null || providerId.isBlank()) {
            return null;
        }
        return providerId;
    }

    public void updateProfile(
            String userName,
            String userNickname,
            String phone,
            String email,
            LocalDate birth,
            Boolean sex
    ) {
        this.userName = userName;
        this.userNickname = userNickname;
        this.phone = phone;
        this.email = email;
        this.birth = birth;
        if (sex != null) {
            this.sex = sex;
        }
    }

    public void updateSocialProfile(String userName, String phone, LocalDate birth, Boolean sex) {
        if (userName != null && !userName.isBlank()) {
            this.userName = userName;
        }
        this.phone = phone == null || phone.isBlank() ? null : phone;
        if (birth != null) {
            this.birth = birth;
        }
        if (sex != null) {
            this.sex = sex;
        }
    }

    public void updatePassword(String encodedPassword) {
        this.password = encodedPassword;
    }

    @PrePersist
    @PreUpdate
    void normalizeProviderFields() {
        if (provider == SocialProvider.LOCAL) {
            providerId = null;
            return;
        }

        if (providerId == null || providerId.isBlank() || providerId.startsWith("local:")) {
            provider = SocialProvider.LOCAL;
            providerId = null;
            return;
        }

        if (provider == null) {
            provider = SocialProvider.LOCAL;
            providerId = null;
        }
    }
}

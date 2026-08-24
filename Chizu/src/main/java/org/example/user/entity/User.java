package org.example.user.entity;

import org.example.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDate;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "users")
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

    @Column(nullable = false, unique = true)
    private String phone;

    @Column(nullable = false)
    private LocalDate birth;

    @Column(name = "sex")
    private Boolean sex;

    @Column(nullable = false)
    private boolean isAdmin;

    @Builder
    private User(
            String userName,
            String userNickname,
            String password,
            String email,
            String phone,
            LocalDate birth,
            Boolean sex,
            boolean isAdmin
    ) {
        this.userName = userName;
        this.userNickname = userNickname;
        this.password = password;
        this.email = email;
        this.phone = phone;
        this.birth = birth;
        this.sex = sex;
        this.isAdmin = isAdmin;
    }

    public void updateProfile(String userName, String userNickname, String phone) {
        this.userName = userName;
        this.userNickname = userNickname;
        this.phone = phone;
    }
}

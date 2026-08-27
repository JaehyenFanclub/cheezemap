package org.example.user.service;

import org.example.common.service.ImageStorageService;
import org.example.common.service.ImageStorageService.ImageFolder;
import org.example.config.JwtTokenProvider;
import org.example.config.TokenBlacklist;
import org.example.user.dto.LoginRequest;
import org.example.user.dto.LoginResponse;
import org.example.user.dto.MyPageEditRequest;
import org.example.user.dto.MyPageResponse;
import org.example.user.dto.SignupRequest;
import org.example.user.entity.User;
import org.example.user.entity.UserPhoto;
import org.example.user.repository.UserPhotoRepository;
import org.example.user.repository.UserRepository;
import io.jsonwebtoken.JwtException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final UserPhotoRepository userPhotoRepository;
    private final ImageStorageService imageStorageService;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final TokenBlacklist tokenBlacklist;

    @Transactional
    public void signup(SignupRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new IllegalArgumentException("이미 사용 중인 이메일입니다.");
        }
        if (userRepository.existsByUserNickname(request.userNickname())) {
            throw new IllegalArgumentException("이미 사용 중인 닉네임입니다.");
        }
        if (userRepository.existsByPhone(request.phone())) {
            throw new IllegalArgumentException("이미 사용 중인 전화번호입니다.");
        }

        User user = User.builder()
                .userName(request.userName())
                .userNickname(request.userNickname())
                .password(passwordEncoder.encode(request.password()))
                .email(request.email())
                .phone(request.phone())
                .birth(request.birth())
                .sex(request.sex())
                .isAdmin(request.isAdmin())
                .build();

        user.markCreated(null);
        userRepository.save(user);
    }

    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.userEmail())
                .orElseThrow(() -> new IllegalArgumentException("이메일 또는 비밀번호가 올바르지 않습니다."));

        if (!passwordEncoder.matches(request.password(), user.getPassword())) {
            throw new IllegalArgumentException("이메일 또는 비밀번호가 올바르지 않습니다.");
        }

        String token = jwtTokenProvider.createToken(user.getId(), user.getEmail());
        return new LoginResponse("로그인에 성공했습니다.", "200", token);
    }

    public void logout(String token) {
        if (token == null || token.isBlank()) {
            throw new IllegalArgumentException("토큰은 필수입니다.");
        }
        if (tokenBlacklist.contains(token)) {
            throw new IllegalArgumentException("이미 로그아웃된 토큰입니다.");
        }
        try {
            if (!jwtTokenProvider.validateToken(token)) {
                throw new IllegalArgumentException("유효하지 않은 토큰입니다.");
            }
            tokenBlacklist.add(token, jwtTokenProvider.getExpiration(token));
        } catch (JwtException ex) {
            throw new IllegalArgumentException("유효하지 않은 토큰입니다.");
        }
    }

    @Transactional(readOnly = true)
    public MyPageResponse mypage(String token) {
        User user = findUserByToken(token);
        String photoUrl = userPhotoRepository.findByUserId(user.getId())
                .map(UserPhoto::getPhotoUrl)
                .orElse(null);
        return new MyPageResponse(
                user.getEmail(),
                user.getUserName(),
                user.getUserNickname(),
                user.getPhone(),
                user.getBirth(),
                user.getSex(),
                photoUrl
        );
    }

    @Transactional
    public void editMyPage(String token, MyPageEditRequest request) {
        User user = findUserByToken(token);

        String newUserName = pickOrDefault(request.getUserName(), user.getUserName(), "이름");
        String newUserNickname = pickOrDefault(request.getUserNickname(), user.getUserNickname(), "닉네임");
        String newPhone = pickOrDefault(request.getUserPhone(), user.getPhone(), "전화번호");

        if (!newUserNickname.equals(user.getUserNickname())
                && userRepository.existsByUserNickname(newUserNickname)) {
            throw new IllegalArgumentException("이미 사용 중인 닉네임입니다.");
        }

        if (!newPhone.equals(user.getPhone())
                && userRepository.existsByPhone(newPhone)) {
            throw new IllegalArgumentException("이미 사용 중인 전화번호입니다.");
        }

        user.updateProfile(newUserName, newUserNickname, newPhone);
        updatePasswordIfRequested(user, request);
        user.markUpdated(user.getId());

        MultipartFile photo = request.getPhoto();
        if (photo != null && !photo.isEmpty()) {
            updateProfilePhoto(user, photo);
        }
    }

    private void updatePasswordIfRequested(User user, MyPageEditRequest request) {
        String currentPassword = request.getCurrentPassword();
        String newPassword = request.getNewPassword();
        String newPasswordConfirm = request.getNewPasswordConfirm();

        boolean hasAnyPasswordField = isPresent(currentPassword)
                || isPresent(newPassword)
                || isPresent(newPasswordConfirm);

        if (!hasAnyPasswordField) {
            return;
        }

        if (!isPresent(currentPassword) || !isPresent(newPassword) || !isPresent(newPasswordConfirm)) {
            throw new IllegalArgumentException("비밀번호 변경 시 현재 비밀번호, 변경할 비밀번호, 변경할 비밀번호 확인이 모두 필요합니다.");
        }

        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            throw new IllegalArgumentException("현재 비밀번호가 올바르지 않습니다.");
        }

        if (!newPassword.equals(newPasswordConfirm)) {
            throw new IllegalArgumentException("변경할 비밀번호와 확인 비밀번호가 일치하지 않습니다.");
        }

        if (passwordEncoder.matches(newPassword, user.getPassword())) {
            throw new IllegalArgumentException("현재 비밀번호와 동일한 비밀번호로 변경할 수 없습니다.");
        }

        user.updatePassword(passwordEncoder.encode(newPassword));
    }

    private boolean isPresent(String value) {
        return value != null && !value.isBlank();
    }

    private void updateProfilePhoto(User user, MultipartFile photo) {
        String storedPath = imageStorageService.store(photo, ImageFolder.USER);

        userPhotoRepository.findByUserId(user.getId())
                .ifPresentOrElse(
                        userPhoto -> {
                            imageStorageService.deleteByStoredPath(userPhoto.getPhotoUrl());
                            userPhoto.updatePhotoUrl(storedPath);
                            userPhoto.markUpdated(user.getId());
                        },
                        () -> {
                            UserPhoto userPhoto = UserPhoto.builder()
                                    .photoUrl(storedPath)
                                    .user(user)
                                    .build();
                            userPhoto.markCreated(user.getId());
                            userPhotoRepository.save(userPhoto);
                        }
                );
    }

    @Transactional
    public void deleteUser(String token) {
        User user = findUserByToken(token);
        userPhotoRepository.findByUserId(user.getId()).ifPresent(userPhoto -> {
            imageStorageService.deleteByStoredPath(userPhoto.getPhotoUrl());
            userPhotoRepository.delete(userPhoto);
        });
        userRepository.delete(user);
        tokenBlacklist.add(token, jwtTokenProvider.getExpiration(token));
    }

    private User findUserByToken(String token) {
        if (token == null || token.isBlank()) {
            throw new IllegalArgumentException("토큰은 필수입니다.");
        }
        if (tokenBlacklist.contains(token)) {
            throw new IllegalArgumentException("이미 로그아웃된 토큰입니다.");
        }
        try {
            if (!jwtTokenProvider.validateToken(token)) {
                throw new IllegalArgumentException("유효하지 않은 토큰입니다.");
            }
            Long userId = Long.valueOf(jwtTokenProvider.getSubject(token));
            return userRepository.findById(userId)
                    .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));
        } catch (JwtException | NumberFormatException ex) {
            throw new IllegalArgumentException("유효하지 않은 토큰입니다.");
        }
    }

    private String pickOrDefault(String input, String defaultValue, String fieldName) {
        if (input == null) {
            return defaultValue;
        }
        if (input.isBlank()) {
            throw new IllegalArgumentException(fieldName + "은(는) 공백일 수 없습니다.");
        }
        return input;
    }
}

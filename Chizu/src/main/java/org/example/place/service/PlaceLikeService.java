package org.example.place.service;

import lombok.RequiredArgsConstructor;
import org.example.config.JwtTokenProvider;
import org.example.place.domain.Place;
import org.example.place.domain.PlaceLike;
import org.example.place.dto.PlaceLikeResponse;
import org.example.place.dto.PlaceResponse;
import org.example.place.repository.PlaceLikeRepository;
import org.example.place.repository.PlaceRepository;
import org.example.user.entity.User;
import org.example.user.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PlaceLikeService {

    private final PlaceLikeRepository placeLikeRepository;
    private final PlaceRepository placeRepository;
    private final UserRepository userRepository;
    private final JwtTokenProvider jwtTokenProvider; // 토큰에서 userId/email 파싱용 클래스

    @Transactional
    public PlaceLikeResponse toggleLike(Long placeId, String token) {
        // 1. 토큰에서 사용자 정보(userId 또는 email) 추출
        Long userId = Long.parseLong(jwtTokenProvider.getSubject(token)); // 토큰 파서 메서드 사용

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다. id: " + userId));

        Place place = placeRepository.findById(placeId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 장소입니다. id: " + placeId));

        Optional<PlaceLike> existingLike = placeLikeRepository.findByUserAndPlace(user, place);

        // 2. 이미 좋아요 누른 상태 -> 삭제 (좋아요 취소)
        if (existingLike.isPresent()) {
            placeLikeRepository.delete(existingLike.get());
            return null;
        }

        // 3. 좋아요 안 누른 상태 -> 생성 (좋아요 등록)
        PlaceLike placeLike = PlaceLike.builder()
                .user(user)
                .place(place)
                .build();

        PlaceLike savedLike = placeLikeRepository.save(placeLike);
        return PlaceLikeResponse.from(savedLike);
    }

    @Transactional(readOnly = true)
    public List<PlaceResponse> getMyLikedPlaces(String token) {
        // 1. 토큰에서 사용자 정보 추출 (지정한 동일한 파싱 방식 사용)
        Long userId = Long.parseLong(jwtTokenProvider.getSubject(token));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다. id: " + userId));

        // 2. 해당 유저가 좋아요 한 전체 목록 조회
        List<PlaceLike> placeLikes = placeLikeRepository.findAllByUser(user);

        // 3. PlaceLike 목록에서 Place를 추출하여 PlaceResponse DTO 목록으로 변환
        return placeLikes.stream()
                .map(placeLike -> PlaceResponse.from(placeLike.getPlace())) // 프로젝트 내 변환 메서드명에 맞게 호출
                .collect(Collectors.toList());
    }
}

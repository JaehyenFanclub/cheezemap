package org.example.place.service;

import lombok.RequiredArgsConstructor;
import org.example.config.JwtTokenProvider;
import org.example.place.domain.Place;
import org.example.place.domain.PlaceSaved;
import org.example.place.dto.PlaceResponse;
import org.example.place.dto.PlaceSavedResponse;
import org.example.place.repository.PlaceRepository;
import org.example.place.repository.PlaceSavedRepository;
import org.example.user.entity.User;
import org.example.user.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PlaceSavedService {

    private final PlaceSavedRepository placeSavedRepository;
    private final PlaceRepository placeRepository;
    private final UserRepository userRepository;
    private final JwtTokenProvider jwtTokenProvider;

    /**
     * 장소 저장 토글 (저장 / 삭제)
     */
    @Transactional
    public PlaceSavedResponse toggleSave(Long placeId, String token) {
        // 1. 토큰에서 유저 ID 추출
        Long userId = Long.parseLong(jwtTokenProvider.getSubject(token));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다. id: " + userId));

        Place place = placeRepository.findById(placeId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 장소입니다. id: " + placeId));

        Optional<PlaceSaved> existingSave = placeSavedRepository.findByUserAndPlace(user, place);

        // 2. 이미 저장된 상태 -> 삭제 (저장 취소)
        if (existingSave.isPresent()) {
            placeSavedRepository.delete(existingSave.get());
            return null;
        }

        // 3. 저장되지 않은 상태 -> 저장 등록
        PlaceSaved placeSaved = PlaceSaved.builder()
                .user(user)
                .place(place)
                .build();

        PlaceSaved savedPlace = placeSavedRepository.save(placeSaved);
        return PlaceSavedResponse.from(savedPlace);
    }

    /**
     * 내가 저장한 장소 목록 조회 (마이페이지용)
     */
    @Transactional(readOnly = true)
    public List<PlaceResponse> getMySavedPlaces(String token) {
        // 1. 토큰에서 유저 ID 추출
        Long userId = Long.parseLong(jwtTokenProvider.getSubject(token));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다. id: " + userId));

        // 2. 해당 유저가 저장한 장소 목록 조회
        List<PlaceSaved> savedList = placeSavedRepository.findAllByUser(user);

        // 3. PlaceSaved 엔티티 목록에서 Place를 추출하여 PlaceResponse 목록으로 변환
        return savedList.stream()
                .map(saved -> PlaceResponse.from(saved.getPlace()))
                .collect(Collectors.toList());
    }
}

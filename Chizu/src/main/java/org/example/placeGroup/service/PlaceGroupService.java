package org.example.placeGroup.service;

import io.jsonwebtoken.JwtException;
import lombok.RequiredArgsConstructor;
import org.example.common.dto.MsgResponse;
import org.example.config.JwtTokenProvider;
import org.example.config.TokenBlacklist;
import org.example.group.entity.Group;
import org.example.group.repository.GroupRepository;
import org.example.place.domain.Place;
import org.example.place.repository.PlaceRepository;
import org.example.place.service.PlacePreferenceService;
import org.example.placeGroup.dto.AddPlaceDto;
import org.example.placeGroup.dto.DeletePlaceDto;
import org.example.placeGroup.entity.PlaceGroup;
import org.example.placeGroup.repository.PlaceGroupRepository;
import org.example.user.entity.User;
import org.example.user.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PlaceGroupService {
    private final GroupRepository groupRepository;
    private final PlaceGroupRepository placeGroupRepository;
    private final PlaceRepository placeRepository;
    private final PlacePreferenceService placePreferenceService;
    private final TokenBlacklist tokenBlacklist;
    private final JwtTokenProvider jwtTokenProvider;
    private final UserRepository userRepository;

    @Transactional
    public MsgResponse addPlace(String token, AddPlaceDto request, boolean isAuth){
        Group group = groupRepository.findById(request.groupId())
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 그룹입니다."));
        User user = null;
        if(!isAuth){
            user = findUserByToken(token);
            if(!group.getUser().getId().equals(user.getId())){
                throw new IllegalArgumentException("그룹의 소유자가 아니면 추가할 수 없습니다.");
            }
        }
        Place place = placeRepository.findById(request.placeId())
                .orElseThrow(() -> new IllegalArgumentException("해당 장소가 존재하지 않습니다."));
        if(placeGroupRepository.findByGroupIdAndPlaceId(request.groupId(), request.placeId()) != null){
            throw new IllegalArgumentException("그룹에 이미 장소가 추가되어 있습니다.");
        }
        PlaceGroup placeGroup = PlaceGroup.builder()
                .place(place)
                .group(group)
                .build();
        String message = group.getGroupName()+"에 "+ place.getPlaceName()+"가 추가되었습니다!";
        placeGroupRepository.save(placeGroup);
        if (user != null) {
            placePreferenceService.increase(user, place, PlacePreferenceService.WEIGHT_SAVE);
        }
        return new MsgResponse(message, "201");
    }

    @Transactional
    public MsgResponse deletePlace(Long groupId, String token, DeletePlaceDto request){
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 그룹입니다."));
        if(!group.getGroupId().equals(request.groupId())){
            throw new IllegalArgumentException("삭제하려는 그룹과 경로그룹이 일치하지 안습니다.");
        }
        User user = findUserByToken(token);
        if(!group.getUser().getId().equals(user.getId())){
            throw new IllegalArgumentException("본인이 가진 그룹의 장소만 삭제할 수 있습니다.");
        }
        PlaceGroup placeGroup = placeGroupRepository.findByGroupIdAndPlaceId(request.groupId(), request.placeId());
        if(placeGroup == null) {
            throw  new IllegalArgumentException("그룹에 해당 장소가 없습니다.");
        }
        Place place = placeRepository.findById(request.placeId())
                .orElseThrow(() -> new IllegalArgumentException("해당 장소가 존재하지 않습니다."));
        String message = group.getGroupName()+"에서 "+place.getPlaceName()+"을 삭제했습니다!";
        placeGroupRepository.delete(placeGroup);
        return new MsgResponse(message, "200");
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
}

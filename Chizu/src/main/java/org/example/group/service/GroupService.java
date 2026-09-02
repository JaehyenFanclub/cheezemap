package org.example.group.service;

import io.jsonwebtoken.JwtException;
import lombok.RequiredArgsConstructor;
import org.example.common.dto.MsgResponse;
import org.example.config.JwtTokenProvider;
import org.example.config.TokenBlacklist;
import org.example.group.dto.*;
import org.example.group.entity.Group;
import org.example.group.repository.GroupRepository;
import org.example.placeGroup.dto.AddPlaceDto;
import org.example.placeGroup.entity.PlaceGroup;
import org.example.placeGroup.repository.PlaceGroupRepository;
import org.example.placeGroup.service.PlaceGroupService;
import org.example.user.entity.User;
import org.example.user.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@RequiredArgsConstructor
@Service
public class GroupService {
    private final GroupRepository groupRepository;
    private final PlaceGroupRepository placeGroupRepository;
    private final TokenBlacklist tokenBlacklist;
    private final JwtTokenProvider jwtTokenProvider;
    private final UserRepository userRepository;
    private final PlaceGroupService placeGroupService;

    @Transactional
    public CreateResponseDto createGroup(String token, CreateGroupDto request){
        User user = findUserByToken(token);
        Group group = Group.builder()
                .groupDate(request.groupDate())
                .groupMemo(request.groupMemo())
                .groupName(request.groupName())
                .user(user)
                .build();
        groupRepository.save(group);
        String message = group.getGroupName()+"을 생성했습니다!";
        return new CreateResponseDto(message, "201", group.getGroupId());
    }

    @Transactional(readOnly = true)
    public GetResponseDto getGroupDetail(Long groupId){
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 그룹입니다."));
        List<PlaceGroup> places = placeGroupRepository.findByGroupId(groupId);
        List<Long> placeIds = new ArrayList<>();
        for (PlaceGroup placeGroup : places) {
            placeIds.add(placeGroup.getPlace().getPlaceId());
        }
        return new GetResponseDto(
                group.getGroupDate(),
                group.getGroupMemo(),
                group.getGroupName(),
                placeIds
        );
    }

    public GetGroupsResponseDto getMyGroups(String token){
        User user = findUserByToken(token);
        List<Group> groups = groupRepository.findByUser(user);
        List<Long> groupIds = new ArrayList<>();
        for (Group group : groups) {
            groupIds.add(group.getGroupId());
        }
        return new GetGroupsResponseDto(groupIds);
    }

    public ShareResponseDto shareGroup(Long groupId){
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 그룹입니다."));

        String message = group.getGroupName()+"의 공유를 성공했습니다!";
        String url = ServletUriComponentsBuilder.fromCurrentContextPath()
                .path("/group/" + groupId)
                .toUriString();
        return new ShareResponseDto(
                message,
                url
        );
    }

//    그룹이 존재하는지 살피고 존재한다면 사용자로부터 값을 입력받아 복제
    @Transactional
    public MsgResponse cloneGroup(Long groupId, String token, CloneGroupDto request){
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 그룹입니다."));
        LocalDateTime now = LocalDateTime.now();
        String groupMemo= request.groupMemo();
        if(groupMemo != null && groupMemo.isBlank()){
            groupMemo=group.getGroupMemo();
        }
        String groupName= request.groupName();
        if(groupName != null && groupName.isBlank()){
            groupName=group.getGroupName();
        }
        CreateGroupDto createGroupDto = new CreateGroupDto(
                now,
                groupMemo,
                groupName
        );
        Group cloneGroup = groupRepository.findByGroupId(createGroup(token, createGroupDto).groupId());
        List<PlaceGroup> places = placeGroupRepository.findByGroupId(groupId);
        for (PlaceGroup place : places) {
            placeGroupService.addPlace(token, new AddPlaceDto(place.getPlace().getPlaceId(), cloneGroup.getGroupId()), true);
        }
        group.increaseCloneCount();
        String message = cloneGroup.getGroupName()+"이 성공적으로 복제되었습니다!";
        return new MsgResponse(message, "201");
    }

    @Transactional
    public MsgResponse updateGroup(Long groupId, String token, EditGroupDto request){
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 그룹입니다."));
        User user = findUserByToken(token);
        if(!group.getUser().getId().equals(user.getId())){
            throw new IllegalArgumentException("본인이 가진 그룹만 수정할 수 있습니다.");
        }
        LocalDateTime now = LocalDateTime.now();
        String groupMemo= request.groupMemo();
        if(groupMemo != null && groupMemo.isBlank()){
            groupMemo=group.getGroupMemo();
        }
        String groupName= request.groupName();
        if(groupName != null && groupName.isBlank()){
            groupName=group.getGroupName();
        }
        group.update(now, groupMemo, groupName);
        String message = groupName+"의 수정이 완료되었습니다!";
        return new MsgResponse(message, "200");
    }

    @Transactional
    public MsgResponse deleteGroup(Long groupId, String token){
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 그룹입니다."));
        User user = findUserByToken(token);
        if(!group.getUser().getId().equals(user.getId())){
            throw new IllegalArgumentException("본인이 생성한 그룹만 삭제할 수 있습니다.");
        }
        List<PlaceGroup> places = placeGroupRepository.findByGroupId(groupId);
        for (PlaceGroup placeGroup : places) {
            placeGroupRepository.delete(placeGroup);
        }
        String message = group.getGroupName()+"의 삭제가 완료되었습니다!";
        groupRepository.delete(group);
        return new MsgResponse(message, "200");
    }

//    토큰검증 기능은 복붙
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

package org.example.group.controller;


import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.common.dto.MsgResponse;
import org.example.config.JwtAuthenticationFilter;
import org.example.group.dto.*;
import org.example.group.service.GroupService;
import org.example.placeGroup.dto.AddPlaceDto;
import org.example.placeGroup.dto.DeletePlaceDto;
import org.example.placeGroup.service.PlaceGroupService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/group")
@Tag(name="Group", description = "그룹 API")
public class GroupController {
    private final GroupService groupService;
    private final PlaceGroupService placeGroupService;

    @Operation(
            summary = "그룹 생성",
            description = "토큰을 받아서 유저를 확인 후 그룹을 추가합니다."
    )
    @PostMapping("/create")
    @ResponseStatus(HttpStatus.CREATED)
    public CreateResponseDto createGroup(@RequestHeader(JwtAuthenticationFilter.TOKEN_HEADER) String token,
                              @Valid @RequestBody CreateGroupDto request) {
        return groupService.createGroup(token, request);
    }

    @Operation(
            summary = "그룹 조회",
            description = "경로에서 groupId를 받아서 그룹의 정보를 반환합니다."
    )
    @GetMapping("/{groupId}")
    @ResponseStatus(HttpStatus.OK)
    public GetResponseDto getGroupDetail(@PathVariable("groupId") Long groupId){
        return groupService.getGroupDetail(groupId);
    }

    @Operation(
            summary = "내 그룹 조회",
            description = "토큰으로 내 그룹들을 조회해서 가진 그룹들의 id를 반환합니다."
    )
    @GetMapping("/my")
    @ResponseStatus(HttpStatus.OK)
    public GetGroupsResponseDto getMyGroups(@RequestHeader(JwtAuthenticationFilter.TOKEN_HEADER) String token){
        return groupService.getMyGroups(token);
    }

    @Operation(
            summary = "그룹 공유",
            description = "토큰을 받아서 유저를 확인 후 접속할 수 있는 URL을 반환합니다."
    )
    @GetMapping("/{groupId}/share")
    @ResponseStatus(HttpStatus.OK)
    public ShareResponseDto shareGroup(@PathVariable("groupId") Long groupId){
        return groupService.shareGroup(groupId);
    }

    @Operation(
            summary = "그룹 복제",
            description = "토큰을 받아서 유저를 확인 후 이미 존재하는 그룹의 내용들을 복제합니다."
    )
    @PostMapping("/{groupId}/clone")
    @ResponseStatus(HttpStatus.CREATED)
    public MsgResponse cloneGroup(@PathVariable("groupId") Long groupId,
                                  @RequestHeader(JwtAuthenticationFilter.TOKEN_HEADER) String token,
                                  @Valid @RequestBody CloneGroupDto request
    ){
        return groupService.cloneGroup(groupId, token, request);
    }

    @Operation(
            summary = "그룹에서 장소 추가",
            description = "토큰을 받아서 유저를 확인 후 본인 소유그룹에 장소를 추가합니다."
    )
    @PostMapping("/{groupId}/addPlace")
    @ResponseStatus(HttpStatus.CREATED)
    public MsgResponse addPlace(@PathVariable("groupId") Long groupId,
                                @RequestHeader(JwtAuthenticationFilter.TOKEN_HEADER) String token,
                                @Valid @RequestBody AddPlaceDto request) {
        if (!groupId.equals(request.groupId())) {
            throw new IllegalArgumentException("추가하려는 그룹과 경로의 그룹이 일치하지 않습니다.");
        }
        return placeGroupService.addPlace(token, request, false);
    }

    @Operation(
            summary = "그룹에서 장소 삭제",
            description = "토큰을 받아서 유저를 확인 후 본인 소유 그룹에서 장소를 삭제합니다."
    )
    @DeleteMapping("/{groupId}/deletePlace")
    @ResponseStatus(HttpStatus.OK)
    public MsgResponse deletePlace(@PathVariable("groupId") Long groupId,
                                   @RequestHeader(JwtAuthenticationFilter.TOKEN_HEADER) String token,
                                   @Valid @RequestBody DeletePlaceDto request){
        return placeGroupService.deletePlace(groupId, token, request);
    }

    @Operation(
            summary = "그룹 수정",
            description = "토큰을 받아서 유저를 확인 후 그룹의 이름, 내용, 생성일(수정시 현재 시각)을 수정합니다."
    )
    @PutMapping("/{groupId}/update")
    @ResponseStatus(HttpStatus.OK)
    public MsgResponse updateGroup(@PathVariable("groupId") Long groupId,
                                  @RequestHeader(JwtAuthenticationFilter.TOKEN_HEADER) String token,
                                  @Valid @RequestBody EditGroupDto request
    ){

        return groupService.updateGroup(groupId, token, request);
    }

    @Operation(
            summary = "그룹 삭제",
            description = "토큰을 받아서 유저를 확인 후 본인 소유 그룹을 삭제합니다."
    )
    @DeleteMapping("/{groupId}/delete")
    @ResponseStatus(HttpStatus.OK)
    public MsgResponse deleteGroup(@PathVariable("groupId") Long groupId,
                                   @RequestHeader(JwtAuthenticationFilter.TOKEN_HEADER) String token){
        return groupService.deleteGroup(groupId, token);
    }
}
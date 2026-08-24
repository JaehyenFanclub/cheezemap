package org.example.message.contoller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.common.dto.MsgResponse;
import org.example.config.JwtAuthenticationFilter;
import org.example.message.dto.*;
import org.example.message.service.MessageService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/message")
@Tag(name="Message", description = "메시지 API")
public class MessageController {
    private final MessageService messageService;

    @Operation(
            summary = "메시지 송신",
            description = "토큰을 받아서 유저를 확인 후 대상의 id를 받아서 메시지를 송신"
    )
    @PostMapping("/{receptId}/send")
    @ResponseStatus(HttpStatus.CREATED)
    public MsgResponse sendMessage(@RequestHeader(JwtAuthenticationFilter.TOKEN_HEADER) String token,
                                   @PathVariable("receptId") Long receptId,
                                   @Valid @RequestBody SendMessage request) {
        return messageService.sendMessage(token, receptId, request);
    }

    @Operation(
            summary = "메시지 조회",
            description = "토큰을 받아서 유저를 확인 후 대상의 id를 받아서 메시지들을 조회"
    )
    @GetMapping("/{sendId}/recept")
    @ResponseStatus(HttpStatus.OK)
    public List<GetMessagesResponse> getMessages(@RequestHeader(JwtAuthenticationFilter.TOKEN_HEADER) String token,
                                                 @PathVariable("sendId") Long sendId) {
        return messageService.getMessages(token, sendId);
    }

    @Operation(
            summary = "대화 상대 조회",
            description = "토큰을 받아서 유저를 확인 후 현재 대화 상대들을 조회"
    )
    @GetMapping("/recept")
    @ResponseStatus(HttpStatus.OK)
    public List<GetChatterResponse> getChatters(@RequestHeader(JwtAuthenticationFilter.TOKEN_HEADER) String token) {
        return messageService.getChatters(token);
    }

    @Operation(
            summary = "메시지 삭제",
            description = "토큰을 받아서 유저를 확인 후 메시지를 삭제"
    )
    @DeleteMapping("/{messageId}/delete")
    @ResponseStatus(HttpStatus.OK)
    public MsgResponse deleteMessage(@RequestHeader(JwtAuthenticationFilter.TOKEN_HEADER) String token,
                                                 @PathVariable("messageId") Long messageId) {
        return messageService.deleteMessage(token, messageId);
    }

    @Operation(
            summary = "메시지 수정",
            description = "토큰을 받아서 유저를 확인 후 메시지를 수정"
    )
    @PutMapping("/{messageId}/update")
    @ResponseStatus(HttpStatus.OK)
    public MsgResponse updateMessage(@RequestHeader(JwtAuthenticationFilter.TOKEN_HEADER) String token,
                                     @PathVariable("messageId") Long messageId,
                                     @Valid @RequestBody UpdateMessage request) {
        return messageService.updateMessage(token, messageId, request);
    }

    @Operation(
            summary = "메시지 체크",
            description = "토큰을 받아서 유저를 확인하지 않은 메시지의 개수를 확인"
    )
    @GetMapping("/check")
    @ResponseStatus(HttpStatus.OK)
    public Long checkMessage(@RequestHeader(JwtAuthenticationFilter.TOKEN_HEADER) String token) {
        return messageService.checkMessage(token);
    }

    @Operation(
            summary = "대화상대 찾기",
            description = "닉네임을 받아서 id를 반환"
    )
    @GetMapping("/{nickName}/find")
    @ResponseStatus(HttpStatus.OK)
    public Long findUser(@PathVariable("nickName") String nickName) {
        return messageService.findUser(nickName);
    }
}

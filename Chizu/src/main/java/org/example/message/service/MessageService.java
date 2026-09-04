package org.example.message.service;

import io.jsonwebtoken.JwtException;
import lombok.RequiredArgsConstructor;
import org.example.common.dto.MsgResponse;
import org.example.config.JwtTokenProvider;
import org.example.config.TokenBlacklist;
import org.example.message.dto.*;
import org.example.message.entity.Message;
import org.example.message.repository.MessageRepository;
import org.example.user.service.UserDisplayNames;
import org.example.user.entity.User;
import org.example.user.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@RequiredArgsConstructor
@Service
public class MessageService {
    private final MessageRepository messageRepository;
    private final UserRepository userRepository;
    private final TokenBlacklist tokenBlacklist;
    private final JwtTokenProvider jwtTokenProvider;

    @Transactional
    public MsgResponse sendMessage(String token, Long receptId, SendMessage request){
        User sendUser = findUserByToken(token);
        User receptUser = userRepository.findById(receptId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 유저입니다."));
        if(request.content().isBlank()){
            throw new IllegalArgumentException("내용이 비어있으면 안됩니다.");
        }
        Message messsage = Message.builder()
                .messageDate(LocalDateTime.now())
                .isRecepted(false)
                .content(request.content())
                .isEdited(false)
                .sendUser(sendUser)
                .receptUser(receptUser)
                .build();
        messageRepository.save(messsage);
        String msg = receptUser.getUserNickname()+"님에게 메시지를 송신했습니다!";
        return new MsgResponse(msg,"201");
    }

    @Transactional
    public List<GetMessagesResponse> getMessages(String token, Long receptId){
        User sendUser = findUserByToken(token);
        User receptUser = userRepository.findById(receptId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 유저입니다."));
        List<Message> messageList = messageRepository.findByUsers(sendUser.getId(),receptUser.getId());
        List<GetMessagesResponse> messages = new ArrayList<>();
        for(Message message : messageList){
            if(message.getReceptUser().getId().equals(sendUser.getId()) && !message.getIsRecepted()){
                message.toggleRecpeted();
            }
            boolean isSendByMe = sendUser.getId().equals(message.getSendUser().getId());
            messages.add(new GetMessagesResponse(
                    message.getMessageId(),
                    message.getMessageDate(),
                    message.getContent(),
                    message.getIsEdited(),
                    isSendByMe
            ));
        }
        return messages;
    }

    @Transactional
    public List<GetChatterResponse> getChatters(String token){
        User user = findUserByToken(token);
        List<Long> chattersList = messageRepository.findAllChatters(user.getId());
        List<GetChatterResponse> result = new ArrayList<>();
        for(Long id : chattersList){
            List<Message> messages = messageRepository.findByUsers(user.getId(),id);
            if(messages.isEmpty()){
                throw new IllegalArgumentException("대화내용이 없습니다.");
            }
            Message message = messages.get(messages.size() - 1);
            User chatter = userRepository.findById(id)
                    .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 유저입니다."));
            result.add(new GetChatterResponse(
                    UserDisplayNames.nickname(chatter),
                    message.getContent(),
                    message.getMessageDate(),
                    id
            ));
        }
        return result;
    }

    @Transactional
    public MsgResponse deleteMessage(String token, Long messageId){
        User user = findUserByToken(token);
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new IllegalArgumentException("해당하는 메시지가 없습니다."));
        if(!user.getId().equals(message.getSendUser().getId())){
            throw new IllegalArgumentException("자신의 메시지만 삭제할 수 있습니다.");
        }
        messageRepository.delete(message);
        String msg="메시지를 삭제했습니다.";
        return new MsgResponse(msg,"200");
    }

    @Transactional
    public MsgResponse updateMessage(String token, Long messageId, UpdateMessage request){
        User user = findUserByToken(token);
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new IllegalArgumentException("해당하는 메시지가 없습니다."));
        if(!user.getId().equals(message.getSendUser().getId())){
            throw new IllegalArgumentException("자신의 메시지만 수정할 수 있습니다.");
        }
        if(request.content().isBlank()){
            throw new IllegalArgumentException("수정할 내용이 비어있으면 안 됩니다.");
        }
        message.update(request.content());
        String msg = "수정이 완료되었습니다!";
        return new MsgResponse(msg,"200");
    }

    public Long checkMessage(String token){
        User user = findUserByToken(token);
        List<Message> messages = messageRepository.findByReceptUser(user);
        Long count = 0L;
        for(Message message : messages){
            if(!message.getIsRecepted()){
                count += 1;
            }
        }
        return count;
    }

    public Long findUser(String nickName){
        return userRepository.findByUserNicknameAndDeletedFalse(nickName)
                .map(User::getId)
                .orElseThrow(() -> new IllegalArgumentException("해당 닉네임을 가진 유저가 없습니다."));
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

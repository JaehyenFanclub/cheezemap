package org.example.message.entity;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.example.user.entity.User;

import java.time.LocalDateTime;

@Getter
@Entity
@Table
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Message {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "messageId", nullable = false)
    private Long messageId;

    @Column(name = "messageDate", nullable = false)
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime messageDate;

    @Column(name = "isRecepted", nullable = false)
    private Boolean isRecepted;

    @Column(name = "content", columnDefinition = "TEXT")
    @NotBlank
    private String content;

    @Column(name = "isEdited")
    private Boolean isEdited;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "send_id", nullable = false)
    private User sendUser;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recept_id", nullable = false)
    private User receptUser;

    @Builder
    Message(
            LocalDateTime messageDate,
            Boolean isRecepted,
            String content,
            Boolean isEdited,
            User sendUser,
            User receptUser
    ){
        this.messageDate = messageDate;
        this.isRecepted = isRecepted;
        this.content = content;
        this.isEdited = isEdited;
        this.sendUser = sendUser;
        this.receptUser = receptUser;
    }

    public void update(String content){
        this.content = content;
        this.isEdited = true;
    }

    public void toggleRecpeted(){
        this.isRecepted=true;
    }
}

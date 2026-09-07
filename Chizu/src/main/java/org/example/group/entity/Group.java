package org.example.group.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.example.user.entity.User;

import java.time.LocalDateTime;

//group은 sql예약어라 사용불가 => 테이블 명을 table_group로 변경
@Getter
@Entity
@Table(name = "table_group")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Group {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "groupId", nullable = false)
    private Long groupId;

    @Column(name = "groupDate", nullable = false)
    private LocalDateTime groupDate;

    @Column(name = "groupMemo")
    private String groupMemo;

    @Column(name = "groupName", nullable = false)
    private String groupName;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "cloneCount")
    private Long cloneCount = 0L;

    @Builder
    private Group(
            Long groupId,
            LocalDateTime groupDate,
            String groupMemo,
            String groupName,
            User user
    ){
        this.groupId=groupId;
        this.groupDate=groupDate;
        this.groupMemo=groupMemo;
        this.groupName=groupName;
        this.user=user;
    }

    public void update(LocalDateTime groupDate, String groupMemo, String groupName){
        if(groupDate!=null){
            this.groupDate=groupDate;
        }
        this.groupMemo=groupMemo;
        if(groupName!=null){
            this.groupName=groupName;
        }
    }

    public void increaseCloneCount(){
        this.cloneCount += 1;
    }
}

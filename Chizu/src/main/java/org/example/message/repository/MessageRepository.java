package org.example.message.repository;

import org.example.message.entity.Message;
import org.example.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface MessageRepository extends JpaRepository<Message, Long> {
    @Query("SELECT m FROM Message m " +
            "WHERE (m.sendUser.id = :sendId AND m.receptUser.id = :receptId) " +
            "OR (m.sendUser.id = :receptId AND m.receptUser.id = :sendId) ORDER BY m.messageDate ASC")
    List<Message> findByUsers(@Param("sendId") Long sendId,
                              @Param("receptId") Long receptId);

    @Query("SELECT DISTINCT CASE WHEN m.sendUser.id = :sendId THEN m.receptUser.id ELSE m.sendUser.id END " +
            "FROM Message m " +
            "WHERE m.sendUser.id = :sendId OR m.receptUser.id = :sendId")
    List<Long> findAllChatters(@Param("sendId") Long sendId);

    List<Message> findByReceptUser(User receptUser);
}

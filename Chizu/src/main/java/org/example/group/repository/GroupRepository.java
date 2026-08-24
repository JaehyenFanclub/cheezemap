package org.example.group.repository;

import org.example.group.entity.Group;
import org.example.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface GroupRepository extends JpaRepository<Group, Long> {
    List<Group> findByUser(User user);
    Group findByGroupId(Long aLong);
}

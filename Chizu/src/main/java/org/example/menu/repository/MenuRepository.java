package org.example.menu.repository;

import org.example.menu.domain.Menu;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MenuRepository extends JpaRepository<Menu, Long> {

    List<Menu> findByPlace_PlaceId(Long placeId);
}

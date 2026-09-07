package org.example.menu.repository;

import org.example.menu.domain.MenuPhoto;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MenuPhotoRepository extends JpaRepository<MenuPhoto, Long> {

    List<MenuPhoto> findByMenu_MenuId(Long menuId);

}

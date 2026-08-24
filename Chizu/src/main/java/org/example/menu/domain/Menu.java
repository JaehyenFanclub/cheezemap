package org.example.menu.domain;

import jakarta.persistence.*;
import lombok.*;
import org.example.menu.dto.MenuUpdateRequest;
import org.example.place.domain.Place;

@Entity
@Table(name = "menu")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder

public class Menu {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "menuId")
    private Long menuId;

    @Column(name = "menuName")
    private String menuName;

    @Column(name = "menuValue")
    private String menuValue;

    @Column(name = "menuInfo")
    private String menuInfo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "placeId")
    private Place place;

    public void updateMenuInfo(MenuUpdateRequest dto){
        this.menuName = dto.getMenuName();
        this.menuValue = dto.getMenuValue();
        this.menuInfo = dto.getMenuInfo();
    }

}

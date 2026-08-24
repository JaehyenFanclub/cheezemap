package org.example.autoPlace.Entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "autoPlacePhoto")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@ToString(exclude = "autoPlace") // 순환 참조 방지
public class AutoPlacePhoto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "photoId")
    private Long photoId;

    // 신버전 API의 photos.name 및 생성된 Google Media URL 저장 용도
    @Column(name = "photoUrl", length = 1000, nullable = false)
    private String photoUrl;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "autoPlaceId")
    private AutoPlace autoPlace;
}

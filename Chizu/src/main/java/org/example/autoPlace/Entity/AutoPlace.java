package org.example.autoPlace.Entity;


import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "autoPlace")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class AutoPlace {

    @Id
    @Column(name = "autoPlaceId", length = 255)
    private String autoPlaceId;

    @Column(name = "placeName")
    private String name;

    @Column(name = "placeCategory")
    private String category;

    @Column(name = "placeAddress")
    private String address;

    @Column(name = "openTime")
    private LocalTime openTime;

    @Column(name = "closeTime")
    private LocalTime closeTime;

    @Column(name = "autoLatitude")
    private Double autoLatitude;

    @Column(name = "autoLongitude")
    private Double autoLongitude;

    // ---------------- 추가된 필드 ----------------
    @Column(name = "rating")
    private Double rating; // 평점 (예: 4.5)

    @Column(name = "userRatingCount")
    private Integer userRatingCount; // 리뷰 수 (예: 1250)
    // --------------------------------------------

    @Builder.Default
    @OneToMany(mappedBy = "autoPlace", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<AutoPlacePhoto> photos = new ArrayList<>();

    public void addPhoto(AutoPlacePhoto photo) {
        if (this.photos == null) {
            this.photos = new ArrayList<>();
        }
        this.photos.add(photo);
        photo.setAutoPlace(this); // 양방향 세팅
    }

    public void clearPhotos() {
        if (this.photos != null) {
            for (AutoPlacePhoto photo : this.photos) {
                photo.setAutoPlace(null); // 참조 해제
            }
            this.photos.clear();
        }
    }
}
package org.example.place.domain;

import jakarta.persistence.*;
import lombok.*;
import org.example.place.dto.PlacePhotoResponse;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "placePhoto")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class PlacePhoto {


    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "placePhotoId")
    private Long placePhotoId;

    @CreatedDate
    @Column(name = "photoDate")
    private LocalDateTime photoDate;

    @Column(name = "photoUrl")
    private String photoUrl;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "placeId")
    private Place place;

}

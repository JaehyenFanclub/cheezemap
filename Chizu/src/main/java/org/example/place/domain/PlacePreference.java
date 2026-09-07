package org.example.place.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.example.common.entity.BaseEntity;
import org.example.common.enums.AgeGroup;
import org.example.common.enums.GenderGroup;

@Entity
@Table(
        name = "place_preference",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_place_preference_segment",
                columnNames = {"place_id", "age_group", "gender"}
        )
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PlacePreference extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "place_id", nullable = false)
    private Place place;

    @Enumerated(EnumType.STRING)
    @Column(name = "age_group", nullable = false)
    private AgeGroup ageGroup;

    @Enumerated(EnumType.STRING)
    @Column(name = "gender", nullable = false)
    private GenderGroup gender;

    @Column(name = "hit_count", nullable = false)
    private int hitCount;

    public PlacePreference(Place place, AgeGroup ageGroup, GenderGroup gender) {
        this.place = place;
        this.ageGroup = ageGroup;
        this.gender = gender;
        this.hitCount = 0;
    }

    public void increment(int weight) {
        this.hitCount += weight;
    }
}

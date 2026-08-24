package org.example.place.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.common.enums.AgeGroup;
import org.example.common.enums.GenderGroup;
import org.example.place.domain.Place;
import org.example.place.domain.PlacePreference;
import org.example.place.repository.PlacePreferenceRepository;
import org.example.place.repository.PlaceRepository;
import org.example.user.entity.User;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class PlacePreferenceService {

    public static final int WEIGHT_VIEW = 1;
    public static final int WEIGHT_LIKE = 2;
    public static final int WEIGHT_SAVE = 3;
    public static final int WEIGHT_REVIEW = 5;

    private final PlacePreferenceRepository placePreferenceRepository;
    private final PlaceRepository placeRepository;
    private final ObjectProvider<PlacePreferenceService> self;

    public void increase(User user, Place place, int weight) {
        if (user == null || place == null || place.getPlaceId() == null || weight <= 0) {
            return;
        }

        AgeGroup ageGroup = AgeGroup.fromBirth(user.getBirth());
        GenderGroup gender = GenderGroup.fromSex(user.getSex());
        if (ageGroup == AgeGroup.UNKNOWN || gender == GenderGroup.UNKNOWN) {
            log.warn(
                    "place preference skip: userId={} birth={} sex={} ageGroup={} gender={}",
                    user.getId(),
                    user.getBirth(),
                    user.getSex(),
                    ageGroup,
                    gender
            );
            return;
        }

        try {
            self.getObject().applyHit(user.getId(), place.getPlaceId(), ageGroup, gender, weight);
        } catch (DataIntegrityViolationException ex) {
            try {
                self.getObject().applyHit(user.getId(), place.getPlaceId(), ageGroup, gender, weight);
            } catch (RuntimeException retryEx) {
                log.warn("place preference 증가 재시도 실패 placeId={} weight={}", place.getPlaceId(), weight, retryEx);
            }
        } catch (RuntimeException ex) {
            log.warn("place preference 증가 실패 placeId={} weight={}", place.getPlaceId(), weight, ex);
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void applyHit(Long userId, Long placeId, AgeGroup ageGroup, GenderGroup gender, int weight) {
        PlacePreference preference = placePreferenceRepository
                .findByPlace_PlaceIdAndAgeGroupAndGender(placeId, ageGroup, gender)
                .orElseGet(() -> {
                    PlacePreference created = new PlacePreference(
                            placeRepository.getReferenceById(placeId),
                            ageGroup,
                            gender
                    );
                    created.markCreated(userId);
                    return created;
                });
        preference.increment(weight);
        preference.markUpdated(userId);
        placePreferenceRepository.saveAndFlush(preference);
    }
}

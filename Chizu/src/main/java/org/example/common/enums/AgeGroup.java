package org.example.common.enums;

import java.time.LocalDate;
import java.time.Period;

public enum AgeGroup {
    TEENS,
    TWENTIES,
    THIRTIES,
    FORTIES,
    FIFTIES_PLUS,
    UNKNOWN;

    public static AgeGroup fromBirth(LocalDate birth) {
        if (birth == null) {
            return UNKNOWN;
        }

        int age = Period.between(birth, LocalDate.now()).getYears();
        if (age < 10 || age > 120) {
            return UNKNOWN;
        }
        if (age < 20) {
            return TEENS;
        }
        if (age < 30) {
            return TWENTIES;
        }
        if (age < 40) {
            return THIRTIES;
        }
        if (age < 50) {
            return FORTIES;
        }
        return FIFTIES_PLUS;
    }
}

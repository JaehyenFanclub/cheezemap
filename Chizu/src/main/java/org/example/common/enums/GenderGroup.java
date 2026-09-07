package org.example.common.enums;

public enum GenderGroup {
    MALE,
    FEMALE,
    UNKNOWN;

    public static GenderGroup fromSex(Boolean sex) {
        if (sex == null) {
            return UNKNOWN;
        }
        return sex ? MALE : FEMALE;
    }
}

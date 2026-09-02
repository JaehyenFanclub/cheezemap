package org.example.auth;

import org.example.auth.enums.SocialProvider;
import org.example.user.entity.User;

public final class SocialProfileCompletion {

    private SocialProfileCompletion() {
    }

    public static boolean isComplete(User user) {
        if (user.getProvider() == SocialProvider.LOCAL) {
            return true;
        }

        return hasText(user.getUserNickname())
                && hasText(user.getPhone())
                && user.getBirth() != null
                && user.getSex() != null;
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}

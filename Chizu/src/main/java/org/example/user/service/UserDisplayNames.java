package org.example.user.service;

import org.example.user.entity.User;

public final class UserDisplayNames {

    public static final String WITHDRAWN = "탈퇴한 사용자";

    private UserDisplayNames() {
    }

    public static String nickname(User user) {
        if (user == null || user.isDeleted()) {
            return WITHDRAWN;
        }

        String nickname = user.getUserNickname();
        if (nickname == null || nickname.isBlank()) {
            return WITHDRAWN;
        }

        return nickname;
    }
}

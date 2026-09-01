"use strict";

const PROFILE_LANGUAGE_KEY = "cheeseMapLanguage";

const profileTranslations = {
    ko: {
        title: "프로필 수정",
        description: "마이페이지에 표시되는 회원 정보를 수정합니다.",
        name: "이름",
        nickname: "닉네임",
        phone: "전화번호",
        birth: "생년월일",
        gender: "성별",
        male: "남성",
        female: "여성",
        photo: "프로필 사진",
        passwordChange: "비밀번호 변경",
        currentPassword: "현재 비밀번호",
        newPassword: "새 비밀번호",
        newPasswordConfirm: "새 비밀번호 확인",
        socialPasswordDescription: "비밀번호는 가입한 소셜 서비스에서 변경할 수 있습니다.",
        cancel: "취소",
        save: "수정 완료",
        saving: "수정 중...",
        backAria: "돌아가기",
        nameRequired: "이름을 입력해주세요.",
        nicknameRequired: "닉네임을 입력해주세요.",
        phoneRequired: "전화번호를 입력해주세요.",
        birthRequired: "생년월일을 선택해주세요.",
        genderRequired: "성별을 선택해주세요.",
        passwordAllRequired: "비밀번호 변경 시 세 항목을 모두 입력해주세요.",
        passwordLength: "새 비밀번호는 6자 이상이어야 합니다.",
        passwordMismatch: "새 비밀번호가 서로 다릅니다.",
        passwordSame: "현재 비밀번호와 다른 비밀번호를 입력해주세요.",
        socialLogin: "계정으로 로그인 중",
        success: "프로필이 수정되었습니다."
    },
    ja: {
        title: "プロフィール編集",
        description: "マイページに表示される会員情報を編集します。",
        name: "名前",
        nickname: "ニックネーム",
        phone: "電話番号",
        birth: "生年月日",
        gender: "性別",
        male: "男性",
        female: "女性",
        photo: "プロフィール写真",
        passwordChange: "パスワード変更",
        currentPassword: "現在のパスワード",
        newPassword: "新しいパスワード",
        newPasswordConfirm: "新しいパスワード（確認）",
        socialPasswordDescription: "パスワードは登録したSNSサービス側で変更できます。",
        cancel: "キャンセル",
        save: "変更を保存",
        saving: "保存中...",
        backAria: "戻る",
        nameRequired: "名前を入力してください。",
        nicknameRequired: "ニックネームを入力してください。",
        phoneRequired: "電話番号を入力してください。",
        birthRequired: "生年月日を選択してください。",
        genderRequired: "性別を選択してください。",
        passwordAllRequired: "パスワード変更時は3項目すべて入力してください。",
        passwordLength: "新しいパスワードは6文字以上で入力してください。",
        passwordMismatch: "新しいパスワードが一致しません。",
        passwordSame: "現在のパスワードとは異なるパスワードを入力してください。",
        socialLogin: "アカウントでログイン中",
        success: "プロフィールを更新しました。"
    },
    en: {
        title: "Edit Profile",
        description: "Update the member information shown on My Page.",
        name: "Name",
        nickname: "Nickname",
        phone: "Phone",
        birth: "Date of birth",
        gender: "Gender",
        male: "Male",
        female: "Female",
        photo: "Profile photo",
        passwordChange: "Change password",
        currentPassword: "Current password",
        newPassword: "New password",
        newPasswordConfirm: "Confirm new password",
        socialPasswordDescription: "Change your password through the social service you signed up with.",
        cancel: "Cancel",
        save: "Save changes",
        saving: "Saving...",
        backAria: "Go back",
        nameRequired: "Please enter your name.",
        nicknameRequired: "Please enter your nickname.",
        phoneRequired: "Please enter your phone number.",
        birthRequired: "Please select your date of birth.",
        genderRequired: "Please select your gender.",
        passwordAllRequired: "Fill in all three password fields to change your password.",
        passwordLength: "Your new password must be at least 6 characters.",
        passwordMismatch: "The new passwords do not match.",
        passwordSame: "Please enter a password different from your current password.",
        socialLogin: "account signed in",
        success: "Your profile has been updated."
    }
};

let currentProfileLanguage =
    localStorage.getItem(PROFILE_LANGUAGE_KEY) || "ko";

if (!profileTranslations[currentProfileLanguage]) {
    currentProfileLanguage = "ko";
}

let loadedProfileUser = null;

function pt(key) {
    return (
        profileTranslations[currentProfileLanguage]?.[key] ||
        profileTranslations.ko[key] ||
        key
    );
}

function setProfileMessage(message, success = false) {
    const element = document.getElementById("profileEditMessage");
    if (!element) return;

    element.textContent = message || "";
    element.className =
        success
            ? "form-message success"
            : "form-message";
}

function applyProfileLanguage(language) {
    currentProfileLanguage =
        profileTranslations[language]
            ? language
            : "ko";

    localStorage.setItem(
        PROFILE_LANGUAGE_KEY,
        currentProfileLanguage
    );

    document.documentElement.lang =
        currentProfileLanguage;

    document
        .querySelectorAll("[data-i18n]")
        .forEach(element => {
            element.textContent =
                pt(element.dataset.i18n);
        });

    document
        .querySelectorAll("[data-i18n-aria]")
        .forEach(element => {
            element.setAttribute(
                "aria-label",
                pt(element.dataset.i18nAria)
            );
        });

    document
        .querySelectorAll("[data-language]")
        .forEach(button => {
            button.classList.toggle(
                "active",
                button.dataset.language ===
                    currentProfileLanguage
            );
        });

    if (loadedProfileUser) {
        configureAccountType(
            loadedProfileUser.provider
        );
    }
}

function configureAccountType(provider) {
    const type =
        String(provider || "LOCAL")
            .toUpperCase();

    const isSocial =
        type !== "LOCAL";

    const passwordSection =
        document.getElementById(
            "localPasswordSection"
        );

    const socialGuide =
        document.getElementById(
            "socialPasswordGuide"
        );

    const badge =
        document.getElementById(
            "socialAccountBadge"
        );

    const title =
        document.getElementById(
            "socialPasswordTitle"
        );

    if (passwordSection) {
        passwordSection.hidden =
            isSocial;
    }

    if (socialGuide) {
        socialGuide.hidden =
            !isSocial;
    }

    if (badge) {
        badge.hidden = !isSocial;
        badge.textContent =
            isSocial
                ? `${type} ACCOUNT`
                : "";
    }

    if (title && isSocial) {
        if (
            currentProfileLanguage === "ja"
        ) {
            title.textContent =
                `${type} ${pt("socialLogin")}`;
        } else if (
            currentProfileLanguage === "en"
        ) {
            title.textContent =
                `${type} ${pt("socialLogin")}`;
        } else {
            title.textContent =
                `${type} ${pt("socialLogin")}`;
        }
    }
}

function renderProfileEditAvatar(photoUrl) {
    const avatar =
        document.getElementById(
            "profileEditAvatar"
        );

    if (!avatar) return;

    if (photoUrl) {
        avatar.innerHTML = `
            <img
                src="${photoUrl}"
                alt="Profile"
                class="profile-edit-avatar-image"
            >
        `;
        avatar.classList.add("has-photo");
    } else {
        avatar.innerHTML =
            '<i class="ti ti-user"></i>';

        avatar.classList.remove(
            "has-photo"
        );
    }
}

function formatPhone(value) {
    const numbers =
        String(value || "")
            .replace(/\D/g, "")
            .slice(0, 11);

    if (numbers.length < 4) {
        return numbers;
    }

    if (numbers.length < 8) {
        return (
            `${numbers.slice(0, 3)}-` +
            `${numbers.slice(3)}`
        );
    }

    return (
        `${numbers.slice(0, 3)}-` +
        `${numbers.slice(3, 7)}-` +
        `${numbers.slice(7)}`
    );
}

function getTrimmedValue(id) {
    return (
        document
            .getElementById(id)
            ?.value
            ?.trim() || ""
    );
}

async function loadProfileForEdit() {
    if (!getAuthToken()) {
        window.location.replace(
            "index.html?login=1"
        );
        return;
    }

    try {
        const response =
            await apiRequest(
                "/user/mypage",
                { auth: true }
            );

        const user =
            mapMyPageUser(response);

        loadedProfileUser = user;

        document.getElementById(
            "editName"
        ).value =
            user?.name || "";

        document.getElementById(
            "editNickname"
        ).value =
            user?.nickname || "";

        document.getElementById(
            "editPhone"
        ).value =
            formatPhone(
                user?.phone || ""
            );

        document.getElementById(
            "editBirth"
        ).value =
            user?.birth || "";

        if (
            user?.sex === true ||
            user?.sex === false
        ) {
            const radio =
                document.querySelector(
                    `input[name="sex"][value="${String(user.sex)}"]`
                );

            if (radio) {
                radio.checked = true;
            }
        }

        configureAccountType(
            user?.provider
        );

        renderProfileEditAvatar(
            user?.photoUrl
        );

        localStorage.setItem(
            "cheeseMapUser",
            JSON.stringify(user)
        );
    } catch (error) {
        console.error(
            "프로필 정보를 불러오지 못했습니다.",
            error
        );

        clearAuthToken();

        localStorage.removeItem(
            "cheeseMapUser"
        );

        window.location.replace(
            "index.html?login=1"
        );
    }
}

document
    .getElementById("editPhone")
    ?.addEventListener(
        "input",
        event => {
            event.target.value =
                formatPhone(
                    event.target.value
                );
        }
    );

document
    .getElementById("editPhoto")
    ?.addEventListener(
        "change",
        event => {
            const file =
                event.target
                    ?.files
                    ?.[0];

            if (!file) return;

            const previewUrl =
                URL.createObjectURL(file);

            renderProfileEditAvatar(
                previewUrl
            );
        }
    );

document
    .querySelectorAll(
        "[data-language]"
    )
    .forEach(button => {
        button.addEventListener(
            "click",
            () => {
                applyProfileLanguage(
                    button.dataset.language
                );
            }
        );
    });

document
    .getElementById("profileEditForm")
    ?.addEventListener(
        "submit",
        async event => {
            event.preventDefault();

            setProfileMessage("");

            const userName =
                getTrimmedValue(
                    "editName"
                );

            const userNickname =
                getTrimmedValue(
                    "editNickname"
                );

            const userPhone =
                getTrimmedValue(
                    "editPhone"
                );

            const birth =
                document
                    .getElementById(
                        "editBirth"
                    )
                    ?.value || "";

            const sexValue =
                document
                    .querySelector(
                        'input[name="sex"]:checked'
                    )
                    ?.value;

            if (!userName) {
                setProfileMessage(
                    pt("nameRequired")
                );
                return;
            }

            if (!userNickname) {
                setProfileMessage(
                    pt("nicknameRequired")
                );
                return;
            }

            if (!userPhone) {
                setProfileMessage(
                    pt("phoneRequired")
                );
                return;
            }

            if (!birth) {
                setProfileMessage(
                    pt("birthRequired")
                );
                return;
            }

            if (
                sexValue !== "true" &&
                sexValue !== "false"
            ) {
                setProfileMessage(
                    pt("genderRequired")
                );
                return;
            }

            const provider =
                String(
                    loadedProfileUser
                        ?.provider ||
                    "LOCAL"
                ).toUpperCase();

            const isLocal =
                provider === "LOCAL";

            const currentPassword =
                document
                    .getElementById(
                        "currentPassword"
                    )
                    ?.value || "";

            const newPassword =
                document
                    .getElementById(
                        "newPassword"
                    )
                    ?.value || "";

            const newPasswordConfirm =
                document
                    .getElementById(
                        "newPasswordConfirm"
                    )
                    ?.value || "";

            const wantsPasswordChange =
                isLocal &&
                Boolean(
                    currentPassword ||
                    newPassword ||
                    newPasswordConfirm
                );

            if (wantsPasswordChange) {
                if (
                    !currentPassword ||
                    !newPassword ||
                    !newPasswordConfirm
                ) {
                    setProfileMessage(
                        pt(
                            "passwordAllRequired"
                        )
                    );
                    return;
                }

                if (
                    newPassword.length < 6
                ) {
                    setProfileMessage(
                        pt("passwordLength")
                    );
                    return;
                }

                if (
                    newPassword !==
                    newPasswordConfirm
                ) {
                    setProfileMessage(
                        pt(
                            "passwordMismatch"
                        )
                    );
                    return;
                }

                if (
                    currentPassword ===
                    newPassword
                ) {
                    setProfileMessage(
                        pt("passwordSame")
                    );
                    return;
                }
            }

            const formData =
                new FormData();

            formData.append(
                "userName",
                userName
            );

            formData.append(
                "userNickname",
                userNickname
            );

            formData.append(
                "userPhone",
                userPhone.replace(
                    /\D/g,
                    ""
                )
            );

            formData.append(
                "birth",
                birth
            );

            formData.append(
                "sex",
                sexValue
            );

            if (
                wantsPasswordChange
            ) {
                formData.append(
                    "currentPassword",
                    currentPassword
                );

                formData.append(
                    "newPassword",
                    newPassword
                );

                formData.append(
                    "newPasswordConfirm",
                    newPasswordConfirm
                );
            }

            const photoInput =
                document.getElementById(
                    "editPhoto"
                );

            const photo =
                photoInput
                    ?.files
                    ?.[0];

            if (photo) {
                formData.append(
                    "photo",
                    photo
                );
            }

            const saveButton =
                document.querySelector(
                    ".save-button"
                );

            try {
                if (saveButton) {
                    saveButton.disabled = true;
                    saveButton.textContent =
                        pt("saving");
                }

                await apiRequest(
                    "/user/mypage/edit",
                    {
                        method: "PUT",
                        auth: true,
                        body: formData
                    }
                );

                const latestResponse =
                    await apiRequest(
                        "/user/mypage",
                        { auth: true }
                    );

                const latestUser =
                    mapMyPageUser(
                        latestResponse
                    );

                loadedProfileUser =
                    latestUser;

                localStorage.setItem(
                    "cheeseMapUser",
                    JSON.stringify(
                        latestUser
                    )
                );

                setProfileMessage(
                    pt("success"),
                    true
                );

                setTimeout(() => {
                    window.location.href =
                        "index.html";
                }, 500);
            } catch (error) {
                console.error(
                    "프로필 수정 실패:",
                    error
                );

                setProfileMessage(
                    error.message ||
                    "Profile update failed."
                );
            } finally {
                if (saveButton) {
                    saveButton.disabled = false;
                    saveButton.textContent =
                        pt("save");
                }
            }
        }
    );

applyProfileLanguage(
    currentProfileLanguage
);

loadProfileForEdit();

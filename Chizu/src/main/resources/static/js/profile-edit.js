const profileEditForm =
    document.getElementById(
        "profileEditForm"
    );

const profileEditMessage =
    document.getElementById(
        "profileEditMessage"
    );

const profileEditAvatar =
    document.getElementById(
        "profileEditAvatar"
    );

const saveButton =
    profileEditForm?.querySelector(
        ".save-button"
    );

let birthEditable = false;

function setProfileMessage(
    text,
    success = false
) {
    if (!profileEditMessage) return;

    profileEditMessage.className =
        success
            ? "form-message success"
            : "form-message";

    profileEditMessage.textContent =
        text || "";
}

function normalizeProfilePhotoUrl(photoUrl) {
    const raw =
        String(photoUrl || "")
            .trim();

    if (!raw) {
        return "";
    }

    if (/^https?:\/\//i.test(raw)) {
        return raw;
    }

    return raw.startsWith("/")
        ? raw
        : `/${raw}`;
}

function renderProfileEditAvatar(photoUrl) {
    if (!profileEditAvatar) return;

    const normalizedUrl =
        normalizeProfilePhotoUrl(
            photoUrl
        );

    if (!normalizedUrl) {
        profileEditAvatar.innerHTML = `
            <i class="ti ti-user"></i>
        `;

        profileEditAvatar.classList.remove(
            "has-photo"
        );

        return;
    }

    const separator =
        normalizedUrl.includes("?")
            ? "&"
            : "?";

    profileEditAvatar.innerHTML = `
        <img
            src="${normalizedUrl}${separator}v=${Date.now()}"
            alt="현재 프로필 사진"
            class="profile-edit-avatar-image"
        >
    `;

    profileEditAvatar.classList.add(
        "has-photo"
    );

    profileEditAvatar
        .querySelector("img")
        ?.addEventListener(
            "error",
            () => {
                profileEditAvatar.innerHTML = `
                    <i class="ti ti-user"></i>
                `;

                profileEditAvatar.classList.remove(
                    "has-photo"
                );
            },
            {
                once: true
            }
        );
}

function setProfileSubmitting(
    submitting
) {
    if (!saveButton) return;

    saveButton.disabled =
        submitting;

    saveButton.textContent =
        submitting
            ? "수정 중..."
            : "수정 완료";
}

function getTrimmedValue(id) {
    return String(
        document
            .getElementById(id)
            ?.value || ""
    ).trim();
}

function configureBirthField(birth) {
    const birthInput =
        document.getElementById(
            "editBirth"
        );

    if (!birthInput) return;

    const hasBirth =
        birth != null &&
        String(birth).trim() !== "";

    birthEditable = !hasBirth;
    birthInput.value = hasBirth
        ? String(birth)
        : "";
    birthInput.readOnly = hasBirth;
}

async function loadProfileForEdit() {
    if (!getAuthToken()) {
        window.location.href =
            "/";

        return;
    }

    try {
        const data =
            await apiRequest(
                "/user/mypage",
                {
                    auth: true
                }
            );

        const user =
            mapMyPageUser(
                data
            );

        document
            .getElementById("editName")
            .value =
                user?.name || "";

        document
            .getElementById("editNickname")
            .value =
                user?.nickname || "";

        document
            .getElementById("editEmail")
            .value =
                user?.email || "";

        document
            .getElementById("editPhone")
            .value =
                user?.phone || "";

        configureBirthField(
            user?.birth
        );

        renderProfileEditAvatar(
            user?.photoUrl
        );

        localStorage.setItem(
            "cheeseMapUser",
            JSON.stringify(user)
        );
    } catch (error) {
        setProfileMessage(
            error.message
        );

        setTimeout(
            () => {
                window.location.href =
                    "/";
            },
            1000
        );
    }
}

/*
    새 사진을 선택하면 저장 전에도
    프로필 수정 화면에서 바로 미리보기합니다.
*/
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

            if (profileEditAvatar) {
                profileEditAvatar.innerHTML = `
                    <img
                        src="${previewUrl}"
                        alt="새 프로필 사진 미리보기"
                        class="profile-edit-avatar-image"
                    >
                `;

                profileEditAvatar.classList.add(
                    "has-photo"
                );
            }
        }
    );

profileEditForm
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
                getTrimmedValue(
                    "editBirth"
                );

            if (!userName) {
                setProfileMessage(
                    "이름을 입력해주세요."
                );
                return;
            }

            if (!userNickname) {
                setProfileMessage(
                    "닉네임을 입력해주세요."
                );
                return;
            }

            if (!userPhone) {
                setProfileMessage(
                    "전화번호를 입력해주세요."
                );
                return;
            }

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
                        "비밀번호 변경 시 세 항목을 모두 입력해주세요."
                    );
                    return;
                }

                if (
                    newPassword.length < 6
                ) {
                    setProfileMessage(
                        "새 비밀번호는 6자 이상이어야 합니다."
                    );
                    return;
                }

                if (
                    newPassword !==
                    newPasswordConfirm
                ) {
                    setProfileMessage(
                        "새 비밀번호가 서로 다릅니다."
                    );
                    return;
                }

                if (
                    currentPassword ===
                    newPassword
                ) {
                    setProfileMessage(
                        "현재 비밀번호와 다른 비밀번호를 입력해주세요."
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
                userPhone
            );

            if (birthEditable && birth) {
                formData.append(
                    "birth",
                    birth
                );
            }

            if (wantsPasswordChange) {
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

            if (
                photoInput
                    ?.files
                    ?.[0]
            ) {
                formData.append(
                    "photo",
                    photoInput.files[0]
                );
            }

            try {
                setProfileSubmitting(
                    true
                );

                const result =
                    await apiRequest(
                        "/user/mypage/edit",
                        {
                            method: "PUT",
                            auth: true,
                            body: formData
                        }
                    );

                /*
                    DB 저장 완료 후 서버의 최신 프로필을 다시 읽어서
                    홈 헤더 / 마이페이지 / 프로필 수정 화면이 모두
                    같은 photoUrl을 사용하게 합니다.
                */
                const latestData =
                    await apiRequest(
                        "/user/mypage",
                        {
                            auth: true
                        }
                    );

                const latestUser =
                    mapMyPageUser(
                        latestData
                    );

                localStorage.setItem(
                    "cheeseMapUser",
                    JSON.stringify(
                        latestUser
                    )
                );

                renderProfileEditAvatar(
                    latestUser?.photoUrl
                );

                setProfileMessage(
                    result?.msg ||
                    "프로필이 수정되었습니다.",
                    true
                );

                setTimeout(
                    () => {
                        window.location.href =
                            "/";
                    },
                    700
                );
            } catch (error) {
                setProfileMessage(
                    error.message
                );
            } finally {
                setProfileSubmitting(
                    false
                );
            }
        }
    );

loadProfileForEdit();

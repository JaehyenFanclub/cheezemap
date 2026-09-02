/* =====================================================
   로그인 및 회원가입
   현재는 백엔드 연결 전 임시 localStorage 방식
===================================================== */

function normalizeHeaderProfilePhotoUrl(photoUrl) {
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

function renderHeaderProfilePhoto() {
    const avatar =
        document.getElementById(
            "headerProfileAvatar"
        );

    if (!avatar) return;

    const photoUrl =
        normalizeHeaderProfilePhotoUrl(
            currentUser?.photoUrl
        );

    if (!photoUrl) {
        avatar.innerHTML = `
            <i class="ti ti-user"></i>
        `;

        avatar.classList.remove(
            "has-photo"
        );

        return;
    }

    /*
        프로필 사진 교체 직후에도 브라우저 캐시 대신
        서버의 최신 사진을 보이게 합니다.
    */
    const separator =
        photoUrl.includes("?")
            ? "&"
            : "?";

    const src =
        `${photoUrl}${separator}v=${Date.now()}`;

    avatar.innerHTML = `
        <img
            src="${src}"
            alt="프로필 사진"
            class="header-profile-avatar-image"
        >
    `;

    avatar.classList.add(
        "has-photo"
    );

    avatar
        .querySelector("img")
        ?.addEventListener(
            "error",
            () => {
                avatar.innerHTML = `
                    <i class="ti ti-user"></i>
                `;

                avatar.classList.remove(
                    "has-photo"
                );
            },
            {
                once: true
            }
        );
}


function renderMyPageProfilePhoto() {
    const avatar =
        document.querySelector(
            ".mypage-avatar"
        );

    if (!avatar) return;

    const photoUrl =
        normalizeHeaderProfilePhotoUrl(
            currentUser?.photoUrl
        );

    if (!photoUrl) {
        avatar.innerHTML = `
            <i class="ti ti-user"></i>
        `;

        avatar.classList.remove(
            "has-photo"
        );

        return;
    }

    const separator =
        photoUrl.includes("?")
            ? "&"
            : "?";

    const src =
        `${photoUrl}${separator}v=${Date.now()}`;

    avatar.innerHTML = `
        <img
            src="${src}"
            alt="프로필 사진"
            class="mypage-avatar-image"
        >
    `;

    avatar.classList.add(
        "has-photo"
    );

    avatar
        .querySelector("img")
        ?.addEventListener(
            "error",
            () => {
                avatar.innerHTML = `
                    <i class="ti ti-user"></i>
                `;

                avatar.classList.remove(
                    "has-photo"
                );
            },
            {
                once: true
            }
        );
}


function updateHeaderAuthState() {
    const loginButton =
        document.getElementById(
            "loginButton"
        );

    const profileButton =
        document.getElementById(
            "profileButton"
        );

    const profileNickname =
        document.getElementById(
            "profileNickname"
        );

    const headerMessageButton =
        document.getElementById(
            "headerMessageButton"
        );


    const loggedIn =
        Boolean(currentUser);


    if (loginButton) {
        loginButton.hidden =
            loggedIn;
    }

    if (profileButton) {
        profileButton.hidden =
            !loggedIn;
    }

    if (headerMessageButton) {
        headerMessageButton.hidden =
            !loggedIn;
    }

    if (
        profileNickname &&
        currentUser
    ) {
        profileNickname.textContent =
            currentUser.nickname;
    }

    /*
        홈 화면 우측 프로필 버튼도
        /user/mypage에서 받은 currentUser.photoUrl을 사용합니다.
    */
    renderHeaderProfilePhoto();
    renderMyPageProfilePhoto();
}


/* 로그인 버튼 */

document
    .getElementById("loginButton")
    ?.addEventListener(
        "click",
        () => {
            openModal(loginModal);
        }
    );


/* 프로필 버튼 */

document
    .getElementById("profileButton")
    ?.addEventListener(
        "click",
        async () => {
            if (!getAuthToken()) {
                currentUser = null;
                updateHeaderAuthState();
                openModal(loginModal);
                return;
            }

            try {
                await fetchCurrentUser();
                updateHeaderAuthState();
                setMyPageTab("reviews");
                openModal(mypageModal);
            } catch (error) {
                console.error("마이페이지 조회 실패:", error);
                clearAuthToken();
                currentUser = null;
                localStorage.removeItem(STORAGE_KEYS.user);
                updateHeaderAuthState();
                openModal(loginModal);
            }
        }
    );


/* 모달 닫기 버튼 */

document
    .querySelectorAll("[data-modal-close]")
    .forEach(button => {
        button.addEventListener("click", event => {
            event.preventDefault();
            event.stopPropagation();

            const targetModal =
                button.closest(".modal-backdrop");

            closeModal(targetModal);
        });
    });


/* 로그인 → 회원가입 */

document
    .getElementById(
        "openSignupButton"
    )
    ?.addEventListener(
        "click",
        () => {
            openModal(
                signupModal
            );
        }
    );


/* 회원가입 → 로그인 */

document
    .getElementById(
        "openLoginButton"
    )
    ?.addEventListener(
        "click",
        () => {
            openModal(
                loginModal
            );
        }
    );


/* 모달 바깥 클릭 시 닫기 */

document
    .querySelectorAll(
        ".modal-backdrop"
    )
    .forEach(modal => {
        modal.addEventListener(
            "click",
            event => {
                if (
                    event.target === modal
                ) {
                    closeModal(
                        modal
                    );
                }
            }
        );
    });


/* ESC 키로 열린 모달 닫기 */

document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        closeAllModals();
    }
});


/* =====================================================
   로그인 처리 - Spring Boot/JWT
===================================================== */

document.getElementById("loginForm")?.addEventListener("submit", async event => {
    event.preventDefault();

    // await 이후 event.currentTarget가 null이 될 수 있으므로
    // submit 직후 폼 참조를 따로 보관합니다.
    const form = event.currentTarget;

    const email = document.getElementById("loginEmail")?.value.trim();
    const password = document.getElementById("loginPassword")?.value;
    const loginError = document.getElementById("loginError");
    const submitButton = form?.querySelector('button[type="submit"]');

    if (!email || !password) {
        if (loginError) loginError.textContent = translate("error.login");
        return;
    }

    try {
        if (loginError) loginError.textContent = "";
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = currentLanguage === "ja" ? "ログイン中..." : currentLanguage === "en" ? "Logging in..." : "로그인 중...";
        }

        const loginData = await apiRequest("/user/auth/login", {
            method: "POST",
            body: { userEmail: email, password }
        });

        setAuthToken(loginData.token);
        await fetchCurrentUser();

        form?.reset();
        closeModal(loginModal);
        updateHeaderAuthState();
        if (typeof updateMessageBadge === "function") updateMessageBadge();
        if (typeof applyCheeseSettings === "function") applyCheeseSettings();

        // 로그인 직후: 추천 카테고리 선택 UI를 표시하고 개인화 추천을 다시 불러온다.
        if (typeof renderRecommendedPlaces === "function") {
            await renderRecommendedPlaces(
                typeof getActiveRecommendationMapCategory === "function"
                    ? getActiveRecommendationMapCategory()
                    : "all",
                { force: true }
            );
        }

        showToast("toast.loginSuccess");
    } catch (error) {
        console.error("로그인 API 오류:", error);
        clearAuthToken();
        currentUser = null;
        localStorage.removeItem(STORAGE_KEYS.user);
        if (loginError) loginError.textContent = error.message;
        updateHeaderAuthState();
    } finally {
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = translate("auth.login");
        }
    }
});


/* 로그아웃 */

document.getElementById("logoutButton")?.addEventListener("click", async () => {
    try {
        if (getAuthToken()) {
            await apiRequest("/user/auth/logout", { method: "POST", auth: true });
        }
    } catch (error) {
        console.warn("로그아웃 API:", error);
    } finally {
        clearAuthToken();
        currentUser = null;
        localStorage.removeItem(STORAGE_KEYS.user);
        likedPlaces = [];
        favoritePlaces = [];
        writeStorage(STORAGE_KEYS.likes, likedPlaces);
        writeStorage(STORAGE_KEYS.favorites, favoritePlaces);
        updateFavoriteButtons?.();
        closeModal(mypageModal);
        updateHeaderAuthState();

        // 로그아웃 직후: 추천 카테고리 선택 UI를 숨기고
        // 토큰이 필요 없는 Google 주변 추천 장소로 즉시 전환한다.
        if (typeof renderRecommendedPlaces === "function") {
            await renderRecommendedPlaces(
                typeof getActiveRecommendationMapCategory === "function"
                    ? getActiveRecommendationMapCategory()
                    : "all",
                { force: true }
            );
        }

        showToast("toast.logoutSuccess");
    }
});


/* =====================================================
   마이페이지
===================================================== */

/* 과거 시연용 mockReviews 제거: 실제 리뷰는 reviews.js + 백엔드 Review API 사용 */



let currentMyPageTab =
    "reviews";

let myPageRenderRequestId = 0;


function setMyPageTab(tabName) {
    currentMyPageTab =
        ["reviews", "likes", "favorites"].includes(tabName)
            ? tabName
            : "reviews";


    document
        .querySelectorAll(
            "[data-mypage-tab]"
        )
        .forEach(button => {
            button.classList.toggle(
                "active",
                button.dataset.mypageTab ===
                    currentMyPageTab
            );
        });


    renderMyPage();
}


function renderMyPage() {
    if (!currentUser) {
        closeModal(mypageModal);

        openModal(
            loginModal
        );

        return;
    }


    const nickname =
        document.getElementById(
            "mypageNickname"
        );

    const email =
        document.getElementById(
            "mypageEmail"
        );


    if (nickname) {
        nickname.textContent =
            currentUser.nickname;
    }

    if (email) {
        email.textContent =
            currentUser.email;
    }

    renderMyPageProfilePhoto();


    const content =
        document.getElementById(
            "mypageContent"
        );

    if (!content) {
        return;
    }


    const renderRequestId =
        ++myPageRenderRequestId;

    if (currentMyPageTab === "reviews") {
        renderMyReviews(
            content,
            renderRequestId
        );
    } else if (currentMyPageTab === "likes") {
        renderMyLikes(
            content,
            renderRequestId
        );
    } else {
        renderMyFavorites(
            content,
            renderRequestId
        );
    }
}


// 마이페이지 - 기존 백엔드 구조를 그대로 사용해 내가 작성한 리뷰를 모아 표시합니다.
async function renderMyReviewsLegacy(container, renderRequestId = myPageRenderRequestId) {
    if (!getAuthToken() || !(typeof getCurrentUserId === "function" ? getCurrentUserId() : currentUser?.id)) {
        container.innerHTML = `
            <div class="mypage-empty">
                <div>
                    <i class="ti ti-message-circle"></i>
                    <p>${translate("empty.reviews")}</p>
                </div>
            </div>`;
        return;
    }

    container.innerHTML = `
        <div class="mypage-empty">
            <div>
                <i class="ti ti-loader-2"></i>
                <p>내 리뷰를 불러오는 중...</p>
            </div>
        </div>`;

    const stale = () =>
        renderRequestId !== myPageRenderRequestId ||
        currentMyPageTab !== "reviews";

    try {
        const placeIds = typeof getKnownBackendPlaceIds === "function"
            ? getKnownBackendPlaceIds()
            : [];

        const reviewGroups = await Promise.all(
            placeIds.map(async placeId => {
                try {
                    // 오래된 localStorage placeId는 실제 장소 존재 확인 후 리뷰 API 호출
                    const place = await getBackendPlaceById(placeId).catch(() => null);
                    if (!place) return [];

                    const rows = await apiRequest(`/place/${placeId}/review`);
                    return (Array.isArray(rows) ? rows : []).filter(
                        review => Number(review.userId) === Number(typeof getCurrentUserId === "function" ? getCurrentUserId() : currentUser?.id)
                    );
                } catch {
                    return [];
                }
            })
        );

        if (stale()) return;

        const myReviews = reviewGroups.flat().sort((a, b) => {
            return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        });

        if (!myReviews.length) {
            container.innerHTML = `
                <div class="mypage-empty">
                    <i class="ti ti-message-circle"></i>
                    <p>${translate("empty.reviews")}</p>
                </div>`;
            return;
        }

        const cards = await Promise.all(myReviews.map(async review => {
            const frontendKey = typeof backendPlaceIdToFrontendKey === "function"
                ? await backendPlaceIdToFrontendKey(review.placeId)
                : null;
            const stateKey = frontendKey
                ? (
                    String(frontendKey).startsWith("google_")
                        ? `google:${String(frontendKey).slice(7)}`
                        : `static:${frontendKey}`
                )
                : `place:${review.placeId}`;

            let placeName = `장소 #${review.placeId}`;
            let placeCategory = "";
            let placeAddress = "";

            try {
                if (typeof resolveBackendPlaceCardMeta === "function") {
                    const meta = await resolveBackendPlaceCardMeta(review.placeId, stateKey);
                    placeName = meta?.name || placeName;
                    placeCategory = meta?.category || "";
                    placeAddress = meta?.address || "";
                } else {
                    const backendPlace = await getBackendPlaceById(review.placeId);
                    placeName = backendPlace?.placeName || placeName;
                    placeCategory = backendPlace?.placeCategory || "";
                    placeAddress = backendPlace?.placeAddress || "";
                }
            } catch {}

            return `
                <article class="mypage-card" data-my-review-id="${review.reviewId}" data-my-review-place-id="${review.placeId}" data-my-review-place-key="${frontendKey || ""}" data-edit-rating="${review.rating}">
                    <span>${getReviewStars(review.rating)}</span>
                    <strong class="mypage-review-place">${escapeGroupHtml(placeName)}</strong>
                    ${
                        placeCategory
                            ? `<p class="mypage-place-category">${escapeGroupHtml(placeCategory)}</p>`
                            : ""
                    }
                    ${
                        placeAddress
                            ? `
                                <p class="mypage-place-address">
                                    <i class="ti ti-map-pin"></i>
                                    ${escapeGroupHtml(placeAddress)}
                                </p>
                            `
                            : ""
                    }
                    <p class="mypage-review-content">${escapeGroupHtml(review.content || "")}</p>
                    <div class="mypage-card-actions">
                        <button type="button" class="mypage-place-view-button" data-open-review-place="${review.placeId}">${currentLanguage === "ko" ? "장소 보기" : "場所を見る"}</button>
                        <button type="button" data-my-review-edit-toggle aria-expanded="false">${currentLanguage === "ko" ? "수정" : "編集"}</button>
                    </div>
                    <div class="place-review-edit mypage-review-edit" data-my-review-edit hidden>
                        <div class="place-review-edit-stars">
                            ${[1,2,3,4,5].map(rating => `<button type="button" data-my-review-rating="${rating}" class="${rating <= Number(review.rating) ? "selected" : ""}">${rating <= Number(review.rating) ? "★" : "☆"}</button>`).join("")}
                        </div>
                        <textarea data-my-review-content maxlength="500">${escapeGroupHtml(review.content || "")}</textarea>
                        <div class="place-review-edit-actions">
                            <button type="button" class="place-review-edit-cancel" data-my-review-cancel>${currentLanguage === "ko" ? "취소" : "キャンセル"}</button>
                            <button type="button" class="place-review-edit-save" data-my-review-save>${currentLanguage === "ko" ? "수정 완료" : "編集完了"}</button>
                        </div>
                    </div>
                </article>`;
        }));

        if (stale()) return;

        container.innerHTML = cards.join("");

        container.querySelectorAll("[data-open-review-place]").forEach(button => {
            button.addEventListener("click", () => {
                const placeId = Number(button.dataset.openReviewPlace);
                closeModal(mypageModal);
                if (typeof openBackendPlaceById === "function") {
                    openBackendPlaceById(placeId);
                }
            });
        });
    } catch (error) {
        if (stale()) return;

        container.innerHTML = `
            <div class="mypage-empty">
                <i class="ti ti-alert-circle"></i>
                <p>${escapeGroupHtml(error.message || "리뷰를 불러오지 못했습니다.")}</p>
            </div>`;
    }
}


async function resolveLikedStateRow(stateKey) {
    const normalized =
        typeof normalizePlaceStateKey === "function"
            ? normalizePlaceStateKey(stateKey)
            : String(stateKey || "");

    if (/^place:\d+$/.test(normalized)) {
        const placeId =
            backendPlaceIdFromStateKey(
                normalized
            );

        if (!placeId) return null;

        return {
            stateKey: normalized,
            placeId,
            place:
                await getBackendPlaceById(
                    placeId
                )
        };
    }

    if (normalized.startsWith("google:")) {
        const googlePlaceId =
            normalized.slice(
                "google:".length
            );

        const backendPlace =
            await ensureBackendPlace(
                `google_${googlePlaceId}`
            );

        const placeId =
            Number(
                backendPlace?.placeId
            );

        if (
            !Number.isFinite(placeId) ||
            placeId <= 0
        ) {
            return null;
        }

        return {
            stateKey: normalized,
            placeId,
            place:
                await getBackendPlaceById(
                    placeId
                )
        };
    }

    return null;
}


async function renderMyLikes(
    container,
    renderRequestId = myPageRenderRequestId
) {
    const stateKeys =
        likedPlaces.filter(
            key => /^place:\d+$/.test(String(key || ""))
        );

    if (!stateKeys.length) {
        container.innerHTML = `
            <div class="empty-state">
                <div>
                    <i class="ti ti-heart"></i>
                    <p>${translate("empty.likes")}</p>
                </div>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="empty-state">
            <div>
                <i class="ti ti-loader-2"></i>
                <p>
                    ${
                        currentLanguage === "ko"
                            ? "좋아요한 장소를 불러오는 중..."
                            : "いいねした場所を読み込み中..."
                    }
                </p>
            </div>
        </div>
    `;

    const resolvedRows = (
        await Promise.all(
            stateKeys.map(async stateKey => {
                const placeId =
                    backendPlaceIdFromStateKey(
                        stateKey
                    );

                if (!placeId) return null;

                try {
                    const place =
                        await getBackendPlaceById(
                            placeId
                        );

                    return {
                        stateKey,
                        placeId,
                        place
                    };
                } catch (error) {
                    console.error(
                        "좋아요 장소 조회 실패:",
                        placeId,
                        error
                    );
                    return null;
                }
            })
        )
    ).filter(Boolean);

    if (
        renderRequestId !== myPageRenderRequestId ||
        currentMyPageTab !== "likes"
    ) {
        return;
    }

    const seenPlaceIds = new Set();

    const rows =
        resolvedRows.filter(row => {
            if (
                !row?.placeId ||
                seenPlaceIds.has(row.placeId)
            ) {
                return false;
            }

            seenPlaceIds.add(row.placeId);
            return true;
        });

    if (!rows.length) {
        container.innerHTML = `
            <div class="empty-state">
                <div>
                    <i class="ti ti-heart"></i>
                    <p>${translate("empty.likes")}</p>
                </div>
            </div>
        `;
        return;
    }

    /*
        마이페이지 좋아요 카드의 장소 정보는
        무조건 백엔드 GET /place/{placeId} 응답만 사용합니다.
        Google 캐시 / AutoPlace / stateKey 보정값을 섞지 않습니다.
    */
    container.innerHTML =
        rows.map(({ stateKey, placeId, place }) => `
            <article class="mypage-card">
                <strong>
                    ${escapeGroupHtml(
                        place?.placeName ||
                        `장소 #${placeId}`
                    )}
                </strong>

                ${
                    place?.placeCategory
                        ? `
                            <p class="mypage-place-category">
                                ${escapeGroupHtml(
                                    place.placeCategory
                                )}
                            </p>
                        `
                        : ""
                }

                ${
                    place?.placeAddress
                        ? `
                            <p class="mypage-place-address">
                                <i class="ti ti-map-pin"></i>
                                ${escapeGroupHtml(
                                    place.placeAddress
                                )}
                            </p>
                        `
                        : ""
                }

                <div class="mypage-card-actions">
                    <button
                        type="button"
                        data-open-liked-place="${placeId}"
                    >
                        ${
                            currentLanguage === "ko"
                                ? "장소 보기"
                                : currentLanguage === "ja"
                                    ? "場所を見る"
                                    : "View place"
                        }
                    </button>

                    <button
                        type="button"
                        data-remove-like-state="${stateKey}"
                    >
                        ${
                            currentLanguage === "ko"
                                ? "좋아요 삭제"
                                : currentLanguage === "ja"
                                    ? "いいね削除"
                                    : "Remove"
                        }
                    </button>
                </div>
            </article>
        `).join("");

    container
        .querySelectorAll(
            "[data-open-liked-place]"
        )
        .forEach(button => {
            button.addEventListener(
                "click",
                async () => {
                    const placeId =
                        Number(
                            button.dataset.openLikedPlace
                        );

                    closeModal(mypageModal);

                    if (
                        typeof openBackendPlaceById === "function"
                    ) {
                        await openBackendPlaceById(
                            placeId
                        );
                    }
                }
            );
        });

    container
        .querySelectorAll(
            "[data-remove-like-state]"
        )
        .forEach(button => {
            button.addEventListener(
                "click",
                async () => {
                    const stateKey = button.dataset.removeLikeState;
                    const placeId = backendPlaceIdFromStateKey(stateKey);

                    if (!placeId) return;

                    try {
                        const result = await apiRequest(`/api/places/${placeId}/like`, {
                            method: "POST",
                            auth: true
                        });

                        if (result?.isLiked) {
                            // 서버가 여전히 좋아요 상태라면 서버 목록을 다시 기준으로 맞춥니다.
                            await syncBackendPlacePreferences?.();
                            return;
                        }

                        likedPlaces = likedPlaces.filter(
                            key => normalizePlaceStateKey(key) !== `place:${placeId}`
                        );
                        writeStorage(STORAGE_KEYS.likes, likedPlaces);

                        button.closest(".mypage-card")?.remove();
                        updateLikeButton?.();
                        updateFavoriteButtons?.();

                        const content = document.getElementById("mypageContent");
                        if (content && !content.querySelector(".mypage-card")) {
                            content.innerHTML = `
                                <div class="empty-state">
                                    <div>
                                        <i class="ti ti-heart"></i>
                                        <p>${translate("empty.likes")}</p>
                                    </div>
                                </div>
                            `;
                        }
                    } catch (error) {
                        console.error("좋아요 삭제 실패:", error);
                        showToast(
                            currentLanguage === "ko"
                                ? "좋아요 삭제에 실패했습니다."
                                : "いいねの削除に失敗しました。"
                        );
                    }
                }
            );
        });
}



// 마이페이지 리뷰 수정 - 실제 review API 사용
document.getElementById("mypageContent")?.addEventListener("click", async event => {
    const card = event.target.closest("[data-my-review-id]");
    if (!card) return;

    const reviewId = Number(card.dataset.myReviewId);
    const placeId = Number(card.dataset.myReviewPlaceId);
    const editArea = card.querySelector("[data-my-review-edit]");
    const toggleButton = card.querySelector("[data-my-review-edit-toggle]");

    if (event.target.closest("[data-my-review-edit-toggle]")) {
        const opening = !!editArea?.hidden;
        if (editArea) editArea.hidden = !opening;
        if (toggleButton) toggleButton.setAttribute("aria-expanded", String(opening));
        return;
    }

    const ratingButton = event.target.closest("[data-my-review-rating]");
    if (ratingButton) {
        const rating = Number(ratingButton.dataset.myReviewRating);
        card.dataset.editRating = String(rating);
        card.querySelectorAll("[data-my-review-rating]").forEach(button => {
            const value = Number(button.dataset.myReviewRating);
            button.textContent = value <= rating ? "★" : "☆";
            button.classList.toggle("selected", value <= rating);
        });
        return;
    }

    if (event.target.closest("[data-my-review-cancel]")) {
        if (editArea) editArea.hidden = true;
        if (toggleButton) toggleButton.setAttribute("aria-expanded", "false");
        return;
    }

    if (event.target.closest("[data-my-review-save]")) {
        const textarea = card.querySelector("[data-my-review-content]");
        const value = textarea?.value.trim() || "";
        if (!value) {
            showToast(currentLanguage === "ko" ? "리뷰 내용을 입력해주세요." : "レビュー内容を入力してください。");
            return;
        }

        const form = new FormData();
        form.append("rating", card.dataset.editRating || "5");
        form.append("content", value);

        try {
            await apiRequest(`/place/${placeId}/review/${reviewId}/edit`, {
                method: "PUT",
                auth: true,
                body: form
            });
            reviewCacheByPlace?.delete?.(String(placeId));
            await renderMyReviews(document.getElementById("mypageContent"));
            if (selectedPlaceKey && activeReviewBackendPlace?.placeId === placeId) {
                await renderPlaceReviews(selectedPlaceKey);
            }
            showToast(currentLanguage === "ko" ? "리뷰가 수정되었습니다." : "レビューを編集しました。");
        } catch (error) {
            showToast(error.message);
        }
    }
});

document
    .querySelectorAll(
        "[data-mypage-tab]"
    )
    .forEach(button => {
        button.addEventListener(
            "click",
            () => {
                setMyPageTab(
                    button.dataset.mypageTab
                );
            }
        );
    });


/* =====================================================
   기타 버튼
===================================================== */


window.addEventListener(
    "resize",
    () => {
        if (window.innerWidth > 850) {
            sidebar?.classList.remove(
                "open"
            );
        }
    }
);


document.addEventListener(
    "keydown",
    event => {
        if (event.key === "Escape") {
            closeAllModals();

            routePanel?.classList.remove(
                "show"
            );
            placeCard?.classList.remove("route-focus");

            placeCard?.classList.remove(
                "show"
            );
        }
    }
);






/* =====================================================
   OAuth2 제공자 목록 - 백엔드 설정 기준
===================================================== */

async function loadOAuthProviders() {
    const container = document.getElementById("socialLoginButtons");
    const divider = document.getElementById("socialLoginDivider");
    const errorNode = document.getElementById("socialLoginError");
    if (!container) return;

    try {
        const providers = await apiRequest("/user/auth/oauth2/providers");
        const rows = Array.isArray(providers) ? providers : [];

        container.innerHTML = rows.map(provider => {
            const id = String(provider?.id || "").toLowerCase().replace(/[^a-z0-9_-]/g, "");
            const name = String(provider?.name || provider?.id || "").trim();
            const authorizationUrl = String(provider?.authorizationUrl || "").trim();

            if (!id || !name || !authorizationUrl.startsWith("/")) {
                return "";
            }

            return `
                <a
                    href="${escapeGroupHtml(authorizationUrl)}"
                    class="social-login-button social-login-${id}"
                    data-provider="${escapeGroupHtml(id)}"
                >
                    ${escapeGroupHtml(name)}
                </a>
            `;
        }).join("");

        if (!container.children.length) {
            container.hidden = true;
            if (divider) divider.hidden = true;
        } else {
            container.hidden = false;
            if (divider) divider.hidden = false;
        }

        if (errorNode) errorNode.textContent = "";
    } catch (error) {
        console.error("OAuth 제공자 목록 조회 실패:", error);
        container.hidden = true;
        if (divider) divider.hidden = true;
        if (errorNode) {
            errorNode.textContent =
                currentLanguage === "ja"
                    ? "ソーシャルログインを読み込めませんでした。"
                    : currentLanguage === "en"
                        ? "Could not load social sign-in options."
                        : "소셜 로그인 정보를 불러오지 못했습니다.";
        }
    }
}

loadOAuthProviders();

/* =====================================================
   OAuth2 소셜 로그인 콜백 처리
===================================================== */

function needsSocialProfileCompletion(user) {
    if (!user) {
        return false;
    }

    if (user.profileComplete === true) {
        return false;
    }

    const provider = String(user.provider || "LOCAL").toUpperCase();
    if (provider === "LOCAL") {
        return false;
    }

    if (user.profileComplete === false) {
        return true;
    }

    return (
        !String(user.nickname || "").trim() ||
        !String(user.phone || "").trim() ||
        !String(user.birth || "").trim() ||
        user.sex == null
    );
}

async function handleOAuthCallback() {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const oauthError = params.get("oauth_error");

    if (!token && !oauthError) {
        return;
    }

    params.delete("token");
    params.delete("oauth_error");

    const nextQuery = params.toString();
    const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}${window.location.hash}`;
    window.history.replaceState({}, document.title, nextUrl);

    if (oauthError) {
        const socialLoginError = document.getElementById("socialLoginError");
        if (socialLoginError) {
            socialLoginError.textContent = decodeURIComponent(oauthError);
        }
        openModal(loginModal);
        return;
    }

    try {
        setAuthToken(token);
        const socialUser = await fetchCurrentUser();

        if (needsSocialProfileCompletion(socialUser)) {
            window.location.replace("complete-profile.html");
            return;
        }

        updateHeaderAuthState();
        if (typeof updateMessageBadge === "function") updateMessageBadge();
        if (typeof applyCheeseSettings === "function") applyCheeseSettings();
        showToast("toast.loginSuccess");
    } catch (error) {
        console.error("소셜 로그인 콜백 처리 실패:", error);
        clearAuthToken();
        currentUser = null;
        localStorage.removeItem(STORAGE_KEYS.user);
        updateHeaderAuthState();
        const socialLoginError = document.getElementById("socialLoginError");
        if (socialLoginError) {
            socialLoginError.textContent = error.message;
        }
        openModal(loginModal);
    }
}


/* 새로고침 후 JWT 로그인 복원 */
(async function restoreServerLogin() {
    await handleOAuthCallback();

    if (!getAuthToken()) {
        if (currentUser) {
            currentUser = null;
            localStorage.removeItem(STORAGE_KEYS.user);
            updateHeaderAuthState();
        }
        return;
    }
    try {
        const restoredUser = await fetchCurrentUser();

        if (
            needsSocialProfileCompletion(restoredUser) &&
            !window.location.pathname.endsWith("complete-profile.html")
        ) {
            window.location.replace("complete-profile.html");
            return;
        }

        updateHeaderAuthState();
        if (typeof applyCheeseSettings === "function") applyCheeseSettings();
    } catch (error) {
        console.warn("로그인 복원 실패:", error);
        clearAuthToken();
        currentUser = null;
        localStorage.removeItem(STORAGE_KEYS.user);
        updateHeaderAuthState();
    }
})();


/* =====================================================
   회원가입 페이지 -> 로그인 모달 바로 열기
   - signup.html의 index.html?login=1
   - sessionStorage cheeseMapOpenLogin
   두 방법을 모두 지원합니다.
===================================================== */

function openLoginModalFromSignup() {
    const params = new URLSearchParams(window.location.search);
    const requestedByQuery = params.get("login") === "1";
    const requestedBySession =
        sessionStorage.getItem("cheeseMapOpenLogin") === "1";

    if (!requestedByQuery && !requestedBySession) {
        return;
    }

    sessionStorage.removeItem("cheeseMapOpenLogin");

    if (requestedByQuery) {
        params.delete("login");

        const nextQuery = params.toString();
        const cleanUrl =
            `${window.location.pathname}` +
            `${nextQuery ? `?${nextQuery}` : ""}` +
            `${window.location.hash}`;

        window.history.replaceState(
            {},
            document.title,
            cleanUrl
        );
    }

    // 로그인된 사용자는 다시 로그인 모달을 띄우지 않습니다.
    if (getAuthToken()) {
        return;
    }

    const show = () => {
        openModal(loginModal);

        setTimeout(() => {
            document
                .getElementById("loginEmail")
                ?.focus();
        }, 50);
    };

    // account.js는 body 하단에서 로드되지만,
    // 다른 초기화 코드와 겹치는 상황까지 대비해 한 틱 뒤에 실행합니다.
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", show, { once: true });
    } else {
        setTimeout(show, 0);
    }
}

openLoginModalFromSignup();

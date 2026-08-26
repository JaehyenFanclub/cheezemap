/* =====================================================
   로그인 및 회원가입
   현재는 백엔드 연결 전 임시 localStorage 방식
===================================================== */

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
        closeModal(mypageModal);
        updateHeaderAuthState();
        showToast("toast.logoutSuccess");
    }
});


/* =====================================================
   마이페이지
===================================================== */

const mockReviews = [
    /* MR.EUM 수정부분: 마이페이지에 등록된 두 장소의 내 리뷰만 사용합니다. */
    {
        placeKey: "cafe",
        userName: "엄용민",
        isMine: true,
        rating: 5,
        content: {
            ko: "매장이 조용하고 치즈 디저트가 맛있었어요.",
            ja: "店内が静かで、チーズデザートがおいしかったです。"
        },
        date: "2026-07-20"
    },
    /* MR.EUM 수정부분: 마이페이지에 등록된 두 번째 내 리뷰 */
    {
        placeKey: "park",
        userName: "엄용민",
        isMine: true,
        rating: 4,
        content: {
            ko: "도심에서 산책하기 좋은 공원이었습니다.",
            ja: "都心で散歩するのに良い公園でした。"
        },
        date: "2026-07-18"
    },
     // [타인 리뷰 1] cafe 장소 - 다른 사람이 쓴 리뷰라 수정 버튼이 절대 나오면 안 됨
    {
        placeKey: "cafe",
        userName: "김철수",
        isMine: false,
        rating: 3,
        content: {
            ko: "커피 맛은 보통인데 자리가 조금 좁네요.",
            ja: "コーヒーの味は普通ですが、席이 조금 좁네요."
        },
        date: "2026-07-19"
    },
    // [내 리뷰 2] park 장소 - 수정 버튼 나와야 함
    {
        placeKey: "park",
        userName: "엄용민",
        isMine: true,
        rating: 4,
        content: {
            ko: "도심에서 산책하기 좋은 공원이었습니다.",
            ja: "都심에서 산책하기 좋은 공원이었습니다."
        },
        date: "2026-07-18"
    },
    // [타인 리뷰 2] park 장소 - 다른 사람이 쓴 리뷰라 수정 버튼이 절대 나오면 안 됨
    {
        placeKey: "park",
        userName: "야마다",
        isMine: false,
        rating: 5,
        content: {
            ko: "녹지가 풍부하고 힐링되는 공간입니다.",
            ja: "緑が豊かで、とても癒される空間です。"
        },
        date: "2026-07-17"
    }
];


let currentMyPageTab =
    "reviews";


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


    const content =
        document.getElementById(
            "mypageContent"
        );

    if (!content) {
        return;
    }


    if (currentMyPageTab === "reviews") {
        renderMyReviews(content);
    } else if (currentMyPageTab === "likes") {
        renderMyLikes(content);
    } else {
        renderMyFavorites(content);
    }
}


// 마이페이지 - 기존 백엔드 구조를 그대로 사용해 내가 작성한 리뷰를 모아 표시합니다.
async function renderMyReviews(container) {
    if (!getAuthToken() || !currentUser?.id) {
        container.innerHTML = `
            <div class="mypage-empty">
                <i class="ti ti-message-circle"></i>
                <p>${translate("empty.reviews")}</p>
            </div>`;
        return;
    }

    container.innerHTML = `
        <div class="mypage-empty">
            <i class="ti ti-loader-2"></i>
            <p>내 리뷰를 불러오는 중...</p>
        </div>`;

    try {
        const placeIds = typeof getKnownBackendPlaceIds === "function"
            ? getKnownBackendPlaceIds()
            : [];

        const reviewGroups = await Promise.all(
            placeIds.map(async placeId => {
                try {
                    const rows = await apiRequest(`/place/${placeId}/review`);
                    return (Array.isArray(rows) ? rows : []).filter(
                        review => Number(review.userId) === Number(currentUser.id)
                    );
                } catch {
                    return [];
                }
            })
        );

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
            let placeName = `장소 #${review.placeId}`;
            try {
                const backendPlace = await getBackendPlaceById(review.placeId);
                placeName = backendPlace?.placeName || placeName;
            } catch {}

            return `
                <article class="mypage-card" data-my-review-id="${review.reviewId}" data-my-review-place-id="${review.placeId}" data-my-review-place-key="${frontendKey || ""}" data-edit-rating="${review.rating}">
                    <span>${getReviewStars(review.rating)}</span>
                    <div class="mypage-review-place-row">
                        <i class="ti ti-map-pin"></i>
                        <strong class="mypage-review-place">${escapeGroupHtml(placeName)}</strong>
                    </div>
                    <p>${escapeGroupHtml(review.content || "")}</p>
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

        container.innerHTML = cards.join("");

        container.querySelectorAll("[data-open-place]").forEach(button => {
            button.addEventListener("click", () => {
                const placeKey = button.dataset.openPlace;
                if (!places[placeKey]) return;
                closeModal(mypageModal);
                openPlace(placeKey);
                googleMap?.panTo(places[placeKey].position);
                googleMap?.setZoom(15);
            });
        });
    } catch (error) {
        container.innerHTML = `
            <div class="mypage-empty">
                <i class="ti ti-alert-circle"></i>
                <p>${escapeGroupHtml(error.message || "리뷰를 불러오지 못했습니다.")}</p>
            </div>`;
    }
}


function renderMyLikes(container) {
    if (!likedPlaces.length) {
        container.innerHTML = `
            <div class="empty-state">
                <div>
                    <i class="ti ti-heart"></i>

                    <p>
                        ${translate("empty.likes")}
                    </p>
                </div>
            </div>
        `;

        return;
    }


    container.innerHTML =
        likedPlaces
            .filter(placeKey => {
                return Boolean(
                    places[placeKey]
                );
            })
            .map(placeKey => {
                const place =
                    places[placeKey];

                return `
                    <article class="mypage-card">
                        <strong>
                            ${
                                place.name[
                                    currentLanguage
                                ]
                            }
                        </strong>

                        <span>
                            ★ ${place.rating}
                        </span>

                        <p>
                            ${
                                place.address[
                                    currentLanguage
                                ]
                            }
                        </p>

                        <div class="mypage-card-actions">
                            <button
                                type="button"
                                data-open-place="${placeKey}"
                            >
                                ${
                                    currentLanguage === "ko"
                                        ? "장소 보기"
                                        : "場所を見る"
                                }
                            </button>

                            <button
                                type="button"
                                data-remove-like="${placeKey}"
                            >
                                ${
                                    currentLanguage === "ko"
                                        ? "좋아요 취소"
                                        : currentLanguage === "ja"
                                            ? "いいね取消"
                                            : "Unlike"
                                }
                            </button>
                        </div>
                    </article>
                `;
            })
            .join("");


    container
        .querySelectorAll(
            "[data-open-place]"
        )
        .forEach(button => {
            button.addEventListener(
                "click",
                () => {
                    const placeKey =
                        button.dataset.openPlace;

                    closeModal(mypageModal);

                    openPlace(placeKey);

                    googleMap?.panTo(
                        places[placeKey]
                            .position
                    );

                    googleMap?.setZoom(15);
                }
            );
        });


    container
        .querySelectorAll(
            "[data-remove-like]"
        )
        .forEach(button => {
            button.addEventListener(
                "click",
                () => {
                    const placeKey =
                        button.dataset.removeLike;

                    togglePlaceLike(
                        placeKey
                    );

                    /*
                        togglePlaceLike 내부에서도 마이페이지 갱신하지만
                        현재 탭을 확실히 유지해서 즉시 카드가 사라지게 합니다.
                    */
                    if (
                        currentMyPageTab ===
                        "likes"
                    ) {
                        renderMyPage();
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






/* 새로고침 후 JWT 로그인 복원 */
(async function restoreServerLogin() {
    if (!getAuthToken()) {
        if (currentUser) {
            currentUser = null;
            localStorage.removeItem(STORAGE_KEYS.user);
            updateHeaderAuthState();
        }
        return;
    }
    try {
        await fetchCurrentUser();
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

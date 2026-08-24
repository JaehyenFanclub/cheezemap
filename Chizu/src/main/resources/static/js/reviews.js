/* =====================================================
   장소 상세 / 메뉴 / 리뷰 - Spring Boot API 연결
===================================================== */

document
    .getElementById("groupSaveButton")
    ?.addEventListener(
        "click",
        () => {
            /*
                장소 상세의 "그룹 저장"은
                내 그룹 관리창으로 바로 보내지 않고
                전용 장소 저장 모달을 먼저 엽니다.
            */
            openGroupPlaceSaveModal();
        }
    );

const reviewCacheByPlace = new Map();
let activeReviewBackendPlace = null;

function getReviewStars(rating) {
    const score = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)));
    return "★".repeat(score) + "☆".repeat(5 - score);
}

function formatReviewDate(value) {
    if (!value) return "";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value).slice(0, 10) : date.toLocaleDateString(currentLanguage === "ja" ? "ja-JP" : currentLanguage === "en" ? "en-US" : "ko-KR");
}

async function resolveActiveBackendPlace(placeKey = selectedPlaceKey) {
    try {
        activeReviewBackendPlace = await ensureBackendPlace(placeKey);
        return activeReviewBackendPlace;
    } catch (error) {
        activeReviewBackendPlace = null;
        throw error;
    }
}

async function loadReviewsForActivePlace(placeKey = selectedPlaceKey, force = false) {
    const backendPlace = await resolveActiveBackendPlace(placeKey);

    // 기존 리뷰 API는 숫자 Place ID(Long)를 요구합니다.
    // Google AutoPlace(ChIJ...)에는 숫자 placeId가 없으므로
    // /place/undefined/review 요청을 보내지 않습니다.
    const numericPlaceId = Number(backendPlace?.placeId);
    if (!Number.isFinite(numericPlaceId) || numericPlaceId <= 0) {
        return [];
    }

    const cacheKey = String(numericPlaceId);
    if (!force && reviewCacheByPlace.has(cacheKey)) return reviewCacheByPlace.get(cacheKey);
    const reviews = await apiRequest(`/place/${numericPlaceId}/review`);
    reviewCacheByPlace.set(cacheKey, reviews || []);
    return reviews || [];
}

async function renderPlaceReviews(placeKey) {
    const list = document.getElementById("placeReviewList");
    const score = document.getElementById("placeReviewScore");
    const stars = document.getElementById("placeReviewStars");
    const summary = document.getElementById("placeReviewSummaryText");
    if (!list) return;

    list.innerHTML = `<p class="place-empty-text">${translate("place.reviewLoading")}</p>`;

    let reviews = [];
    try {
        reviews = await loadReviewsForActivePlace(placeKey);
    } catch (error) {
        if (score) score.textContent = "-";
        if (stars) stars.textContent = "☆☆☆☆☆";
        if (summary) summary.textContent = `${translate("place.reviewCount")} 0`;
        list.innerHTML = `<p class="place-empty-text">${getAuthToken() ? escapeGroupHtml(error.message) : translate("place.reviewEmpty")}</p>`;
        return;
    }

    const average = reviews.length ? reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length : NaN;
    if (score) score.textContent = Number.isFinite(average) ? average.toFixed(1) : "-";
    if (stars) stars.textContent = Number.isFinite(average) ? getReviewStars(average) : "☆☆☆☆☆";
    if (summary) summary.textContent = `${translate("place.reviewCount")} ${reviews.length}${currentLanguage === "ja" ? "件" : currentLanguage === "ko" ? "개" : ""}`;

    if (!reviews.length) {
        list.innerHTML = `<p class="place-empty-text">${translate("place.reviewEmpty")}</p>`;
        return;
    }

    list.innerHTML = reviews.map(review => {
        const mine = Number(review.userId) === Number(currentUser?.id);
        const photos = (review.photoUrls || []).map(url => `<img src="${escapeGroupHtml(url)}" alt="리뷰 사진" loading="lazy">`).join("");
        return `
            <article class="place-review-item" data-review-id="${review.reviewId}" data-review-rating="${review.rating}">
                <div class="place-review-top">
                    <div class="place-review-user-wrap">
                        <span class="place-review-user">${escapeGroupHtml(review.userNickname || "CHEESE USER")}</span>
                        <span class="place-review-rating">${getReviewStars(review.rating)}</span>
                    </div>
                    <div class="place-review-actions">
                        ${mine ? `<button type="button" class="place-review-edit-toggle" data-review-edit-toggle>${translate("place.reviewEdit")}</button>
                        <button type="button" class="place-review-edit-toggle" data-review-delete>삭제</button>` : `<button type="button" class="place-review-edit-toggle" data-review-like><i class="ti ti-heart"></i> ${Number(review.likeCount || 0)}</button>`}
                    </div>
                </div>
                <div class="place-review-view" data-review-view>
                    <p class="place-review-content">${escapeGroupHtml(review.content)}</p>
                    ${photos ? `<div class="place-review-photos">${photos}</div>` : ""}
                    <span class="place-review-date">${formatReviewDate(review.createdAt)}</span>
                </div>
                ${mine ? `<div class="place-review-edit" data-review-edit hidden>
                    <div class="place-review-edit-stars">${[1,2,3,4,5].map(r => `<button type="button" data-edit-rating="${r}" class="${r <= Number(review.rating) ? "selected" : ""}">${r <= Number(review.rating) ? "★" : "☆"}</button>`).join("")}</div>
                    <textarea data-review-edit-content maxlength="500">${escapeGroupHtml(review.content)}</textarea>
                    <div class="place-review-edit-actions">
                        <button type="button" class="place-review-edit-cancel" data-review-edit-cancel>${translate("place.reviewEditCancel")}</button>
                        <button type="button" class="place-review-edit-save" data-review-edit-save>${translate("place.reviewEditSave")}</button>
                    </div>
                </div>` : ""}
            </article>`;
    }).join("");
}

async function renderPlaceMenu(placeKey) {
    const list = document.getElementById("placeMenuList");
    const count = document.getElementById("placeMenuCount");
    const menuSection = document.getElementById("placeMenuSection");
    const staticPlace = placeKey ? places[placeKey] : null;
    const googleType = String(selectedGooglePoi?.primaryType || "").toLowerCase();
    const shouldShow = staticPlace ? staticPlace.type === "food" : Boolean(selectedGooglePoi && (googleType.includes("restaurant") || googleType.includes("food")));
    if (!list) return;
    if (!shouldShow) {
        if (menuSection) menuSection.style.display = "none";
        return;
    }
    if (menuSection) menuSection.style.display = "block";

    let menus = [];
    try {
        const backendPlace = await ensureBackendPlace(placeKey);
        const numericPlaceId = Number(backendPlace?.placeId);
        if (Number.isFinite(numericPlaceId) && numericPlaceId > 0) {
            menus = await apiRequest(`/place/${numericPlaceId}/menu`);
        } else {
            menus = [];
        }
    } catch {
        menus = [];
    }

    if (!menus?.length && placeKey && typeof getPlaceMenuData === "function") {
        menus = getPlaceMenuData(placeKey).map(item => ({
            menuName: localizedValue(item.menuName),
            menuValue: item.menuValue,
            menuInfo: localizedValue(item.menuInfo),
            photoUrl: item.photoUrl || ""
        }));
    }

    if (count) count.textContent = `${menus.length}${translate("place.menuCount")}`;
    if (!menus.length) {
        list.innerHTML = `<p class="place-empty-text">${translate("place.menuEmpty")}</p>`;
        return;
    }
    list.innerHTML = menus.map(menu => {
        const price = String(menu.menuValue || "").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        const image = menu.photoUrl ? `<img src="${escapeGroupHtml(menu.photoUrl)}" alt="${escapeGroupHtml(menu.menuName)}">` : `<i class="ti ti-tools-kitchen-2"></i>`;
        return `<article class="place-menu-item"><div class="place-menu-thumb">${image}</div><div class="place-menu-info"><strong>${escapeGroupHtml(menu.menuName)}</strong><p>${escapeGroupHtml(menu.menuInfo || translate("place.menuDescriptionEmpty"))}</p></div><strong class="place-menu-price">¥${price}</strong></article>`;
    }).join("");
}

/* 기존 map.js의 extra section 함수가 이 함수들을 동적으로 호출합니다. */

const reviewComposeModal = document.getElementById("reviewComposeModal");
const reviewComposePlaceName = document.getElementById("reviewComposePlaceName");
const reviewStarPicker = document.getElementById("reviewStarPicker");
const reviewRatingMessage = document.getElementById("reviewRatingMessage");
const reviewContent = document.getElementById("reviewContent");
const reviewCharacterCount = document.getElementById("reviewCharacterCount");
const reviewPhotoInput = document.getElementById("reviewPhotoInput");
const reviewPhotoGrid = document.getElementById("reviewPhotoGrid");
let reviewSelectedRating = 0;
let reviewSelectedPhotos = [];

function resetReviewComposeForm() {
    reviewSelectedRating = 0;
    reviewSelectedPhotos = [];
    if (reviewContent) reviewContent.value = "";
    if (reviewCharacterCount) reviewCharacterCount.textContent = "0/500";
    if (reviewRatingMessage) reviewRatingMessage.textContent = translate("review.ratingHelp");
    reviewStarPicker?.querySelectorAll("button").forEach(button => { button.textContent = "☆"; button.classList.remove("selected"); });
    renderReviewPhotoPreview();
}

function openReviewComposeModal() {
    if (!getAuthToken()) {
        showToast("로그인이 필요합니다.");
        openModal(loginModal);
        return;
    }
    resetReviewComposeForm();
    const descriptor = getActivePlaceDescriptor(selectedPlaceKey);
    if (reviewComposePlaceName) reviewComposePlaceName.textContent = descriptor?.name || "";
    openModal(reviewComposeModal);
}

function setReviewRating(rating) {
    reviewSelectedRating = Number(rating);
    reviewStarPicker?.querySelectorAll("button").forEach(button => {
        const number = Number(button.dataset.rating);
        button.textContent = number <= reviewSelectedRating ? "★" : "☆";
        button.classList.toggle("selected", number <= reviewSelectedRating);
    });
    if (reviewRatingMessage) reviewRatingMessage.textContent = translate(`review.rating${reviewSelectedRating}`);
}

function renderReviewPhotoPreview() {
    if (!reviewPhotoGrid) return;
    reviewPhotoGrid.innerHTML = `<label class="review-photo-add" for="reviewPhotoInput"><i class="ti ti-camera-plus"></i><span>${translate("review.photoAdd")}</span></label>`;
    reviewSelectedPhotos.forEach((file, index) => {
        const url = URL.createObjectURL(file);
        reviewPhotoGrid.insertAdjacentHTML("beforeend", `<div class="review-photo-item"><img src="${url}" alt=""><button type="button" data-photo-index="${index}">×</button></div>`);
    });
}

reviewStarPicker?.addEventListener("click", event => { const button = event.target.closest("button[data-rating]"); if (button) setReviewRating(button.dataset.rating); });
reviewContent?.addEventListener("input", () => { if (reviewCharacterCount) reviewCharacterCount.textContent = `${reviewContent.value.length}/500`; });
reviewPhotoInput?.addEventListener("change", event => { reviewSelectedPhotos = [...reviewSelectedPhotos, ...Array.from(event.target.files || [])].slice(0, 5); reviewPhotoInput.value = ""; renderReviewPhotoPreview(); });
reviewPhotoGrid?.addEventListener("click", event => { const button = event.target.closest("button[data-photo-index]"); if (!button) return; reviewSelectedPhotos.splice(Number(button.dataset.photoIndex), 1); renderReviewPhotoPreview(); });
document.getElementById("placeReviewWriteButton")?.addEventListener("click", openReviewComposeModal);
document.getElementById("reviewComposeCloseButton")?.addEventListener("click", () => closeModal(reviewComposeModal));
document.getElementById("reviewComposeCancelButton")?.addEventListener("click", () => closeModal(reviewComposeModal));

document.getElementById("reviewComposeSubmitButton")?.addEventListener("click", async event => {
    if (!reviewSelectedRating) {
        return showToast(
            currentLanguage === "ja"
                ? "評価を選択してください。"
                : "별점을 선택해주세요."
        );
    }

    if (!reviewContent?.value.trim()) {
        return showToast(
            currentLanguage === "ja"
                ? "レビュー内容を入力してください。"
                : "리뷰 내용을 입력해주세요."
        );
    }

    const submitButton =
        event.currentTarget;

    try {
        submitButton.disabled = true;

        /*
            1) Google Place ID / 프론트 장소키를 기준으로
               기존 DB placeId 매핑 확인
            2) 없으면 기존 백엔드 POST /place로 장소 등록
            3) 반환된 숫자 placeId로 리뷰 저장
        */
        const backendPlace =
            await ensureBackendPlace(
                selectedPlaceKey
            );

        if (!backendPlace?.placeId) {
            throw new Error(
                "리뷰를 저장할 장소 ID를 확인하지 못했습니다."
            );
        }

        const form =
            new FormData();

        form.append(
            "rating",
            String(
                reviewSelectedRating
            )
        );

        form.append(
            "content",
            reviewContent.value.trim()
        );

        reviewSelectedPhotos.forEach(
            file =>
                form.append(
                    "images",
                    file
                )
        );

        await apiRequest(
            `/place/${backendPlace.placeId}/review`,
            {
                method:
                    "POST",

                auth:
                    true,

                body:
                    form
            }
        );

        reviewCacheByPlace.delete(
            String(
                backendPlace.placeId
            )
        );

        closeModal(
            reviewComposeModal
        );

        await renderPlaceReviews(
            selectedPlaceKey
        );

        showToast(
            "리뷰가 등록되었습니다."
        );
    } catch (error) {
        console.error(
            "리뷰 등록 실패:",
            error
        );

        showToast(
            error.message
        );
    } finally {
        submitButton.disabled =
            false;
    }
});

document.getElementById("placeReviewList")?.addEventListener("click", async event => {
    const item = event.target.closest(".place-review-item");
    if (!item || !activeReviewBackendPlace) return;
    const reviewId = Number(item.dataset.reviewId);

    if (event.target.closest("[data-review-edit-toggle]")) {
        const edit = item.querySelector("[data-review-edit]");
        const view = item.querySelector("[data-review-view]");
        const opening = Boolean(edit?.hidden);
        if (edit) edit.hidden = !opening;
        if (view) view.hidden = opening;
        return;
    }
    const ratingButton = event.target.closest("[data-edit-rating]");
    if (ratingButton) {
        const rating = Number(ratingButton.dataset.editRating);
        item.dataset.editRating = String(rating);
        item.querySelectorAll("[data-edit-rating]").forEach(button => {
            const n = Number(button.dataset.editRating);
            button.textContent = n <= rating ? "★" : "☆";
            button.classList.toggle("selected", n <= rating);
        });
        return;
    }
    if (event.target.closest("[data-review-edit-cancel]")) {
        const edit = item.querySelector("[data-review-edit]");
        const view = item.querySelector("[data-review-view]");
        if (edit) edit.hidden = true;
        if (view) view.hidden = false;
        return;
    }
    if (event.target.closest("[data-review-edit-save]")) {
        const content = item.querySelector("[data-review-edit-content]")?.value.trim();
        if (!content) return showToast("리뷰 내용을 입력해주세요.");
        const form = new FormData();
        form.append("rating", item.dataset.editRating || item.dataset.reviewRating || "5");
        form.append("content", content);
        try {
            await apiRequest(`/place/${activeReviewBackendPlace.placeId}/review/${reviewId}/edit`, { method: "PUT", auth: true, body: form });
            reviewCacheByPlace.delete(String(activeReviewBackendPlace.placeId));
            await renderPlaceReviews(selectedPlaceKey);
            showToast("리뷰가 수정되었습니다.");
        } catch (error) { showToast(error.message); }
        return;
    }
    if (event.target.closest("[data-review-delete]")) {
        if (!window.confirm("이 리뷰를 삭제할까요?")) return;
        try {
            await apiRequest(`/place/${activeReviewBackendPlace.placeId}/review/${reviewId}/delete`, { method: "DELETE", auth: true });
            reviewCacheByPlace.delete(String(activeReviewBackendPlace.placeId));
            await renderPlaceReviews(selectedPlaceKey);
            showToast("리뷰가 삭제되었습니다.");
        } catch (error) { showToast(error.message); }
        return;
    }
    if (event.target.closest("[data-review-like]")) {
        if (!getAuthToken()) { openModal(loginModal); return; }
        try {
            const result = await apiRequest(`/place/${activeReviewBackendPlace.placeId}/review/${reviewId}/like`, { method: "POST", auth: true });
            reviewCacheByPlace.delete(String(activeReviewBackendPlace.placeId));
            await renderPlaceReviews(selectedPlaceKey);
            showToast(result?.msg || "처리되었습니다.");
        } catch (error) { showToast(error.message); }
    }
});

/* 마이페이지의 내 리뷰를 서버 데이터로 교체 */
async function renderMyReviews(container) {
    if (!getAuthToken()) {
        container.innerHTML =
            `<div class="mypage-empty"><p>${translate("empty.reviews")}</p></div>`;
        return;
    }

    container.innerHTML =
        `<div class="mypage-empty"><p>리뷰를 불러오는 중...</p></div>`;

    try {
        /*
            현재 백엔드에는 "내 리뷰 전용 API"가 없으므로
            프론트에서 이미 연결한 DB placeId들을 기준으로
            각 장소 리뷰를 가져온 뒤 로그인 사용자의 리뷰만 추립니다.

            중요:
            백엔드 /user/mypage 응답에 userId가 없는 버전도 있으므로
            userId가 있으면 ID로 비교하고,
            없으면 닉네임으로 비교합니다.
        */
        const placeIds =
            typeof getKnownBackendPlaceIds === "function"
                ? getKnownBackendPlaceIds()
                : [];

        if (!placeIds.length) {
            container.innerHTML =
                `<div class="mypage-empty">
                    <i class="ti ti-message-circle"></i>
                    <p>${translate("empty.reviews")}</p>
                </div>`;
            return;
        }

        const myUserId =
            Number(
                currentUser?.id
            );

        const myNickname =
            String(
                currentUser?.nickname || ""
            ).trim();

        const cards = [];

        for (const placeId of placeIds) {
            const [
                place,
                placeReviews
            ] = await Promise.all([
                getBackendPlaceById(
                    placeId
                ).catch(
                    () => null
                ),

                apiRequest(
                    `/place/${placeId}/review`
                ).catch(
                    () => []
                )
            ]);

            const mine =
                (placeReviews || [])
                    .filter(review => {
                        const reviewUserId =
                            Number(
                                review.userId
                            );

                        /*
                            userId가 양쪽 모두 존재하면
                            가장 정확한 ID 비교 사용
                        */
                        if (
                            Number.isFinite(myUserId) &&
                            myUserId > 0 &&
                            Number.isFinite(reviewUserId) &&
                            reviewUserId > 0
                        ) {
                            return (
                                reviewUserId ===
                                myUserId
                            );
                        }

                        /*
                            현재 백엔드 MyPageResponse에 userId가 없는 경우
                            ReviewResponse의 userNickname과
                            로그인 사용자 nickname으로 판별
                        */
                        return Boolean(
                            myNickname &&
                            String(
                                review.userNickname || ""
                            ).trim() ===
                                myNickname
                        );
                    });

            const key =
                await backendPlaceIdToFrontendKey(
                    placeId
                );

            mine.forEach(review => {
                cards.push(`
                    <article
                        class="mypage-card"
                        data-my-review-id="${review.reviewId}"
                        data-my-review-place-id="${placeId}"
                        data-my-review-rating="${review.rating}"
                    >
                        <div data-my-review-view>
                            <span>
                                ${getReviewStars(review.rating)}
                            </span>

                            <small class="mypage-review-place">
                                ${escapeGroupHtml(place?.placeName || "장소")}
                            </small>

                            <p>
                                ${escapeGroupHtml(review.content)}
                            </p>

                            <div class="mypage-card-actions">
                                ${
                                    key &&
                                    places[key]
                                        ? `<button
                                                type="button"
                                                data-open-place="${key}"
                                           >
                                                장소 보기
                                           </button>`
                                        : ""
                                }

                                <button
                                    type="button"
                                    data-my-server-review-edit
                                >
                                    수정
                                </button>

                                <button
                                    type="button"
                                    data-my-server-review-delete
                                >
                                    삭제
                                </button>
                            </div>
                        </div>

                        <div
                            class="place-review-edit mypage-review-edit"
                            data-my-server-review-edit-area
                            hidden
                        >
                            <div
                                class="place-review-edit-stars"
                                data-my-server-review-stars
                            >
                                ${[1,2,3,4,5].map(rating => `
                                    <button
                                        type="button"
                                        data-my-server-review-rating="${rating}"
                                        class="${rating <= Number(review.rating) ? "selected" : ""}"
                                    >
                                        ${rating <= Number(review.rating) ? "★" : "☆"}
                                    </button>
                                `).join("")}
                            </div>

                            <textarea
                                data-my-server-review-content
                                maxlength="500"
                            >${escapeGroupHtml(review.content)}</textarea>

                            <div class="place-review-edit-actions">
                                <button
                                    type="button"
                                    class="place-review-edit-cancel"
                                    data-my-server-review-cancel
                                >
                                    취소
                                </button>

                                <button
                                    type="button"
                                    class="place-review-edit-save"
                                    data-my-server-review-save
                                >
                                    수정 완료
                                </button>
                            </div>
                        </div>
                    </article>
                `);
            });
        }

        if (!cards.length) {
            container.innerHTML =
                `<div class="mypage-empty">
                    <i class="ti ti-message-circle"></i>
                    <p>${translate("empty.reviews")}</p>
                </div>`;
            return;
        }

        container.innerHTML =
            cards.join("");

        container
            .querySelectorAll(
                "[data-open-place]"
            )
            .forEach(button => {
                button.addEventListener(
                    "click",
                    () => {
                        const key =
                            button.dataset.openPlace;

                        closeModal(
                            mypageModal
                        );

                        openPlace(
                            key
                        );

                        googleMap?.panTo(
                            places[key].position
                        );

                        googleMap?.setZoom(
                            15
                        );
                    }
                );
            });

    } catch (error) {
        console.error(
            "내 리뷰 조회 실패:",
            error
        );

        container.innerHTML =
            `<div class="mypage-empty">
                <p>${escapeGroupHtml(error.message)}</p>
            </div>`;
    }
}


/* =====================================================
   마이페이지 - 서버 리뷰 수정 / 삭제
===================================================== */

document
    .getElementById(
        "mypageContent"
    )
    ?.addEventListener(
        "click",
        async event => {
            const card =
                event.target.closest(
                    "[data-my-review-id]"
                );

            if (!card) {
                return;
            }

            const reviewId =
                Number(
                    card.dataset.myReviewId
                );

            const placeId =
                Number(
                    card.dataset.myReviewPlaceId
                );

            if (
                !reviewId ||
                !placeId
            ) {
                return;
            }

            const view =
                card.querySelector(
                    "[data-my-review-view]"
                );

            const editArea =
                card.querySelector(
                    "[data-my-server-review-edit-area]"
                );

            /*
                수정 열기
            */
            if (
                event.target.closest(
                    "[data-my-server-review-edit]"
                )
            ) {
                if (view) {
                    view.hidden =
                        true;
                }

                if (editArea) {
                    editArea.hidden =
                        false;
                }

                card.dataset.editRating =
                    card.dataset.myReviewRating ||
                    "5";

                return;
            }

            /*
                별점 선택
            */
            const ratingButton =
                event.target.closest(
                    "[data-my-server-review-rating]"
                );

            if (ratingButton) {
                const rating =
                    Number(
                        ratingButton.dataset
                            .myServerReviewRating
                    );

                card.dataset.editRating =
                    String(
                        rating
                    );

                card
                    .querySelectorAll(
                        "[data-my-server-review-rating]"
                    )
                    .forEach(button => {
                        const value =
                            Number(
                                button.dataset
                                    .myServerReviewRating
                            );

                        button.textContent =
                            value <= rating
                                ? "★"
                                : "☆";

                        button.classList.toggle(
                            "selected",
                            value <= rating
                        );
                    });

                return;
            }

            /*
                수정 취소
            */
            if (
                event.target.closest(
                    "[data-my-server-review-cancel]"
                )
            ) {
                if (editArea) {
                    editArea.hidden =
                        true;
                }

                if (view) {
                    view.hidden =
                        false;
                }

                return;
            }

            /*
                수정 저장
            */
            if (
                event.target.closest(
                    "[data-my-server-review-save]"
                )
            ) {
                const textarea =
                    card.querySelector(
                        "[data-my-server-review-content]"
                    );

                const content =
                    textarea?.value
                        .trim() ||
                    "";

                if (!content) {
                    showToast(
                        "리뷰 내용을 입력해주세요."
                    );

                    return;
                }

                const form =
                    new FormData();

                form.append(
                    "rating",
                    card.dataset.editRating ||
                    card.dataset.myReviewRating ||
                    "5"
                );

                form.append(
                    "content",
                    content
                );

                try {
                    await apiRequest(
                        `/place/${placeId}/review/${reviewId}/edit`,
                        {
                            method:
                                "PUT",

                            auth:
                                true,

                            body:
                                form
                        }
                    );

                    reviewCacheByPlace.delete(
                        String(
                            placeId
                        )
                    );

                    await renderMyReviews(
                        document.getElementById(
                            "mypageContent"
                        )
                    );

                    /*
                        현재 화면에 같은 장소가 열려 있다면
                        장소 상세 리뷰도 함께 갱신합니다.
                    */
                    if (
                        activeReviewBackendPlace &&
                        Number(
                            activeReviewBackendPlace.placeId
                        ) ===
                        placeId
                    ) {
                        await renderPlaceReviews(
                            selectedPlaceKey
                        );
                    }

                    showToast(
                        "리뷰가 수정되었습니다."
                    );
                } catch (error) {
                    console.error(
                        "내 리뷰 수정 실패:",
                        error
                    );

                    showToast(
                        error.message
                    );
                }

                return;
            }

            /*
                리뷰 삭제
            */
            if (
                event.target.closest(
                    "[data-my-server-review-delete]"
                )
            ) {
                if (
                    !window.confirm(
                        "이 리뷰를 삭제할까요?"
                    )
                ) {
                    return;
                }

                try {
                    await apiRequest(
                        `/place/${placeId}/review/${reviewId}/delete`,
                        {
                            method:
                                "DELETE",

                            auth:
                                true
                        }
                    );

                    reviewCacheByPlace.delete(
                        String(
                            placeId
                        )
                    );

                    await renderMyReviews(
                        document.getElementById(
                            "mypageContent"
                        )
                    );

                    if (
                        activeReviewBackendPlace &&
                        Number(
                            activeReviewBackendPlace.placeId
                        ) ===
                        placeId
                    ) {
                        await renderPlaceReviews(
                            selectedPlaceKey
                        );
                    }

                    showToast(
                        "리뷰가 삭제되었습니다."
                    );
                } catch (error) {
                    console.error(
                        "내 리뷰 삭제 실패:",
                        error
                    );

                    showToast(
                        error.message
                    );
                }
            }
        }
    );


/* 네이버지도형 장소 상세 패널 열기·접기 */
function syncPlaceSidePanelState() {
    const panel = document.getElementById("placeCard");
    const toggle = document.getElementById("placeSideToggle");
    const isOpen = Boolean(panel?.classList.contains("show"));
    document.body.classList.toggle("place-side-panel-open", isOpen);
    panel?.setAttribute("aria-hidden", String(!isOpen));
    toggle?.setAttribute("aria-expanded", String(isOpen));
    requestAnimationFrame(() => {
        if (!googleMap || !window.google?.maps) return;
        const center = googleMap.getCenter();
        google.maps.event.trigger(googleMap, "resize");
        if (center) googleMap.setCenter(center);
    });
}

const placeSidePanelElement = document.getElementById("placeCard");
if (placeSidePanelElement) new MutationObserver(syncPlaceSidePanelState).observe(placeSidePanelElement, { attributes: true, attributeFilter: ["class"] });
document.getElementById("placeSideToggle")?.addEventListener("click", () => { const panel = document.getElementById("placeCard"); if (!panel) return; panel.classList.toggle("show"); syncPlaceSidePanelState(); });
syncPlaceSidePanelState();

(function () {
    const toastElement = document.getElementById("toast");
    if (toastElement) document.body.appendChild(toastElement);
})();

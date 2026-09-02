/* =====================================================
   장소 상세 / 메뉴 / 리뷰 - Spring Boot API 연결
===================================================== */

document
    .getElementById("groupSaveButton")
    ?.addEventListener("click", () => {
        openGroupPlaceSaveModal();
    });

const reviewCacheByPlace = new Map();
let activeReviewBackendPlace = null;

function getReviewStars(rating) {
    const score = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)));
    return "★".repeat(score) + "☆".repeat(5 - score);
}

function formatReviewDate(value) {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return String(value).slice(0, 10);
    }

    const locale = currentLanguage === "ja"
        ? "ja-JP"
        : currentLanguage === "en"
            ? "en-US"
            : "ko-KR";

    return date.toLocaleDateString(locale);
}

/* =====================================================
   MR.EUM 수정부분
   리뷰 사진 표시

   핵심 변경사항
   1. 사진을 최대 4장까지만 화면에 표시
   2. 사진이 5장 이상이면 4번째 사진 위에 +N 표시
   3. 사진을 클릭하면 전체 사진을 볼 수 있는 미리보기 모달 생성
   4. 사진 크기는 원본 크기가 아니라 CSS의 고정 영역을 사용
===================================================== */

function renderReviewPhotos(photoUrls) {
    const photos = Array.isArray(photoUrls)
        ? photoUrls.filter(Boolean)
        : [];

    if (!photos.length) {
        return "";
    }

    /*
        Google 지도 리뷰처럼 사진을 작게 정리합니다.

        1장 -> 작은 사진 1장
        2장 -> 2장
        3장 -> 3장
        4장 -> 4장
        5장 이상 -> 4장 + 마지막 사진에 +N
    */
    const visiblePhotos = photos.slice(0, 4);

    let layoutClass = "is-four";

    if (photos.length === 1) {
        layoutClass = "is-one";
    } else if (photos.length === 2) {
        layoutClass = "is-two";
    } else if (photos.length === 3) {
        layoutClass = "is-three";
    }

    /*
        4번째 사진 위에 표시할 추가 사진 개수.

        사진 5장 -> +2
        사진 6장 -> +3
        사진 10장 -> +7

        현재 화면에는 4장만 보이므로
        "4번째 사진을 눌렀을 때 추가로 볼 수 있는 사진 수"입니다.
    */
    const remainingCount = photos.length - 4;

    return `
        <div
            class="place-review-photos ${layoutClass}"
            data-review-photos
            data-photo-urls="${escapeGroupHtml(JSON.stringify(photos))}"
        >
            ${visiblePhotos.map((url, index) => {
                const showMore =
                    index === 3 &&
                    photos.length > 4;

                return `
                    <button
                        type="button"
                        class="place-review-photo-item"
                        data-review-photo-index="${index}"
                        aria-label="리뷰 사진 ${index + 1} 보기"
                    >
                        <img
                            src="${escapeGroupHtml(url)}"
                            alt="리뷰 사진 ${index + 1}"
                            loading="lazy"
                        >

                        ${
                            showMore
                                ? `
                                    <span
                                        class="place-review-photo-more"
                                    >
                                        +${remainingCount}
                                    </span>
                                `
                                : ""
                        }
                    </button>
                `;
            }).join("")}
        </div>
    `;
}

/* =====================================================
   MR.EUM 수정부분
   리뷰 사진 전체보기 모달

   4번째 사진의 +N을 누르면
   해당 리뷰에 등록된 전체 사진을 크게 볼 수 있습니다.

   HTML을 별도로 추가할 필요 없이 JS에서 모달을 생성합니다.
===================================================== */

let reviewPhotoViewerIndex = 0;
let reviewPhotoViewerUrls = [];

function ensureReviewPhotoViewer() {
    if (document.getElementById("reviewPhotoViewer")) {
        return;
    }

    const viewer = document.createElement("div");

    viewer.id = "reviewPhotoViewer";
    viewer.className = "review-photo-viewer";
    viewer.hidden = true;

    viewer.innerHTML = `
        <div
            class="review-photo-viewer-backdrop"
            data-review-photo-viewer-close
        ></div>

        <div class="review-photo-viewer-content">
            <button
                type="button"
                class="review-photo-viewer-close"
                data-review-photo-viewer-close
                aria-label="사진 닫기"
            >
                ×
            </button>

            <button
                type="button"
                class="review-photo-viewer-prev"
                data-review-photo-viewer-prev
                aria-label="이전 사진"
            >
                ‹
            </button>

            <img
                class="review-photo-viewer-image"
                data-review-photo-viewer-image
                alt="리뷰 사진"
            >

            <button
                type="button"
                class="review-photo-viewer-next"
                data-review-photo-viewer-next
                aria-label="다음 사진"
            >
                ›
            </button>

            <div
                class="review-photo-viewer-count"
                data-review-photo-viewer-count
            ></div>
        </div>
    `;

    document.body.appendChild(viewer);

    viewer.addEventListener("click", event => {
        if (event.target.closest("[data-review-photo-viewer-close]")) {
            closeReviewPhotoViewer();
            return;
        }

        if (event.target.closest("[data-review-photo-viewer-prev]")) {
            moveReviewPhotoViewer(-1);
            return;
        }

        if (event.target.closest("[data-review-photo-viewer-next]")) {
            moveReviewPhotoViewer(1);
        }
    });
}

function openReviewPhotoViewer(photoUrls, index = 0) {
    const photos = Array.isArray(photoUrls)
        ? photoUrls.filter(Boolean)
        : [];

    if (!photos.length) {
        return;
    }

    ensureReviewPhotoViewer();

    reviewPhotoViewerUrls = photos;
    reviewPhotoViewerIndex = Math.max(
        0,
        Math.min(Number(index) || 0, photos.length - 1)
    );

    updateReviewPhotoViewer();

    const viewer = document.getElementById("reviewPhotoViewer");

    if (viewer) {
        viewer.hidden = false;
        document.body.classList.add("review-photo-viewer-open");
    }
}

function updateReviewPhotoViewer() {
    const viewer = document.getElementById("reviewPhotoViewer");

    if (!viewer || !reviewPhotoViewerUrls.length) {
        return;
    }

    const image = viewer.querySelector(
        "[data-review-photo-viewer-image]"
    );

    const count = viewer.querySelector(
        "[data-review-photo-viewer-count]"
    );

    const prev = viewer.querySelector(
        "[data-review-photo-viewer-prev]"
    );

    const next = viewer.querySelector(
        "[data-review-photo-viewer-next]"
    );

    const url =
        reviewPhotoViewerUrls[reviewPhotoViewerIndex];

    if (image) {
        image.src = url;
        image.alt =
            `리뷰 사진 ${reviewPhotoViewerIndex + 1}`;
    }

    if (count) {
        count.textContent =
            `${reviewPhotoViewerIndex + 1} / ${reviewPhotoViewerUrls.length}`;
    }

    /*
        사진이 1장뿐이면 좌우 버튼을 숨깁니다.
    */
    if (prev) {
        prev.hidden =
            reviewPhotoViewerUrls.length <= 1;
    }

    if (next) {
        next.hidden =
            reviewPhotoViewerUrls.length <= 1;
    }
}

function moveReviewPhotoViewer(direction) {
    if (!reviewPhotoViewerUrls.length) {
        return;
    }

    const length = reviewPhotoViewerUrls.length;

    reviewPhotoViewerIndex =
        (reviewPhotoViewerIndex + direction + length) % length;

    updateReviewPhotoViewer();
}

function closeReviewPhotoViewer() {
    const viewer =
        document.getElementById("reviewPhotoViewer");

    if (viewer) {
        viewer.hidden = true;
    }

    document.body.classList.remove(
        "review-photo-viewer-open"
    );
}

/*
    ESC 키를 누르면 사진 전체보기 모달을 닫습니다.
*/
document.addEventListener("keydown", event => {
    const viewer =
        document.getElementById("reviewPhotoViewer");

    if (
        event.key === "Escape" &&
        viewer &&
        !viewer.hidden
    ) {
        closeReviewPhotoViewer();
    }
});

/* =====================================================
   MR.EUM 수정부분
   리뷰 사진 클릭 이벤트

   사진 자체를 클릭해도 전체 사진을 볼 수 있도록 합니다.
===================================================== */

document
    .getElementById("placeReviewList")
    ?.addEventListener("click", event => {
        const photoItem =
            event.target.closest(
                "[data-review-photo-index]"
            );

        if (!photoItem) {
            return;
        }

        const photoContainer =
            photoItem.closest("[data-review-photos]");

        if (!photoContainer) {
            return;
        }

        let photoUrls = [];

        try {
            photoUrls = JSON.parse(
                photoContainer.dataset.photoUrls || "[]"
            );
        } catch (error) {
            console.error(
                "리뷰 사진 목록 변환 실패:",
                error
            );
        }

        const index =
            Number(
                photoItem.dataset.reviewPhotoIndex
            ) || 0;

        openReviewPhotoViewer(
            photoUrls,
            index
        );
    });

/* =====================================================
   리뷰 작성 / 프로필 관련
===================================================== */

function normalizeReviewUserPhotoUrl(photoUrl) {
    const raw = String(photoUrl || "").trim();

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

function reviewUserAvatarHtml(review) {
    const photoUrl =
        normalizeReviewUserPhotoUrl(
            review?.userPhotoUrl
        );

    if (photoUrl) {
        const separator =
            photoUrl.includes("?")
                ? "&"
                : "?";

        return `
            <span class="place-review-avatar has-photo">
                <img
                    src="${escapeGroupHtml(
                        `${photoUrl}${separator}v=${Date.now()}`
                    )}"
                    alt="${escapeGroupHtml(
                        review?.userNickname ||
                        "리뷰 작성자"
                    )} 프로필 사진"
                    loading="lazy"
                    onerror="this.parentElement.classList.remove('has-photo'); this.parentElement.innerHTML='<i class=&quot;ti ti-user&quot;></i>';"
                >
            </span>
        `;
    }

    return `
        <span class="place-review-avatar">
            <i class="ti ti-user"></i>
        </span>
    `;
}

async function resolveActiveBackendPlace(
    placeKey = selectedPlaceKey
) {
    try {
        activeReviewBackendPlace =
            await ensureBackendPlace(placeKey);

        return activeReviewBackendPlace;
    } catch (error) {
        activeReviewBackendPlace = null;
        throw error;
    }
}

async function loadReviewsForActivePlace(
    placeKey = selectedPlaceKey,
    force = false
) {
    const backendPlace =
        await resolveActiveBackendPlace(placeKey);

    const numericPlaceId =
        Number(backendPlace?.placeId);

    if (
        !Number.isFinite(numericPlaceId) ||
        numericPlaceId <= 0
    ) {
        return [];
    }

    const cacheKey =
        String(numericPlaceId);

    if (
        !force &&
        reviewCacheByPlace.has(cacheKey)
    ) {
        return reviewCacheByPlace.get(cacheKey);
    }

    const reviews =
        await apiRequest(
            `/place/${numericPlaceId}/review`
        );

    reviewCacheByPlace.set(
        cacheKey,
        reviews || []
    );

    return reviews || [];
}

async function renderPlaceReviews(placeKey) {
    const list =
        document.getElementById(
            "placeReviewList"
        );

    const score =
        document.getElementById(
            "placeReviewScore"
        );

    const stars =
        document.getElementById(
            "placeReviewStars"
        );

    const summary =
        document.getElementById(
            "placeReviewSummaryText"
        );

    if (!list) {
        return;
    }

    list.innerHTML = `
        <p class="place-empty-text">
            ${translate("place.reviewLoading")}
        </p>
    `;

    let reviews = [];

    try {
        reviews =
            await loadReviewsForActivePlace(
                placeKey
            );
    } catch (error) {
        if (score) {
            score.textContent = "-";
        }

        if (stars) {
            stars.textContent = "☆☆☆☆☆";
        }

        if (summary) {
            summary.textContent =
                `${translate("place.reviewCount")} 0`;
        }

        const errorMessage =
            getAuthToken()
                ? escapeGroupHtml(error.message)
                : translate("place.reviewEmpty");

        list.innerHTML = `
            <p class="place-empty-text">
                ${errorMessage}
            </p>
        `;

        return;
    }

    const average =
        reviews.length
            ? reviews.reduce(
                (sum, review) =>
                    sum + Number(review.rating || 0),
                0
            ) / reviews.length
            : NaN;

    if (score) {
        score.textContent =
            Number.isFinite(average)
                ? average.toFixed(1)
                : "-";
    }

    if (stars) {
        stars.textContent =
            Number.isFinite(average)
                ? getReviewStars(average)
                : "☆☆☆☆☆";
    }

    if (summary) {
        const reviewUnit =
            currentLanguage === "ja"
                ? "件"
                : currentLanguage === "ko"
                    ? "개"
                    : "";

        summary.textContent =
            `${translate("place.reviewCount")} ${reviews.length}${reviewUnit}`;
    }

    if (!reviews.length) {
        list.innerHTML = `
            <p class="place-empty-text">
                ${translate("place.reviewEmpty")}
            </p>
        `;

        return;
    }

    list.innerHTML =
        reviews.map(review => {
            const mine =
                Number(review.userId) ===
                Number(
                    typeof getCurrentUserId === "function"
                        ? getCurrentUserId()
                        : currentUser?.id
                );

            return `
                <article
                    class="place-review-item"
                    data-review-id="${review.reviewId}"
                    data-review-rating="${review.rating}"
                >
                    <div class="place-review-top">
                        <div class="place-review-user-wrap">
                            ${reviewUserAvatarHtml(review)}

                            <div class="place-review-user-meta">
                                <span class="place-review-user">
                                    ${escapeGroupHtml(
                                        review.userNickname ||
                                        "CHEESE USER"
                                    )}
                                </span>

                                <span class="place-review-rating">
                                    ${getReviewStars(review.rating)}
                                </span>
                            </div>
                        </div>

                        <div class="place-review-actions">
                            ${
                                mine
                                    ? `
                                        <button
                                            type="button"
                                            class="place-review-edit-toggle"
                                            data-review-edit-toggle
                                        >
                                            ${translate("place.reviewEdit")}
                                        </button>

                                        <button
                                            type="button"
                                            class="place-review-edit-toggle"
                                            data-review-delete
                                        >
                                            삭제
                                        </button>
                                    `
                                    : `
                                        <button
                                            type="button"
                                            class="place-review-edit-toggle"
                                            data-review-like
                                        >
                                            <i class="ti ti-heart"></i>
                                            ${Number(review.likeCount || 0)}
                                        </button>
                                    `
                            }
                        </div>
                    </div>

                    <div
                        class="place-review-view"
                        data-review-view
                    >
                        <p class="place-review-content">
                            ${escapeGroupHtml(review.content)}
                        </p>

                        ${renderReviewPhotos(review.photoUrls)}

                        <span class="place-review-date">
                            ${formatReviewDate(review.createdAt)}
                        </span>
                    </div>

                    ${
                        mine
                            ? `
                                <div
                                    class="place-review-edit"
                                    data-review-edit
                                    hidden
                                >
                                    <div class="place-review-edit-stars">
                                        ${[1,2,3,4,5].map(r => `
                                            <button
                                                type="button"
                                                data-edit-rating="${r}"
                                                class="${r <= Number(review.rating) ? "selected" : ""}"
                                            >
                                                ${r <= Number(review.rating) ? "★" : "☆"}
                                            </button>
                                        `).join("")}
                                    </div>

                                    <textarea
                                        data-review-edit-content
                                        maxlength="500"
                                    >${escapeGroupHtml(review.content)}</textarea>

                                    <div class="place-review-edit-actions">
                                        <button
                                            type="button"
                                            class="place-review-edit-cancel"
                                            data-review-edit-cancel
                                        >
                                            ${translate("place.reviewEditCancel")}
                                        </button>

                                        <button
                                            type="button"
                                            class="place-review-edit-save"
                                            data-review-edit-save
                                        >
                                            ${translate("place.reviewEditSave")}
                                        </button>
                                    </div>
                                </div>
                            `
                            : ""
                    }
                </article>
            `;
        }).join("");
}

async function renderPlaceMenu(placeKey) {
    const list =
        document.getElementById("placeMenuList");

    const count =
        document.getElementById("placeMenuCount");

    const menuSection =
        document.getElementById("placeMenuSection");

    const staticPlace =
        placeKey ? places[placeKey] : null;

    const googleType =
        String(
            selectedGooglePoi?.primaryType || ""
        ).toLowerCase();

    const shouldShow =
        staticPlace
            ? staticPlace.type === "food"
            : Boolean(
                selectedGooglePoi &&
                (
                    googleType.includes("restaurant") ||
                    googleType.includes("food")
                )
            );

    if (!list) {
        return;
    }

    if (!shouldShow) {
        if (menuSection) {
            menuSection.style.display = "none";
        }

        return;
    }

    if (menuSection) {
        menuSection.style.display = "block";
    }

    const menus = [];

    if (count) {
        count.textContent =
            `${menus.length}${translate("place.menuCount")}`;
    }

    if (!menus.length) {
        list.innerHTML = `
            <p class="place-empty-text">
                ${translate("place.menuEmpty")}
            </p>
        `;

        return;
    }

    list.innerHTML =
        menus.map(menu => {
            const price =
                String(menu.menuValue || "")
                    .replace(
                        /\B(?=(\d{3})+(?!\d))/g,
                        ","
                    );

            const image =
                menu.photoUrl
                    ? `
                        <img
                            src="${escapeGroupHtml(menu.photoUrl)}"
                            alt="${escapeGroupHtml(menu.menuName)}"
                        >
                    `
                    : `
                        <i class="ti ti-tools-kitchen-2"></i>
                    `;

            return `
                <article class="place-menu-item">
                    <div class="place-menu-thumb">
                        ${image}
                    </div>

                    <div class="place-menu-info">
                        <strong>
                            ${escapeGroupHtml(menu.menuName)}
                        </strong>

                        <p>
                            ${escapeGroupHtml(
                                menu.menuInfo ||
                                translate("place.menuDescriptionEmpty")
                            )}
                        </p>
                    </div>

                    <strong class="place-menu-price">
                        ¥${price}
                    </strong>
                </article>
            `;
        }).join("");
}

/* =====================================================
   리뷰 작성 모달
===================================================== */

const reviewComposeModal =
    document.getElementById(
        "reviewComposeModal"
    );

const reviewComposePlaceName =
    document.getElementById(
        "reviewComposePlaceName"
    );

const reviewStarPicker =
    document.getElementById(
        "reviewStarPicker"
    );

const reviewRatingMessage =
    document.getElementById(
        "reviewRatingMessage"
    );

const reviewContent =
    document.getElementById(
        "reviewContent"
    );

const reviewCharacterCount =
    document.getElementById(
        "reviewCharacterCount"
    );

const reviewPhotoInput =
    document.getElementById(
        "reviewPhotoInput"
    );

const reviewPhotoGrid =
    document.getElementById(
        "reviewPhotoGrid"
    );

let reviewSelectedRating = 0;
let reviewSelectedPhotos = [];

function resetReviewComposeForm() {
    reviewSelectedRating = 0;
    reviewSelectedPhotos = [];

    if (reviewContent) {
        reviewContent.value = "";
    }

    if (reviewCharacterCount) {
        reviewCharacterCount.textContent =
            "0/500";
    }

    if (reviewRatingMessage) {
        reviewRatingMessage.textContent =
            translate("review.ratingHelp");
    }

    reviewStarPicker
        ?.querySelectorAll("button")
        .forEach(button => {
            button.textContent = "☆";
            button.classList.remove("selected");
        });

    renderReviewPhotoPreview();
}

function openReviewComposeModal() {
    if (!getAuthToken()) {
        showToast("로그인이 필요합니다.");
        openModal(loginModal);
        return;
    }

    resetReviewComposeForm();

    const descriptor =
        getActivePlaceDescriptor(
            selectedPlaceKey
        );

    if (reviewComposePlaceName) {
        reviewComposePlaceName.textContent =
            descriptor?.name || "";
    }

    openModal(reviewComposeModal);
}

function setReviewRating(rating) {
    reviewSelectedRating =
        Number(rating);

    reviewStarPicker
        ?.querySelectorAll("button")
        .forEach(button => {
            const number =
                Number(button.dataset.rating);

            button.textContent =
                number <= reviewSelectedRating
                    ? "★"
                    : "☆";

            button.classList.toggle(
                "selected",
                number <= reviewSelectedRating
            );
        });

    if (reviewRatingMessage) {
        reviewRatingMessage.textContent =
            translate(
                `review.rating${reviewSelectedRating}`
            );
    }
}

function renderReviewPhotoPreview() {
    if (!reviewPhotoGrid) {
        return;
    }

    reviewPhotoGrid.innerHTML = `
        <label
            class="review-photo-add"
            for="reviewPhotoInput"
        >
            <i class="ti ti-camera-plus"></i>
            <span>
                ${translate("review.photoAdd")}
            </span>
        </label>
    `;

    /*
        리뷰 작성 중에는 최대 5장까지 선택합니다.
        서버로 보내는 사진도 최대 5장입니다.
    */
    reviewSelectedPhotos.forEach(
        (file, index) => {
            const url =
                URL.createObjectURL(file);

            reviewPhotoGrid.insertAdjacentHTML(
                "beforeend",
                `
                    <div class="review-photo-item">
                        <img
                            src="${url}"
                            alt=""
                        >

                        <button
                            type="button"
                            data-photo-index="${index}"
                        >
                            ×
                        </button>
                    </div>
                `
            );
        }
    );
}

reviewStarPicker?.addEventListener(
    "click",
    event => {
        const button =
            event.target.closest(
                "button[data-rating]"
            );

        if (button) {
            setReviewRating(
                button.dataset.rating
            );
        }
    }
);

reviewContent?.addEventListener(
    "input",
    () => {
        if (reviewCharacterCount) {
            reviewCharacterCount.textContent =
                `${reviewContent.value.length}/500`;
        }
    }
);

reviewPhotoInput?.addEventListener(
    "change",
    event => {
        const selectedFiles =
            Array.from(
                event.target.files || []
            );

        reviewSelectedPhotos = [
            ...reviewSelectedPhotos,
            ...selectedFiles
        ].slice(0, 5);

        reviewPhotoInput.value = "";

        renderReviewPhotoPreview();
    }
);

reviewPhotoGrid?.addEventListener(
    "click",
    event => {
        const button =
            event.target.closest(
                "button[data-photo-index]"
            );

        if (!button) {
            return;
        }

        reviewSelectedPhotos.splice(
            Number(
                button.dataset.photoIndex
            ),
            1
        );

        renderReviewPhotoPreview();
    }
);

document
    .getElementById(
        "placeReviewWriteButton"
    )
    ?.addEventListener(
        "click",
        openReviewComposeModal
    );

document
    .getElementById(
        "reviewComposeCloseButton"
    )
    ?.addEventListener(
        "click",
        () => closeModal(reviewComposeModal)
    );

document
    .getElementById(
        "reviewComposeCancelButton"
    )
    ?.addEventListener(
        "click",
        () => closeModal(reviewComposeModal)
    );

document
    .getElementById(
        "reviewComposeSubmitButton"
    )
    ?.addEventListener(
        "click",
        async event => {
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

                const backendPlace =
                    await ensureBackendPlace(
                        selectedPlaceKey
                    );

                const reviewPlaceId =
                    Number(
                        backendPlace?.placeId
                    );

                if (
                    !Number.isFinite(reviewPlaceId) ||
                    reviewPlaceId <= 0
                ) {
                    throw new Error(
                        "이 장소를 리뷰 저장용 장소와 연결하지 못했습니다. 페이지를 새로고침한 뒤 다시 시도해주세요."
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
                    `/place/${reviewPlaceId}/review`,
                    {
                        method: "POST",
                        auth: true,
                        body: form
                    }
                );

                reviewCacheByPlace.delete(
                    String(reviewPlaceId)
                );

                invalidateMyReviewsPageCache();

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
        }
    );

/* =====================================================
   장소 상세 리뷰 수정 / 삭제 / 좋아요
===================================================== */

document
    .getElementById("placeReviewList")
    ?.addEventListener(
        "click",
        async event => {
            /*
                사진 클릭은 위에서 처리합니다.
                리뷰 수정/삭제/좋아요 로직은
                아래에서 계속 처리합니다.
            */

            const item =
                event.target.closest(
                    ".place-review-item"
                );

            if (
                !item ||
                !activeReviewBackendPlace
            ) {
                return;
            }

            const reviewId =
                Number(
                    item.dataset.reviewId
                );

            if (
                event.target.closest(
                    "[data-review-edit-toggle]"
                )
            ) {
                const edit =
                    item.querySelector(
                        "[data-review-edit]"
                    );

                const view =
                    item.querySelector(
                        "[data-review-view]"
                    );

                const opening =
                    Boolean(edit?.hidden);

                if (edit) {
                    edit.hidden =
                        !opening;
                }

                if (view) {
                    view.hidden =
                        opening;
                }

                return;
            }

            const ratingButton =
                event.target.closest(
                    "[data-edit-rating]"
                );

            if (ratingButton) {
                const rating =
                    Number(
                        ratingButton.dataset
                            .editRating
                    );

                item.dataset.editRating =
                    String(rating);

                item
                    .querySelectorAll(
                        "[data-edit-rating]"
                    )
                    .forEach(button => {
                        const n =
                            Number(
                                button.dataset
                                    .editRating
                            );

                        button.textContent =
                            n <= rating
                                ? "★"
                                : "☆";

                        button.classList.toggle(
                            "selected",
                            n <= rating
                        );
                    });

                return;
            }

            if (
                event.target.closest(
                    "[data-review-edit-cancel]"
                )
            ) {
                const edit =
                    item.querySelector(
                        "[data-review-edit]"
                    );

                const view =
                    item.querySelector(
                        "[data-review-view]"
                    );

                if (edit) {
                    edit.hidden = true;
                }

                if (view) {
                    view.hidden = false;
                }

                return;
            }

            if (
                event.target.closest(
                    "[data-review-edit-save]"
                )
            ) {
                const content =
                    item.querySelector(
                        "[data-review-edit-content]"
                    )?.value.trim();

                if (!content) {
                    return showToast(
                        "리뷰 내용을 입력해주세요."
                    );
                }

                const form =
                    new FormData();

                form.append(
                    "rating",
                    item.dataset.editRating ||
                    item.dataset.reviewRating ||
                    "5"
                );

                form.append(
                    "content",
                    content
                );

                try {
                    await apiRequest(
                        `/place/${activeReviewBackendPlace.placeId}/review/${reviewId}/edit`,
                        {
                            method: "PUT",
                            auth: true,
                            body: form
                        }
                    );

                    reviewCacheByPlace.delete(
                        String(
                            activeReviewBackendPlace.placeId
                        )
                    );

                    invalidateMyReviewsPageCache();

                    await renderPlaceReviews(
                        selectedPlaceKey
                    );

                    showToast(
                        "리뷰가 수정되었습니다."
                    );
                } catch (error) {
                    showToast(
                        error.message
                    );
                }

                return;
            }

            if (
                event.target.closest(
                    "[data-review-delete]"
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
                        `/place/${activeReviewBackendPlace.placeId}/review/${reviewId}/delete`,
                        {
                            method: "DELETE",
                            auth: true
                        }
                    );

                    reviewCacheByPlace.delete(
                        String(
                            activeReviewBackendPlace.placeId
                        )
                    );

                    invalidateMyReviewsPageCache();

                    item.remove();

                    renderPlaceReviews(
                        selectedPlaceKey
                    ).catch(console.error);

                    showToast(
                        "리뷰가 삭제되었습니다."
                    );
                } catch (error) {
                    showToast(
                        error.message
                    );
                }

                return;
            }

            if (
                event.target.closest(
                    "[data-review-like]"
                )
            ) {
                if (!getAuthToken()) {
                    openModal(loginModal);
                    return;
                }

                try {
                    const result =
                        await apiRequest(
                            `/place/${activeReviewBackendPlace.placeId}/review/${reviewId}/like`,
                            {
                                method: "POST",
                                auth: true
                            }
                        );

                    reviewCacheByPlace.delete(
                        String(
                            activeReviewBackendPlace.placeId
                        )
                    );

                    invalidateMyReviewsPageCache();

                    await renderPlaceReviews(
                        selectedPlaceKey
                    );

                    showToast(
                        result?.msg ||
                        "처리되었습니다."
                    );
                } catch (error) {
                    showToast(
                        error.message
                    );
                }
            }
        }
    );

/* =====================================================
   마이페이지 내 리뷰
===================================================== */

async function openMyReviewPlace(placeId) {
    closeModal(mypageModal);

    if (
        typeof openBackendPlaceById === "function"
    ) {
        await openBackendPlaceById(placeId);
        return;
    }

    const backendPlace =
        await getBackendPlaceById(
            placeId
        );

    const position = {
        lat: Number(
            backendPlace?.placeLatitude
        ),
        lng: Number(
            backendPlace?.placeLongitude
        )
    };

    if (
        backendPlace?.googlePlaceId &&
        typeof openGooglePoi === "function"
    ) {
        await openGooglePoi(
            backendPlace.googlePlaceId,
            Number.isFinite(position.lat) &&
            Number.isFinite(position.lng)
                ? position
                : null,
            backendPlace.placeName || ""
        );
    }
}

/*
   마이페이지 내 리뷰 캐시
*/
const MY_REVIEWS_CACHE_TTL =
    60 * 1000;

let myReviewsPageCache = {
    userKey: "",
    loadedAt: 0,
    cards: null
};

function getMyReviewsUserCacheKey() {
    const id =
        Number(
            typeof getCurrentUserId === "function"
                ? getCurrentUserId()
                : currentUser?.id
        );

    if (
        Number.isFinite(id) &&
        id > 0
    ) {
        return `id:${id}`;
    }

    return `nickname:${String(
        currentUser?.nickname || ""
    ).trim()}`;
}

function invalidateMyReviewsPageCache() {
    myReviewsPageCache = {
        userKey: "",
        loadedAt: 0,
        cards: null
    };
}

function isMyReviewsPageCacheFresh() {
    return Boolean(
        myReviewsPageCache.cards &&
        myReviewsPageCache.userKey ===
            getMyReviewsUserCacheKey() &&
        Date.now() -
            myReviewsPageCache.loadedAt <
            MY_REVIEWS_CACHE_TTL
    );
}

const correctedReviewPlaceNameCache =
    new Map();

function isGenericStoredPlaceName(value) {
    const name =
        String(value || "")
            .trim()
            .toLowerCase();

    return !name ||
        name === "선택한 장소" ||
        name === "選択した場所" ||
        name === "selected place" ||
        name === "google place" ||
        name === "place";
}

async function resolveStoredReviewPlaceName(
    placeId,
    place
) {
    const backendName =
        String(
            place?.placeName ||
            place?.name ||
            ""
        ).trim();

    if (
        !isGenericStoredPlaceName(
            backendName
        )
    ) {
        return backendName ||
            `장소 #${placeId}`;
    }

    const cacheKey =
        String(placeId);

    const cachedCorrected =
        correctedReviewPlaceNameCache.get(
            cacheKey
        );

    if (
        cachedCorrected &&
        !isGenericStoredPlaceName(
            cachedCorrected
        )
    ) {
        return cachedCorrected;
    }

    let frontendKey =
        typeof getFrontendKeyForKnownBackendId === "function"
            ? getFrontendKeyForKnownBackendId(
                placeId
            )
            : null;

    if (
        !frontendKey &&
        typeof backendPlaceIdToFrontendKey === "function"
    ) {
        try {
            frontendKey =
                await backendPlaceIdToFrontendKey(
                    placeId
                );
        } catch {}
    }

    if (
        frontendKey &&
        places?.[frontendKey]
    ) {
        const localNameValue =
            places[frontendKey].name;

        const localName =
            typeof localNameValue === "object"
                ? (
                    localNameValue[currentLanguage] ||
                    localNameValue.ko ||
                    localNameValue.ja ||
                    localNameValue.en ||
                    ""
                )
                : String(
                    localNameValue || ""
                );

        if (
            localName &&
            !isGenericStoredPlaceName(
                localName
            )
        ) {
            correctedReviewPlaceNameCache.set(
                cacheKey,
                localName
            );

            return localName;
        }
    }

    let googlePlaceId =
        String(
            place?.googlePlaceId || ""
        ).trim();

    if (
        !googlePlaceId &&
        String(frontendKey || "")
            .startsWith("google_")
    ) {
        googlePlaceId =
            String(frontendKey)
                .slice(
                    "google_".length
                );
    }

    if (
        googlePlaceId &&
        typeof normalizeGooglePlaceId === "function"
    ) {
        googlePlaceId =
            normalizeGooglePlaceId(
                googlePlaceId
            );
    }

    if (
        googlePlaceId &&
        typeof fetchGooglePoiDetails === "function"
    ) {
        try {
            const googlePlace =
                await fetchGooglePoiDetails(
                    googlePlaceId
                );

            const actualName =
                String(
                    googlePlace?.displayName ||
                    ""
                ).trim();

            if (
                actualName &&
                !isGenericStoredPlaceName(
                    actualName
                )
            ) {
                correctedReviewPlaceNameCache.set(
                    cacheKey,
                    actualName
                );

                const googleKey =
                    `google_${googlePlaceId}`;

                if (
                    typeof places === "object"
                ) {
                    const existing =
                        places[googleKey] ||
                        {};

                    places[googleKey] = {
                        ...existing,
                        name: {
                            ko: actualName,
                            ja: actualName,
                            en: actualName
                        }
                    };
                }

                return actualName;
            }
        } catch (error) {
            console.debug(
                "리뷰 장소명 보정 실패:",
                error
            );
        }
    }

    return `장소 #${placeId}`;
}

function renderMyReviewCards(
    container,
    cards
) {
    if (!cards?.length) {
        container.innerHTML = `
            <div class="empty-state">
                <div>
                    <i class="ti ti-message-circle"></i>
                    <p>
                        ${translate("empty.reviews")}
                    </p>
                </div>
            </div>
        `;

        return;
    }

    container.innerHTML =
        cards.join("");
}

async function renderMyReviews(
    container,
    renderRequestId =
        typeof myPageRenderRequestId === "number"
            ? myPageRenderRequestId
            : 0
) {
    if (!getAuthToken()) {
        container.innerHTML = `
            <div class="empty-state">
                <div>
                    <i class="ti ti-message-circle"></i>
                    <p>
                        ${translate("empty.reviews")}
                    </p>
                </div>
            </div>
        `;

        return;
    }

    const isStale = () => {
        const currentRequestId =
            typeof myPageRenderRequestId === "number"
                ? myPageRenderRequestId
                : renderRequestId;

        return (
            renderRequestId !==
                currentRequestId ||
            (
                typeof currentMyPageTab === "string" &&
                currentMyPageTab !== "reviews"
            ) ||
            container !==
                document.getElementById(
                    "mypageContent"
                )
        );
    };

    if (
        isMyReviewsPageCacheFresh()
    ) {
        renderMyReviewCards(
            container,
            myReviewsPageCache.cards
        );

        return;
    }

    container.innerHTML = `
        <div class="empty-state">
            <div>
                <i class="ti ti-loader-2"></i>
                <p>
                    ${
                        currentLanguage === "ko"
                            ? "리뷰를 불러오는 중..."
                            : currentLanguage === "ja"
                                ? "レビューを読み込み中..."
                                : "Loading reviews..."
                    }
                </p>
            </div>
        </div>
    `;

    try {
        const reviewList =
            await apiRequest(
                "/user/me/reviews",
                {
                    auth: true
                }
            );

        const myReviews =
            Array.isArray(reviewList)
                ? reviewList
                : [];

        if (isStale()) {
            return;
        }

        if (!myReviews.length) {
            myReviewsPageCache = {
                userKey:
                    getMyReviewsUserCacheKey(),
                loadedAt:
                    Date.now(),
                cards: []
            };

            renderMyReviewCards(
                container,
                []
            );

            return;
        }

        const uniquePlaceIds = [
            ...new Set(
                myReviews
                    .map(
                        review =>
                            Number(
                                review.placeId
                            )
                    )
                    .filter(
                        placeId =>
                            Number.isFinite(
                                placeId
                            ) &&
                            placeId > 0
                    )
            )
        ];

        const placeById =
            new Map(
                await Promise.all(
                    uniquePlaceIds.map(
                        async placeId => {
                            const place =
                                await getBackendPlaceById(
                                    placeId
                                ).catch(
                                    () => null
                                );

                            return [
                                placeId,
                                place
                            ];
                        }
                    )
                )
            );

        if (isStale()) {
            return;
        }

        const reviewsWithMeta =
            await Promise.all(
                myReviews.map(
                    async review => {
                        const placeId =
                            Number(
                                review.placeId
                            );

                        const place =
                            placeById.get(
                                placeId
                            ) || null;

                        return {
                            review,
                            placeId,
                            place,
                            resolvedPlaceName:
                                await resolveStoredReviewPlaceName(
                                    placeId,
                                    place
                                )
                        };
                    }
                )
            );

        if (isStale()) {
            return;
        }

        const cards =
            reviewsWithMeta.map(({
                review,
                placeId,
                place,
                resolvedPlaceName
            }) => `
                <article
                    class="mypage-card"
                    data-my-review-id="${review.reviewId}"
                    data-my-review-place-id="${placeId}"
                    data-my-review-rating="${review.rating}"
                >
                    <div data-my-review-view>
                        <div class="mypage-review-place-row">
                            <strong class="mypage-review-place">
                                ${escapeGroupHtml(
                                    resolvedPlaceName ||
                                    `장소 #${placeId}`
                                )}
                            </strong>

                            <span class="mypage-review-rating">
                                ${getReviewStars(
                                    review.rating
                                )}
                            </span>
                        </div>

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

                        <p class="mypage-review-content">
                            ${escapeGroupHtml(
                                review.content
                            )}
                        </p>

                        <div class="mypage-card-actions">
                            <button
                                type="button"
                                class="mypage-place-view-button"
                                data-open-review-place="${placeId}"
                            >
                                장소 보기
                            </button>

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
                            ${[1,2,3,4,5].map(
                                rating => `
                                    <button
                                        type="button"
                                        data-my-server-review-rating="${rating}"
                                        class="${
                                            rating <=
                                            Number(review.rating)
                                                ? "selected"
                                                : ""
                                        }"
                                    >
                                        ${
                                            rating <=
                                            Number(review.rating)
                                                ? "★"
                                                : "☆"
                                        }
                                    </button>
                                `
                            ).join("")}
                        </div>

                        <textarea
                            data-my-server-review-content
                            maxlength="500"
                        >${escapeGroupHtml(
                            review.content
                        )}</textarea>

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

        if (isStale()) {
            return;
        }

        myReviewsPageCache = {
            userKey:
                getMyReviewsUserCacheKey(),
            loadedAt:
                Date.now(),
            cards
        };

        renderMyReviewCards(
            container,
            cards
        );
    } catch (error) {
        if (isStale()) {
            return;
        }

        console.error(
            "내 리뷰 조회 실패:",
            error
        );

        container.innerHTML = `
            <div class="empty-state">
                <div>
                    <i class="ti ti-alert-circle"></i>
                    <p>
                        ${escapeGroupHtml(
                            error.message
                        )}
                    </p>
                </div>
            </div>
        `;
    }
}

/* =====================================================
   마이페이지 - 서버 리뷰 수정 / 삭제
===================================================== */

document
    .getElementById("mypageContent")
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

            if (
                event.target.closest(
                    "[data-open-review-place]"
                )
            ) {
                try {
                    await openMyReviewPlace(
                        placeId
                    );
                } catch (error) {
                    console.error(
                        "장소 보기 실패:",
                        error
                    );

                    showToast(
                        error.message ||
                        "장소를 열지 못했습니다."
                    );
                }

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

            if (
                event.target.closest(
                    "[data-my-server-review-edit]"
                )
            ) {
                if (view) {
                    view.hidden = true;
                }

                if (editArea) {
                    editArea.hidden = false;
                }

                card.dataset.editRating =
                    card.dataset.myReviewRating ||
                    "5";

                return;
            }

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
                    String(rating);

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

            if (
                event.target.closest(
                    "[data-my-server-review-cancel]"
                )
            ) {
                if (editArea) {
                    editArea.hidden = true;
                }

                if (view) {
                    view.hidden = false;
                }

                return;
            }

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
                    textarea?.value.trim() ||
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
                            method: "PUT",
                            auth: true,
                            body: form
                        }
                    );

                    reviewCacheByPlace.delete(
                        String(placeId)
                    );

                    invalidateMyReviewsPageCache();

                    await renderMyReviews(
                        document.getElementById(
                            "mypageContent"
                        )
                    );

                    if (
                        activeReviewBackendPlace &&
                        Number(
                            activeReviewBackendPlace.placeId
                        ) === placeId
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

                const mypageContent =
                    document.getElementById(
                        "mypageContent"
                    );

                card.remove();

                if (
                    mypageContent &&
                    !mypageContent.querySelector(
                        "[data-my-review-id]"
                    )
                ) {
                    renderMyReviewCards(
                        mypageContent,
                        []
                    );
                }

                reviewCacheByPlace.delete(
                    String(placeId)
                );

                invalidateMyReviewsPageCache();

                try {
                    await apiRequest(
                        `/place/${placeId}/review/${reviewId}/delete`,
                        {
                            method: "DELETE",
                            auth: true
                        }
                    );

                    if (
                        activeReviewBackendPlace &&
                        Number(
                            activeReviewBackendPlace.placeId
                        ) === placeId
                    ) {
                        renderPlaceReviews(
                            selectedPlaceKey
                        ).catch(
                            console.error
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

                    invalidateMyReviewsPageCache();

                    if (
                        mypageContent &&
                        typeof currentMyPageTab ===
                            "string" &&
                        currentMyPageTab ===
                            "reviews"
                    ) {
                        renderMyReviews(
                            mypageContent,
                            typeof myPageRenderRequestId ===
                                "number"
                                ? myPageRenderRequestId
                                : 0
                        ).catch(
                            console.error
                        );
                    }

                    showToast(
                        error.message
                    );
                }
            }
        }
    );

/* =====================================================
   네이버지도형 장소 상세 패널 열기 / 접기
===================================================== */

function syncPlaceSidePanelState() {
    const panel =
        document.getElementById(
            "placeCard"
        );

    const toggle =
        document.getElementById(
            "placeSideToggle"
        );

    const isOpen =
        Boolean(
            panel?.classList.contains(
                "show"
            )
        );

    document.body.classList.toggle(
        "place-side-panel-open",
        isOpen
    );

    panel?.setAttribute(
        "aria-hidden",
        String(!isOpen)
    );

    toggle?.setAttribute(
        "aria-expanded",
        String(isOpen)
    );

    requestAnimationFrame(() => {
        if (
            !googleMap ||
            !window.google?.maps
        ) {
            return;
        }

        const center =
            googleMap.getCenter();

        google.maps.event.trigger(
            googleMap,
            "resize"
        );

        if (center) {
            googleMap.setCenter(
                center
            );
        }
    });
}

const placeSidePanelElement =
    document.getElementById(
        "placeCard"
    );

if (placeSidePanelElement) {
    new MutationObserver(
        syncPlaceSidePanelState
    ).observe(
        placeSidePanelElement,
        {
            attributes: true,
            attributeFilter: ["class"]
        }
    );
}

document
    .getElementById(
        "placeSideToggle"
    )
    ?.addEventListener(
        "click",
        () => {
            const panel =
                document.getElementById(
                    "placeCard"
                );

            if (!panel) {
                return;
            }

            panel.classList.toggle(
                "show"
            );

            syncPlaceSidePanelState();
        }
    );

syncPlaceSidePanelState();

(function () {
    const toastElement =
        document.getElementById(
            "toast"
        );

    if (toastElement) {
        document.body.appendChild(
            toastElement
        );
    }
})();

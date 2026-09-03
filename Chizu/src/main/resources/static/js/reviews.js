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
/* =====================================================
   MR.EUM 수정부분
   마이페이지에서 수정할 리뷰 원본 데이터를 보관합니다.

   기존에는 카드 HTML 안에서만 리뷰 데이터를 가지고 있어서
   수정 버튼을 눌렀을 때 별도의 수정 모달로 전달하기 어려웠습니다.

   reviewId를 기준으로 실제 리뷰 객체를 보관합니다.
===================================================== */

const myPageReviewStore = new Map();

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

// =====================================================
// MR.EUM 수정부분
// 현재 열려있는 사진의 리뷰 정보를 저장
// 사진만 저장하면 작성자/리뷰 내용을 알 수 없기 때문에
// 클릭한 리뷰 객체 자체를 같이 저장한다.
// =====================================================
let reviewPhotoViewerReview = null;

/* =====================================================
   MR.EUM 최종 수정부분
   리뷰 사진 전체보기 모달

   기존 문제
   1. 사진 영역이 중복되어 있었음
   2. 작성자 정보 영역이 중복되어 있었음
   3. data-review-photo-viewer-avatar가 2개 존재
   4. querySelector()가 잘못된 avatar 요소를 가져올 수 있었음
   5. 사진 크기에 따라 전체보기 위치가 달라질 수 있었음

   수정
   - 사진 영역 1개
   - 작성자 정보 1개
   - 프로필 1개
   - 닉네임 1개
   - 리뷰 내용 1개
   - 사진 중앙 정렬용 image-wrap 유지
===================================================== */

function ensureReviewPhotoViewer() {

    /*
        이미 사진 전체보기 모달이 만들어져 있다면
        다시 만들지 않습니다.
    */
    if (document.getElementById("reviewPhotoViewer")) {
        return;
    }

    const viewer = document.createElement("div");

    viewer.id = "reviewPhotoViewer";
    viewer.className = "review-photo-viewer";
    viewer.hidden = true;

    viewer.innerHTML = `

        <!-- 어두운 배경 -->
        <div
            class="review-photo-viewer-backdrop"
            data-review-photo-viewer-close
        ></div>


        <!-- 전체 사진보기 영역 -->
        <div class="review-photo-viewer-content">

            <!-- 닫기 버튼 -->
            <button
                type="button"
                class="review-photo-viewer-close"
                data-review-photo-viewer-close
                aria-label="사진 닫기"
            >
                ×
            </button>


            <!-- 이전 사진 -->
            <button
                type="button"
                class="review-photo-viewer-prev"
                data-review-photo-viewer-prev
                aria-label="이전 사진"
            >
                ‹
            </button>


            <!-- =================================================
                MR.EUM 수정부분

                사진 + 작성자 정보를 하나의 영역으로 묶습니다.

                이렇게 해야 사진 크기가 달라도
                전체 영역의 기준점이 변하지 않습니다.
            ================================================= -->
            <div class="review-photo-viewer-main">


                <!-- 사진 중앙 영역 -->
                <div class="review-photo-viewer-image-wrap">

                    <img
                        class="review-photo-viewer-image"
                        data-review-photo-viewer-image
                        alt="리뷰 사진"
                    >

                </div>


                <!-- =================================================
                    MR.EUM 수정부분

                    사진 바로 아래

                    [프로필] [작성자]
                    리뷰 내용 한 줄

                    이렇게 표시합니다.
                ================================================= -->
                <div class="review-photo-viewer-info">


                    <!-- 작성자 -->
                    <div class="review-photo-viewer-profile">

                        <span
                            class="review-photo-viewer-avatar"
                            data-review-photo-viewer-avatar
                        >
                            <i class="ti ti-user"></i>
                        </span>


                        <span
                            class="review-photo-viewer-nickname"
                            data-review-photo-viewer-nickname
                        >
                            CHEESE USER
                        </span>

                    </div>


                    <!-- 리뷰 내용 -->
                    <p
                        class="review-photo-viewer-text"
                        data-review-photo-viewer-text
                    ></p>


                </div>

            </div>


            <!-- 다음 사진 -->
            <button
                type="button"
                class="review-photo-viewer-next"
                data-review-photo-viewer-next
                aria-label="다음 사진"
            >
                ›
            </button>

        </div>
    `;

    document.body.appendChild(viewer);


    /*
        모달 내부 버튼 이벤트

        배경 / X
        → 모달 닫기

        ←
        → 이전 사진

        →
        → 다음 사진
    */
    viewer.addEventListener("click", event => {

        if (
            event.target.closest(
                "[data-review-photo-viewer-close]"
            )
        ) {
            closeReviewPhotoViewer();
            return;
        }


        if (
            event.target.closest(
                "[data-review-photo-viewer-prev]"
            )
        ) {
            moveReviewPhotoViewer(-1);
            return;
        }


        if (
            event.target.closest(
                "[data-review-photo-viewer-next]"
            )
        ) {
            moveReviewPhotoViewer(1);
        }

    });
}

function openReviewPhotoViewer(
    photoUrls,
    index = 0,
    review = null
) {
    const photos = Array.isArray(photoUrls)
        ? photoUrls.filter(Boolean)
        : [];

    if (!photos.length) {
        return;
    }

    ensureReviewPhotoViewer();

    reviewPhotoViewerUrls = photos;
    // =====================================================
    // MR.EUM 수정부분
    // 현재 사진에 해당하는 리뷰 정보를 저장한다.
    // 작성자 프로필 / 닉네임 / 리뷰 내용을
    // 사진 아래에 표시하기 위해 필요하다.
    // =====================================================
    reviewPhotoViewerReview = review;
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

    // const count = viewer.querySelector(
    //     "[data-review-photo-viewer-count]"
    // );

    const prev = viewer.querySelector(
        "[data-review-photo-viewer-prev]"
    );

    const next = viewer.querySelector(
        "[data-review-photo-viewer-next]"
    );

    // =====================================================
    // MR.EUM 수정부분
    // 사진 아래에 표시할 작성자 / 프로필 / 리뷰 내용 요소
    // =====================================================
    const avatar = viewer.querySelector(
        "[data-review-photo-viewer-avatar]"
    );

    const nickname = viewer.querySelector(
        "[data-review-photo-viewer-nickname]"
    );

    const reviewText = viewer.querySelector(
        "[data-review-photo-viewer-text]"
    );

    const url =
        reviewPhotoViewerUrls[reviewPhotoViewerIndex];

    if (image) {
        image.src = url;
        image.alt =
            `리뷰 사진 ${reviewPhotoViewerIndex + 1}`;
    }

    // =====================================================
// MR.EUM 수정부분
// 작성자 정보 표시
// =====================================================

    const review = reviewPhotoViewerReview;

    if (review) {

        // 작성자 이름
        if (nickname) {
            nickname.textContent =
                review.userNickname ||
                "CHEESE USER";
        }

        // 리뷰 내용
        if (reviewText) {
            reviewText.textContent =
                review.content || "";
        }

        // 작성자 프로필
        if (avatar) {

            const photoUrl =
                normalizeReviewUserPhotoUrl(
                    review.userPhotoUrl
                );

            if (photoUrl) {

                const separator =
                    photoUrl.includes("?")
                        ? "&"
                        : "?";

                avatar.classList.add("has-photo");

                avatar.innerHTML = `
                    <img
                        src="${escapeGroupHtml(
                            `${photoUrl}${separator}v=${Date.now()}`
                        )}"
                        alt="${escapeGroupHtml(
                            review.userNickname ||
                            "리뷰 작성자"
                        )} 프로필 사진"
                        onerror="
                            this.parentElement.classList.remove('has-photo');
                            this.parentElement.innerHTML='<i class=&quot;ti ti-user&quot;></i>';
                        "
                    >
                `;

            } else {

                avatar.classList.remove("has-photo");

                avatar.innerHTML = `
                    <i class="ti ti-user"></i>
                `;
            }
        }

    } else {

        if (nickname) {
            nickname.textContent = "CHEESE USER";
        }

        if (reviewText) {
            reviewText.textContent = "";
        }

        if (avatar) {
            avatar.classList.remove("has-photo");

            avatar.innerHTML = `
                <i class="ti ti-user"></i>
            `;
        }
    }

    // if (count) {
    //     count.textContent =
    //         `${reviewPhotoViewerIndex + 1} / ${reviewPhotoViewerUrls.length}`;
    // }

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

document.addEventListener("click", event => {

    /*
        클릭한 요소에서
        data-review-photo-index를 가진 버튼을 찾습니다.

        사진 <img> 자체를 눌러도
        closest()가 부모 버튼을 찾아줍니다.
    */
    const photoItem =
        event.target.closest(
            "[data-review-photo-index]"
        );

    /*
        리뷰 사진 버튼이 아니면
        이 이벤트에서는 아무것도 하지 않습니다.
    */
    if (!photoItem) {
        return;
    }


    /*
        클릭한 사진이 들어있는
        리뷰 사진 전체 영역을 찾습니다.
    */
    const photoContainer =
        photoItem.closest(
            "[data-review-photos]"
        );

    /*
        사진이 들어있는 리뷰 article을 찾습니다.

        이 안에
        - 작성자
        - 프로필
        - 리뷰 내용
        이 들어있습니다.
    */
    const reviewItem =
        photoItem.closest(
            ".place-review-item"
        );


    /*
        사진 목록을 JSON으로 다시 변환합니다.

        renderReviewPhotos()에서

        data-photo-urls="[...]"

        형태로 저장해둔 값을 가져옵니다.
    */
    if (!photoContainer) {
        console.error(
            "MR.EUM: 리뷰 사진 컨테이너를 찾을 수 없습니다."
        );

        return;
    }


    let photoUrls = [];

    try {

        photoUrls =
            JSON.parse(
                photoContainer.dataset.photoUrls || "[]"
            );

    } catch (error) {

        console.error(
            "MR.EUM: 리뷰 사진 목록 변환 실패:",
            error
        );

        return;
    }


    /*
        사진이 실제로 존재하는지 확인합니다.
    */
    if (
        !Array.isArray(photoUrls) ||
        photoUrls.length === 0
    ) {

        console.error(
            "MR.EUM: 리뷰 사진 URL이 없습니다.",
            photoUrls
        );

        return;
    }


    /*
        몇 번째 사진을 클릭했는지 가져옵니다.

        예:
        첫 번째 사진 -> 0
        두 번째 사진 -> 1
        세 번째 사진 -> 2
        네 번째 사진 -> 3
    */
    const index =
        Number(
            photoItem.dataset.reviewPhotoIndex
        ) || 0;


    /*
        =================================================
        MR.EUM 수정부분

        리뷰 작성자 / 내용 / 프로필 정보를
        사진 전체보기 모달에 전달합니다.
        =================================================
    */
    const review =
        reviewItem
            ? {

                userNickname:
                    reviewItem
                        .querySelector(
                            ".place-review-user"
                        )
                        ?.textContent
                        ?.trim() ||
                    "CHEESE USER",


                content:
                    reviewItem
                        .querySelector(
                            ".place-review-content"
                        )
                        ?.textContent
                        ?.trim() ||
                    "",


                userPhotoUrl:
                    reviewItem
                        .querySelector(
                            ".place-review-avatar img"
                        )
                        ?.src ||
                    ""

            }
            : null;


    /*
        =================================================
        실제 사진 전체보기 실행
        =================================================
    */
    openReviewPhotoViewer(
        photoUrls,
        index,
        review
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


// =====================================================
// MR.EUM 수정부분
// 리뷰 내용은 처음에 한 줄만 표시하고
// "더보기"를 누르면 전체 내용을 표시
// =====================================================


const REVIEW_TRANSLATION_CACHE_KEY =
    "cheeseMapReviewTranslationV2";

function readReviewTranslationCache() {
    try {
        const parsed = JSON.parse(
            localStorage.getItem(
                REVIEW_TRANSLATION_CACHE_KEY
            ) || "{}"
        );

        return parsed && typeof parsed === "object"
            ? parsed
            : {};
    } catch {
        return {};
    }
}

function writeReviewTranslationCache(cache) {
    try {
        localStorage.setItem(
            REVIEW_TRANSLATION_CACHE_KEY,
            JSON.stringify(cache || {})
        );
    } catch (error) {
        console.debug(
            "리뷰 번역 캐시 저장 실패:",
            error
        );
    }
}

function hashReviewTranslationText(text) {
    const value = String(text || "");
    let hash = 2166136261;

    for (let i = 0; i < value.length; i += 1) {
        hash ^= value.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }

    return (hash >>> 0).toString(36);
}

function getReviewTranslationCacheKey(
    reviewId,
    targetLanguage,
    sourceText = ""
) {
    return `${reviewId}:${targetLanguage}:${hashReviewTranslationText(sourceText)}`;
}

function getCachedReviewTranslation(
    reviewId,
    targetLanguage,
    sourceText = ""
) {
    const cache =
        readReviewTranslationCache();

    const entry =
        cache[
            getReviewTranslationCacheKey(
                reviewId,
                targetLanguage,
                sourceText
            )
        ] || null;

    if (!entry?.translatedText) {
        return null;
    }

    // 원문이 바뀌었는데 예전 해시 충돌/구버전 캐시가 있으면 쓰지 않습니다.
    if (
        entry.sourceText != null &&
        String(entry.sourceText) !== String(sourceText || "")
    ) {
        return null;
    }

    return entry;
}

function cacheReviewTranslation(
    reviewId,
    targetLanguage,
    sourceText,
    translatedText,
    detectedLanguage = ""
) {
    const cache =
        readReviewTranslationCache();

    cache[
        getReviewTranslationCacheKey(
            reviewId,
            targetLanguage,
            sourceText
        )
    ] = {
        sourceText: String(sourceText || ""),
        translatedText:
            String(translatedText || ""),
        detectedLanguage:
            String(detectedLanguage || ""),
        savedAt: Date.now()
    };

    // 포트폴리오/AWS 시연용: 리뷰 번역 캐시는 최대 300개까지만 유지
    const keys = Object.keys(cache);

    if (keys.length > 300) {
        keys
            .sort(
                (a, b) =>
                    Number(cache[a]?.savedAt || 0) -
                    Number(cache[b]?.savedAt || 0)
            )
            .slice(0, keys.length - 300)
            .forEach(key => {
                delete cache[key];
            });
    }

    writeReviewTranslationCache(cache);
}

function invalidateReviewTranslationCache(reviewId) {
    if (reviewId == null || reviewId === "") {
        return;
    }

    const prefix = `${reviewId}:`;
    const cache = readReviewTranslationCache();
    let changed = false;

    Object.keys(cache).forEach(key => {
        if (key.startsWith(prefix)) {
            delete cache[key];
            changed = true;
        }
    });

    if (changed) {
        writeReviewTranslationCache(cache);
    }
}

function detectReviewLanguage(text) {
    const value =
        String(text || "").trim();

    if (!value) {
        return "";
    }

    if (/[가-힣ㄱ-ㅎㅏ-ㅣ]/u.test(value)) {
        return "ko";
    }

    if (/[ぁ-んァ-ヶー]/u.test(value)) {
        return "ja";
    }

    if (/[A-Za-z]/.test(value)) {
        return "en";
    }

    // 한자만 있는 짧은 일본어 리뷰 등은 확정하기 어려우므로
    // 현재 UI 언어와 다른 언어 선택지를 모두 노출합니다.
    return "";
}

function getReviewLanguageLabel(language) {
    if (language === "ko") {
        return "한국어";
    }

    if (language === "ja") {
        return "日本語";
    }

    return "English";
}

function getReviewSiteLanguage() {
    return ["ko", "ja", "en"].includes(currentLanguage)
        ? currentLanguage
        : "ko";
}

function getReviewTranslateButtonLabel() {
    return currentLanguage === "ja"
        ? "翻訳"
        : currentLanguage === "en"
            ? "Translate"
            : "번역";
}

function getReviewTranslatingLabel() {
    return currentLanguage === "ja"
        ? "翻訳中..."
        : currentLanguage === "en"
            ? "Translating..."
            : "번역 중...";
}

function getReviewOriginalButtonLabel() {
    return "×";
}

function renderReviewTranslationControls(
    reviewId,
    content
) {
    const sourceLanguage =
        detectReviewLanguage(content);
    const targetLanguage =
        getReviewSiteLanguage();

    // 원문이 이미 사이트 언어와 같으면 번역 버튼을 숨깁니다.
    if (
        sourceLanguage &&
        sourceLanguage === targetLanguage
    ) {
        return "";
    }

    return `
        <div
            class="place-review-translation"
            data-review-translation
            data-review-id="${reviewId}"
            data-review-source-language="${sourceLanguage}"
        >
            <button
                type="button"
                class="place-review-translate-toggle"
                data-review-translate-button
            >
                <i class="ti ti-language"></i>
                <span data-review-translate-label>${getReviewTranslateButtonLabel()}</span>
            </button>

            <div
                class="place-review-translated-box"
                data-review-translated-box
                hidden
            >
                <div class="place-review-translated-head">
                    <span data-review-translated-label></span>

                    <button
                        type="button"
                        class="place-review-original-button"
                        data-review-original-button
                    >
                        ${getReviewOriginalButtonLabel()}
                    </button>
                </div>

                <p
                    class="place-review-translated-text"
                    data-review-translated-text
                ></p>
            </div>
        </div>
    `;
}

async function requestReviewTranslation(
    reviewId,
    text,
    targetLanguage
) {
    const sourceText = String(text || "").trim();

    const cached =
        getCachedReviewTranslation(
            reviewId,
            targetLanguage,
            sourceText
        );

    if (cached?.translatedText) {
        return cached;
    }

    const result =
        await apiRequest(
            "/api/translate",
            {
                method: "POST",
                body: {
                    text: sourceText,
                    targetLanguage
                }
            }
        );

    const translatedText =
        String(
            result?.translatedText || ""
        ).trim();

    if (!translatedText) {
        throw new Error(
            currentLanguage === "ja"
                ? "翻訳結果を取得できませんでした。"
                : currentLanguage === "en"
                    ? "Could not get the translation."
                    : "번역 결과를 가져오지 못했습니다."
        );
    }

    const normalized = {
        translatedText,
        detectedLanguage:
            String(
                result?.detectedLanguage ||
                result?.detectedSourceLanguage ||
                ""
            ).trim()
    };

    cacheReviewTranslation(
        reviewId,
        targetLanguage,
        sourceText,
        normalized.translatedText,
        normalized.detectedLanguage
    );

    return normalized;
}

document.addEventListener(
    "click",
    async event => {
        const translateButton =
            event.target.closest(
                "[data-review-translate-button]"
            );

        if (translateButton) {
            event.stopPropagation();

            const reviewItem =
                translateButton.closest(
                    ".place-review-item"
                );

            const wrapper =
                translateButton.closest(
                    "[data-review-translation]"
                );

            const content =
                reviewItem
                    ?.querySelector(
                        "[data-review-content-data]"
                    )
                    ?.textContent
                    ?.trim() ||
                reviewItem
                    ?.querySelector(
                        "[data-review-content]"
                    )
                    ?.textContent
                    ?.trim() ||
                "";

            const reviewId =
                Number(
                    wrapper?.dataset.reviewId ||
                    reviewItem?.dataset.reviewId
                );

            const targetLanguage =
                getReviewSiteLanguage();

            if (
                !content ||
                !Number.isFinite(reviewId)
            ) {
                return;
            }

            const translatedBox =
                wrapper?.querySelector(
                    "[data-review-translated-box]"
                );

            const translatedTextElement =
                wrapper?.querySelector(
                    "[data-review-translated-text]"
                );

            const translatedLabel =
                wrapper?.querySelector(
                    "[data-review-translated-label]"
                );

            const label =
                translateButton.querySelector(
                    "[data-review-translate-label]"
                );

            translateButton.disabled = true;

            const previousLabel =
                label?.textContent ||
                getReviewTranslateButtonLabel();

            if (label) {
                label.textContent =
                    getReviewTranslatingLabel();
            }

            try {
                const result =
                    await requestReviewTranslation(
                        reviewId,
                        content,
                        targetLanguage
                    );

                if (
                    translatedTextElement &&
                    translatedBox
                ) {
                    translatedTextElement.textContent =
                        result.translatedText;

                    if (translatedLabel) {
                        translatedLabel.textContent =
                            `${getReviewLanguageLabel(
                                targetLanguage
                            )} · Google 번역`;
                    }

                    translatedBox.hidden = false;
                }
            } catch (error) {
                showToast(
                    error?.message ||
                    (
                        currentLanguage === "ja"
                            ? "レビューを翻訳できませんでした。"
                            : currentLanguage === "en"
                                ? "Could not translate the review."
                                : "리뷰를 번역하지 못했습니다."
                    )
                );
            } finally {
                translateButton.disabled = false;

                if (label) {
                    label.textContent = previousLabel;
                }
            }

            return;
        }

        const originalButton =
            event.target.closest(
                "[data-review-original-button]"
            );

        if (originalButton) {
            event.stopPropagation();

            const translatedBox =
                originalButton
                    .closest(
                        "[data-review-translated-box]"
                    );

            if (translatedBox) {
                translatedBox.hidden = true;
            }
        }
    }
);

function renderReviewContent(content) {

    const fullContent = String(content || "");

    // 한 줄로 표시했을 때 넘치는지 판단하기 위한
    // 전체 내용은 data 속성에 보관합니다.
    return `
        <div
            class="place-review-content-wrap"
            data-review-content-wrap
        >

            <!--
                실제 리뷰 내용
                처음에는 CSS로 한 줄만 표시합니다.
                더보기를 누르면 같은 요소가 전체 내용으로 펼쳐집니다.
            -->
            <p
                class="place-review-content review-content-collapsed"
                data-review-content
            >
                ${escapeGroupHtml(fullContent)}
            </p>

            <!--
                리뷰 전체 내용의 길이를
                JS에서 확인하기 위한 숨겨진 데이터
            -->
            <span
                class="place-review-content-data"
                data-review-content-data
                hidden
            >${escapeGroupHtml(fullContent)}</span>

            <!--
                긴 리뷰일 때만 JS에서 표시합니다.
            -->
            <button
                type="button"
                class="place-review-more-button"
                data-review-more-button
                hidden
            >
                더보기
            </button>

        </div>
    `;
}

// =====================================================
// MR.EUM 수정부분
// 리뷰가 실제로 한 줄을 넘는지 확인
// 긴 리뷰에만 "더보기" 버튼을 보여줍니다.
// =====================================================

function updateReviewMoreButtons() {

    const reviewContents =
        document.querySelectorAll(
            "[data-review-content-wrap]"
        );

    reviewContents.forEach(wrap => {

        const content =
            wrap.querySelector("[data-review-content]");

        const moreButton =
            wrap.querySelector("[data-review-more-button]");

        if (!content || !moreButton) {
            return;
        }

        /*
         * 실제 내용의 높이가 한 줄 높이보다 크면
         * 여러 줄짜리 리뷰라고 판단합니다.
         */
        const isLongReview =
            content.scrollHeight > content.clientHeight + 1;

        moreButton.hidden = !isLongReview;
    });
}

updateReviewMoreButtons();

// mr.eum수정부분
function renderPlaceReviewEditPhotos(item) {
    const container = item.querySelector('[data-place-review-edit-photos]');
    const count = item.querySelector('[data-place-review-edit-photo-count]');
    if (!container) return;

    const newUrls = placeReviewEditNewPhotos.map(file => URL.createObjectURL(file));
    const total = placeReviewEditExistingPhotos.length + newUrls.length;
    if (count) count.textContent = `${total}장`;

    container.innerHTML = total
        ? placeReviewEditExistingPhotos.map((photo, index) => `
            <div class="place-review-edit-photo">
                <img src="${escapeGroupHtml(photo.url)}" alt="기존 리뷰 사진">
                <button type="button" class="place-review-edit-photo-delete" data-place-review-edit-photo-delete="existing" data-photo-index="${index}" aria-label="사진 삭제">×</button>
            </div>`).join('') +
          newUrls.map((url, index) => `
            <div class="place-review-edit-photo">
                <img src="${escapeGroupHtml(url)}" alt="새 리뷰 사진">
                <button type="button" class="place-review-edit-photo-delete" data-place-review-edit-photo-delete="new" data-photo-index="${index}" aria-label="사진 삭제">×</button>
            </div>`).join('')
        : '<span class="place-review-edit-photo-empty">사진을 추가해보세요.</span>';
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
                    data-review-photo-urls="${escapeGroupHtml(JSON.stringify(Array.isArray(review.photoUrls) ? review.photoUrls : []))}"
                    data-review-photo-ids="${escapeGroupHtml(JSON.stringify(Array.isArray(review.photoIds) ? review.photoIds : []))}"
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
                        <!-- MR.EUM 수정부분 -->
                        <!--
                            리뷰 내용이 100글자를 넘으면
                            일부만 보여주고 "..." + "더보기"를 표시합니다.
                        -->
                        ${renderReviewContent(review.content)}

                        ${renderReviewTranslationControls(
                            review.reviewId,
                            review.content
                        )}

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

                                    <!-- mr.eum수정부분 -->
                                    <div class="place-review-edit-photo-section">
                                        <div class="place-review-edit-photo-header">
                                            <strong>사진</strong>
                                            <span data-place-review-edit-photo-count>0장</span>
                                        </div>
                                        <div class="place-review-edit-photos" data-place-review-edit-photos></div>
                                        <input type="file" accept="image/*" multiple hidden data-place-review-edit-photo-input>
                                        <button type="button" class="place-review-edit-add-photo" data-place-review-edit-add-photo>
                                            <i class="ti ti-camera-plus"></i> 사진 추가
                                        </button>
                                    </div>

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


            /* =====================================================
               MR.EUM 수정부분
               리뷰 더보기 / 접기

               리뷰 본문 하나만 사용합니다.

               처음 상태
               → 한 줄만 표시

               "더보기" 클릭
               → 같은 리뷰 본문이 그대로 전체 내용으로 펼쳐짐

               "접기" 클릭
               → 다시 한 줄로 접힘

               ※ 별도의 전체 리뷰 영역을 사용하지 않습니다.
            ===================================================== */

            const moreButton =
                event.target.closest(
                    "[data-review-more-button]"
                );

            if (moreButton) {

                /*
                    현재 클릭한 더보기 버튼이 속한
                    리뷰 내용 영역을 찾습니다.
                */
                const contentWrap =
                    moreButton.closest(
                        "[data-review-content-wrap]"
                    );

                if (!contentWrap) {
                    return;
                }

                /*
                    실제 리뷰 본문입니다.

                    더보기 전과 후에
                    똑같은 이 요소를 사용합니다.
                */
                const content =
                    contentWrap.querySelector(
                        "[data-review-content]"
                    );

                if (!content) {
                    return;
                }

                /*
                    현재 리뷰가 접혀 있는지 확인합니다.
                */
                const isCollapsed =
                    content.classList.contains(
                        "review-content-collapsed"
                    );


                /* =================================================
                   더보기
                ================================================= */

                if (isCollapsed) {

                    /*
                        한 줄 제한을 제거합니다.

                        따라서 같은 리뷰 내용이
                        원래 있던 자리에서 그대로
                        여러 줄로 펼쳐집니다.
                    */
                    content.classList.remove(
                        "review-content-collapsed"
                    );

                    /*
                        버튼 글자를 접기로 변경
                    */
                    moreButton.textContent = "접기";

                }


                /* =================================================
                   접기
                ================================================= */

                else {

                    /*
                        다시 한 줄로 제한합니다.
                    */
                    content.classList.add(
                        "review-content-collapsed"
                    );

                    /*
                        버튼 글자를 더보기로 변경
                    */
                    moreButton.textContent = "더보기";
                }

                return;
            }


            /* =====================================================
               여기부터 기존 리뷰 수정 / 삭제 / 좋아요 기능
               기존 기능은 건드리지 않습니다.
            ===================================================== */

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


            /* =====================================================
               리뷰 수정 버튼
            ===================================================== */

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
                // mr.eum수정부분
                // 장소 리뷰 수정창을 열 때 기존 사진을 즉시 표시합니다.
                if (opening && edit) {
                    let reviewPhotoUrls = [];
                    let reviewPhotoIds = [];

                    try {
                        reviewPhotoUrls = JSON.parse(item.dataset.reviewPhotoUrls || "[]").filter(Boolean);
                        reviewPhotoIds = JSON.parse(item.dataset.reviewPhotoIds || "[]");
                    } catch {}

                    placeReviewEditExistingPhotos = reviewPhotoUrls.map((url, index) => ({
                        url,
                        id: reviewPhotoIds[index] ?? null
                    }));
                    placeReviewEditDeletePhotoIds = [];
                    placeReviewEditNewPhotos = [];
                    renderPlaceReviewEditPhotos(item);
                }

                return;
            }

            // mr.eum수정부분
            // 장소 상세 리뷰 수정 사진 추가/삭제
            if (event.target.closest('[data-place-review-edit-add-photo]')) {
                item.querySelector('[data-place-review-edit-photo-input]')?.click();
                return;
            }

            if (event.target.closest('[data-place-review-edit-photo-delete]')) {
                const deleteButton = event.target.closest('[data-place-review-edit-photo-delete]');
                const type = deleteButton.dataset.placeReviewEditPhotoDelete;
                const index = Number(deleteButton.dataset.photoIndex);

                if (type === "existing" && Number.isInteger(index)) {
                    const photo = placeReviewEditExistingPhotos[index];
                    if (photo?.id != null) {
                        placeReviewEditDeletePhotoIds.push(photo.id);
                    }
                    placeReviewEditExistingPhotos.splice(index, 1);
                } else if (type === "new" && Number.isInteger(index)) {
                    placeReviewEditNewPhotos.splice(index, 1);
                }

                renderPlaceReviewEditPhotos(item);
                return;
            }


            /* =====================================================
               별점 수정
            ===================================================== */

            // mr.eum수정부분
            if (event.target.matches('[data-place-review-edit-photo-input]')) {
                const files = Array.from(event.target.files || []);
                placeReviewEditNewPhotos.push(...files);
                event.target.value = '';
                renderPlaceReviewEditPhotos(item);
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


            /* =====================================================
               리뷰 수정 취소
            ===================================================== */

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


            /* =====================================================
               리뷰 수정 저장
            ===================================================== */

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

                // mr.eum수정부분
                placeReviewEditNewPhotos.forEach(file => {
                    form.append("images", file);
                });
                appendReviewDeleteImageIds(form, placeReviewEditDeletePhotoIds);

                try {

                    await apiRequest(
                        `/place/${activeReviewBackendPlace.placeId}/review/${reviewId}/edit`,
                        {
                            method: "PUT",
                            auth: true,
                            body: form
                        }
                    );

                    invalidateReviewTranslationCache(reviewId);

                    reviewCacheByPlace.delete(
                        String(
                            activeReviewBackendPlace.placeId
                        )
                    );

                    // mr.eum수정부분
                    placeReviewEditNewPhotos = [];
                    placeReviewEditExistingPhotos = [];
                    placeReviewEditDeletePhotoIds = [];
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


            /* =====================================================
               리뷰 삭제
            ===================================================== */

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

                    invalidateReviewTranslationCache(reviewId);

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


            /* =====================================================
               리뷰 좋아요
            ===================================================== */

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
    }) => {

        // =====================================================
        // MR.EUM 수정부분
        // 마이페이지에서 수정 버튼을 눌렀을 때
        // 해당 리뷰 데이터를 다시 찾을 수 있도록 저장
        // =====================================================
        myPageReviewStore.set(
            String(review.reviewId),
            {
                review,
                placeId,
                place,
                resolvedPlaceName
            }
        );

        return `
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
            `;
        });

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

/* =====================================================
   MR.EUM 수정부분
   마이페이지 리뷰 수정 모달

   기존 카드 내부 수정창을 사용하지 않고
   화면 중앙에 독립적인 수정 모달을 생성합니다.

   특징
   ─────────────────────────
   1. 별점 수정
   2. 리뷰 내용 수정
   3. 기존 사진 표시
   4. 기존 사진 삭제 버튼
   5. 새 사진 추가
   6. 취소 / 수정 완료
===================================================== */

let myPageReviewEditRating = 5;

let myPageReviewEditNewPhotos = [];

let myPageReviewEditDeletePhotoIds = [];

let myPageReviewEditExistingPhotos = [];

// mr.eum수정부분
let myPageReviewEditTarget = null;

// mr.eum수정부분
// 장소 상세 리뷰 수정에서 새로 선택한 사진을 보관합니다.
let placeReviewEditNewPhotos = [];
let placeReviewEditExistingPhotos = [];
let placeReviewEditDeletePhotoIds = [];

function appendReviewDeleteImageIds(form, deletePhotoIds) {
    (deletePhotoIds || []).forEach(photoId => {
        form.append("deleteImageIds", String(photoId));
    });
}

function toReviewEditPhotos(review) {
    const urls = Array.isArray(review?.photoUrls)
        ? review.photoUrls.filter(Boolean)
        : [];
    const ids = Array.isArray(review?.photoIds)
        ? review.photoIds
        : [];

    return urls.map((url, index) => ({
        url,
        id: ids[index] ?? null
    }));
}


/* =====================================================
   MR.EUM 수정부분
   마이페이지 리뷰 수정 모달 HTML 생성
===================================================== */

function ensureMyPageReviewEditModal() {

    if (
        document.getElementById(
            "myPageReviewEditModal"
        )
    ) {
        return;
    }

    const modal =
        document.createElement("div");

    modal.id =
        "myPageReviewEditModal";

    modal.className =
        "mypage-review-edit-modal";

    modal.hidden = true;

    modal.innerHTML = `

        <div
            class="mypage-review-edit-backdrop"
            data-mypage-review-edit-close
        ></div>

        <section
            class="mypage-review-edit-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="myPageReviewEditTitle"
        >

            <!-- 헤더 -->
            <div class="mypage-review-edit-header">

                <div>
                    <span
                        class="mypage-review-edit-label"
                    >
                        CHEESE REVIEW
                    </span>

                    <h2
                        id="myPageReviewEditTitle"
                    >
                        리뷰 수정
                    </h2>

                    <p
                        id="myPageReviewEditPlace"
                        class="mypage-review-edit-place"
                    ></p>
                </div>

                <button
                    type="button"
                    class="mypage-review-edit-close"
                    data-mypage-review-edit-close
                    aria-label="닫기"
                >
                    ×
                </button>

            </div>


            <!-- 별점 -->
            <div class="mypage-review-edit-section">

                <div
                    class="mypage-review-edit-section-title"
                >
                    별점
                </div>

                <div
                    id="myPageReviewEditStars"
                    class="mypage-review-edit-stars"
                >
                    ${[1,2,3,4,5].map(
                        rating => `
                            <button
                                type="button"
                                data-mypage-edit-rating="${rating}"
                            >
                                ☆
                            </button>
                        `
                    ).join("")}
                </div>

            </div>


            <!-- 리뷰 내용 -->
            <div class="mypage-review-edit-section">

                <div
                    class="mypage-review-edit-section-title"
                >
                    리뷰 내용
                </div>

                <textarea
                    id="myPageReviewEditContent"
                    class="mypage-review-edit-textarea"
                    maxlength="500"
                    placeholder="리뷰 내용을 입력해주세요."
                ></textarea>

                <div
                    id="myPageReviewEditCharacterCount"
                    class="mypage-review-edit-character-count"
                >
                    0 / 500
                </div>

            </div>


            <!-- 사진 -->
            <div class="mypage-review-edit-section">

                <div
                    class="mypage-review-edit-photo-header"
                >

                    <div
                        class="mypage-review-edit-section-title"
                    >
                        사진
                    </div>

                    <span
                        id="myPageReviewEditPhotoCount"
                    >
                        0장
                    </span>

                </div>


                <div
                    id="myPageReviewEditPhotos"
                    class="mypage-review-edit-photos"
                ></div>


                <input
                    type="file"
                    id="myPageReviewEditPhotoInput"
                    accept="image/*"
                    multiple
                    hidden
                >


                <button
                    type="button"
                    class="mypage-review-edit-add-photo"
                    id="myPageReviewEditAddPhoto"
                >
                    <i class="ti ti-camera-plus"></i>
                    사진 추가
                </button>

            </div>


            <!-- 하단 버튼 -->
            <div
                class="mypage-review-edit-footer"
            >

                <button
                    type="button"
                    class="mypage-review-edit-cancel"
                    data-mypage-review-edit-close
                >
                    취소
                </button>

                <button
                    type="button"
                    class="mypage-review-edit-save"
                    id="myPageReviewEditSave"
                >
                    수정 완료
                </button>

            </div>

        </section>
    `;

    document.body.appendChild(modal);


    /* =================================================
       닫기 버튼
    ================================================= */

    modal.addEventListener(
        "click",
        event => {

            if (
                event.target.closest(
                    "[data-mypage-review-edit-close]"
                )
            ) {
                closeMyPageReviewEditModal();
            }

        }
    );


    /* =================================================
       별점
    ================================================= */

    modal.addEventListener(
        "click",
        event => {

            const button =
                event.target.closest(
                    "[data-mypage-edit-rating]"
                );

            if (!button) {
                return;
            }

            myPageReviewEditRating =
                Number(
                    button.dataset
                        .mypageEditRating
                );

            renderMyPageReviewEditStars();
        }
    );


    /* =================================================
       사진 추가 버튼
    ================================================= */

    document
        .getElementById(
            "myPageReviewEditAddPhoto"
        )
        ?.addEventListener(
            "click",
            () => {

                document
                    .getElementById(
                        "myPageReviewEditPhotoInput"
                    )
                    ?.click();

            }
        );


    /* =================================================
       사진 파일 선택
    ================================================= */

    document
        .getElementById(
            "myPageReviewEditPhotoInput"
        )
        ?.addEventListener(
            "change",
            event => {

                const files =
                    Array.from(
                        event.target.files || []
                    );

                if (!files.length) {
                    return;
                }

                myPageReviewEditNewPhotos.push(
                    ...files
                );

                event.target.value = "";

                renderMyPageReviewEditPhotos();

            }
        );


    /* =================================================
       사진 삭제
    ================================================= */

    modal.addEventListener(
        "click",
        event => {

            const deleteButton =
                event.target.closest(
                    "[data-mypage-delete-photo]"
                );

            if (!deleteButton) {
                return;
            }

            const type =
                deleteButton.dataset
                    .mypageDeletePhoto;

            const index =
                Number(
                    deleteButton.dataset
                        .photoIndex
                );

            if (
                type === "existing"
            ) {

                const photoId =
                    Number(
                        deleteButton.dataset
                            .photoId
                    );

                if (Number.isFinite(photoId)) {
                    myPageReviewEditDeletePhotoIds.push(photoId);
                }

                myPageReviewEditExistingPhotos.splice(index, 1);

            } else if (
                type === "new"
            ) {

                myPageReviewEditNewPhotos
                    .splice(index, 1);

            }

            renderMyPageReviewEditPhotos();

        }
    );


    /* =================================================
       리뷰 내용 글자 수
    ================================================= */

    document
        .getElementById(
            "myPageReviewEditContent"
        )
        ?.addEventListener(
            "input",
            event => {

                const counter =
                    document.getElementById(
                        "myPageReviewEditCharacterCount"
                    );

                if (counter) {

                    counter.textContent =
                        `${event.target.value.length} / 500`;

                }

            }
        );


    /* =================================================
       수정 완료
    ================================================= */

    document
        .getElementById(
            "myPageReviewEditSave"
        )
        ?.addEventListener(
            "click",
            saveMyPageReviewEdit
        );
}


/* =====================================================
   MR.EUM 수정부분
   수정 모달 열기
===================================================== */

function openMyPageReviewEditModal(
    reviewData
) {

    ensureMyPageReviewEditModal();

    const modal =
        document.getElementById(
            "myPageReviewEditModal"
        );

    if (!modal) {
        return;
    }


    const review =
        reviewData.review;

    // mr.eum수정부분
    myPageReviewEditTarget = reviewData;

    myPageReviewEditRating =
        Number(review.rating) || 5;


    myPageReviewEditNewPhotos =
        [];


    myPageReviewEditDeletePhotoIds =
        [];


    /*
       서버에서 내려오는 기존 사진 목록

       현재 프로젝트의 리뷰 데이터에서
       photoUrls를 사용하고 있으므로 우선
       그것을 기존 사진으로 사용합니다.
    */

    myPageReviewEditExistingPhotos = toReviewEditPhotos(review);


    const placeName =
        document.getElementById(
            "myPageReviewEditPlace"
        );

    if (placeName) {

        placeName.textContent =
            reviewData.resolvedPlaceName ||
            `장소 #${reviewData.placeId}`;

    }


    const textarea =
        document.getElementById(
            "myPageReviewEditContent"
        );

    if (textarea) {

        textarea.value =
            review.content || "";

    }


    renderMyPageReviewEditStars();

    renderMyPageReviewEditPhotos();


    modal.hidden = false;

    document.body.classList.add(
        "mypage-review-edit-open"
    );


    requestAnimationFrame(
        () => {

            textarea?.focus();

        }
    );
}


/* =====================================================
   MR.EUM 수정부분
   별점 화면 표시
===================================================== */

function renderMyPageReviewEditStars() {

    const container =
        document.getElementById(
            "myPageReviewEditStars"
        );

    if (!container) {
        return;
    }

    container
        .querySelectorAll(
            "[data-mypage-edit-rating]"
        )
        .forEach(button => {

            const rating =
                Number(
                    button.dataset
                        .mypageEditRating
                );

            button.textContent =
                rating <=
                myPageReviewEditRating
                    ? "★"
                    : "☆";

            button.classList.toggle(
                "selected",
                rating <=
                myPageReviewEditRating
            );

        });
}


/* =====================================================
   MR.EUM 수정부분
   수정 모달 사진 표시
===================================================== */

function renderMyPageReviewEditPhotos() {

    const container =
        document.getElementById(
            "myPageReviewEditPhotos"
        );

    const count =
        document.getElementById(
            "myPageReviewEditPhotoCount"
        );

    if (!container) {
        return;
    }


    const existingCount =
        myPageReviewEditExistingPhotos.length;


    const newCount =
        myPageReviewEditNewPhotos.length;


    const totalCount =
        existingCount +
        newCount;


    if (count) {

        count.textContent =
            `${totalCount}장`;

    }


    if (!totalCount) {

        container.innerHTML = `
            <div
                class="mypage-review-edit-photo-empty"
            >
                <i class="ti ti-photo"></i>
                <span>
                    사진을 추가해보세요.
                </span>
            </div>
        `;

        return;
    }


    container.innerHTML = `

        ${
            myPageReviewEditExistingPhotos
                .map(
                    (photo, index) => `
                        <div
                            class="mypage-review-edit-photo"
                        >

                            <img
                                src="${escapeGroupHtml(photo.url)}"
                                alt="기존 리뷰 사진"
                            >

                            <button
                                type="button"
                                class="mypage-review-edit-photo-delete"
                                data-mypage-delete-photo="existing"
                                data-photo-index="${index}"
                                ${
                                    photo.id
                                        ? `data-photo-id="${photo.id}"`
                                        : ""
                                }
                                aria-label="사진 삭제"
                            >
                                ×
                            </button>

                        </div>
                    `
                )
                .join("")
        }

        ${
            myPageReviewEditNewPhotos
                .map(
                    (file, index) => {

                        const url =
                            URL.createObjectURL(
                                file
                            );

                        return `
                            <div
                                class="mypage-review-edit-photo"
                            >

                                <img
                                    src="${url}"
                                    alt="새 리뷰 사진"
                                >

                                <button
                                    type="button"
                                    class="mypage-review-edit-photo-delete"
                                    data-mypage-delete-photo="new"
                                    data-photo-index="${index}"
                                    aria-label="사진 삭제"
                                >
                                    ×
                                </button>

                            </div>
                        `;

                    }
                )
                .join("")
        }

    `;
}


/* =====================================================
   MR.EUM 수정부분
   수정 모달 닫기
===================================================== */

function closeMyPageReviewEditModal() {

    const modal =
        document.getElementById(
            "myPageReviewEditModal"
        );

    if (!modal) {
        return;
    }

    modal.hidden = true;

    document.body.classList.remove(
        "mypage-review-edit-open"
    );

    myPageReviewEditNewPhotos = [];

    myPageReviewEditDeletePhotoIds = [];

    myPageReviewEditExistingPhotos = [];

    myPageReviewEditRating = 5;

    // mr.eum수정부분
    myPageReviewEditTarget = null;
}


/* =====================================================
   MR.EUM 수정부분
   실제 리뷰 수정 요청
===================================================== */

async function saveMyPageReviewEdit() {
    // mr.eum수정부분
    // 마이페이지 리뷰 수정 모달의 실제 저장 처리
    const target = myPageReviewEditTarget;
    const contentElement = document.getElementById("myPageReviewEditContent");

    if (!target || !contentElement) {
        showToast("리뷰 정보를 불러오지 못했습니다.");
        return;
    }

    const content = contentElement.value.trim();
    if (!content) {
        showToast("리뷰 내용을 입력해주세요.");
        return;
    }

    const form = new FormData();
    form.append("rating", String(myPageReviewEditRating));
    form.append("content", content);

    // mr.eum수정부분
    myPageReviewEditNewPhotos.forEach(file => {
        form.append("images", file);
    });
    appendReviewDeleteImageIds(form, myPageReviewEditDeletePhotoIds);

    try {
        await apiRequest(
            `/place/${target.placeId}/review/${target.review.reviewId}/edit`,
            { method: "PUT", auth: true, body: form }
        );

        invalidateReviewTranslationCache(target.review.reviewId);
        reviewCacheByPlace.delete(String(target.placeId));
        invalidateMyReviewsPageCache();
        closeMyPageReviewEditModal();

        const container = document.getElementById("mypageContent");
        if (container) await renderMyReviews(container);

        if (activeReviewBackendPlace && Number(activeReviewBackendPlace.placeId) === Number(target.placeId)) {
            await renderPlaceReviews(selectedPlaceKey);
        }

        showToast("리뷰가 수정되었습니다.");
    } catch (error) {
        console.error("마이페이지 리뷰 수정 실패:", error);
        showToast(error.message || "리뷰 수정에 실패했습니다.");
    }
}

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

            /* =====================================================
            MR.EUM 수정부분
            마이페이지 리뷰 수정 버튼

            기존 방식
            ─────────────────────────
            수정 버튼
                ↓
            카드 내부 수정 영역 표시

            변경 방식
            ─────────────────────────
            수정 버튼
                ↓
            별도의 리뷰 수정 모달 표시
            ===================================================== */

            if (
                event.target.closest(
                    "[data-my-server-review-edit]"
                )
            ) {
                const reviewData =
                    myPageReviewStore.get(
                        String(reviewId)
                    );

                if (!reviewData) {
                    showToast(
                        "리뷰 정보를 불러오지 못했습니다."
                    );

                    return;
                }

                openMyPageReviewEditModal(
                    reviewData
                );

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

                    invalidateReviewTranslationCache(reviewId);

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

                    invalidateReviewTranslationCache(reviewId);

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

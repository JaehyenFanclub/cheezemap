/* =====================================================
   좋아요 및 저장
===================================================== */

/*
    현재 장소의 프론트 키를 안전하게 확보합니다.

    - 기존 샘플/로컬 장소: selectedPlaceKey 사용
    - Google Places 장소: google_<placeId> 키로 places에 임시 등록
    - 장소 상세 카드의 data-place-key도 보조로 사용

    좋아요/저장 두 버튼이 동일한 장소 키를 쓰도록 통일합니다.
*/
function ensureCurrentPlaceKey() {
    if (
        selectedPlaceKey &&
        places[selectedPlaceKey]
    ) {
        return selectedPlaceKey;
    }

    if (
        selectedGooglePoi &&
        selectedGooglePoi.placeId
    ) {
        const googleKey =
            `google_${selectedGooglePoi.placeId}`;

        if (!places[googleKey]) {
            const googleName =
                selectedGooglePoi.name ||
                "Google Place";

            const googleAddress =
                selectedGooglePoi.address ||
                "";

            places[googleKey] = {
                name: {
                    ko: googleName,
                    ja: googleName,
                    en: googleName
                },

                category: {
                    ko: "구글 장소",
                    ja: "Googleスポット",
                    en: "Google Place"
                },

                type: "tour",

                rating:
                    Number(
                        selectedGooglePoi.rating
                    ) || 0,

                reviewCount:
                    Number(
                        selectedGooglePoi.reviewCount
                    ) || 0,

                address: {
                    ko: googleAddress,
                    ja: googleAddress,
                    en: googleAddress
                },

                crowd: {
                    ko: "보통",
                    ja: "普通",
                    en: "Normal"
                },

                icon: "ti-map-pin",

                color:
                    "linear-gradient(135deg, #ffe5a7, #f4bc45)",

                position:
                    selectedGooglePoi.position
            };
        }

        selectedPlaceKey =
            googleKey;

        if (placeCard) {
            placeCard.dataset.placeKey =
                googleKey;
        }

        /*
            selectedGooglePoi는 일부 다른 기능에서도 사용할 수 있으므로
            여기서 null로 만들지 않습니다.
        */

        return googleKey;
    }

    const cardPlaceKey =
        placeCard?.dataset.placeKey;

    if (
        cardPlaceKey &&
        places[cardPlaceKey]
    ) {
        selectedPlaceKey =
            cardPlaceKey;

        return cardPlaceKey;
    }

    return null;
}


function hasCurrentPlaceContext() {
    return Boolean(
        (
            selectedPlaceKey &&
            places[selectedPlaceKey]
        ) ||
        (
            selectedGooglePoi &&
            selectedGooglePoi.placeId
        ) ||
        (
            placeCard?.dataset.placeKey &&
            places[
                placeCard.dataset.placeKey
            ]
        )
    );
}


/*
    다른 JS에서 Google 장소를 열 때
    favoriteButton / saveButton을 disabled 처리하더라도
    실제 장소가 선택돼 있으면 다시 활성화합니다.

    로그인 여부는 클릭 핸들러에서 검사하므로
    로그아웃 상태에서도 버튼 자체는 클릭 가능하게 두고
    클릭 시 로그인 모달을 띄웁니다.
*/
function enablePlaceActionButtons() {
    const hasPlace =
        hasCurrentPlaceContext();

    const favoriteButton =
        document.getElementById(
            "favoriteButton"
        );

    const savePlaceButton =
        document.getElementById(
            "saveButton"
        );

    if (favoriteButton) {
        favoriteButton.disabled =
            !hasPlace;

        if (hasPlace) {
            favoriteButton.removeAttribute(
                "title"
            );
        }
    }

    if (savePlaceButton) {
        savePlaceButton.disabled =
            !hasPlace;

        if (hasPlace) {
            savePlaceButton.removeAttribute(
                "title"
            );
        }
    }
}


function normalizePlaceStateKey(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";

    if (/^place:\d+$/.test(raw)) {
        return raw;
    }

    if (raw.startsWith("google:")) {
        const googleId =
            typeof normalizeGooglePlaceId === "function"
                ? normalizeGooglePlaceId(raw.slice("google:".length))
                : raw.slice("google:".length).replace(/^places\//, "");

        return googleId
            ? `google:${googleId}`
            : "";
    }

    if (raw.startsWith("google_")) {
        const googleId =
            typeof normalizeGooglePlaceId === "function"
                ? normalizeGooglePlaceId(raw.slice("google_".length))
                : raw.slice("google_".length).replace(/^places\//, "");

        return googleId
            ? `google:${googleId}`
            : "";
    }

    return raw;
}


function migrateLegacyPlaceStateKeys(values) {
    if (!Array.isArray(values)) return [];

    const links =
        typeof readBackendPlaceLinks === "function"
            ? readBackendPlaceLinks()
            : {};

    const migrated = [];

    values.forEach(value => {
        const raw =
            normalizePlaceStateKey(value);

        if (!raw) return;

        if (
            /^place:\d+$/.test(raw) ||
            raw.startsWith("google:")
        ) {
            migrated.push(raw);

            /*
                Google 별칭에 이미 DB 링크가 있으면 place:id도 함께 보관합니다.
                반대로 링크가 아직 없어도 google:<id>를 버리지 않습니다.
            */
            if (raw.startsWith("google:")) {
                const linkedId =
                    Number(links[raw]);

                if (
                    Number.isFinite(linkedId) &&
                    linkedId > 0
                ) {
                    migrated.push(
                        `place:${linkedId}`
                    );
                }
            }

            return;
        }

        if (raw && places[raw]) {
            const externalKey =
                `static:${raw}`;

            const linkedId =
                Number(links[externalKey]);

            if (
                Number.isFinite(linkedId) &&
                linkedId > 0
            ) {
                migrated.push(
                    `place:${linkedId}`
                );
            }
        }
    });

    return [...new Set(migrated)];
}


function getCurrentGoogleStateKey() {
    const googleId =
        typeof normalizeGooglePlaceId === "function"
            ? normalizeGooglePlaceId(
                selectedGooglePoi?.placeId || ""
            )
            : String(
                selectedGooglePoi?.placeId || ""
            ).replace(/^places\//, "");

    return googleId
        ? `google:${googleId}`
        : "";
}


function getPlaceStateKeys(placeKey = selectedPlaceKey) {
    const keys = [];

    const backendId =
        typeof getRememberedBackendPlaceId === "function"
            ? getRememberedBackendPlaceId(
                placeKey
            )
            : null;

    if (
        Number.isFinite(Number(backendId)) &&
        Number(backendId) > 0
    ) {
        keys.push(
            `place:${Number(backendId)}`
        );
    }

    const googleKey =
        getCurrentGoogleStateKey();

    if (googleKey) {
        keys.push(googleKey);
    }

    if (
        placeKey &&
        String(placeKey).startsWith("google_")
    ) {
        const googleId =
            typeof normalizeGooglePlaceId === "function"
                ? normalizeGooglePlaceId(
                    String(placeKey).slice(7)
                )
                : String(placeKey).slice(7).replace(/^places\//, "");

        if (googleId) {
            keys.push(
                `google:${googleId}`
            );
        }
    }

    return [...new Set(keys)];
}


async function ensurePlaceStateKeys(placeKey = selectedPlaceKey) {
    const keys =
        getPlaceStateKeys(placeKey);

    let backendId =
        keys
            .map(key => {
                const match =
                    key.match(/^place:(\d+)$/);

                return match
                    ? Number(match[1])
                    : null;
            })
            .find(Boolean);

    if (!backendId) {
        const backendPlace =
            await ensureBackendPlace(
                placeKey
            );

        backendId =
            Number(
                backendPlace?.placeId
            );

        if (
            Number.isFinite(backendId) &&
            backendId > 0
        ) {
            keys.push(
                `place:${backendId}`
            );
        }
    }

    const descriptor =
        typeof getActivePlaceDescriptor === "function"
            ? getActivePlaceDescriptor(placeKey)
            : null;

    if (descriptor?.googlePlaceId) {
        const googleId =
            normalizeGooglePlaceId(
                descriptor.googlePlaceId
            );

        if (googleId) {
            keys.push(
                `google:${googleId}`
            );
        }
    }

    return [...new Set(keys)];
}

likedPlaces = migrateLegacyPlaceStateKeys(likedPlaces);
writeStorage(STORAGE_KEYS.likes, likedPlaces);


/* =====================================================
   서버 PlaceLike / PlaceSaved 상태 동기화
===================================================== */

function placeStateKeysFromBackendRows(rows) {
    return [...new Set(
        (Array.isArray(rows) ? rows : [])
            .map(place => Number(place?.placeId))
            .filter(placeId => Number.isFinite(placeId) && placeId > 0)
            .map(placeId => `place:${placeId}`)
    )];
}

function cacheBackendPreferencePlaces(rows) {
    (Array.isArray(rows) ? rows : []).forEach(place => {
        try {
            if (typeof registerFrontendPlaceFromBackend === "function") {
                registerFrontendPlaceFromBackend(place);
            }
        } catch (error) {
            console.debug("저장 장소 캐시 등록 실패:", error);
        }
    });
}

async function syncBackendPlacePreferences() {
    if (!getAuthToken()) return;

    const [likesResult, savedResult] = await Promise.allSettled([
        apiRequest("/api/places/me/likes", { auth: true }),
        apiRequest("/api/places/me/saved", { auth: true })
    ]);

    if (likesResult.status === "fulfilled") {
        const rows = Array.isArray(likesResult.value) ? likesResult.value : [];
        cacheBackendPreferencePlaces(rows);
        likedPlaces = placeStateKeysFromBackendRows(rows);
        writeStorage(STORAGE_KEYS.likes, likedPlaces);
    } else {
        console.warn("좋아요 목록 서버 동기화 실패:", likesResult.reason);
    }

    if (savedResult.status === "fulfilled") {
        const rows = Array.isArray(savedResult.value) ? savedResult.value : [];
        cacheBackendPreferencePlaces(rows);
        favoritePlaces = placeStateKeysFromBackendRows(rows);
        writeStorage(STORAGE_KEYS.favorites, favoritePlaces);
    } else {
        console.warn("즐겨찾기 목록 서버 동기화 실패:", savedResult.reason);
    }

    updateFavoriteButtons?.();
}


function getCurrentBackendStateKey() {
    return getPlaceStateKeys(
        selectedPlaceKey
    ).find(
        key => /^place:\d+$/.test(key)
    ) || "";
}


function isPlaceLiked(stateKeyOrKeys) {
    const keys =
        Array.isArray(stateKeyOrKeys)
            ? stateKeyOrKeys
            : [stateKeyOrKeys];

    return keys.some(
        key =>
            key &&
            likedPlaces.includes(
                normalizePlaceStateKey(key)
            )
    );
}


async function togglePlaceLike(placeKey = selectedPlaceKey) {
    if (!currentUser) {
        showToast("toast.loginRequired");
        openModal(loginModal);
        return;
    }

    let stateKeys = [];

    try {
        stateKeys = await ensurePlaceStateKeys(placeKey);

        const placeStateKey = stateKeys.find(key => /^place:\d+$/.test(key));
        const placeId = backendPlaceIdFromStateKey(placeStateKey);

        if (!placeId) {
            throw new Error("백엔드 장소 ID를 확인할 수 없습니다.");
        }

        const result = await apiRequest(`/api/places/${placeId}/like`, {
            method: "POST",
            auth: true
        });

        const canonicalKey = `place:${placeId}`;
        const isLiked = Boolean(result?.isLiked);

        if (isLiked) {
            likedPlaces = [
                ...new Set([
                    ...likedPlaces.filter(key => !stateKeys.includes(normalizePlaceStateKey(key))),
                    canonicalKey
                ])
            ];
            showToast("toast.saved");

            if (typeof recordPlacePreferenceAction === "function") {
                recordPlacePreferenceAction("like", placeKey).catch?.(console.warn);
            }
        } else {
            likedPlaces = likedPlaces.filter(key => {
                const normalized = normalizePlaceStateKey(key);
                return normalized !== canonicalKey && !stateKeys.includes(normalized);
            });
            showToast("toast.removed");
        }

        writeStorage(STORAGE_KEYS.likes, likedPlaces);
        updateLikeButton();

        if (
            mypageModal?.classList.contains("show") &&
            currentMyPageTab === "likes"
        ) {
            renderMyPage();
        }
    } catch (error) {
        console.error("좋아요 서버 처리 실패:", error);
        showToast(
            currentLanguage === "ko"
                ? "좋아요 처리에 실패했습니다."
                : currentLanguage === "ja"
                    ? "いいねの処理に失敗しました。"
                    : "Could not update like."
        );
    }
}

function updateLikeButton() {
    enablePlaceActionButtons();

    const stateKeys =
        getPlaceStateKeys(
            selectedPlaceKey
        );

    const liked =
        isPlaceLiked(
            stateKeys
        );

    const favoriteButton =
        document.getElementById(
            "favoriteButton"
        );

    favoriteButton?.classList.toggle(
        "active",
        liked
    );

    favoriteButton?.classList.toggle(
        "saved",
        liked
    );

    if (favoriteButton) {
        favoriteButton.innerHTML = `
            <i
                class="ti ${liked ? "ti-heart-filled" : "ti-heart"}"
                aria-hidden="true"
            ></i>
        `;

        favoriteButton.setAttribute(
            "aria-label",
            currentLanguage === "ko"
                ? liked
                    ? "좋아요 취소"
                    : "좋아요"
                : currentLanguage === "ja"
                    ? liked
                        ? "いいね解除"
                        : "いいね"
                    : liked
                        ? "Unlike"
                        : "Like"
        );
    }
}


function updateSaveButton() {
    enablePlaceActionButtons();

    const stateKeys =
        getPlaceStateKeys(
            selectedPlaceKey
        );

    const saved =
        typeof isPlaceFavorite === "function"
            ? isPlaceFavorite(
                stateKeys
            )
            : false;

    const savePlaceButton =
        document.getElementById(
            "saveButton"
        );

    if (!savePlaceButton) return;

    savePlaceButton.classList.toggle(
        "saved",
        Boolean(saved)
    );

    savePlaceButton.classList.toggle(
        "active",
        Boolean(saved)
    );

    savePlaceButton.innerHTML = `
        <i
            class="ti ${saved ? "ti-bookmark-filled" : "ti-bookmark"}"
            aria-hidden="true"
        ></i>
        <span>
            ${
                saved
                    ? (
                        currentLanguage === "ko"
                            ? "저장됨"
                            : currentLanguage === "ja"
                                ? "保存済み"
                                : "Saved"
                    )
                    : translate("place.save")
            }
        </span>
    `;
}


function updateFavoriteButtons() {
    updateLikeButton();
    updateSaveButton();
}


/* 하트 / 좋아요 버튼 */

document
    .getElementById(
        "favoriteButton"
    )
    ?.addEventListener(
        "click",
        event => {
            event.preventDefault();
            event.stopPropagation();

            if (!currentUser) {
                showToast(
                    "toast.loginRequired"
                );

                openModal(
                    loginModal
                );

                return;
            }

            const currentKey =
                ensureCurrentPlaceKey();

            if (
                !currentKey ||
                !places[currentKey]
            ) {
                showToast(
                    currentLanguage === "ko"
                        ? "장소 정보를 불러오지 못했습니다."
                        : currentLanguage === "ja"
                            ? "場所情報を取得できませんでした。"
                            : "Could not load place information."
                );

                return;
            }

            togglePlaceLike(
                currentKey
            );
        }
    );


/* 저장 버튼 */

document
    .getElementById(
        "saveButton"
    )
    ?.addEventListener(
        "click",
        event => {
            event.preventDefault();
            event.stopPropagation();

            if (!currentUser) {
                showToast(
                    "toast.loginRequired"
                );

                openModal(
                    loginModal
                );

                return;
            }

            const currentKey =
                ensureCurrentPlaceKey();

            if (
                !currentKey ||
                !places[currentKey]
            ) {
                showToast(
                    currentLanguage === "ko"
                        ? "장소 정보를 불러오지 못했습니다."
                        : currentLanguage === "ja"
                            ? "場所情報を取得できませんでした。"
                            : "Could not load place information."
                );

                return;
            }

            togglePlaceFavorite(
                currentKey
            );
        }
    );


/*
    map.js 등 다른 스크립트가 장소를 표시하면서
    버튼에 disabled를 다시 붙이는 경우를 방지합니다.
*/
const placeActionButtonObserver =
    new MutationObserver(
        () => {
            enablePlaceActionButtons();
        }
    );

[
    document.getElementById(
        "favoriteButton"
    ),

    document.getElementById(
        "saveButton"
    ),

    placeCard
]
    .filter(Boolean)
    .forEach(element => {
        placeActionButtonObserver.observe(
            element,
            {
                attributes: true,
                attributeFilter: [
                    "disabled",
                    "class",
                    "data-place-key"
                ]
            }
        );
    });


document.addEventListener(
    "DOMContentLoaded",
    () => {
        enablePlaceActionButtons();
        updateFavoriteButtons();
    }
);


/* =====================================================
   장소 SNS 공유
   - 장소명 / 주소 / Google Place ID를 공유 URL에 포함
   - LINE / X는 웹 공유 URL로 바로 전송
   - 카카오톡 / Instagram은 모바일 OS 공유창을 사용
   - 링크 복사 지원
   - 공유 링크를 받은 사람이 열면 해당 Google POI를 자동으로 엽니다.
===================================================== */

const PLACE_SHARE_QUERY_KEY =
    "sharedPlace";

let placeShareContext = null;


function getCurrentSharePlaceInfo() {
    const currentKey =
        typeof ensureCurrentPlaceKey === "function"
            ? ensureCurrentPlaceKey()
            : selectedPlaceKey;

    const descriptor =
        typeof getActivePlaceDescriptor === "function"
            ? getActivePlaceDescriptor(currentKey)
            : null;

    const titleElement =
        document.getElementById("placeTitle");

    const addressElement =
        document.getElementById("placeAddress");

    const name =
        String(
            descriptor?.name ||
            selectedGooglePoi?.name ||
            titleElement?.textContent ||
            ""
        ).trim();

    const address =
        String(
            descriptor?.address ||
            selectedGooglePoi?.address ||
            addressElement?.textContent ||
            ""
        ).trim();

    let googlePlaceId =
        String(
            descriptor?.googlePlaceId ||
            selectedGooglePoi?.placeId ||
            ""
        ).trim();

    if (
        !googlePlaceId &&
        currentKey &&
        String(currentKey).startsWith("google_")
    ) {
        googlePlaceId =
            String(currentKey).slice(
                "google_".length
            );
    }

    const lat =
        Number(
            descriptor?.lat ??
            selectedGooglePoi?.position?.lat
        );

    const lng =
        Number(
            descriptor?.lng ??
            selectedGooglePoi?.position?.lng
        );

    return {
        name:
            name ||
            (
                currentLanguage === "ja"
                    ? "CHEESE MAPの場所"
                    : currentLanguage === "en"
                        ? "CHEESE MAP place"
                        : "CHEESE MAP 장소"
            ),

        address,
        googlePlaceId,

        lat:
            Number.isFinite(lat)
                ? lat
                : null,

        lng:
            Number.isFinite(lng)
                ? lng
                : null
    };
}


function buildCurrentPlaceShareUrl(placeInfo) {
    const url =
        new URL(
            window.location.pathname,
            window.location.origin
        );

    /*
        Google Place ID가 있으면 가장 정확하게 같은 POI를 다시 엽니다.
        좌표/장소명은 상세 조회 실패 시 fallback 용도로 함께 넣습니다.
    */
    if (placeInfo.googlePlaceId) {
        url.searchParams.set(
            PLACE_SHARE_QUERY_KEY,
            placeInfo.googlePlaceId
        );
    }

    if (placeInfo.name) {
        url.searchParams.set(
            "placeName",
            placeInfo.name
        );
    }

    if (Number.isFinite(placeInfo.lat)) {
        url.searchParams.set(
            "placeLat",
            String(placeInfo.lat)
        );
    }

    if (Number.isFinite(placeInfo.lng)) {
        url.searchParams.set(
            "placeLng",
            String(placeInfo.lng)
        );
    }

    return url.toString();
}


function getPlaceShareText(placeInfo) {
    return [
        placeInfo.name,
        placeInfo.address,
        "CHEESE MAP"
    ]
        .filter(Boolean)
        .join("\n");
}


async function copyPlaceShareUrl(url) {
    try {
        if (
            navigator.clipboard &&
            window.isSecureContext
        ) {
            await navigator.clipboard.writeText(
                url
            );
        } else {
            const textarea =
                document.createElement(
                    "textarea"
                );

            textarea.value = url;
            textarea.setAttribute(
                "readonly",
                ""
            );

            textarea.style.position =
                "fixed";

            textarea.style.opacity =
                "0";

            document.body.appendChild(
                textarea
            );

            textarea.select();

            document.execCommand(
                "copy"
            );

            textarea.remove();
        }

        showToast(
            "toast.linkCopied"
        );

        return true;

    } catch (error) {
        console.error(
            "장소 공유 링크 복사 실패:",
            error
        );

        showToast(
            "toast.linkFailed"
        );

        return false;
    }
}


function closePlaceShareModal() {
    const modal =
        document.getElementById(
            "placeShareModal"
        );

    if (!modal) {
        return;
    }

    modal.classList.remove(
        "show"
    );

    modal.setAttribute(
        "aria-hidden",
        "true"
    );
}


function ensurePlaceShareModal() {
    let modal =
        document.getElementById(
            "placeShareModal"
        );

    if (modal) {
        return modal;
    }

    modal =
        document.createElement(
            "div"
        );

    modal.id =
        "placeShareModal";

    modal.className =
        "place-share-modal";

    modal.setAttribute(
        "aria-hidden",
        "true"
    );

    modal.innerHTML = `
        <button
            type="button"
            class="place-share-backdrop"
            data-place-share-close
            aria-label="공유창 닫기"
        ></button>

        <section
            class="place-share-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="placeShareTitle"
        >
            <div class="place-share-head">
                <div>
                    <span>
                        SHARE PLACE
                    </span>

                    <h3 id="placeShareTitle">
                        장소 공유
                    </h3>
                </div>

                <button
                    type="button"
                    class="place-share-close"
                    data-place-share-close
                    aria-label="닫기"
                >
                    <i class="ti ti-x"></i>
                </button>
            </div>

            <div class="place-share-place">
                <strong
                    data-place-share-name
                ></strong>

                <span
                    data-place-share-address
                ></span>
            </div>

            <div class="place-share-options">
                <button
                    type="button"
                    class="place-share-option line"
                    data-place-share-provider="line"
                >
                    <span class="place-share-brand" aria-hidden="true">
                        <svg
                            class="place-share-brand-svg line-logo-svg"
                            viewBox="0 0 64 64"
                            role="img"
                            aria-hidden="true"
                        >
                            <rect
                                x="2"
                                y="2"
                                width="60"
                                height="60"
                                rx="17"
                                fill="#06C755"
                            />

                            <!-- LINE 특유의 흰색 말풍선 -->
                            <path
                                d="
                                    M32 13
                                    C20.4 13 11 20.4 11 29.6
                                    C11 37.8 18.5 44.5 28.6 45.8
                                    L27.9 51.1
                                    C27.8 52.1 28.9 52.7 29.8 52.2
                                    C34.7 49.7 40.7 46.6 44.5 42.8
                                    C49.7 39.1 53 34.5 53 29.6
                                    C53 20.4 43.6 13 32 13
                                    Z
                                "
                                fill="#FFFFFF"
                            />

                            <text
                                x="31.8"
                                y="33.8"
                                text-anchor="middle"
                                fill="#06C755"
                                font-size="10.2"
                                font-family="Arial Black, Arial, Helvetica, sans-serif"
                                font-weight="900"
                                letter-spacing="-0.8"
                            >LINE</text>
                        </svg>
                    </span>

                    <b>LINE</b>
                </button>

                <button
                    type="button"
                    class="place-share-option x"
                    data-place-share-provider="x"
                >
                    <span class="place-share-brand" aria-hidden="true">
                        <svg viewBox="0 0 48 48" class="share-brand-svg">
                            <rect x="3" y="3" width="42" height="42" rx="12"></rect>
                            <path class="x-mark" d="M13 12h7.4l5.6 7.6 6.7-7.6H36L27.6 21.5 36.8 36h-7.4l-6.1-8.4-7.5 8.4H12l9.6-10.9L13 12Zm6 3.2 12 17.6h2.8L21.8 15.2H19Z"></path>
                        </svg>
                    </span>

                    <b>X</b>
                </button>

                <button
                    type="button"
                    class="place-share-option kakao"
                    data-place-share-provider="kakao"
                >
                    <span class="place-share-brand" aria-hidden="true">
                        <svg
                            class="place-share-brand-svg"
                            viewBox="0 0 64 64"
                            role="img"
                            aria-hidden="true"
                        >
                            <rect
                                x="2"
                                y="2"
                                width="60"
                                height="60"
                                rx="16"
                                fill="#FEE500"
                            />
                            <path
                                d="M32 14.3c-11.2 0-20.3 7.1-20.3 15.8 0 5.6 3.7 10.6 9.5 13.3l-2.4 8.5c-.2.7.6 1.3 1.2.9l9.9-6.6c.7.1 1.4.1 2.1.1 11.2 0 20.3-7.1 20.3-15.8S43.2 14.3 32 14.3Z"
                                fill="#3C1E1E"
                            />
                            <text
                                x="32"
                                y="34.3"
                                text-anchor="middle"
                                fill="#FEE500"
                                font-size="10.8"
                                font-family="Arial, Helvetica, sans-serif"
                                font-weight="900"
                                letter-spacing="-0.8"
                            >TALK</text>
                        </svg>
                    </span>

                    <b>카카오톡</b>
                </button>

                <button
                    type="button"
                    class="place-share-option instagram"
                    data-place-share-provider="instagram"
                >
                    <span class="place-share-brand" aria-hidden="true">
                        <svg
                            class="place-share-brand-svg"
                            viewBox="0 0 64 64"
                            role="img"
                            aria-hidden="true"
                        >
                            <defs>
                                <linearGradient
                                    id="cheeseShareInstagramGradient"
                                    x1="7"
                                    y1="57"
                                    x2="57"
                                    y2="7"
                                    gradientUnits="userSpaceOnUse"
                                >
                                    <stop offset="0%" stop-color="#FFDC80"/>
                                    <stop offset="24%" stop-color="#FCAF45"/>
                                    <stop offset="46%" stop-color="#F77737"/>
                                    <stop offset="68%" stop-color="#E1306C"/>
                                    <stop offset="84%" stop-color="#C13584"/>
                                    <stop offset="100%" stop-color="#833AB4"/>
                                </linearGradient>
                            </defs>

                            <rect
                                x="2"
                                y="2"
                                width="60"
                                height="60"
                                rx="16"
                                fill="url(#cheeseShareInstagramGradient)"
                            />

                            <rect
                                x="16"
                                y="16"
                                width="32"
                                height="32"
                                rx="10"
                                fill="none"
                                stroke="#FFFFFF"
                                stroke-width="4"
                            />

                            <circle
                                cx="32"
                                cy="32"
                                r="8.5"
                                fill="none"
                                stroke="#FFFFFF"
                                stroke-width="4"
                            />

                            <circle
                                cx="42.5"
                                cy="21.5"
                                r="2.8"
                                fill="#FFFFFF"
                            />
                        </svg>
                    </span>

                    <b>Instagram</b>
                </button>

                <button
                    type="button"
                    class="place-share-option native"
                    data-place-share-provider="native"
                >
                    <span class="place-share-brand" aria-hidden="true">
                        <svg viewBox="0 0 48 48" class="share-brand-svg utility-svg">
                            <rect x="3" y="3" width="42" height="42" rx="12"></rect>
                            <path d="M25 13h10v10"></path>
                            <path d="M34.5 13.5 22 26"></path>
                            <path d="M20 18h-4.5A3.5 3.5 0 0 0 12 21.5v11A3.5 3.5 0 0 0 15.5 36h11A3.5 3.5 0 0 0 30 32.5V28"></path>
                        </svg>
                    </span>

                    <b>다른 앱</b>
                </button>

                <button
                    type="button"
                    class="place-share-option copy"
                    data-place-share-provider="copy"
                >
                    <span class="place-share-brand" aria-hidden="true">
                        <svg viewBox="0 0 48 48" class="share-brand-svg utility-svg">
                            <rect x="3" y="3" width="42" height="42" rx="12"></rect>
                            <path d="M20 28 16.5 31.5a5 5 0 0 1-7-7L14 20a5 5 0 0 1 7 0"></path>
                            <path d="M28 20 31.5 16.5a5 5 0 0 1 7 7L34 28a5 5 0 0 1-7 0"></path>
                            <path d="m18 30 12-12"></path>
                        </svg>
                    </span>

                    <b>링크 복사</b>
                </button>
            </div>
        </section>
    `;

    document.body.appendChild(
        modal
    );

    modal.addEventListener(
        "click",
        async event => {
            if (
                event.target.closest(
                    "[data-place-share-close]"
                )
            ) {
                closePlaceShareModal();
                return;
            }

            const providerButton =
                event.target.closest(
                    "[data-place-share-provider]"
                );

            if (
                !providerButton ||
                !placeShareContext
            ) {
                return;
            }

            const provider =
                providerButton.dataset
                    .placeShareProvider;

            const {
                url,
                text,
                info
            } = placeShareContext;

            if (provider === "line") {
                window.open(
                    `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}`,
                    "_blank",
                    "noopener,noreferrer"
                );

                return;
            }

            if (provider === "x") {
                window.open(
                    `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
                    "_blank",
                    "noopener,noreferrer"
                );

                return;
            }

            if (
                provider === "native" ||
                provider === "kakao" ||
                provider === "instagram"
            ) {
                if (
                    typeof navigator.share ===
                    "function"
                ) {
                    try {
                        await navigator.share({
                            title:
                                info.name,

                            text,

                            url
                        });

                        closePlaceShareModal();

                    } catch (error) {
                        /*
                            사용자가 공유창을 직접 닫은 경우에는
                            오류 토스트를 표시하지 않습니다.
                        */
                        if (
                            error?.name !==
                            "AbortError"
                        ) {
                            console.error(
                                "시스템 공유 실패:",
                                error
                            );
                        }
                    }

                    return;
                }

                /*
                    PC 브라우저처럼 Web Share API가 없을 때는
                    카카오/Instagram 웹 DM으로 강제로 넘길 공식 범용 URL이 없으므로
                    공유 링크를 복사해 둡니다.
                */
                const copied =
                    await copyPlaceShareUrl(
                        url
                    );

                if (copied) {
                    showToast(
                        provider === "kakao"
                            ? "카카오톡에 붙여넣을 링크를 복사했습니다."
                            : provider === "instagram"
                                ? "Instagram에 붙여넣을 링크를 복사했습니다."
                                : "공유 링크를 복사했습니다."
                    );
                }

                return;
            }

            if (provider === "copy") {
                if (
                    await copyPlaceShareUrl(
                        url
                    )
                ) {
                    closePlaceShareModal();
                }
            }
        }
    );

    return modal;
}


function openPlaceShareModal() {
    const info =
        getCurrentSharePlaceInfo();

    if (
        !info.googlePlaceId &&
        !Number.isFinite(info.lat) &&
        !Number.isFinite(info.lng)
    ) {
        showToast(
            currentLanguage === "ja"
                ? "共有する場所情報がありません。"
                : currentLanguage === "en"
                    ? "There is no place to share."
                    : "공유할 장소 정보가 없습니다."
        );

        return;
    }

    const url =
        buildCurrentPlaceShareUrl(
            info
        );

    placeShareContext = {
        info,
        url,
        text:
            getPlaceShareText(
                info
            )
    };

    const modal =
        ensurePlaceShareModal();

    const name =
        modal.querySelector(
            "[data-place-share-name]"
        );

    const address =
        modal.querySelector(
            "[data-place-share-address]"
        );

    if (name) {
        name.textContent =
            info.name;
    }

    if (address) {
        address.textContent =
            info.address ||
            (
                currentLanguage === "ja"
                    ? "住所情報なし"
                    : currentLanguage === "en"
                        ? "No address"
                        : "주소 정보 없음"
            );
    }

    modal.classList.add(
        "show"
    );

    modal.setAttribute(
        "aria-hidden",
        "false"
    );
}


/*
    공유받은 CHEESE MAP 장소 링크를 열었을 때
    지도 초기화가 끝나는 것을 기다린 뒤 같은 Google POI를 자동으로 엽니다.
*/
async function openSharedPlaceFromUrl() {
    const params =
        new URLSearchParams(
            window.location.search
        );

    const googlePlaceId =
        String(
            params.get(
                PLACE_SHARE_QUERY_KEY
            ) || ""
        ).trim();

    if (!googlePlaceId) {
        return;
    }

    const lat =
        Number(
            params.get(
                "placeLat"
            )
        );

    const lng =
        Number(
            params.get(
                "placeLng"
            )
        );

    const fallbackPosition =
        Number.isFinite(lat) &&
        Number.isFinite(lng)
            ? {
                lat,
                lng
            }
            : null;

    const fallbackName =
        String(
            params.get(
                "placeName"
            ) || ""
        ).trim();

    const startedAt =
        Date.now();

    while (
        (
            !googleMap ||
            typeof openGooglePoi !==
                "function"
        ) &&
        Date.now() - startedAt <
            12000
    ) {
        await new Promise(
            resolve =>
                setTimeout(
                    resolve,
                    150
                )
        );
    }

    if (
        !googleMap ||
        typeof openGooglePoi !==
            "function"
    ) {
        console.warn(
            "공유 장소 열기 실패: 지도가 준비되지 않았습니다."
        );

        return;
    }

    await openGooglePoi(
        googlePlaceId,
        fallbackPosition,
        fallbackName,
        {
            focusMap: true,
            focusZoom: 16
        }
    );
}


document
    .getElementById(
        "shareButton"
    )
    ?.addEventListener(
        "click",
        event => {
            event.preventDefault();
            event.stopPropagation();

            openPlaceShareModal();
        }
    );


document.addEventListener(
    "keydown",
    event => {
        if (
            event.key === "Escape"
        ) {
            closePlaceShareModal();
        }
    }
);


if (
    document.readyState ===
    "loading"
) {
    document.addEventListener(
        "DOMContentLoaded",
        () => {
            openSharedPlaceFromUrl();
        },
        {
            once: true
        }
    );
} else {
    openSharedPlaceFromUrl();
}



/* =====================================================
   지도 확대·축소
===================================================== */

document
    .getElementById(
        "zoomInButton"
    )
    ?.addEventListener(
        "click",
        () => {
            if (!googleMap) {
                showToast(
                    "toast.mapNotReady"
                );

                return;
            }


            const currentZoom =
                googleMap.getZoom() || 13;


            googleMap.setZoom(
                currentZoom + 1
            );
        }
    );


document
    .getElementById(
        "zoomOutButton"
    )
    ?.addEventListener(
        "click",
        () => {
            if (!googleMap) {
                showToast(
                    "toast.mapNotReady"
                );

                return;
            }


            const currentZoom =
                googleMap.getZoom() || 13;


            googleMap.setZoom(
                currentZoom - 1
            );
        }
    );


/* =====================================================
   지도 종류 변경
===================================================== */

document
    .getElementById(
        "mapTypeButton"
    )
    ?.addEventListener(
        "click",
        () => {
            if (!googleMap) {
                showToast(
                    "toast.mapNotReady"
                );

                return;
            }


            const currentType =
                googleMap.getMapTypeId();


            const nextType =
                currentType ===
                google.maps.MapTypeId
                    .SATELLITE
                    ? google.maps
                        .MapTypeId
                        .ROADMAP
                    : google.maps
                        .MapTypeId
                        .SATELLITE;


            googleMap.setMapTypeId(
                nextType
            );
        }
    );


/* =====================================================
   현재 위치
   지도 이동 전용이며 길찾기 기본 출발지는 도쿄역으로 고정
===================================================== */

document
    .getElementById(
        "locationButton"
    )
    ?.addEventListener(
        "click",
        () => {
            if (
                !navigator.geolocation
            ) {
                showToast(
                    "toast.locationFailed"
                );

                return;
            }


            if (!googleMap) {
                showToast(
                    "toast.mapNotReady"
                );

                return;
            }


            navigator.geolocation
                .getCurrentPosition(
                    async position => {
                        const currentPosition = {
                            lat:
                                position
                                    .coords
                                    .latitude,

                            lng:
                                position
                                    .coords
                                    .longitude
                        };


                        googleMap.panTo(
                            currentPosition
                        );

                        googleMap.setZoom(
                            16
                        );


                        currentLocationMarker
                            ?.setMap(null);


                        currentLocationMarker =
                            new google.maps
                                .Marker({
                                    map:
                                        googleMap,

                                    position:
                                        currentPosition,

                                    title:
                                        translate(
                                            "route.currentLocation"
                                        ),

                                    icon: {
                                        path:
                                            google
                                                .maps
                                                .SymbolPath
                                                .CIRCLE,

                                        scale: 9,

                                        fillColor:
                                            "#e2a800",

                                        fillOpacity:
                                            1,

                                        strokeColor:
                                            "#fff7dc",

                                        strokeWeight:
                                            3
                                    }
                                });

                        /*
                            현재 위치 버튼을 눌렀을 때
                            지도 이동뿐 아니라 왼쪽 "현재 지역" 카드도
                            같은 좌표 기준으로 즉시 갱신합니다.
                        */
                        if (
                            typeof updateCurrentAreaFromPosition === "function"
                        ) {
                            await updateCurrentAreaFromPosition(
                                currentPosition
                            );
                        }


                        showToast(
                            "toast.currentLocation"
                        );
                    },


                    error => {
                        console.error(
                            "현재 위치 오류:",
                            error
                        );


                        showToast(
                            "toast.locationFailed"
                        );
                    },


                    {
                        enableHighAccuracy:
                            true,

                        timeout:
                            10000,

                        maximumAge:
                            0
                    }
                );
        }
    );


/* =====================================================
   지도 레이어
===================================================== */

/* 실시간 교통 */

document
    .getElementById(
        "trafficToggle"
    )
    ?.addEventListener(
        "change",
        event => {
            if (
                !trafficLayer ||
                !googleMap
            ) {
                event.target.checked =
                    false;

                legendCard?.classList.remove(
                    "show"
                );

                showToast(
                    "toast.mapNotReady"
                );

                return;
            }

            const enabled =
                event.target.checked;

            /*
                실시간 교통을 켜면 혼잡도 범례도 함께 표시합니다.
                별도 "혼잡도" 스위치는 제거하고 교통 레이어와 한 번에 제어합니다.
            */
            trafficLayer.setMap(
                enabled
                    ? googleMap
                    : null
            );

            legendCard?.classList.toggle(
                "show",
                enabled
            );

            showToast(
                enabled
                    ? "toast.trafficOn"
                    : "toast.trafficOff"
            );
        }
    );

/* 위험지역 샘플 기능 */

document
    .getElementById(
        "dangerToggle"
    )
    ?.addEventListener(
        "change",
        event => {
            const message =
                currentLanguage === "ko"
                    ? event.target.checked
                        ? "위험지역 표시를 켰습니다."
                        : "위험지역 표시를 껐습니다."
                    : event.target.checked
                        ? "危険地域を表示しました。"
                        : "危険地域を非表示にしました。";


            showToast(message);
        }
    );


/* =====================================================
   휠체어 접근성 장소 검색
   Places API (New)의 Nearby Search + accessibilityOptions 사용
===================================================== */

function clearWheelchairMarkers() {
    wheelchairMarkers.forEach(marker => {
        marker.setMap(null);
    });

    wheelchairMarkers = [];
}


function hasConfirmedWheelchairAccess(place) {
    const options = place?.accessibilityOptions;

    if (!options) {
        return false;
    }

    return (
        options.hasWheelchairAccessibleEntrance === true ||
        options.hasWheelchairAccessibleParking === true ||
        options.hasWheelchairAccessibleRestroom === true ||
        options.hasWheelchairAccessibleSeating === true
    );
}


function getWheelchairAccessLabels(place) {
    const options = place?.accessibilityOptions;
    const labels = [];

    if (!options) {
        return labels;
    }

    if (options.hasWheelchairAccessibleEntrance === true) {
        labels.push(
            currentLanguage === "ko"
                ? "휠체어 출입구"
                : "車椅子対応入口"
        );
    }

    if (options.hasWheelchairAccessibleParking === true) {
        labels.push(
            currentLanguage === "ko"
                ? "장애인 주차구역"
                : "車椅子対応駐車場"
        );
    }

    if (options.hasWheelchairAccessibleRestroom === true) {
        labels.push(
            currentLanguage === "ko"
                ? "휠체어 화장실"
                : "車椅子対応トイレ"
        );
    }

    if (options.hasWheelchairAccessibleSeating === true) {
        labels.push(
            currentLanguage === "ko"
                ? "휠체어 좌석"
                : "車椅子対応座席"
        );
    }

    return labels;
}


function getWheelchairSearchRadius() {
    const zoom = googleMap?.getZoom() || 13;

    if (zoom >= 17) return 700;
    if (zoom >= 15) return 1300;
    if (zoom >= 13) return 2500;
    if (zoom >= 11) return 5000;

    return 8000;
}


function getWheelchairMarkerIcon(isHovered = false) {
    const size = isHovered ? 31 : 28;

    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
            <circle
                cx="20"
                cy="20"
                r="17.5"
                fill="#d7d9dd"
                fill-opacity="0.96"
                stroke="#7b8088"
                stroke-width="2.1"
            />

            <circle
                cx="17"
                cy="10.8"
                r="2.8"
                fill="#4a4f56"
            />

            <path
                d="M17.4 15.8L19.3 23.8H26.3M18.9 19.2H24.3M26.3 23.8L29.5 30H33"
                fill="none"
                stroke="#4a4f56"
                stroke-width="2.6"
                stroke-linecap="round"
                stroke-linejoin="round"
            />

            <path
                d="M23.8 26.5A7.1 7.1 0 1 1 18.1 21.7"
                fill="none"
                stroke="#4a4f56"
                stroke-width="2.6"
                stroke-linecap="round"
            />
        </svg>
    `;

    return {
        url:
            "data:image/svg+xml;charset=UTF-8," +
            encodeURIComponent(svg),
        scaledSize:
            new google.maps.Size(size, size),
        anchor:
            new google.maps.Point(
                size / 2,
                size / 2
            )
    };
}


function createWheelchairMarker(place) {
    if (!place?.location || !googleMap) {
        return;
    }

    const marker = new google.maps.Marker({
        map: googleMap,
        position: place.location,
        title: `${place.displayName || ""} · ${
            currentLanguage === "ko"
                ? "휠체어 접근 가능"
                : "車椅子対応"
        }`,
        icon: getWheelchairMarkerIcon(false),
        opacity: 0.94,
        zIndex: 45,
        optimized: false
    });

    marker.addListener("mouseover", () => {
        marker.setOpacity(1);
        marker.setIcon(
            getWheelchairMarkerIcon(true)
        );
    });

    marker.addListener("mouseout", () => {
        marker.setOpacity(0.94);
        marker.setIcon(
            getWheelchairMarkerIcon(false)
        );
    });

    marker.addListener("click", () => {
        const position = {
            lat: typeof place.location.lat === "function"
                ? place.location.lat()
                : Number(place.location.lat),
            lng: typeof place.location.lng === "function"
                ? place.location.lng()
                : Number(place.location.lng)
        };

        selectedPlaceKey = null;
        selectedGooglePoi = {
            placeId: place.id || "",
            name: place.displayName || "",
            position,
            address: place.formattedAddress || ""
        };

        updateGooglePoiCard({
            id: place.id || "",
            displayName: place.displayName || "",
            formattedAddress: place.formattedAddress || "",
            location: place.location,
            primaryType: place.primaryType || "",
            primaryTypeDisplayName:
                place.primaryTypeDisplayName ||
                getGooglePoiTypeLabel(
                    place.primaryType ? [place.primaryType] : []
                ),
            rating: place.rating,
            userRatingCount: place.userRatingCount,
            businessStatus: place.businessStatus || "",
            regularOpeningHours: place.regularOpeningHours || null,
            accessibilityOptions: place.accessibilityOptions || null
        });

        const accessLabels =
            getWheelchairAccessLabels(place);

        const placeCrowd =
            document.getElementById("placeCrowd");

        if (placeCrowd) {
            placeCrowd.textContent = accessLabels.length
                ? accessLabels.join(" · ")
                : currentLanguage === "ko"
                    ? "휠체어 접근 가능"
                    : "車椅子対応";
        }

        placeCard?.classList.add("show");
        routePanel?.classList.remove("show");
        googleMap.panTo(position);

        if ((googleMap.getZoom() || 13) < 15) {
            googleMap.setZoom(15);
        }
    });

    wheelchairMarkers.push(marker);
}

async function loadWheelchairAccessiblePlaces() {
    const toggle =
        document.getElementById("wheelchairToggle");

    if (!googleMap || !toggle?.checked) {
        return;
    }

    const center = googleMap.getCenter();

    if (!center) {
        return;
    }

    const requestId = ++wheelchairSearchRequestId;

    clearWheelchairMarkers();

    try {
        const {
            Place,
            SearchNearbyRankPreference
        } = await google.maps.importLibrary("places");

        const request = {
            fields: [
                "id",
                "displayName",
                "formattedAddress",
                "location",
                "primaryType",
                "primaryTypeDisplayName",
                "rating",
                "userRatingCount",
                "businessStatus",
                "accessibilityOptions"
            ],
            locationRestriction: {
                center,
                radius: getWheelchairSearchRadius()
            },
            maxResultCount: 20,
            rankPreference:
                SearchNearbyRankPreference.POPULARITY,
            language: currentLanguage === "ja"
                ? "ja"
                : "ko",
            region: "JP"
        };

        const result =
            await Place.searchNearby(request);

        if (
            requestId !== wheelchairSearchRequestId ||
            !toggle.checked
        ) {
            return;
        }

        const accessiblePlaces =
            (result.places || []).filter(
                hasConfirmedWheelchairAccess
            );

        accessiblePlaces.forEach(
            createWheelchairMarker
        );

        showToast(
            accessiblePlaces.length
                ? currentLanguage === "ko"
                    ? `휠체어 접근 정보가 확인된 장소 ${accessiblePlaces.length}곳을 표시했습니다.`
                    : `車椅子対応情報が確認された場所を${accessiblePlaces.length}件表示しました。`
                : currentLanguage === "ko"
                    ? "현재 지도 주변에서 휠체어 접근 정보가 확인된 장소를 찾지 못했습니다."
                    : "現在の地図周辺では車椅子対応情報が確認された場所が見つかりませんでした。"
        );
    } catch (error) {
        console.error(
            "휠체어 접근성 장소 검색 실패:",
            error
        );

        clearWheelchairMarkers();

        showToast(
            currentLanguage === "ko"
                ? "접근성 정보를 불러오지 못했습니다. Places API (New) 활성화와 결제 설정을 확인해주세요."
                : "アクセシビリティ情報を取得できませんでした。Places API (New) と請求設定を確認してください。"
        );
    }
}


function scheduleWheelchairAccessibilitySearch() {
    clearTimeout(wheelchairSearchTimer);

    wheelchairSearchTimer = setTimeout(() => {
        loadWheelchairAccessiblePlaces();
    }, 450);
}


document
    .getElementById("wheelchairToggle")
    ?.addEventListener(
        "change",
        event => {
            if (event.target.checked) {
                loadWheelchairAccessiblePlaces();
                return;
            }

            wheelchairSearchRequestId += 1;
            clearTimeout(wheelchairSearchTimer);
            clearWheelchairMarkers();

            showToast(
                currentLanguage === "ko"
                    ? "접근성 표시를 해제했습니다."
                    : "アクセシビリティ表示を解除しました。"
            );
        }
    );

    /* =====================================================
   다크 모드
   모드 변경 시 저장 후 페이지 새로고침
===================================================== */

function updateDarkModeButtonUi(isDark) {
    const darkModeButton = document.getElementById("darkModeButton");
    if (!darkModeButton) return;

    darkModeButton.innerHTML = `
        <i class="ti ${isDark ? "ti-sun" : "ti-moon"}"></i>
    `;

    darkModeButton.setAttribute(
        "aria-label",
        isDark ? "라이트 모드" : "다크 모드"
    );

    darkModeButton.setAttribute(
        "title",
        isDark ? "라이트 모드로 전환" : "다크 모드로 전환"
    );
}

function loadSavedTheme() {
    const isDark =
        localStorage.getItem(STORAGE_KEYS.darkMode) === "true";

    document.body.classList.toggle("dark", isDark);
    updateDarkModeButtonUi(isDark);
}


document
    .getElementById("darkModeButton")
    ?.addEventListener("click", () => {
        const nextDarkMode =
            !(localStorage.getItem(STORAGE_KEYS.darkMode) === "true");

        localStorage.setItem(
            STORAGE_KEYS.darkMode,
            String(nextDarkMode)
        );

        document.body.classList.toggle("dark", nextDarkMode);
        updateDarkModeButtonUi(nextDarkMode);

        // Cloud Map Style은 같은 Map ID 안의 Light/Dark 스타일을
        // colorScheme에 따라 선택하므로 현재 카테고리를 유지한 채 지도를 재생성합니다.
        if (window.google?.maps && googleMap && typeof switchGoogleBasePoiCategory === "function") {
            switchGoogleBasePoiCategory(
                typeof getActiveMapCategory === "function"
                    ? getActiveMapCategory()
                    : "all"
            );
        }
    });



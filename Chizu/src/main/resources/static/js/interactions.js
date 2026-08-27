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
        stateKeys =
            await ensurePlaceStateKeys(
                placeKey
            );
    } catch (error) {
        console.error(
            "좋아요 장소 연결 실패:",
            error
        );

        showToast(
            currentLanguage === "ko"
                ? "장소 정보를 불러오지 못했습니다."
                : currentLanguage === "ja"
                    ? "場所情報を取得できませんでした。"
                    : "Could not load place information."
        );
        return;
    }

    if (!stateKeys.length) return;

    const currentlyLiked =
        isPlaceLiked(stateKeys);

    if (currentlyLiked) {
        likedPlaces =
            likedPlaces.filter(
                key =>
                    !stateKeys.includes(
                        normalizePlaceStateKey(key)
                    )
            );

        showToast("toast.removed");
    } else {
        likedPlaces = [
            ...new Set([
                ...likedPlaces,
                ...stateKeys
            ])
        ];

        showToast("toast.saved");

        if (
            typeof recordPlacePreferenceAction === "function"
        ) {
            recordPlacePreferenceAction(
                "like",
                placeKey
            ).catch?.(console.warn);
        }
    }

    writeStorage(
        STORAGE_KEYS.likes,
        likedPlaces
    );

    updateLikeButton();

    if (
        mypageModal?.classList.contains("show") &&
        currentMyPageTab === "likes"
    ) {
        renderMyPage();
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
   장소 공유
===================================================== */


document
    .getElementById(
        "shareButton"
    )
    ?.addEventListener(
        "click",
        async event => {
            event.preventDefault();
            event.stopPropagation();

            const link = window.location.href;

            try {
                if (navigator.clipboard && window.isSecureContext) {
                    await navigator.clipboard.writeText(link);
                } else {
                    const textarea = document.createElement("textarea");
                    textarea.value = link;
                    textarea.setAttribute("readonly", "");
                    textarea.style.position = "fixed";
                    textarea.style.opacity = "0";
                    document.body.appendChild(textarea);
                    textarea.select();
                    document.execCommand("copy");
                    textarea.remove();
                }

                showToast("toast.linkCopied");
            } catch (error) {
                console.error("링크 복사 실패:", error);
                showToast("toast.linkFailed");
            }
        }
    );



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



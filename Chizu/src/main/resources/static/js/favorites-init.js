/* =====================================================
   최초 실행
===================================================== */

function initializeCheeseMapUI() {
    renderRecommendedPlaces();

    applyLanguage(
        currentLanguage
    );

    updateHeaderAuthState();

    updatePlaceCard(
        selectedPlaceKey
    );

    loadSavedTheme();

    startTokyoClock();
    loadTokyoWeather();
}


initializeCheeseMapUI();

favoritePlaces =
    typeof migrateLegacyPlaceStateKeys === "function"
        ? migrateLegacyPlaceStateKeys(
            favoritePlaces
        )
        : favoritePlaces;

writeStorage(
    STORAGE_KEYS.favorites,
    favoritePlaces
);


function isPlaceFavorite(stateKeyOrKeys) {
    const keys =
        Array.isArray(stateKeyOrKeys)
            ? stateKeyOrKeys
            : [stateKeyOrKeys];

    return keys.some(key => {
        const normalized =
            typeof normalizePlaceStateKey === "function"
                ? normalizePlaceStateKey(key)
                : String(key || "");

        return Boolean(
            normalized &&
            favoritePlaces.includes(
                normalized
            )
        );
    });
}


async function togglePlaceFavorite(placeKey = selectedPlaceKey) {
    if (!currentUser) {
        showToast("toast.loginRequired");
        openModal(loginModal);
        return;
    }

    let stateKeys = [];

    try {
        stateKeys =
            typeof ensurePlaceStateKeys === "function"
                ? await ensurePlaceStateKeys(
                    placeKey
                )
                : [
                    await ensureBackendStateKey(
                        placeKey
                    )
                ].filter(Boolean);
    } catch (error) {
        console.error(
            "즐겨찾기 장소 연결 실패:",
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

    const saved =
        isPlaceFavorite(
            stateKeys
        );

    if (saved) {
        favoritePlaces =
            favoritePlaces.filter(
                key =>
                    !stateKeys.includes(
                        typeof normalizePlaceStateKey === "function"
                            ? normalizePlaceStateKey(key)
                            : key
                    )
            );

        showToast(
            currentLanguage === "ko"
                ? "즐겨찾기에서 삭제했습니다."
                : "お気に入りから削除しました。"
        );
    } else {
        favoritePlaces = [
            ...new Set([
                ...favoritePlaces,
                ...stateKeys
            ])
        ];

        showToast(
            currentLanguage === "ko"
                ? "즐겨찾기에 저장했습니다."
                : "お気に入りに保存しました。"
        );

        if (
            typeof recordPlacePreferenceAction === "function"
        ) {
            recordPlacePreferenceAction(
                "save",
                placeKey
            ).catch?.(console.warn);
        }
    }

    writeStorage(
        STORAGE_KEYS.favorites,
        favoritePlaces
    );

    updateSaveButton?.();

    if (
        mypageModal?.classList.contains("show") &&
        currentMyPageTab === "favorites"
    ) {
        renderMyPage();
    }
}


async function resolveSavedStateRow(stateKey) {
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

        const place =
            await getBackendPlaceById(
                placeId
            );

        return {
            stateKey: normalized,
            placeId,
            place
        };
    }

    if (normalized.startsWith("google:")) {
        const googlePlaceId =
            normalized.slice(
                "google:".length
            );

        const googleKey =
            `google_${googlePlaceId}`;

        const backendPlace =
            await ensureBackendPlace(
                googleKey
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

async function renderMyFavorites(
    container,
    renderRequestId = null
) {
    const stateKeys =
        favoritePlaces.filter(
            key => /^place:\d+$/.test(String(key || ""))
        );

    if (!stateKeys.length) {
        container.innerHTML = `
            <div class="empty-state">
                <div>
                    <i class="ti ti-bookmark"></i>
                    <p>${translate("empty.favorites")}</p>
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
                            ? "즐겨찾기를 불러오는 중..."
                            : "お気に入りを読み込み中..."
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
                        "즐겨찾기 장소 조회 실패:",
                        placeId,
                        error
                    );
                    return null;
                }
            })
        )
    ).filter(Boolean);

    if (
        renderRequestId != null &&
        renderRequestId !== myPageRenderRequestId
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
                    <i class="ti ti-bookmark"></i>
                    <p>${translate("empty.favorites")}</p>
                </div>
            </div>
        `;
        return;
    }

    /*
        마이페이지 즐겨찾기 카드의 장소 정보는
        백엔드 Place 응답(placeName/placeCategory/placeAddress)만 사용합니다.
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
                        data-open-backend-place="${placeId}"
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
                        data-remove-favorite-state="${stateKey}"
                    >
                        ${
                            currentLanguage === "ko"
                                ? "즐겨찾기 삭제"
                                : currentLanguage === "ja"
                                    ? "お気に入り削除"
                                    : "Remove"
                        }
                    </button>
                </div>
            </article>
        `).join("");

    container
        .querySelectorAll(
            "[data-open-backend-place]"
        )
        .forEach(button => {
            button.addEventListener(
                "click",
                async () => {
                    const placeId =
                        Number(
                            button.dataset.openBackendPlace
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
            "[data-remove-favorite-state]"
        )
        .forEach(button => {
            button.addEventListener(
                "click",
                () => {
                    const stateKey =
                        button.dataset.removeFavoriteState;

                    favoritePlaces =
                        favoritePlaces.filter(
                            key => key !== stateKey
                        );

                    writeStorage(
                        STORAGE_KEYS.favorites,
                        favoritePlaces
                    );

                    const card =
                        button.closest(
                            ".mypage-card"
                        );

                    card?.remove();

                    updateSaveButton?.();
                    updateFavoriteButtons?.();

                    const content =
                        document.getElementById(
                            "mypageContent"
                        );

                    if (
                        content &&
                        !content.querySelector(
                            ".mypage-card"
                        )
                    ) {
                        content.innerHTML = `
                            <div class="empty-state">
                                <div>
                                    <i class="ti ti-bookmark"></i>
                                    <p>${translate("empty.favorites")}</p>
                                </div>
                            </div>
                        `;
                    }
                }
            );
        });
}




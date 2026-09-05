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

    try {
        const stateKeys =
            typeof ensurePlaceStateKeys === "function"
                ? await ensurePlaceStateKeys(placeKey)
                : [await ensureBackendStateKey(placeKey)].filter(Boolean);

        const placeStateKey = stateKeys.find(key => /^place:\d+$/.test(key));
        const placeId = backendPlaceIdFromStateKey(placeStateKey);

        if (!placeId) {
            throw new Error("백엔드 장소 ID를 확인할 수 없습니다.");
        }

        const result = await apiRequest(`/api/places/${placeId}/save`, {
            method: "POST",
            auth: true
        });

        const canonicalKey = `place:${placeId}`;
        const isSaved = Boolean(result?.isSaved);

        if (isSaved) {
            favoritePlaces = [
                ...new Set([
                    ...favoritePlaces.filter(key => !stateKeys.includes(normalizePlaceStateKey(key))),
                    canonicalKey
                ])
            ];

            showToast(
                currentLanguage === "ko"
                    ? "즐겨찾기에 저장했습니다."
                    : "お気に入りに保存しました。"
            );

            if (typeof recordPlacePreferenceAction === "function") {
                recordPlacePreferenceAction("save", placeKey).catch?.(console.warn);
            }
        } else {
            favoritePlaces = favoritePlaces.filter(key => {
                const normalized = normalizePlaceStateKey(key);
                return normalized !== canonicalKey && !stateKeys.includes(normalized);
            });

            showToast(
                currentLanguage === "ko"
                    ? "즐겨찾기에서 삭제했습니다."
                    : "お気に入りから削除しました。"
            );
        }

        writeStorage(STORAGE_KEYS.favorites, favoritePlaces);
        updateSaveButton?.();

        if (
            mypageModal?.classList.contains("show") &&
            currentMyPageTab === "favorites"
        ) {
            renderMyPage();
        }
    } catch (error) {
        console.error("즐겨찾기 서버 처리 실패:", error);
        showToast(
            currentLanguage === "ko"
                ? "즐겨찾기 처리에 실패했습니다."
                : currentLanguage === "ja"
                    ? "お気に入りの処理に失敗しました。"
                    : "Could not update saved place."
        );
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

                    if ( typeof openBackendPlaceById === "function" ) 
                        { await openBackendPlaceById( placeId ); 
                            /* mr.eum수정부분 */ /* 마이페이지 즐겨찾기 → 장소 보기에서도 내 리뷰와 동일하게 해당 장소 위치에 마커를 표시합니다. */ 
                            if (typeof showMyReviewPlaceMarker === "function") 
                                { const backendPlace = await getBackendPlaceById(placeId); 
                                    const position = { lat: Number(backendPlace?.placeLatitude), 
                                        lng: Number(backendPlace?.placeLongitude) }; 
                                        if ( Number.isFinite(position.lat) && Number.isFinite(position.lng) ) 
                                            { await showMyReviewPlaceMarker( position, backendPlace?.placeName || "장소" ); 
                                                googleMap?.panTo(position); 
                        if ((googleMap?.getZoom() || 0) < 15) { googleMap?.setZoom(15); } } } }
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
                async () => {
                    const stateKey = button.dataset.removeFavoriteState;
                    const placeId = backendPlaceIdFromStateKey(stateKey);

                    if (!placeId) return;

                    try {
                        const result = await apiRequest(`/api/places/${placeId}/save`, {
                            method: "POST",
                            auth: true
                        });

                        if (result?.isSaved) {
                            // 서버가 여전히 저장 상태라면 화면도 유지합니다.
                            await syncBackendPlacePreferences?.();
                            return;
                        }

                        favoritePlaces = favoritePlaces.filter(
                            key => normalizePlaceStateKey(key) !== `place:${placeId}`
                        );
                        writeStorage(STORAGE_KEYS.favorites, favoritePlaces);

                        button.closest(".mypage-card")?.remove();
                        updateSaveButton?.();
                        updateFavoriteButtons?.();

                        const content = document.getElementById("mypageContent");
                        if (content && !content.querySelector(".mypage-card")) {
                            content.innerHTML = `
                                <div class="empty-state">
                                    <div>
                                        <i class="ti ti-bookmark"></i>
                                        <p>${translate("empty.favorites")}</p>
                                    </div>
                                </div>
                            `;
                        }
                    } catch (error) {
                        console.error("즐겨찾기 삭제 실패:", error);
                        showToast(
                            currentLanguage === "ko"
                                ? "즐겨찾기 삭제에 실패했습니다."
                                : "お気に入りの削除に失敗しました。"
                        );
                    }
                }
            );
        });
}




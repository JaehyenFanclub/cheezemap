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

function isPlaceFavorite(placeKey) {
    return favoritePlaces.includes(placeKey);
}

function togglePlaceFavorite(placeKey) {
    if (!places[placeKey]) return;

    if (!currentUser) {
        showToast("toast.loginRequired");
        openModal(loginModal);
        return;
    }

    if (isPlaceFavorite(placeKey)) {
        favoritePlaces = favoritePlaces.filter(key => key !== placeKey);
        showToast(currentLanguage === "ko" ? "즐겨찾기에서 삭제했습니다." : "お気に入りから削除しました。");
    } else {
        favoritePlaces.push(placeKey);
        showToast(currentLanguage === "ko" ? "즐겨찾기에 저장했습니다." : "お気に入りに保存しました。");
    }

    writeStorage(STORAGE_KEYS.favorites, favoritePlaces);
    if (typeof updateSaveButton === "function") {
        updateSaveButton();
    } else {
        updateFavoriteButtons();
    }

    if (mypageModal?.classList.contains("show")) renderMyPage();
}

function renderMyFavorites(container) {
    if (!favoritePlaces.length) {
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

    container.innerHTML = favoritePlaces
        .filter(placeKey => Boolean(places[placeKey]))
        .map(placeKey => {
            const place = places[placeKey];
            return `
                <article class="mypage-card">
                    <strong>${place.name[currentLanguage]}</strong>
                    <span>★ ${place.rating}</span>
                    <p>${place.address[currentLanguage]}</p>
                    <div class="mypage-card-actions">
                        <button type="button" data-open-place="${placeKey}">
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
                            data-remove-favorite="${placeKey}"
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
            `;
        }).join("");

    container.querySelectorAll("[data-open-place]").forEach(button => {
        button.addEventListener("click", () => {
            const placeKey = button.dataset.openPlace;
            closeModal(mypageModal);
            openPlace(placeKey);
            googleMap?.panTo(places[placeKey].position);
            googleMap?.setZoom(15);
        });
    });

    container
        .querySelectorAll(
            "[data-remove-favorite]"
        )
        .forEach(button => {
            button.addEventListener(
                "click",
                () => {
                    const placeKey =
                        button.dataset.removeFavorite;

                    togglePlaceFavorite(
                        placeKey
                    );

                    if (
                        currentMyPageTab ===
                        "favorites"
                    ) {
                        renderMyPage();
                    }
                }
            );
        });
}



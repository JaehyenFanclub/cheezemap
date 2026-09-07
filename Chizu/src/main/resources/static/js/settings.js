/* =====================================================
   CHEESE MAP 설정
   프론트 시연용: localStorage 기반
===================================================== */

const SETTINGS_STORAGE_KEY = "cheeseMapSettings";
const SETTINGS_RECENT_SEARCH_STORAGE_KEY = "cheeseMapRecentSearches";

const DEFAULT_SETTINGS = {
    recommendVisible: true,
    recommendBasis: "gender"
};

const SETTINGS_TEXT = {
    ko: {
        title: "설정",
        description: "추천 방식과 저장 데이터를 관리할 수 있어요.",
        languageSection: "언어",
        languageTitle: "언어 변경",
        languageDesc: "화면에 표시할 언어를 선택합니다.",
        recommendSection: "추천",
        recommendVisible: "추천 장소 표시",
        recommendVisibleDesc: "지도 아래의 주변 추천 장소를 표시합니다.",
        recommendBasis: "추천 기준",
        recommendBasisDesc: "추천 장소를 고르는 기준을 선택합니다.",
        gender: "내 성별 기준",
        genderDesc: "회원가입 때 선택한 성별을 추천에 반영합니다.",
        all: "성별 구분 없이",
        allDesc: "성별을 구분하지 않고 전체 기준으로 추천합니다.",
        dataSection: "데이터 관리",
        clearSearch: "최근 검색 기록 삭제",
        clearSearchDesc: "이 브라우저에 저장된 최근 검색어를 삭제합니다.",
        resetData: "저장 데이터 초기화",
        resetDataDesc: "좋아요, 즐겨찾기와 추천 설정을 초기화합니다.",
        cleared: "최근 검색 기록을 삭제했습니다.",
        noHistory: "삭제할 최근 검색 기록이 없습니다.",
        resetConfirm: "좋아요, 즐겨찾기와 추천 설정을 초기화할까요?",
        resetDone: "저장 데이터를 초기화했습니다.",
        deleteAccount: "회원 탈퇴",
        deleteAccountDesc: "계정과 서버에 저장된 회원 정보를 영구적으로 삭제합니다.",
        deleteAccountConfirm: "정말 회원 탈퇴할까요? 계정은 복구할 수 없습니다.",
        deleteAccountDone: "회원 탈퇴가 완료되었습니다.",
        loginRequired: "회원 탈퇴하려면 로그인이 필요합니다."
    },
    ja: {
        title: "設定",
        description: "おすすめ方法と保存データを管理できます。",
        languageSection: "言語",
        languageTitle: "言語を変更",
        languageDesc: "画面に表示する言語を選択します。",
        recommendSection: "おすすめ",
        recommendVisible: "おすすめスポットを表示",
        recommendVisibleDesc: "地図下部の周辺おすすめスポットを表示します。",
        recommendBasis: "おすすめ基準",
        recommendBasisDesc: "おすすめスポットの基準を選択します。",
        gender: "自分の性別を基準",
        genderDesc: "会員登録時に選択した性別をおすすめに反映します。",
        all: "性別を区別しない",
        allDesc: "性別を区別せず全体を基準におすすめします。",
        dataSection: "データ管理",
        clearSearch: "最近の検索履歴を削除",
        clearSearchDesc: "このブラウザに保存された検索履歴を削除します。",
        resetData: "保存データを初期化",
        resetDataDesc: "いいね・お気に入り・おすすめ設定を初期化します。",
        cleared: "最近の検索履歴を削除しました。",
        noHistory: "削除する検索履歴がありません。",
        resetConfirm: "いいね・お気に入り・おすすめ設定を初期化しますか？",
        resetDone: "保存データを初期化しました。",
        deleteAccount: "退会",
        deleteAccountDesc: "アカウントとサーバーに保存された会員情報を完全に削除します。",
        deleteAccountConfirm: "本当に退会しますか？アカウントは復元できません。",
        deleteAccountDone: "退会が完了しました。",
        loginRequired: "退会するにはログインが必要です。"
    },
    en: {
        title: "Settings",
        description: "Manage recommendations and saved data.",
        languageSection: "Language",
        languageTitle: "Change language",
        languageDesc: "Choose the language shown on screen.",
        recommendSection: "Recommendations",
        recommendVisible: "Show recommended places",
        recommendVisibleDesc: "Show the nearby recommendations panel on the map.",
        recommendBasis: "Recommendation basis",
        recommendBasisDesc: "Choose how recommended places are selected.",
        gender: "Use my gender",
        genderDesc: "Use the gender selected during sign-up for recommendations.",
        all: "Ignore gender",
        allDesc: "Recommend places using overall data without gender filtering.",
        dataSection: "Data",
        clearSearch: "Clear recent searches",
        clearSearchDesc: "Delete recent searches saved in this browser.",
        resetData: "Reset saved data",
        resetDataDesc: "Reset likes, favorites, and recommendation settings.",
        cleared: "Recent search history cleared.",
        noHistory: "There is no recent search history to delete.",
        resetConfirm: "Reset likes, favorites, and recommendation settings?",
        resetDone: "Saved data has been reset.",
        deleteAccount: "Delete account",
        deleteAccountDesc: "Permanently delete your account and member data stored on the server.",
        deleteAccountConfirm: "Delete your account? This cannot be undone.",
        deleteAccountDone: "Your account has been deleted.",
        loginRequired: "Log in before deleting your account."
    }
};

function getSettingsText() {
    return SETTINGS_TEXT[currentLanguage] || SETTINGS_TEXT.ko;
}

function readCheeseSettings() {
    return {
        ...DEFAULT_SETTINGS,
        ...readStorage(SETTINGS_STORAGE_KEY, {})
    };
}

function writeCheeseSettings(nextSettings) {
    writeStorage(SETTINGS_STORAGE_KEY, nextSettings);
}

function applyRecommendationVisibility(visible) {
    document
        .querySelector(".recommend-panel")
        ?.classList.toggle("settings-hidden", !visible);
}

function applyRecommendationBasis(basis) {
    document.documentElement.dataset.recommendBasis =
        basis === "all" ? "all" : "gender";

    const sex = currentUser?.sex || "";
    document.documentElement.dataset.userSex = sex;
}

function applyCheeseSettings() {
    const settings = readCheeseSettings();

    applyRecommendationVisibility(settings.recommendVisible);
    applyRecommendationBasis(settings.recommendBasis);

    const visibleInput =
        document.getElementById("recommendVisibleSetting");

    if (visibleInput) {
        visibleInput.checked = settings.recommendVisible;
    }

    document
        .querySelectorAll('input[name="recommendBasis"]')
        .forEach(input => {
            input.checked =
                input.value === settings.recommendBasis;
        });

}

function updateSettingsLanguageText() {
    const modal = document.getElementById("settingsModal");
    if (!modal) return;

    const text = getSettingsText();

    const title = modal.querySelector("#settingsModalTitle");
    const description = modal.querySelector(".settings-heading p");
    const sectionTitles = modal.querySelectorAll(".settings-section-title span");

    if (title) title.textContent = text.title;
    if (description) description.textContent = text.description;

    if (sectionTitles[0]) sectionTitles[0].textContent = text.recommendSection;
    if (sectionTitles[1]) sectionTitles[1].textContent = text.dataSection;

    const toggleCopy = modal.querySelector(".settings-toggle-row > span");
    if (toggleCopy) {
        toggleCopy.querySelector("strong").textContent = text.recommendVisible;
        toggleCopy.querySelector("small").textContent = text.recommendVisibleDesc;
    }

    const choiceCopy = modal.querySelector(".settings-choice-copy");
    if (choiceCopy) {
        choiceCopy.querySelector("strong").textContent = text.recommendBasis;
        choiceCopy.querySelector("small").textContent = text.recommendBasisDesc;
    }

    const radios = modal.querySelectorAll(".settings-radio-row");
    if (radios[0]) {
        radios[0].querySelector("strong").textContent = text.gender;
        radios[0].querySelector("small").textContent = text.genderDesc;
    }
    if (radios[1]) {
        radios[1].querySelector("strong").textContent = text.all;
        radios[1].querySelector("small").textContent = text.allDesc;
    }

    const actions = modal.querySelectorAll(".settings-action-row");
    if (actions[0]) {
        actions[0].querySelector("strong").textContent = text.clearSearch;
        actions[0].querySelector("small").textContent = text.clearSearchDesc;
    }
    if (actions[1]) {
        actions[1].querySelector("strong").textContent = text.resetData;
        actions[1].querySelector("small").textContent = text.resetDataDesc;
    }
    if (actions[2]) {
        actions[2].querySelector("strong").textContent = text.deleteAccount;
        actions[2].querySelector("small").textContent = text.deleteAccountDesc;
    }
}

function showSettingsStatus(message) {
    const status = document.getElementById("settingsStatus");
    if (!status) return;

    status.textContent = message;

    clearTimeout(window.cheeseSettingsStatusTimer);
    window.cheeseSettingsStatusTimer = setTimeout(() => {
        status.textContent = "";
    }, 2200);
}

/* 설정 열기 */

document
    .getElementById("settingsButton")
    ?.addEventListener("click", () => {
        applyCheeseSettings();
        updateSettingsLanguageText();
        openModal(document.getElementById("settingsModal"));
    });

/* 추천 장소 표시 */

document
    .getElementById("recommendVisibleSetting")
    ?.addEventListener("change", event => {
        const settings = readCheeseSettings();

        settings.recommendVisible = event.target.checked;

        writeCheeseSettings(settings);
        applyRecommendationVisibility(settings.recommendVisible);
    });

/* 추천 기준 */

document
    .querySelectorAll('input[name="recommendBasis"]')
    .forEach(input => {
        input.addEventListener("change", () => {
            if (!input.checked) return;

            const settings = readCheeseSettings();
            settings.recommendBasis =
                input.value === "all" ? "all" : "gender";

            writeCheeseSettings(settings);
            applyRecommendationBasis(settings.recommendBasis);
        });
    });

/* 최근 검색 기록 저장 */

function saveRecentSearchTerm() {
    const input = document.getElementById("searchInput");
    const term = input?.value.trim();

    if (!term) return;

    const history =
        readStorage(SETTINGS_RECENT_SEARCH_STORAGE_KEY, []);

    const nextHistory = [
        term,
        ...history.filter(item => item !== term)
    ].slice(0, 10);

    writeStorage(SETTINGS_RECENT_SEARCH_STORAGE_KEY, nextHistory);
}

document
    .getElementById("searchButton")
    ?.addEventListener("click", saveRecentSearchTerm);

document
    .getElementById("searchInput")
    ?.addEventListener("keydown", event => {
        if (event.key === "Enter") {
            saveRecentSearchTerm();
        }
    });

/* 최근 검색 기록 삭제 */

document
    .getElementById("clearRecentSearchButton")
    ?.addEventListener("click", () => {
        const text = getSettingsText();
        const history =
            readStorage(SETTINGS_RECENT_SEARCH_STORAGE_KEY, []);

        if (!history.length) {
            showSettingsStatus(text.noHistory);
            return;
        }

        localStorage.removeItem(SETTINGS_RECENT_SEARCH_STORAGE_KEY);
        showSettingsStatus(text.cleared);
    });

/* 저장 데이터 초기화 */

document
    .getElementById("resetSavedDataButton")
    ?.addEventListener("click", async () => {
        const text = getSettingsText();

        if (!window.confirm(text.resetConfirm)) {
            return;
        }

        const button = document.getElementById("resetSavedDataButton");
        if (button) button.disabled = true;

        try {
            /* 좋아요/즐겨찾기는 서버 DB가 기준이므로 localStorage만 지우지 않습니다. */
            if (getAuthToken()) {
                const [likedRows, savedRows] = await Promise.all([
                    apiRequest("/api/places/me/likes", { auth: true }),
                    apiRequest("/api/places/me/saved", { auth: true })
                ]);

                await Promise.all([
                    ...(Array.isArray(likedRows) ? likedRows : []).map(place =>
                        apiRequest(`/api/places/${Number(place.placeId)}/like`, {
                            method: "POST",
                            auth: true
                        })
                    ),
                    ...(Array.isArray(savedRows) ? savedRows : []).map(place =>
                        apiRequest(`/api/places/${Number(place.placeId)}/save`, {
                            method: "POST",
                            auth: true
                        })
                    )
                ]);
            }

            [
                STORAGE_KEYS.likes,
                STORAGE_KEYS.favorites,
                SETTINGS_STORAGE_KEY,
                SETTINGS_RECENT_SEARCH_STORAGE_KEY
            ].filter(Boolean).forEach(key => localStorage.removeItem(key));

            likedPlaces = [];
            favoritePlaces = [];

            const resetSettings = { ...DEFAULT_SETTINGS };
            writeCheeseSettings(resetSettings);
            applyCheeseSettings();

            if (typeof renderRecommendedPlaces === "function") {
                renderRecommendedPlaces();
            }
            if (typeof updateFavoriteButtons === "function") {
                updateFavoriteButtons();
            }

            showSettingsStatus(text.resetDone);
        } catch (error) {
            console.error("저장 데이터 초기화 실패:", error);
            showSettingsStatus(error.message);
        } finally {
            if (button) button.disabled = false;
        }
    });

/* 최초 적용 */

applyCheeseSettings();



/* 회원 탈퇴 */
document
    .getElementById("deleteAccountButton")
    ?.addEventListener("click", async () => {
        const text = getSettingsText();
        if (!getAuthToken() || !currentUser) {
            showSettingsStatus(text.loginRequired);
            return;
        }
        if (!window.confirm(text.deleteAccountConfirm)) return;

        const button = document.getElementById("deleteAccountButton");
        if (button) button.disabled = true;

        try {
            await apiRequest("/user/delete", {
                method: "DELETE",
                auth: true
            });

            clearAuthToken();
            currentUser = null;
            localStorage.removeItem(STORAGE_KEYS.user);

            [
                STORAGE_KEYS.likes,
                STORAGE_KEYS.favorites,
                typeof GROUP_STORAGE_KEY !== "undefined" ? GROUP_STORAGE_KEY : null,
                typeof MESSAGE_STORAGE_KEY !== "undefined" ? MESSAGE_STORAGE_KEY : null,
                SETTINGS_RECENT_SEARCH_STORAGE_KEY
            ].filter(Boolean).forEach(key => localStorage.removeItem(key));

            likedPlaces = [];
            favoritePlaces = [];
            if (typeof updateHeaderAuthState === "function") updateHeaderAuthState();
            if (typeof updateFavoriteButtons === "function") updateFavoriteButtons();
            if (typeof updateMessageBadge === "function") updateMessageBadge();

            closeModal(document.getElementById("settingsModal"));
            closeModal(document.getElementById("mypageModal"));
            showToast(text.deleteAccountDone);
        } catch (error) {
            showSettingsStatus(error.message);
        } finally {
            if (button) button.disabled = false;
        }
    });

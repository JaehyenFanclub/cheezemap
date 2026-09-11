/* =====================================================
   CHEESE MAP API 공통 모듈
===================================================== */

const CHEESE_TOKEN_KEY = "cheeseMapToken";

let sessionLogoutInProgress = false;
let lastForcedLogoutAt = 0;

function getAuthToken() {
    return localStorage.getItem(CHEESE_TOKEN_KEY) || "";
}

function setAuthToken(token) {
    if (token) localStorage.setItem(CHEESE_TOKEN_KEY, token);
}

function clearAuthToken() {
    localStorage.removeItem(CHEESE_TOKEN_KEY);
}

function decodeJwtPayload(token = getAuthToken()) {
    const raw = String(token || "").trim();
    const parts = raw.split(".");
    if (parts.length < 2) return null;

    try {
        const base64 = parts[1]
            .replace(/-/g, "+")
            .replace(/_/g, "/");
        const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
        const json = decodeURIComponent(
            Array.from(atob(padded))
                .map(char => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`)
                .join("")
        );
        return JSON.parse(json);
    } catch {
        return null;
    }
}

function isAuthTokenExpired(token = getAuthToken()) {
    const payload = decodeJwtPayload(token);
    if (!payload) {
        return true;
    }

    const exp = Number(payload.exp);
    if (!Number.isFinite(exp)) {
        return false;
    }

    // 만료 5초 전부터 만료로 취급해 경계 레이스를 줄입니다.
    return exp * 1000 <= Date.now() + 5000;
}

function isAuthFailureMessage(message) {
    const text = String(message || "");
    return /유효하지 않은 토큰|이미 로그아웃된 토큰|토큰은 필수|세션이 만료|unauthorized|jwt|expired/i.test(
        text
    );
}

/**
 * JWT 만료/무효 시 로컬 세션을 정리하고 헤더 UI를 비로그인 상태로 맞춥니다.
 * 서버 logout API는 호출하지 않습니다(이미 만료된 토큰일 수 있음).
 */
function forceSessionLogout(options = {}) {
    const {
        showMessage = true,
        closeModals = true
    } = options;

    if (sessionLogoutInProgress) {
        return;
    }

    const hadSession = Boolean(
        getAuthToken() ||
        (typeof currentUser !== "undefined" && currentUser)
    );

    sessionLogoutInProgress = true;

    try {
        clearAuthToken();

        if (typeof currentUser !== "undefined") {
            currentUser = null;
        }

        const userKey =
            typeof STORAGE_KEYS !== "undefined"
                ? STORAGE_KEYS.user
                : "cheeseMapUser";
        localStorage.removeItem(userKey);

        if (typeof likedPlaces !== "undefined") {
            likedPlaces = [];
            if (typeof writeStorage === "function" && typeof STORAGE_KEYS !== "undefined") {
                writeStorage(STORAGE_KEYS.likes, likedPlaces);
            }
        }

        if (typeof favoritePlaces !== "undefined") {
            favoritePlaces = [];
            if (typeof writeStorage === "function" && typeof STORAGE_KEYS !== "undefined") {
                writeStorage(STORAGE_KEYS.favorites, favoritePlaces);
            }
        }

        if (typeof updateFavoriteButtons === "function") {
            updateFavoriteButtons();
        }

        if (
            closeModals &&
            typeof closeModal === "function" &&
            typeof mypageModal !== "undefined" &&
            mypageModal
        ) {
            closeModal(mypageModal);
        }

        if (typeof updateHeaderAuthState === "function") {
            updateHeaderAuthState();
        }

        const now = Date.now();
        if (
            showMessage &&
            hadSession &&
            now - lastForcedLogoutAt > 2500 &&
            typeof showToast === "function"
        ) {
            lastForcedLogoutAt = now;
            showToast("toast.sessionExpired");
        }
    } finally {
        sessionLogoutInProgress = false;
    }
}

function getCurrentUserId() {
    const payload = decodeJwtPayload();
    const id = Number(payload?.sub);
    return Number.isFinite(id) && id > 0 ? id : null;
}

async function apiRequest(path, options = {}) {
    const {
        method = "GET",
        body = null,
        auth = false,
        headers: extraHeaders = {},
        raw = false,
        skipSessionLogout = false
    } = options;

    const headers = { ...extraHeaders };
    let requestBody = body;
    if (auth) {
        const token = getAuthToken();
        if (!token) {
            throw new Error("로그인이 필요합니다.");
        }

        if (isAuthTokenExpired(token)) {
            if (!skipSessionLogout) {
                forceSessionLogout({ showMessage: true });
            } else {
                clearAuthToken();
            }
            throw new Error("세션이 만료되었습니다. 다시 로그인해주세요.");
        }

        headers.token = token;
    }

    if (body != null && !(body instanceof FormData)) {
        headers["Content-Type"] = headers["Content-Type"] || "application/json";
        if (headers["Content-Type"].includes("application/json") && typeof body !== "string") {
            requestBody = JSON.stringify(body);
        }
    }

    let response;
    try {
        response = await fetch(path, { method, headers, body: requestBody });
    } catch (error) {
        throw error instanceof Error
            ? error
            : new Error(String(error || "요청에 실패했습니다."));
    }

    if (raw) return response;

    const contentType = response.headers.get("content-type") || "";
    const data = contentType.includes("application/json")
        ? await response.json().catch(() => null)
        : await response.text().catch(() => "");

    if (!response.ok) {
        let message =
            data?.msg ||
            data?.message ||
            data?.error ||
            (typeof data === "string" && data) ||
            `요청 실패 (${response.status})`;

        if (isUploadSizeExceededError(message, response.status)) {
            message = "사진이 너무 커서 추가할 수 없습니다. (장당 최대 10MB)";
        }

        const shouldLogout =
            auth &&
            !skipSessionLogout &&
            (
                response.status === 401 ||
                response.status === 403 ||
                isAuthFailureMessage(message)
            );

        if (shouldLogout) {
            forceSessionLogout({ showMessage: true });
        } else if (
            auth &&
            skipSessionLogout &&
            (response.status === 401 || response.status === 403)
        ) {
            clearAuthToken();
        }

        throw new Error(message);
    }

    return data;
}

function isUploadSizeExceededError(message, status) {
    if (Number(status) === 413) {
        return true;
    }

    const text = String(message || "").toLowerCase();
    return (
        text.includes("entity too large") ||
        text.includes("max upload") ||
        text.includes("maximum upload") ||
        text.includes("size exceed") ||
        text.includes("업로드 파일 크기가 제한") ||
        text.includes("사진 최대용량") ||
        text.includes("너무 커서")
    );
}

function mapMyPageUser(data, fallbackUser = null) {
    if (!data) return null;

    const fallback = fallbackUser || {};

    return {
        id:
            getCurrentUserId() ??
            data.userId ??
            data.id ??
            fallback.id ??
            null,

        name:
            data.userName ??
            data.name ??
            "",

        nickname:
            data.userNickname ??
            data.nickname ??
            "",

        email:
            data.userEmail ??
            data.email ??
            "",

        phone:
            data.userPhone ??
            data.phone ??
            "",

        birth:
            data.birth ??
            null,

        sex:
            data.SEX ??
            data.sex ??
            null,

        photoUrl:
            data.photoUrl ||
            fallback.photoUrl ||
            null,

        provider:
            String(
                data.provider ??
                fallback.provider ??
                "LOCAL"
            ).toUpperCase(),

        profileComplete:
            typeof data.profileComplete === "boolean"
                ? data.profileComplete
                : null
    };
}

async function fetchCurrentUser() {
    const data = await apiRequest("/user/mypage", { auth: true });
    const cachedUser =
        currentUser ||
        (typeof STORAGE_KEYS !== "undefined"
            ? readStorage(STORAGE_KEYS.user, null)
            : JSON.parse(localStorage.getItem("cheeseMapUser") || "null"));

    currentUser = mapMyPageUser(data, cachedUser);
    writeStorage(STORAGE_KEYS.user, currentUser);

    if (typeof syncBackendPlacePreferences === "function") {
        await syncBackendPlacePreferences();
    }

    return currentUser;
}

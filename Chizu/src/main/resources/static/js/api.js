/* =====================================================
   CHEESE MAP API 공통 모듈
===================================================== */

const CHEESE_TOKEN_KEY = "cheeseMapToken";

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
        raw = false
    } = options;

    const headers = { ...extraHeaders };
    let requestBody = body;
    if (auth) {
        const token = getAuthToken();
        if (!token) throw new Error("로그인이 필요합니다.");
        headers.token = token;
    }

    if (body != null && !(body instanceof FormData)) {
        headers["Content-Type"] = headers["Content-Type"] || "application/json";
        if (headers["Content-Type"].includes("application/json") && typeof body !== "string") {
            requestBody = JSON.stringify(body);
        }
    }

    const response = await fetch(path, { method, headers, body: requestBody });
    if (raw) return response;

    const contentType = response.headers.get("content-type") || "";
    const data = contentType.includes("application/json")
        ? await response.json().catch(() => null)
        : await response.text().catch(() => "");

    if (!response.ok) {
        const message = data?.msg || data?.message || data?.error || (typeof data === "string" && data) || `요청 실패 (${response.status})`;
        if (response.status === 401 || response.status === 403) {
            if (auth) {
                clearAuthToken();
                localStorage.removeItem(typeof STORAGE_KEYS !== "undefined" ? STORAGE_KEYS.user : "cheeseMapUser");
            }
        }
        throw new Error(message);
    }

    return data;
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

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

function mapMyPageUser(data) {
    if (!data) return null;

    return {
        id:
            data.userId ??
            data.id ??
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
            null
    };
}

async function fetchCurrentUser() {
    const data = await apiRequest("/user/mypage", { auth: true });
    currentUser = mapMyPageUser(data);
    writeStorage(STORAGE_KEYS.user, currentUser);
    return currentUser;
}

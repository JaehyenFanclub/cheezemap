/* =====================================================
   프론트 지도 장소 <-> Spring Boot Place / AutoPlace 연결

   - CHEESE MAP 정적 장소: Place API 사용
   - Google 장소:
       1) 이미 Place 연결(localStorage / 세션)이 있으면 GET /place/{id}
       2) 없을 때만 AutoPlace API → Place getOrCreate
   - 브라우저에는 placeId 매핑을 캐시
===================================================== */

const backendPlaceCache = new Map();
const backendPlaceIdCache = new Map();
// 같은 장소를 지도/리뷰/그룹이 동시에 요청해도 HTTP 요청은 하나만 전송합니다.
const backendPlacePending = new Map();
const BACKEND_PLACE_LINK_KEY = "cheeseMapBackendPlaceLinksV1";

function localizedValue(value) {
    if (value && typeof value === "object") {
        return value[currentLanguage] || value.ko || value.ja || value.en || "";
    }
    return value || "";
}

function readBackendPlaceLinks() {
    try {
        const value = JSON.parse(localStorage.getItem(BACKEND_PLACE_LINK_KEY) || "{}");
        return value && typeof value === "object" ? value : {};
    } catch {
        return {};
    }
}

function writeBackendPlaceLinks(value) {
    localStorage.setItem(BACKEND_PLACE_LINK_KEY, JSON.stringify(value || {}));
}

function rememberBackendPlace(externalKey, data) {
    if (!externalKey || !data?.placeId) return;
    const links = readBackendPlaceLinks();
    links[externalKey] = Number(data.placeId);
    writeBackendPlaceLinks(links);
    backendPlaceCache.set(externalKey, { ...data, externalKey });
    backendPlaceIdCache.set(String(data.placeId), { ...data, externalKey });
}

function forgetBackendPlace(externalKey) {
    const links = readBackendPlaceLinks();
    delete links[externalKey];
    writeBackendPlaceLinks(links);
    backendPlaceCache.delete(externalKey);
}

function getKnownBackendPlaceIds() {
    return [...new Set(Object.values(readBackendPlaceLinks()).map(Number).filter(Number.isFinite))];
}

function getFrontendKeyForKnownBackendId(placeId) {
    const links = readBackendPlaceLinks();
    const target = Number(placeId);
    for (const [externalKey, id] of Object.entries(links)) {
        if (Number(id) !== target) continue;
        if (externalKey.startsWith("static:")) {
            return externalKey.slice(7);
        }
        if (externalKey.startsWith("google:")) {
            return `google_${externalKey.slice(7)}`;
        }
    }
    return null;
}

function frontendKeyFromExternalKey(externalKey) {
    const key = String(externalKey || "");
    if (key.startsWith("static:")) {
        return key.slice(7);
    }
    if (key.startsWith("google:")) {
        return `google_${key.slice(7)}`;
    }
    return null;
}

function frontendKeyForBackendPlace(data) {
    if (!data) return null;
    const remembered = getFrontendKeyForKnownBackendId(data.placeId);
    if (remembered) return remembered;
    if (data.googlePlaceId) return `google_${data.googlePlaceId}`;
    if (data.externalKey) return frontendKeyFromExternalKey(data.externalKey);
    return null;
}

/** 그룹/마이페이지가 새로고침 후에도 백엔드 장소를 그릴 수 있도록 places 에 등록합니다. */
function registerFrontendPlaceFromBackend(data) {
    const frontendKey = frontendKeyForBackendPlace(data);
    if (!frontendKey) return null;

    const googlePlaceId = data.googlePlaceId
        || (String(frontendKey).startsWith("google_") ? frontendKey.slice(7) : null);
    const externalKey = googlePlaceId
        ? `google:${googlePlaceId}`
        : (String(frontendKey).startsWith("google_") ? null : `static:${frontendKey}`);

    if (externalKey && data.placeId) {
        rememberBackendPlace(externalKey, { ...data, placeId: Number(data.placeId) });
    }

    if (typeof places === "object" && places && !places[frontendKey]) {
        const name = data.placeName || data.name || "장소";
        const category = data.placeCategory || data.category || "";
        const address = data.placeAddress || data.address || "";
        places[frontendKey] = {
            name: { ko: name, ja: name, en: name },
            category: { ko: category, ja: category, en: category },
            type: "tour",
            rating: Number(data.avgRating || data.rating) || 0,
            reviewCount: Number(data.reviewCount || data.userRatingCount) || 0,
            address: { ko: address, ja: address, en: address },
            crowd: { ko: "보통", ja: "普通", en: "Normal" },
            icon: "ti-map-pin",
            color: "linear-gradient(135deg, #ffe5a7, #f4bc45)",
            position: {
                lat: Number(data.placeLatitude ?? data.autoLatitude),
                lng: Number(data.placeLongitude ?? data.autoLongitude)
            }
        };
    }

    return frontendKey;
}

/** 로그인 상태에서 Place 조회 시 view preference(hit_count)가 쌓이도록 호출합니다. */
async function recordPlaceViewIfLoggedIn(placeId) {
    const id = Number(placeId);
    if (!Number.isFinite(id) || id <= 0 || !getAuthToken()) {
        return;
    }
    try {
        await apiRequest(`/place/${id}`, { auth: true });
    } catch (error) {
        console.warn("place view preference 기록 실패:", error);
    }
}

/**
 * like / save / view 등 Place preference 액션을 백엔드에 기록합니다.
 * ensureCurrentPlaceKey 가 만든 google_* 키도 AutoPlace Place 로 연결합니다.
 */
async function recordPlacePreferenceAction(action, placeKey = selectedPlaceKey) {
    if (!action || !getAuthToken()) {
        return;
    }
    try {
        const backendPlace = await ensureBackendPlace(placeKey);
        const placeId = Number(backendPlace?.placeId);
        if (!Number.isFinite(placeId) || placeId <= 0) {
            return;
        }
        await apiRequest(`/place/${placeId}/preference/${action}`, {
            method: "POST",
            auth: true
        });
    } catch (error) {
        console.warn(`place ${action} preference 기록 실패:`, error);
    }
}

function normalizeGooglePlaceId(placeId) {
    const raw = String(placeId || "").trim();
    if (!raw) return "";
    return raw.startsWith("places/") ? raw.slice("places/".length) : raw;
}

function buildGooglePlaceDescriptor(googlePlaceId, source = null) {
    const normalizedId = normalizeGooglePlaceId(googlePlaceId);
    const poi = source || (
        normalizeGooglePlaceId(selectedGooglePoi?.placeId) === normalizedId
            ? selectedGooglePoi
            : null
    );
    const googleKey = `google_${normalizedId}`;
    const cached = places[googleKey];

    return {
        externalKey: `google:${normalizedId}`,
        googlePlaceId: normalizedId,
        frontendKey: null,
        name: poi?.name || localizedValue(cached?.name) || "Google Place",
        category: poi?.category || localizedValue(cached?.category) || "Google Maps",
        address: poi?.address || localizedValue(cached?.address) || "",
        phone: "",
        information: `Google Maps POI / ${normalizedId}`,
        lat: Number(poi?.position?.lat ?? cached?.position?.lat),
        lng: Number(poi?.position?.lng ?? cached?.position?.lng)
    };
}

function getActivePlaceDescriptor(placeKey = selectedPlaceKey) {
    // ensureCurrentPlaceKey / 그룹저장이 만든 google_* 임시 키는 정적 장소가 아닙니다.
    if (placeKey && String(placeKey).startsWith("google_")) {
        return buildGooglePlaceDescriptor(String(placeKey).slice("google_".length));
    }

    if (placeKey && places[placeKey] && !String(placeKey).startsWith("google_")) {
        const p = places[placeKey];
        return {
            externalKey: `static:${placeKey}`,
            frontendKey: placeKey,
            name: localizedValue(p.name),
            category: localizedValue(p.category),
            address: localizedValue(p.address),
            phone: p.phone || "",
            information: `${localizedValue(p.category)} / CHEESE MAP / ${placeKey}`,
            lat: Number(p.position?.lat),
            lng: Number(p.position?.lng)
        };
    }

    if (selectedGooglePoi?.placeId) {
        return buildGooglePlaceDescriptor(selectedGooglePoi.placeId, selectedGooglePoi);
    }

    return null;
}

async function ensureBackendPlace(placeKey = selectedPlaceKey) {
    const descriptor = getActivePlaceDescriptor(placeKey);

    if (!descriptor) {
        throw new Error("장소 정보를 확인할 수 없습니다.");
    }

    // 1. 메모리 캐시
    if (backendPlaceCache.has(descriptor.externalKey)) {
        const cached = backendPlaceCache.get(descriptor.externalKey);
        if (Number(cached?.placeId) > 0) {
            return cached;
        }
    }

    // 같은 세션에서 이미 Place 를 알고 있으면 재사용
    if (
        descriptor.googlePlaceId &&
        normalizeGooglePlaceId(selectedGooglePoi?.placeId) === descriptor.googlePlaceId &&
        Number(selectedGooglePoi?.backendPlaceId) > 0
    ) {
        const knownId = Number(selectedGooglePoi.backendPlaceId);
        const known = {
            placeId: knownId,
            googlePlaceId: descriptor.googlePlaceId,
            placeName: descriptor.name,
            placeCategory: descriptor.category,
            placeAddress: descriptor.address,
            placeLatitude: descriptor.lat,
            placeLongitude: descriptor.lng,
            externalKey: descriptor.externalKey,
            isAutoPlace: true,
            autoPlaceId: selectedGooglePoi?.autoPlace?.autoPlaceId || descriptor.googlePlaceId,
            photoUrls: Array.isArray(selectedGooglePoi?.autoPlace?.photoUrls)
                ? selectedGooglePoi.autoPlace.photoUrls
                : []
        };
        rememberBackendPlace(descriptor.externalKey, known);
        return known;
    }

    const links = readBackendPlaceLinks();
    const linkedId = Number(links[descriptor.externalKey]);

    // 2. 이미 Place 로 연결된 경우 (정적/Google 공통)
    // Place 테이블에 있으면 GET /place 만으로 충분합니다.
    // AutoPlace 는 연결이 없을 때 최초 생성/동기화용입니다.
    if (Number.isFinite(linkedId) && linkedId > 0) {
        try {
            const existing = await apiRequest(
                `/place/${linkedId}`,
                getAuthToken() ? { auth: true } : {}
            );

            const reused = {
                ...existing,
                placeId: Number(existing.placeId) || linkedId,
                googlePlaceId: existing.googlePlaceId || descriptor.googlePlaceId || null,
                externalKey: descriptor.externalKey,
                isAutoPlace: Boolean(descriptor.googlePlaceId),
                autoPlaceId: descriptor.googlePlaceId || null,
                photoUrls: backendPlaceCache.get(descriptor.externalKey)?.photoUrls || []
            };

            rememberBackendPlace(descriptor.externalKey, reused);
            return reused;
        } catch {
            forgetBackendPlace(descriptor.externalKey);
        }
    }


    /* =====================================================
       GOOGLE 장소 (Place 연결이 아직 없을 때만)
       GET /api/places/{googlePlaceId} → AutoPlace + Place getOrCreate
    ===================================================== */
    if (descriptor.googlePlaceId) {
        const pendingKey = descriptor.externalKey;

        if (backendPlacePending.has(pendingKey)) {
            return backendPlacePending.get(pendingKey);
        }

        const requestPromise = (async () => {
            const googlePlaceId = normalizeGooglePlaceId(descriptor.googlePlaceId);
            const encodedGooglePlaceId = encodeURIComponent(googlePlaceId);
            const autoPlace = await apiRequest(`/api/places/${encodedGooglePlaceId}`);

            if (!autoPlace?.autoPlaceId) {
                throw new Error("Google 장소 정보를 AutoPlace 백엔드에서 가져오지 못했습니다.");
            }

            const placeId = Number(autoPlace.placeId);
            const normalized = {
                ...autoPlace,
                autoPlaceId: String(autoPlace.autoPlaceId),
                // AutoPlace API가 Place getOrCreate 후 placeId를 내려줍니다.
                placeId: Number.isFinite(placeId) && placeId > 0 ? placeId : null,
                // Google Place ID는 정규화된 값을 유지합니다.
                googlePlaceId: String(googlePlaceId),
                placeName: autoPlace.name || descriptor.name,
                placeCategory: autoPlace.category || descriptor.category,
                placeAddress: autoPlace.address || descriptor.address,
                placeLatitude: autoPlace.autoLatitude ?? descriptor.lat,
                placeLongitude: autoPlace.autoLongitude ?? descriptor.lng,
                rating: Number(autoPlace.avgRating ?? autoPlace.rating) || 0,
                userRatingCount: Number(autoPlace.reviewCount ?? autoPlace.userRatingCount) || 0,
                avgRating: Number(autoPlace.avgRating) || 0,
                reviewCount: Number(autoPlace.reviewCount) || 0,
                photoUrls: Array.isArray(autoPlace.photoUrls) ? autoPlace.photoUrls.filter(Boolean) : [],
                externalKey: descriptor.externalKey,
                isAutoPlace: true
            };

            // Place는 백엔드 AutoPlace → getOrCreateFromAutoPlace 로 이미 연결됩니다.
            // 여기서 POST /place 를 다시 호출하면 중복 Place가 생길 수 있습니다.
            if (normalized.placeId) {
                rememberBackendPlace(descriptor.externalKey, normalized);
                if (
                    normalizeGooglePlaceId(selectedGooglePoi?.placeId) === googlePlaceId
                ) {
                    selectedGooglePoi.placeId = googlePlaceId;
                    selectedGooglePoi.backendPlaceId = normalized.placeId;
                    selectedGooglePoi.autoPlace = normalized;
                }
                await recordPlaceViewIfLoggedIn(normalized.placeId);
            } else {
                backendPlaceCache.set(descriptor.externalKey, normalized);
            }
            return normalized;
        })();

        backendPlacePending.set(pendingKey, requestPromise);
        try {
            return await requestPromise;
        } finally {
            backendPlacePending.delete(pendingKey);
        }
    }


    /* =====================================================
       기존 CHEESE MAP 정적 장소
       기존 방식 그대로 유지
    ===================================================== */

    if (!getAuthToken()) {
        throw new Error(
            "이 장소를 처음 사용할 때는 로그인이 필요합니다."
        );
    }

    const created = await apiRequest("/place", {
        method: "POST",
        auth: true,
        body: {
            placeName: descriptor.name,
            placeCategory: descriptor.category,
            placeAddress: descriptor.address,
            placePhone: descriptor.phone,
            placeInformation: descriptor.information,
            placeDate: new Date().toISOString(),
            googlePlaceId: descriptor.googlePlaceId || null,

            placeLatitude:
                Number.isFinite(descriptor.lat)
                    ? descriptor.lat
                    : null,

            placeLongitude:
                Number.isFinite(descriptor.lng)
                    ? descriptor.lng
                    : null
        }
    });

    rememberBackendPlace(
        descriptor.externalKey,
        created
    );

    return {
        ...created,
        externalKey: descriptor.externalKey
    };
}

async function getBackendPlaceById(placeId) {
    const key = String(placeId);
    if (backendPlaceIdCache.has(key)) return backendPlaceIdCache.get(key);

    const data = await apiRequest(`/place/${placeId}`);
    const googlePlaceId = data.googlePlaceId || null;
    let frontendKey = getFrontendKeyForKnownBackendId(placeId);
    if (!frontendKey && googlePlaceId) {
        frontendKey = `google_${googlePlaceId}`;
    }
    const externalKey = frontendKey
        ? (String(frontendKey).startsWith("google_")
            ? `google:${frontendKey.slice(7)}`
            : `static:${frontendKey}`)
        : null;
    const normalized = { ...data, frontendKey, externalKey };

    backendPlaceIdCache.set(key, normalized);
    if (externalKey) {
        rememberBackendPlace(externalKey, normalized);
    }
    registerFrontendPlaceFromBackend(normalized);
    return normalized;
}

async function backendPlaceIdToFrontendKey(placeId) {
    const remembered = getFrontendKeyForKnownBackendId(placeId);
    if (remembered) return remembered;

    try {
        const place = await getBackendPlaceById(placeId);
        return registerFrontendPlaceFromBackend(place)
            || frontendKeyFromExternalKey(place.externalKey);
    } catch {
        return null;
    }
}

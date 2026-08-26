/* =====================================================
   프론트 지도 장소 <-> Spring Boot Place / AutoPlace 연결

   - CHEESE MAP 정적 장소: 기존 Place API 사용
   - Google 장소: AutoPlace API를 통해 기존 Place와 연결
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
        if (Number(id) === target && externalKey.startsWith("static:")) {
            return externalKey.slice(7);
        }
    }
    return null;
}

function getActivePlaceDescriptor(placeKey = selectedPlaceKey) {
    if (placeKey && places[placeKey]) {
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
        return {
            externalKey: `google:${selectedGooglePoi.placeId}`,
            googlePlaceId: selectedGooglePoi.placeId,
            frontendKey: null,
            name: selectedGooglePoi.name || "Google Place",
            category: selectedGooglePoi.category || "Google Maps",
            address: selectedGooglePoi.address || "",
            phone: "",
            information: `Google Maps POI / ${selectedGooglePoi.placeId}`,
            lat: Number(selectedGooglePoi.position?.lat),
            lng: Number(selectedGooglePoi.position?.lng)
        };
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
        return backendPlaceCache.get(descriptor.externalKey);
    }

    // 2. 기존에 연결된 placeId가 있으면 기존 Place 조회
    // Google 장소는 photoReferences까지 받아야 하므로 AutoPlace API를 사용한다.
    const links = readBackendPlaceLinks();
    const linkedId = Number(links[descriptor.externalKey]);

    if (
        !descriptor.googlePlaceId &&
        Number.isFinite(linkedId) &&
        linkedId > 0
    ) {
        try {
            const existing = await apiRequest(`/place/${linkedId}`);

            rememberBackendPlace(
                descriptor.externalKey,
                existing
            );

            return {
                ...existing,
                externalKey: descriptor.externalKey
            };
        } catch {
            // 기존 DB에서 사라진 경우 브라우저 캐시 제거
            forgetBackendPlace(descriptor.externalKey);
        }
    }


    /* =====================================================
       GOOGLE 장소
       현재 백엔드 AutoPlaceController 규격에 맞춤
       GET /api/places/{googlePlaceId}
       응답: autoPlaceId, name, category, address,
             autoLatitude, autoLongitude, rating,
             userRatingCount, photoUrls
    ===================================================== */
    if (descriptor.googlePlaceId) {
        const pendingKey = descriptor.externalKey;

        if (backendPlacePending.has(pendingKey)) {
            return backendPlacePending.get(pendingKey);
        }

        const requestPromise = (async () => {
            const encodedGooglePlaceId = encodeURIComponent(descriptor.googlePlaceId);
            const autoPlace = await apiRequest(`/api/places/${encodedGooglePlaceId}`);

            if (!autoPlace?.autoPlaceId) {
                throw new Error("Google 장소 정보를 AutoPlace 백엔드에서 가져오지 못했습니다.");
            }

            const normalized = {
                ...autoPlace,
                autoPlaceId: String(autoPlace.autoPlaceId),
                // Google Place ID는 AutoPlace ID와 별개이므로 원래 Google ID를 유지합니다.
                googlePlaceId: String(descriptor.googlePlaceId),
                placeName: autoPlace.name || descriptor.name,
                placeCategory: autoPlace.category || descriptor.category,
                placeAddress: autoPlace.address || descriptor.address,
                placeLatitude: autoPlace.autoLatitude ?? descriptor.lat,
                placeLongitude: autoPlace.autoLongitude ?? descriptor.lng,
                rating: Number(autoPlace.rating) || 0,
                userRatingCount: Number(autoPlace.userRatingCount) || 0,
                photoUrls: Array.isArray(autoPlace.photoUrls) ? autoPlace.photoUrls.filter(Boolean) : [],
                externalKey: descriptor.externalKey,
                isAutoPlace: true
            };

            /*
                리뷰 API는 /place/{placeId}/review 형태의 숫자 placeId를 사용합니다.
                Google POI도 리뷰를 작성할 수 있도록 로그인 상태에서는 Google Place ID를
                기존 Place 테이블과 한 번 연결합니다. PlaceService가 googlePlaceId 중복을
                확인하므로 같은 Google 장소를 여러 번 눌러도 Place 행이 계속 생기지 않습니다.
            */
            if (getAuthToken()) {
                const reviewPlace = await apiRequest("/place", {
                    method: "POST",
                    auth: true,
                    body: {
                        googlePlaceId: descriptor.googlePlaceId,
                        placeName: normalized.placeName,
                        placeCategory: normalized.placeCategory,
                        placeAddress: normalized.placeAddress,
                        placePhone: descriptor.phone || "",
                        placeInformation: `Google Maps POI / ${descriptor.googlePlaceId}`,
                        placeDate: new Date().toISOString(),
                        placeLatitude: Number.isFinite(Number(normalized.placeLatitude))
                            ? Number(normalized.placeLatitude)
                            : null,
                        placeLongitude: Number.isFinite(Number(normalized.placeLongitude))
                            ? Number(normalized.placeLongitude)
                            : null
                    }
                });

                const linked = {
                    ...normalized,
                    ...reviewPlace,
                    autoPlaceId: normalized.autoPlaceId,
                    googlePlaceId: descriptor.googlePlaceId,
                    photoUrls: normalized.photoUrls,
                    rating: normalized.rating,
                    userRatingCount: normalized.userRatingCount,
                    externalKey: descriptor.externalKey,
                    isAutoPlace: true
                };

                rememberBackendPlace(descriptor.externalKey, linked);
                return linked;
            }

            backendPlaceCache.set(descriptor.externalKey, normalized);
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
    const frontendKey = getFrontendKeyForKnownBackendId(placeId);
    const externalKey = frontendKey ? `static:${frontendKey}` : null;
    const normalized = externalKey ? { ...data, externalKey } : data;

    backendPlaceIdCache.set(key, normalized);
    if (externalKey) backendPlaceCache.set(externalKey, normalized);
    return normalized;
}

function frontendKeyFromExternalKey(externalKey) {
    if (String(externalKey || "").startsWith("static:")) {
        return String(externalKey).slice(7);
    }
    return null;
}

async function backendPlaceIdToFrontendKey(placeId) {
    const remembered = getFrontendKeyForKnownBackendId(placeId);
    if (remembered) return remembered;

    try {
        const place = await getBackendPlaceById(placeId);
        return frontendKeyFromExternalKey(place.externalKey);
    } catch {
        return null;
    }
}

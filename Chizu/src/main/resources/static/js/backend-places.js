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

function hasMeaningfulBackendValue(value) {
    return value !== undefined &&
        value !== null &&
        String(value).trim() !== "";
}

function mergeBackendPlaceData(existing, incoming, externalKey = null) {
    const oldData =
        existing && typeof existing === "object"
            ? existing
            : {};

    const newData =
        incoming && typeof incoming === "object"
            ? incoming
            : {};

    const merged = {
        ...oldData,
        ...newData
    };

    /*
        AutoPlace/임시 응답의 빈 값이
        이미 GET /place/{id}에서 받은 정상 DB 값을 덮어쓰지 못하게 합니다.
    */
    [
        "placeName",
        "placeCategory",
        "placeAddress",
        "placePhone",
        "placeInformation",
        "googlePlaceId",
        "placeLatitude",
        "placeLongitude"
    ].forEach(field => {
        if (
            !hasMeaningfulBackendValue(newData[field]) &&
            hasMeaningfulBackendValue(oldData[field])
        ) {
            merged[field] =
                oldData[field];
        }
    });

    if (externalKey) {
        merged.externalKey =
            externalKey;
    } else if (oldData.externalKey) {
        merged.externalKey =
            oldData.externalKey;
    }

    return merged;
}

function rememberBackendPlace(externalKey, data) {
    if (!externalKey || !data?.placeId) return;

    const placeId =
        Number(data.placeId);

    const idKey =
        String(placeId);

    const existing =
        backendPlaceIdCache.get(idKey) ||
        backendPlaceCache.get(externalKey) ||
        null;

    const merged =
        mergeBackendPlaceData(
            existing,
            data,
            externalKey
        );

    const links =
        readBackendPlaceLinks();

    links[externalKey] =
        placeId;

    writeBackendPlaceLinks(
        links
    );

    backendPlaceCache.set(
        externalKey,
        merged
    );

    backendPlaceIdCache.set(
        idKey,
        merged
    );
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


const backendPlaceDisplayNameCache = new Map();

function isGenericBackendPlaceName(value) {
    const name = String(value || "").trim().toLowerCase();

    return !name ||
        name === "선택한 장소" ||
        name === "選択した場所" ||
        name === "selected place" ||
        name === "google place" ||
        name === "place";
}

/*
    마이페이지 좋아요/즐겨찾기/리뷰에서 공통으로 사용할 장소명 보정 함수.
    DB에 정상 이름이 있으면 그대로 사용하고,
    오래된 "선택한 장소" 레코드일 때만 googlePlaceId로 실제 이름을 한 번 조회합니다.
*/
async function resolveBackendPlaceDisplayName(placeOrId) {
    let place =
        typeof placeOrId === "object" && placeOrId
            ? placeOrId
            : null;

    const placeId =
        Number(
            place?.placeId ??
            placeOrId
        );

    if (!place && Number.isFinite(placeId) && placeId > 0) {
        place =
            await getBackendPlaceById(
                placeId
            );
    }

    const backendName =
        String(
            place?.placeName ||
            place?.name ||
            ""
        ).trim();

    if (!isGenericBackendPlaceName(backendName)) {
        return backendName;
    }

    const cacheKey =
        Number.isFinite(placeId) && placeId > 0
            ? `place:${placeId}`
            : `google:${String(place?.googlePlaceId || "")}`;

    const cached =
        backendPlaceDisplayNameCache.get(
            cacheKey
        );

    if (
        cached &&
        !isGenericBackendPlaceName(cached)
    ) {
        return cached;
    }

    let googlePlaceId =
        String(
            place?.googlePlaceId || ""
        ).trim();

    /*
        일부 과거 Place 레코드에 googlePlaceId가 비어 있어도
        frontend/backend 연결표에서 Google ID를 복원합니다.
    */
    if (
        !googlePlaceId &&
        Number.isFinite(placeId) &&
        placeId > 0
    ) {
        let frontendKey =
            getFrontendKeyForKnownBackendId(
                placeId
            );

        if (
            !frontendKey &&
            typeof backendPlaceIdToFrontendKey === "function"
        ) {
            try {
                frontendKey =
                    await backendPlaceIdToFrontendKey(
                        placeId
                    );
            } catch {}
        }

        if (
            String(frontendKey || "")
                .startsWith("google_")
        ) {
            googlePlaceId =
                String(frontendKey)
                    .slice("google_".length);
        }
    }

    if (
        googlePlaceId &&
        typeof normalizeGooglePlaceId === "function"
    ) {
        googlePlaceId =
            normalizeGooglePlaceId(
                googlePlaceId
            );
    }

    /*
        먼저 프론트 캐시에 실제 이름이 있으면 API를 다시 호출하지 않습니다.
    */
    if (googlePlaceId) {
        const googleKey =
            `google_${googlePlaceId}`;

        const cachedPlace =
            places?.[googleKey];

        const localNameValue =
            cachedPlace?.name;

        const localName =
            localNameValue &&
            typeof localNameValue === "object"
                ? (
                    localNameValue[currentLanguage] ||
                    localNameValue.ko ||
                    localNameValue.ja ||
                    localNameValue.en ||
                    ""
                )
                : String(
                    localNameValue || ""
                );

        if (
            localName &&
            !isGenericBackendPlaceName(localName)
        ) {
            backendPlaceDisplayNameCache.set(
                cacheKey,
                localName
            );

            return localName;
        }
    }

    if (
        googlePlaceId &&
        typeof fetchGooglePoiDetails === "function"
    ) {
        try {
            const googlePlace =
                await fetchGooglePoiDetails(
                    googlePlaceId
                );

            const actualName =
                String(
                    googlePlace?.displayName || ""
                ).trim();

            if (
                actualName &&
                !isGenericBackendPlaceName(
                    actualName
                )
            ) {
                backendPlaceDisplayNameCache.set(
                    cacheKey,
                    actualName
                );

                const googleKey =
                    `google_${googlePlaceId}`;

                if (typeof places === "object" && places) {
                    const existing =
                        places[googleKey] || {};

                    places[googleKey] = {
                        ...existing,
                        name: {
                            ko: actualName,
                            ja: actualName,
                            en: actualName
                        }
                    };
                }

                return actualName;
            }
        } catch (error) {
            console.debug(
                "마이페이지 장소명 보정 실패:",
                error
            );
        }
    }

    /*
        "선택한 장소"라는 잘못된 문자열은 최종 UI에 절대 출력하지 않습니다.
    */
    return Number.isFinite(placeId) && placeId > 0
        ? `장소 #${placeId}`
        : "장소";
}



const myPagePlaceMetaCache = new Map();

function isGenericBackendDisplayName(value) {
    const text = String(value || "").trim().toLowerCase();

    return !text ||
        text === "선택한 장소" ||
        text === "選択した場所" ||
        text === "selected place" ||
        text === "google place" ||
        text === "place";
}

function isGenericBackendCategory(value) {
    const text = String(value || "").trim().toLowerCase();

    return !text ||
        text === "google maps" ||
        text === "google 지도 장소" ||
        text === "google マップの場所" ||
        text === "google maps place" ||
        text === "장소" ||
        text === "スポット" ||
        text === "place";
}

function cleanUserFacingCategory(value) {
    const text = String(value || "").trim();

    /*
        과거 placeInformation에 들어가던
        "관광 명소 / CHEESE MAP / google_..." 같은 기술 문자열은
        카테고리로 절대 노출하지 않습니다.
    */
    if (
        /CHEESE MAP/i.test(text) ||
        /Google Maps POI/i.test(text) ||
        /google_[A-Za-z0-9_-]+/i.test(text)
    ) {
        return "";
    }

    return text;
}

function localizeCachedPlaceValue(value) {
    if (value && typeof value === "object") {
        return (
            value[currentLanguage] ||
            value.ko ||
            value.ja ||
            value.en ||
            ""
        );
    }

    return String(value || "");
}

async function resolveBackendPlaceCardMeta(placeOrId, stateKey = "") {
    let place =
        typeof placeOrId === "object" && placeOrId
            ? placeOrId
            : null;

    const placeId =
        Number(
            place?.placeId ??
            placeOrId
        );

    if (!place && Number.isFinite(placeId) && placeId > 0) {
        place =
            await getBackendPlaceById(
                placeId
            );
    }

    /*
        google:* 상태키가 있으면 그것을 캐시 키로 사용합니다.
        place:*만 사용하면 과거 DB 레코드의 빈 주소 결과와
        Google 보정 결과가 서로 같은 캐시에 섞일 수 있습니다.
    */
    const suppliedStateKey =
        String(
            stateKey || ""
        ).trim();

    const cacheKey =
        suppliedStateKey.startsWith("google:")
            ? suppliedStateKey
            : (
                Number.isFinite(placeId) && placeId > 0
                    ? `place:${placeId}`
                    : `google:${String(place?.googlePlaceId || "")}`
            );

    const cachedMeta =
        myPagePlaceMetaCache.get(
            cacheKey
        );

    /*
        이미 이름/카테고리/주소가 전부 준비되어 있으면 즉시 재사용합니다.
    */
    if (
        cachedMeta?.name &&
        cachedMeta?.category &&
        cachedMeta?.address
    ) {
        return cachedMeta;
    }

    let name =
        String(
            place?.placeName ||
            place?.name ||
            ""
        ).trim();

    let category =
        cleanUserFacingCategory(
            place?.placeCategory ||
            place?.category ||
            ""
        );

    let address =
        String(
            place?.placeAddress ||
            place?.address ||
            ""
        ).trim();

    let googlePlaceId =
        String(
            place?.googlePlaceId ||
            ""
        ).trim();

    /*
        마이페이지 좋아요/즐겨찾기 상태키가 google:<placeId>인 경우
        DB Place에 googlePlaceId가 비어 있어도 상태키 자체에 정확한 Google ID가 있습니다.
        이 값을 가장 먼저 복원에 사용합니다.
    */
    const normalizedStateKey =
        String(stateKey || "").trim();

    if (
        !googlePlaceId &&
        normalizedStateKey.startsWith("google:")
    ) {
        googlePlaceId =
            normalizedStateKey.slice(
                "google:".length
            );
    }

    if (
        !googlePlaceId &&
        normalizedStateKey.startsWith("google_")
    ) {
        googlePlaceId =
            normalizedStateKey.slice(
                "google_".length
            );
    }

    /*
        과거 DB 레코드에 googlePlaceId가 비어 있으면
        backend ↔ frontend 연결정보에서 Google ID를 복원합니다.
    */
    if (
        !googlePlaceId &&
        Number.isFinite(placeId) &&
        placeId > 0
    ) {
        let frontendKey =
            typeof getFrontendKeyForKnownBackendId === "function"
                ? getFrontendKeyForKnownBackendId(
                    placeId
                )
                : null;

        if (
            !frontendKey &&
            typeof backendPlaceIdToFrontendKey === "function"
        ) {
            try {
                frontendKey =
                    await backendPlaceIdToFrontendKey(
                        placeId
                    );
            } catch {}
        }

        if (
            String(frontendKey || "")
                .startsWith("google_")
        ) {
            googlePlaceId =
                String(frontendKey)
                    .slice("google_".length);
        }
    }

    if (
        googlePlaceId &&
        typeof normalizeGooglePlaceId === "function"
    ) {
        googlePlaceId =
            normalizeGooglePlaceId(
                googlePlaceId
            );
    }

    /*
        먼저 현재 프론트 캐시에 들어 있는 실제 Google 장소정보를 사용합니다.
    */
    if (googlePlaceId) {
        const googleKey =
            `google_${googlePlaceId}`;

        const cachedPlace =
            places?.[googleKey];

        const cachedName =
            localizeCachedPlaceValue(
                cachedPlace?.name
            ).trim();

        const cachedCategory =
            cleanUserFacingCategory(
                localizeCachedPlaceValue(
                    cachedPlace?.category
                )
            );

        const cachedAddress =
            localizeCachedPlaceValue(
                cachedPlace?.address
            ).trim();

        if (
            isGenericBackendDisplayName(name) &&
            cachedName &&
            !isGenericBackendDisplayName(cachedName)
        ) {
            name = cachedName;
        }

        if (
            isGenericBackendCategory(category) &&
            cachedCategory &&
            !isGenericBackendCategory(cachedCategory)
        ) {
            category = cachedCategory;
        }

        if (!address && cachedAddress) {
            address = cachedAddress;
        }
    }

    /*
        이름/카테고리/주소 중 하나라도 부족하면 Google Place Details를 한 번만 조회합니다.
        특히 DB placeAddress가 비어 있는 호텔 등의 주소를 여기서 보완합니다.
    */
    const needsGoogleDetails =
        Boolean(
            googlePlaceId &&
            (
                isGenericBackendDisplayName(name) ||
                isGenericBackendCategory(category) ||
                !address
            )
        );

    if (
        needsGoogleDetails &&
        typeof fetchGooglePoiDetails === "function"
    ) {
        try {
            const googlePlace =
                await fetchGooglePoiDetails(
                    googlePlaceId
                );

            const googleName =
                String(
                    googlePlace?.displayName || ""
                ).trim();

            const googleAddress =
                String(
                    googlePlace?.formattedAddress || ""
                ).trim();

            let googleCategory = "";

            if (
                typeof getGooglePoiCategoryLabel === "function"
            ) {
                googleCategory =
                    getGooglePoiCategoryLabel(
                        googlePlace
                    );
            }

            if (
                !googleCategory ||
                isGenericBackendCategory(
                    googleCategory
                )
            ) {
                googleCategory =
                    String(
                        googlePlace?.primaryTypeDisplayName ||
                        ""
                    ).trim();
            }

            googleCategory =
                cleanUserFacingCategory(
                    googleCategory
                );

            if (
                isGenericBackendDisplayName(name) &&
                googleName &&
                !isGenericBackendDisplayName(googleName)
            ) {
                name = googleName;
            }

            if (
                isGenericBackendCategory(category) &&
                googleCategory &&
                !isGenericBackendCategory(googleCategory)
            ) {
                category = googleCategory;
            }

            if (!address && googleAddress) {
                address = googleAddress;
            }

            /*
                다음 마이페이지 조회에서도 Google API를 다시 부르지 않도록
                프론트 places 캐시에도 보정값을 남깁니다.
            */
            const googleKey =
                `google_${googlePlaceId}`;

            if (typeof places === "object" && places) {
                const existing =
                    places[googleKey] || {};

                places[googleKey] = {
                    ...existing,
                    name: name
                        ? {
                            ko: name,
                            ja: name,
                            en: name
                        }
                        : existing.name,
                    category: category
                        ? {
                            ko: category,
                            ja: category,
                            en: category
                        }
                        : existing.category,
                    address: address
                        ? {
                            ko: address,
                            ja: address,
                            en: address
                        }
                        : existing.address
                };
            }
        } catch (error) {
            console.debug(
                "마이페이지 장소 메타데이터 보정 실패:",
                error
            );
        }
    }

    /*
        기술 문자열은 마지막 단계에서도 제거합니다.
    */
    category =
        cleanUserFacingCategory(
            category
        );

    if (isGenericBackendCategory(category)) {
        category = "";
    }

    if (isGenericBackendDisplayName(name)) {
        name =
            Number.isFinite(placeId) && placeId > 0
                ? `장소 #${placeId}`
                : "장소";
    }

    const result = {
        name,
        category,
        address
    };

    myPagePlaceMetaCache.set(
        cacheKey,
        result
    );

    return result;
}


/** 로그인 상태에서 Place 상세를 조회합니다. 단순 조회는 hit_count에 반영하지 않습니다. */
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
 * like / save 등 Place preference 액션을 백엔드에 기록합니다.
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

    const externalKey = descriptor.externalKey;

    // 1) 메모리 캐시
    const memoryCached = backendPlaceCache.get(externalKey);
    if (Number(memoryCached?.placeId) > 0) {
        if (descriptor.googlePlaceId) {
            const currentGoogleId =
                normalizeGooglePlaceId(descriptor.googlePlaceId);
            const cachedGoogleId =
                normalizeGooglePlaceId(memoryCached?.googlePlaceId);

            // Google POI는 현재 Google Place ID와 캐시의 Google Place ID가
            // 정확히 같은 경우에만 기존 DB Place를 재사용합니다.
            if (
                currentGoogleId &&
                cachedGoogleId &&
                currentGoogleId === cachedGoogleId
            ) {
                return memoryCached;
            }

            // 과거에 잘못 연결된 placeId 캐시는 폐기합니다.
            forgetBackendPlace(externalKey);
        } else {
            return memoryCached;
        }
    }

    // 2) 저장된 frontend <-> DB placeId 연결
    const links = readBackendPlaceLinks();
    const linkedId = Number(links[externalKey]);

    if (Number.isFinite(linkedId) && linkedId > 0) {
        try {
            /*
                단순 상세 복원은 인증 없이 조회합니다.
                단순 조회는 hit_count에 반영하지 않으므로 UI 복원용 조회는 가중치에 영향을 주지 않습니다.
            */
            const existing = await apiRequest(`/place/${linkedId}`);

            if (descriptor.googlePlaceId) {
                const currentGoogleId =
                    normalizeGooglePlaceId(descriptor.googlePlaceId);
                const existingGoogleId =
                    normalizeGooglePlaceId(existing?.googlePlaceId);

                // Google POI를 기존 DB Place에 연결할 때는
                // 양쪽 Google Place ID가 실제로 같을 때만 재사용합니다.
                // existing.googlePlaceId가 NULL인 테스트/수동 Place에는
                // 현재 Google ID를 억지로 덧붙이지 않습니다.
                if (
                    currentGoogleId &&
                    existingGoogleId &&
                    currentGoogleId === existingGoogleId
                ) {
                    const reused = {
                        ...existing,
                        placeId: Number(existing?.placeId) || linkedId,
                        googlePlaceId: existingGoogleId,
                        externalKey
                    };

                    rememberBackendPlace(externalKey, reused);
                    return reused;
                }

                forgetBackendPlace(externalKey);
            } else {
                const reused = {
                    ...existing,
                    placeId: Number(existing?.placeId) || linkedId,
                    googlePlaceId:
                        normalizeGooglePlaceId(existing?.googlePlaceId) ||
                        null,
                    externalKey
                };

                rememberBackendPlace(externalKey, reused);
                return reused;
            }
        } catch (error) {
            console.warn("기존 장소 연결 조회 실패, 다시 연결합니다:", error);
            forgetBackendPlace(externalKey);
        }
    }

    // 3) Google POI
    if (descriptor.googlePlaceId) {
        const pendingKey = externalKey;

        if (backendPlacePending.has(pendingKey)) {
            return backendPlacePending.get(pendingKey);
        }

        const requestPromise = (async () => {
            const googlePlaceId =
                normalizeGooglePlaceId(descriptor.googlePlaceId);

            /*
                현재 백엔드의 /api/places/{googlePlaceId}는
                AutoPlace 조회/생성 + PlaceService.getOrCreateFromAutoPlace()까지
                수행한 뒤 AutoPlaceResponseDto.placeId를 반환합니다.

                따라서 프론트에서 Google 장소를 다시 POST /place 할 필요가 없습니다.
            */
            const response = await apiRequest(
                `/api/places/${encodeURIComponent(googlePlaceId)}`
            );

            const numericPlaceId = Number(response?.placeId);

            if (!Number.isFinite(numericPlaceId) || numericPlaceId <= 0) {
                throw new Error(
                    "백엔드에서 Google 장소의 placeId를 반환하지 않았습니다."
                );
            }

            const normalized = {
                ...response,
                placeId: numericPlaceId,
                googlePlaceId:
                    normalizeGooglePlaceId(
                        response?.googlePlaceId ||
                        googlePlaceId
                    ),
                autoPlaceId:
                    String(response?.autoPlaceId || googlePlaceId),
                placeName:
                    response?.name ||
                    descriptor.name ||
                    "Google Place",
                placeCategory:
                    response?.category ||
                    descriptor.category ||
                    "",
                placeAddress:
                    response?.address ||
                    descriptor.address ||
                    "",
                placeLatitude:
                    response?.autoLatitude ??
                    descriptor.lat,
                placeLongitude:
                    response?.autoLongitude ??
                    descriptor.lng,
                rating:
                    Number(response?.rating) || 0,
                avgRating:
                    Number(response?.avgRating) || 0,
                reviewCount:
                    Number(response?.reviewCount) || 0,
                photoUrls:
                    Array.isArray(response?.photoUrls)
                        ? response.photoUrls.filter(Boolean)
                        : [],
                externalKey,
                isAutoPlace: true
            };

            rememberBackendPlace(externalKey, normalized);

            if (
                selectedGooglePoi &&
                normalizeGooglePlaceId(selectedGooglePoi.placeId) === googlePlaceId
            ) {
                selectedGooglePoi.placeId = googlePlaceId;
                selectedGooglePoi.backendPlaceId = numericPlaceId;
                selectedGooglePoi.autoPlace = normalized;
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

    // 4) CHEESE MAP 정적 장소
    // 정적 장소는 기존 백엔드 API상 사용자가 최초 등록해야 하므로 로그인 필요.
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

    const normalizedCreated = {
        ...created,
        placeId: Number(created?.placeId),
        externalKey
    };

    rememberBackendPlace(externalKey, normalizedCreated);
    return normalizedCreated;
}


/*
    좋아요/즐겨찾기 UI는 백엔드 Place의 숫자 placeId를 식별자로 사용합니다.

    현재 백엔드는 like/save를 개인별 on/off 상태로 조회하는 API가 아니라
    추천 가중치(hit_count)를 누적하는 API만 제공하므로,
    선택 여부 자체는 localStorage에 유지하되 식별자는 DB placeId로 통일합니다.
*/
function backendStateKey(placeId) {
    const id = Number(placeId);
    return Number.isFinite(id) && id > 0
        ? `place:${id}`
        : "";
}

function backendPlaceIdFromStateKey(stateKey) {
    const match = String(stateKey || "").match(/^place:(\d+)$/);
    return match ? Number(match[1]) : null;
}

function getRememberedBackendPlaceId(placeKey = selectedPlaceKey) {
    if (
        selectedGooglePoi?.backendPlaceId &&
        (
            !placeKey ||
            String(placeKey).startsWith("google_")
        )
    ) {
        return Number(selectedGooglePoi.backendPlaceId);
    }

    const cardId = Number(placeCard?.dataset?.backendPlaceId);
    if (Number.isFinite(cardId) && cardId > 0) {
        return cardId;
    }

    const descriptor = getActivePlaceDescriptor(placeKey);
    if (!descriptor?.externalKey) return null;

    const cachedId = Number(
        backendPlaceCache.get(descriptor.externalKey)?.placeId
    );
    if (Number.isFinite(cachedId) && cachedId > 0) {
        return cachedId;
    }

    const linkedId = Number(
        readBackendPlaceLinks()[descriptor.externalKey]
    );

    return Number.isFinite(linkedId) && linkedId > 0
        ? linkedId
        : null;
}

async function ensureBackendStateKey(placeKey = selectedPlaceKey) {
    const remembered = getRememberedBackendPlaceId(placeKey);
    if (remembered) {
        return backendStateKey(remembered);
    }

    const backendPlace = await ensureBackendPlace(placeKey);
    return backendStateKey(backendPlace?.placeId);
}

async function openBackendPlaceById(placeId) {
    const backendPlace = await getBackendPlaceById(placeId);

    const position = {
        lat: Number(backendPlace?.placeLatitude),
        lng: Number(backendPlace?.placeLongitude)
    };

    const safePosition =
        Number.isFinite(position.lat) &&
        Number.isFinite(position.lng)
            ? position
            : null;

    /*
        DB PlaceResponse에 googlePlaceId가 있으면 그 ID로 실제 Google POI를 다시 엽니다.
        과거 데이터에서 googlePlaceId가 비어 있더라도 frontend 연결키가 google_*이면
        그 키에서 Google Place ID를 복원합니다.
    */
    let googlePlaceId =
        normalizeGooglePlaceId(
            backendPlace?.googlePlaceId || ""
        );

    if (!googlePlaceId) {
        const frontendKey =
            getFrontendKeyForKnownBackendId(placeId);

        if (
            frontendKey &&
            String(frontendKey).startsWith("google_")
        ) {
            googlePlaceId =
                normalizeGooglePlaceId(
                    String(frontendKey).slice(7)
                );
        }
    }

    if (
        googlePlaceId &&
        typeof openGooglePoi === "function"
    ) {
        let fallbackName =
            String(
                backendPlace?.placeName || ""
            ).trim();

        const genericFallbackName = [
            "",
            "선택한 장소",
            "選択した場所",
            "selected place",
            "google place",
            "place"
        ].includes(
            fallbackName.toLowerCase()
        );

        if (genericFallbackName) {
            const googleKey =
                `google_${googlePlaceId}`;

            const cachedNameValue =
                places?.[googleKey]?.name;

            const cachedName =
                cachedNameValue &&
                typeof cachedNameValue === "object"
                    ? (
                        cachedNameValue[currentLanguage] ||
                        cachedNameValue.ko ||
                        cachedNameValue.ja ||
                        cachedNameValue.en ||
                        ""
                    )
                    : String(
                        cachedNameValue || ""
                    );

            fallbackName =
                cachedName;
        }

        await openGooglePoi(
            googlePlaceId,
            safePosition,
            fallbackName,
            {
                // 마이페이지 "장소 보기" → 상세 패널 + 지도 이동/확대
                focusMap: true,
                focusZoom: 16
            }
        );
        return;
    }

    /*
        Google ID가 없는 정적 Place라도 DB 주소/좌표를 places 캐시에 복원해서
        장소 상세 카드의 위치가 비지 않게 합니다.
    */
    const frontendKey =
        await backendPlaceIdToFrontendKey(placeId);

    if (frontendKey) {
        const existing = places[frontendKey] || {};

        places[frontendKey] = {
            ...existing,
            name: existing.name || {
                ko: backendPlace?.placeName || "",
                ja: backendPlace?.placeName || "",
                en: backendPlace?.placeName || ""
            },
            category: existing.category || {
                ko: backendPlace?.placeCategory || "",
                ja: backendPlace?.placeCategory || "",
                en: backendPlace?.placeCategory || ""
            },
            address: {
                ko: backendPlace?.placeAddress || "",
                ja: backendPlace?.placeAddress || "",
                en: backendPlace?.placeAddress || ""
            },
            position:
                safePosition ||
                existing.position ||
                null
        };

        openPlace(frontendKey);

        if (safePosition) {
            googleMap?.panTo(safePosition);
            googleMap?.setZoom(16);
        }
        return;
    }

    if (safePosition) {
        googleMap?.panTo(safePosition);
        googleMap?.setZoom(16);
    }
}


function isCanonicalBackendPlace(place) {
    if (!place || typeof place !== "object") {
        return false;
    }

    const validId =
        Number.isFinite(
            Number(place.placeId)
        ) &&
        Number(place.placeId) > 0;

    /*
        핵심은 값이 비어 있는지가 아니라
        정식 PlaceResponse의 필드 자체가 존재하는지 확인하는 것입니다.
        실제로 주소가 없는 장소도 있을 수 있기 때문입니다.
    */
    const hasNameField =
        Object.prototype.hasOwnProperty.call(
            place,
            "placeName"
        );

    const hasCategoryField =
        Object.prototype.hasOwnProperty.call(
            place,
            "placeCategory"
        );

    const hasAddressField =
        Object.prototype.hasOwnProperty.call(
            place,
            "placeAddress"
        );

    return Boolean(
        validId &&
        hasNameField &&
        hasCategoryField &&
        hasAddressField
    );
}

async function getBackendPlaceById(
    placeId,
    options = {}
) {
    const id =
        Number(placeId);

    if (
        !Number.isFinite(id) ||
        id <= 0
    ) {
        throw new Error(
            "유효한 장소 ID가 아닙니다."
        );
    }

    const key =
        String(id);

    const forceRefresh =
        options === true ||
        Boolean(
            options?.forceRefresh
        );

    const cached =
        backendPlaceIdCache.get(
            key
        );

    /*
        앞으로는 "정식 PlaceResponse 형태"의 캐시만 재사용합니다.
        AutoPlace/임시 응답이 먼저 캐시돼 있어도 자동으로 DB Place를 다시 조회합니다.
    */
    if (
        !forceRefresh &&
        cached &&
        isCanonicalBackendPlace(
            cached
        )
    ) {
        return cached;
    }

    const data =
        await apiRequest(
            `/place/${id}`
        );

    const googlePlaceId =
        data.googlePlaceId ||
        null;

    let frontendKey =
        getFrontendKeyForKnownBackendId(
            id
        );

    if (
        !frontendKey &&
        googlePlaceId
    ) {
        frontendKey =
            `google_${googlePlaceId}`;
    }

    const externalKey =
        frontendKey
            ? (
                String(frontendKey)
                    .startsWith("google_")
                    ? `google:${frontendKey.slice(7)}`
                    : `static:${frontendKey}`
            )
            : null;

    const normalized = {
        ...data,
        placeId: id,
        frontendKey,
        externalKey
    };

    /*
        서버에서 받은 정식 Place 응답을 기준으로 캐시를 갱신합니다.
        기존 부분 데이터와 합칠 때도 정상 DB 값은 빈 값으로 덮이지 않습니다.
    */
    if (externalKey) {
        rememberBackendPlace(
            externalKey,
            normalized
        );
    } else {
        backendPlaceIdCache.set(
            key,
            mergeBackendPlaceData(
                cached,
                normalized,
                null
            )
        );
    }

    const canonical =
        backendPlaceIdCache.get(
            key
        ) ||
        normalized;

    registerFrontendPlaceFromBackend(
        canonical
    );

    return canonical;
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

    /* =====================================================
   길찾기 - 대중교통: NAVITIME / 도보·자동차: Google Routes
===================================================== */

function getSelectedTravelMode() {
    const selectedButton =
        document.querySelector(
            ".transport-tabs button.active"
        );

    const transport =
        selectedButton?.dataset.transport ||
        "transit";

    const modeMap = {
        transit: "TRANSIT",
        walking: "WALKING",
        driving: "DRIVING"
    };

    return modeMap[transport] || "TRANSIT";
}


function isCurrentLocationText(value) {
    const normalized =
        String(value || "")
            .trim()
            .replace(/\s+/g, "")
            .toLowerCase();

    return [
        "현재위치",
        "현재지",
        "currentlocation",
        "現在地"
    ].includes(normalized);
}


function getCurrentPositionForRoute() {
    return Promise.resolve({
        ...TOKYO_STATION_POSITION
    });
}



async function geocodeRouteLocation(value) {
    if (
        value &&
        typeof value === "object" &&
        Number.isFinite(Number(value.lat)) &&
        Number.isFinite(Number(value.lng))
    ) {
        return {
            lat: Number(value.lat),
            lng: Number(value.lng)
        };
    }

    const text = String(value || "").trim();

    if (!text) {
        throw new Error("EMPTY_ROUTE_LOCATION");
    }

    /*
        NAVITIME은 위경도 좌표가 필요하므로 Google Geocoder로 변환한다.
        도보/자동차(Google Routes)도 좌표를 그대로 사용할 수 있다.
    */
    if (typeof google === "undefined" || !google.maps?.Geocoder) {
        throw new Error("GEOCODE_UNAVAILABLE");
    }

    const geocoder = new google.maps.Geocoder();
    const query = /japan|日本|東京都|東京|都|道|府|県/i.test(text)
        ? text
        : `${text}, Japan`;

    const response = await geocoder.geocode({
        address: query,
        region: "jp",
        language: routeLocale()
    });

    const location = response?.results?.[0]?.geometry?.location;
    if (!location) {
        throw new Error("GEOCODE_NOT_FOUND");
    }

    return {
        lat: location.lat(),
        lng: location.lng()
    };
}

function toNavitimeCoord(value) {
    if (
        value &&
        typeof value === "object" &&
        Number.isFinite(Number(value.lat)) &&
        Number.isFinite(Number(value.lng))
    ) {
        return `${Number(value.lat)},${Number(value.lng)}`;
    }
    throw new Error("GEOCODE_NOT_FOUND");
}

function formatNavitimeStartTime(date = new Date()) {
    const tokyo = new Date(
        date.toLocaleString("en-US", { timeZone: "Asia/Tokyo" })
    );
    const pad = n => String(n).padStart(2, "0");
    return [
        tokyo.getFullYear(),
        "-",
        pad(tokyo.getMonth() + 1),
        "-",
        pad(tokyo.getDate()),
        "T",
        pad(tokyo.getHours()),
        ":",
        pad(tokyo.getMinutes()),
        ":",
        pad(tokyo.getSeconds())
    ].join("");
}

function coordsToLatLngPath(coordinates) {
    const path = [];
    const pushCoord = coord => {
        if (!Array.isArray(coord) || coord.length < 2) return;
        const lng = Number(coord[0]);
        const lat = Number(coord[1]);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
        path.push({ lat, lng });
    };

    if (!Array.isArray(coordinates)) return path;

    // LineString: [[lng,lat], ...]
    if (coordinates.length && !Array.isArray(coordinates[0]?.[0])) {
        coordinates.forEach(pushCoord);
        return path;
    }

    // MultiLineString: [[[lng,lat], ...], ...]
    coordinates.forEach(line => {
        (line || []).forEach(pushCoord);
    });
    return path;
}

function extractCoordFromNavitimeSection(section) {
    const lat = Number(section?.coord?.lat);
    const lng = Number(section?.coord?.lon ?? section?.coord?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
}

function haversineMeters(a, b) {
    if (!a || !b) return Infinity;
    const toRad = deg => (deg * Math.PI) / 180;
    const earthRadius = 6371000;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const h =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 2 * earthRadius * Math.asin(Math.min(1, Math.sqrt(h)));
}

function createNavitimeWalkBridge(from, to) {
    return {
        path: [from, to],
        isWalk: true,
        color: "#4285F4",
        outlineColor: "#FFFFFF",
        transportType: "",
        isBridge: true
    };
}

function extractNavitimeEndpoint(pointLike) {
    const lat = Number(pointLike?.coord?.lat ?? pointLike?.lat);
    const lng = Number(
        pointLike?.coord?.lon ??
        pointLike?.coord?.lng ??
        pointLike?.lon ??
        pointLike?.lng
    );
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
}

function extractNavitimeWalkSegmentsFromSections(item) {
    const sections = Array.isArray(item?.sections) ? item.sections : [];
    const segments = [];

    for (let i = 0; i < sections.length; i += 1) {
        const section = sections[i];
        if (String(section?.type || "").toLowerCase() !== "move") continue;
        if (String(section?.move || "").toLowerCase() !== "walk") continue;

        const from = extractCoordFromNavitimeSection(sections[i - 1]);
        const to = extractCoordFromNavitimeSection(sections[i + 1]);
        if (!from || !to) continue;

        segments.push({
            path: [from, to],
            isWalk: true,
            color: "#4285F4",
            outlineColor: "#FFFFFF",
            transportType: ""
        });
    }

    return segments;
}

/*
    NAVITIME 철도 shape는 역·출구·환승 지점에서 끊기는 경우가 많다.
    끊긴 구간은 도보 점선으로 이어 출발지~지하철~도착지가 이어지게 한다.
*/
function bridgeNavitimePathGaps(segments, item) {
    const GAP_METERS = 18;
    const source = Array.isArray(segments) ? segments.filter(Boolean) : [];
    if (!source.length) return [];

    const bridged = [];
    const startPoint =
        extractNavitimeEndpoint(item?.summary?.start) ||
        extractCoordFromNavitimeSection(
            (item?.sections || []).find(section => section?.type === "point")
        );
    const goalPoint =
        extractNavitimeEndpoint(item?.summary?.goal) ||
        extractCoordFromNavitimeSection(
            [...(item?.sections || [])].reverse().find(section => section?.type === "point")
        );

    const firstPoint = source[0]?.path?.[0];
    if (
        startPoint &&
        firstPoint &&
        haversineMeters(startPoint, firstPoint) > GAP_METERS
    ) {
        bridged.push(createNavitimeWalkBridge(startPoint, firstPoint));
    }

    source.forEach((segment, index) => {
        if (index > 0) {
            const prevPath = source[index - 1]?.path || [];
            const currPath = segment?.path || [];
            const prevEnd = prevPath[prevPath.length - 1];
            const currStart = currPath[0];
            if (
                prevEnd &&
                currStart &&
                haversineMeters(prevEnd, currStart) > GAP_METERS
            ) {
                bridged.push(createNavitimeWalkBridge(prevEnd, currStart));
            }
        }
        bridged.push(segment);
    });

    const lastPath = source[source.length - 1]?.path || [];
    const lastPoint = lastPath[lastPath.length - 1];
    if (
        goalPoint &&
        lastPoint &&
        haversineMeters(lastPoint, goalPoint) > GAP_METERS
    ) {
        bridged.push(createNavitimeWalkBridge(lastPoint, goalPoint));
    }

    return bridged;
}

function extractNavitimePathSegments(item) {
    const features = item?.shapes?.features || [];
    const segments = [];

    for (const feature of features) {
        const geometry = feature?.geometry;
        if (!geometry) continue;

        const path = coordsToLatLngPath(geometry.coordinates);
        if (path.length < 2) continue;

        const properties = feature?.properties || {};
        const ways = String(properties.ways || "").toLowerCase();
        const inline = properties.inline || {};
        const outline = properties.outline || {};
        const lineStyle = String(inline.line_style || "").toLowerCase();
        const transportType = String(properties.transport_type || "").toLowerCase();

        // walk: 실제 도보 / auxiliary: 출발·도착 연결 보조선
        // transport_type이 있는 철도 구간은 실선으로 유지한다.
        const isWalk =
            ways === "walk" ||
            (lineStyle === "auxiliary" && !transportType && ways !== "transport");

        segments.push({
            path,
            isWalk,
            color: isWalk
                ? "#4285F4"
                : String(inline.color || properties.color || "#4285F4"),
            outlineColor: isWalk
                ? "#FFFFFF"
                : String(outline.color || "#FFFFFF"),
            transportType
        });
    }

    const hasWalkShape = segments.some(segment => segment.isWalk);
    if (!hasWalkShape) {
        // shape에 도보가 없으면 sections의 walk 구간으로 최소한의 도보선을 보완한다.
        segments.push(...extractNavitimeWalkSegmentsFromSections(item));
    }

    if (!segments.length) {
        // shape가 없으면 구간 좌표로 단일 선 구성
        const fallbackPath = [];
        for (const section of item?.sections || []) {
            const point = extractCoordFromNavitimeSection(section);
            if (point) fallbackPath.push(point);
        }

        if (fallbackPath.length >= 2) {
            return [{
                path: fallbackPath,
                isWalk: false,
                color: "#4285F4",
                outlineColor: "#FFFFFF",
                transportType: ""
            }];
        }

        return [];
    }

    return bridgeNavitimePathGaps(segments, item);
}

function extractNavitimePath(item) {
    return extractNavitimePathSegments(item).flatMap(segment => segment.path);
}

function getNavitimeTotalFareYen(item) {
    const move = item?.summary?.move || {};
    const reference = move.reference_fare || {};

    if (Number.isFinite(Number(reference.lowest_total_ic))) {
        return Number(reference.lowest_total_ic);
    }
    if (Number.isFinite(Number(reference.lowest_total_ticket))) {
        return Number(reference.lowest_total_ticket);
    }

    const fare = move.fare || {};
    if (Number.isFinite(Number(fare.unit_48))) return Number(fare.unit_48);
    if (Number.isFinite(Number(fare.unit_0))) return Number(fare.unit_0);

    return null;
}

function isNavitimeTransitMove(section) {
    if (String(section?.type || "").toLowerCase() !== "move") return false;
    const moveType = String(section?.move || "").toLowerCase();
    if (!moveType || moveType === "walk") return false;
    return Boolean(section?.transport || section?.line_name);
}

function getNavitimeSectionName(section) {
    const name = String(section?.name || "").trim();
    if (!name || name === "start" || name === "goal") {
        return "";
    }
    return name;
}

function getNavitimeLineDisplayName(section) {
    const transport = section?.transport || {};
    const selfName = String(transport.self_name || "").trim();
    if (selfName) return selfName;

    const lineName = String(
        section?.line_name ||
        transport.name ||
        transport.links?.[0]?.name ||
        ""
    ).trim();

    if (lineName) return lineName;
    return rt("대중교통", "公共交通", "Transit");
}

function buildNavitimeTransitStepDetails(item) {
    const sections = Array.isArray(item?.sections) ? item.sections : [];
    const details = [];
    const steps = [];

    for (let i = 0; i < sections.length; i += 1) {
        const section = sections[i];
        if (!isNavitimeTransitMove(section)) continue;

        const transport = section.transport || {};
        const link = Array.isArray(transport.links) ? transport.links[0] : null;
        const prevPoint = sections[i - 1]?.type === "point" ? sections[i - 1] : null;
        const nextPoint = sections[i + 1]?.type === "point" ? sections[i + 1] : null;

        const fromName =
            getNavitimeSectionName(prevPoint) ||
            String(link?.from?.name || "").trim() ||
            rt("승차", "乗車", "Board");

        const toName =
            getNavitimeSectionName(nextPoint) ||
            String(link?.to?.name || "").trim() ||
            rt("하차", "降車", "Alight");

        const lineName = getNavitimeLineDisplayName(section);
        const headsign = String(
            transport.destination?.name ||
            link?.destination?.name ||
            ""
        ).trim();
        const trainType = String(transport.type || "").trim();

        const parts = [
            lineName,
            trainType && trainType !== lineName ? trainType : "",
            headsign ? rt(`${headsign}행`, `${headsign}行`, `to ${headsign}`) : "",
            `${fromName} → ${toName}`
        ].filter(Boolean);

        details.push(parts.join(" · "));

        steps.push({
            travelMode: "TRANSIT",
            transitDetails: {
                headsign: `${fromName} → ${toName}`,
                line: {
                    name: lineName,
                    shortName: trainType || link?.name || "",
                    vehicle: {
                        name: String(section.move || "transit")
                    }
                }
            }
        });
    }

    return { details, steps };
}

function normalizeNavitimeRoute(item) {
    const move = item?.summary?.move || {};
    const timeMinutes = Number(move.time) || 0;
    const distanceMeters = Number(move.distance) || 0;
    const fareYen = getNavitimeTotalFareYen(item);
    const transferCount = Number(move.transit_count);
    const pathSegments = extractNavitimePathSegments(item);
    const path = pathSegments.flatMap(segment => segment.path);
    const { details, steps } = buildNavitimeTransitStepDetails(item);

    const durationText = timeMinutes > 0
        ? (currentLanguage === "ko"
            ? `${timeMinutes}분`
            : currentLanguage === "ja"
                ? `${timeMinutes}分`
                : `${timeMinutes} min`)
        : "-";

    const distanceText = distanceMeters >= 1000
        ? `${(distanceMeters / 1000).toFixed(1)} km`
        : distanceMeters > 0
            ? `${Math.round(distanceMeters)} m`
            : "-";

    return {
        provider: "navitime",
        path,
        pathSegments,
        durationMillis: timeMinutes * 60_000,
        distanceMeters,
        transitTransferCount: Number.isFinite(transferCount)
            ? Math.max(0, transferCount)
            : Math.max(0, steps.length - 1),
        transitStepDetails: details,
        fare: Number.isFinite(fareYen)
            ? { value: fareYen, currency: "JPY" }
            : null,
        localizedValues: {
            duration: durationText,
            distance: distanceText
        },
        legs: [
            {
                steps,
                durationMillis: timeMinutes * 60_000,
                localizedValues: {
                    duration: durationText,
                    distance: distanceText
                }
            }
        ],
        navitimeItem: item
    };
}

async function fetchNavitimeTransitRoutes(origin, destination) {
    const start = toNavitimeCoord(origin);
    const goal = toNavitimeCoord(destination);
    const startTime = formatNavitimeStartTime(new Date());

    const query = new URLSearchParams({
        start,
        goal,
        startTime
    });

    const data = await apiRequest(`/api/route/transit?${query.toString()}`);
    const items = Array.isArray(data?.items) ? data.items : [];
    return items.map(normalizeNavitimeRoute);
}


function normalizeGoogleRouteLocation(value) {
    if (
        value &&
        typeof value === "object"
    ) {
        return value;
    }

    const text = String(value || "").trim();
    if (!text) return text;

    // 짧은 장소명은 Google이 다른 국가로 해석할 수 있으므로
    // 일본 지도 서비스에서는 국가 힌트를 붙여 정확도를 높인다.
    if (/japan|日本|東京都|東京|都|道|府|県/i.test(text)) {
        return text;
    }

    return `${text}, Japan`;
}

async function resolveRouteOrigin(startPoint) {
    if (
        !startPoint ||
        isCurrentLocationText(startPoint) ||
        startPoint === "도쿄역" ||
        startPoint === "東京駅"
    ) {
        return {
            ...TOKYO_STATION_POSITION
        };
    }

    return geocodeRouteLocation(startPoint);
}


async function resolveRouteDestination(endPoint) {
    return geocodeRouteLocation(endPoint);
}


function clearRenderedRoute() {
    routePolylines.forEach(polyline => {
        if (!polyline) return;

        if (typeof polyline.setMap === "function") {
            polyline.setMap(null);
        } else if ("map" in polyline) {
            polyline.map = null;
        }
    });

    routeMarkers.forEach(marker => {
        if (!marker) return;

        if (typeof marker.setMap === "function") {
            marker.setMap(null);
        } else if ("map" in marker) {
            marker.map = null;
        }
    });

    routePolylines = [];
    routeMarkers = [];
}


// mr.eum수정부분
// 도보/자동차 경로 시간을 현재 선택된 언어에 맞춰 표시합니다.
function getRouteDurationText(route) {
    const localizedDuration =
        route?.localizedValues?.duration ||
        route?.legs?.[0]?.localizedValues?.duration;

    if (localizedDuration) return localizedDuration;

    const durationMillis = Number(route?.durationMillis);
    const legacyDurationSeconds =
        (route?.legs || []).reduce(
            (total, leg) => total + Number(leg?.duration?.value || 0),
            0
        );

    const totalMinutes =
        Number.isFinite(durationMillis) && durationMillis > 0
            ? Math.max(1, Math.round(durationMillis / 60000))
            : legacyDurationSeconds > 0
                ? Math.max(1, Math.round(legacyDurationSeconds / 60))
                : 0;

    if (!totalMinutes) return "-";

    // mr.eum수정부분
    // Google Routes API와 DirectionsService 결과를 모두 표시합니다.
    return currentLanguage === "ko"
        ? `${totalMinutes}분`
        : currentLanguage === "ja"
            ? `${totalMinutes}分`
            : `${totalMinutes} min`;
}


// mr.eum수정부분
// 도보/자동차 경로 거리를 Google 결과에 맞춰 표시합니다.
function getRouteDistanceText(route) {
    const localizedDistance =
        route?.localizedValues?.distance ||
        route?.legs?.[0]?.localizedValues?.distance;

    if (localizedDistance) return localizedDistance;

    const distanceMeters = Number(route?.distanceMeters);
    const legacyDistanceMeters =
        (route?.legs || []).reduce(
            (total, leg) => total + Number(leg?.distance?.value || 0),
            0
        );

    const meters =
        Number.isFinite(distanceMeters) && distanceMeters > 0
            ? distanceMeters
            : legacyDistanceMeters;

    if (!Number.isFinite(meters) || meters <= 0) return "-";

    return meters >= 1000
        ? `${(meters / 1000).toFixed(1)} km`
        : `${Math.round(meters)} m`;
}


// mr.eum수정부분
// 도보 / 자동차 경로에서 실제 출발지와 도착지 이름을 가져온다.
// =====================================================
function getRoutePlaceNames(route) {
    /*
        Google Routes API의 startLocation / endLocation은
        좌표 정보이지 장소명이 아닙니다.

        따라서 화면에 표시할 출발지/도착지 이름은 사용자가 입력한
        값을 우선 사용합니다. POI에서 길찾기를 시작한 경우에도
        input에 실제 장소명이 들어 있으므로 동일하게 처리합니다.
    */
    const startInput =
        document.getElementById("startPoint")?.value?.trim();

    const endInput =
        document.getElementById("endPoint")?.value?.trim();

    const leg = route?.legs?.[0];

    return {
        start:
            startInput ||
            route?.originName ||
            leg?.startAddress ||
            rt("출발지", "出発地", "Origin"),

        end:
            endInput ||
            route?.destinationName ||
            leg?.endAddress ||
            rt("도착지", "目的地", "Destination")
    };
}


/* =====================================================
   도보 상세 경로
   ===================================================== */

// mr.eum수정부분
// Google Routes가 현재 언어로 반환한 도보 상세 안내를 그대로 사용합니다.
function getWalkingStepDetails(route) {
    const steps =
        route?.legs?.flatMap(leg => leg?.steps || []) || [];

    return steps
        .filter(step => {
            const mode =
                String(step?.travelMode || "").toUpperCase();

            return (
                !mode ||
                mode === "WALKING" ||
                mode === "WALK"
            );
        })
        .map((step, index) => {
            const instruction =
                step?.instructions ||
                step?.navigationInstruction?.instructions ||
                "";

            const maneuver =
                step?.maneuver ||
                step?.navigationInstruction?.maneuver ||
                "";

            const distanceMeters =
                Number(step?.distanceMeters);

            const distanceText =
                step?.localizedValues?.distance ||
                (
                    Number.isFinite(distanceMeters)
                        ? distanceMeters >= 1000
                            ? `${(distanceMeters / 1000).toFixed(1)} km`
                            : `${Math.round(distanceMeters)} m`
                        : ""
                );

            return {
                index: index + 1,
                instruction:
                    String(instruction).trim(),
                maneuver:
                    String(maneuver).trim(),
                distanceText:
                    String(distanceText).trim()
            };
        })
        .filter(
            step =>
                step.instruction ||
                step.distanceText
        );
}


function getWalkingManeuverIcon(maneuver = "") {
    const value = String(maneuver).toUpperCase();

    if (value.includes("LEFT")) return "ti-arrow-left";
    if (value.includes("RIGHT")) return "ti-arrow-right";
    if (value.includes("UTURN") || value.includes("U_TURN")) return "ti-arrow-back-up";
    if (value.includes("ROUNDABOUT")) return "ti-rotate-clockwise";
    if (value.includes("MERGE")) return "ti-arrows-join";
    if (value.includes("FORK")) return "ti-git-branch";
    if (value.includes("DEPART") || value.includes("START")) return "ti-map-pin";
    if (value.includes("ARRIVE") || value.includes("END")) return "ti-flag";

    return "ti-arrow-up";
}


function getWalkingInstructionText(step) {
    const raw = String(step?.instruction || "").trim();

    if (!raw) {
        return rt(
            "계속 이동하세요",
            "そのまま進んでください",
            "Continue straight"
        );
    }

    // Google Routes API가 현재 언어로 제공한 안내 문구를 그대로 사용합니다.
    return raw.replace(/<[^>]*>/g, "").trim();
}


function escapeWalkingText(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function renderWalkingStepDetails(route) {
    const steps = getWalkingStepDetails(route);

    if (!steps.length) {
        return `
            <div class="walking-step-empty">
                ${escapeWalkingText(
                    rt(
                        "상세 도보 안내가 없습니다.",
                        "詳細な徒歩案内はありません。",
                        "Detailed walking instructions are unavailable."
                    )
                )}
            </div>
        `;
    }

    const names = getRoutePlaceNames(route);

    return `
        <div class="walking-step-details">
            <div class="walking-step-endpoint">
                <span class="walking-step-dot"></span>
                <strong>${escapeWalkingText(names.start)}</strong>
            </div>

            <div class="walking-step-list">
                ${steps.map(step => `
                    <div class="walking-step-item">
                        <span class="walking-step-icon">
                            <i class="ti ${getWalkingManeuverIcon(step.maneuver)}" aria-hidden="true"></i>
                        </span>

                        <div class="walking-step-content">
                            <span class="walking-step-instruction">
                                ${escapeWalkingText(getWalkingInstructionText(step))}
                            </span>

                            ${step.distanceText ? `
                                <span class="walking-step-distance">
                                    ${escapeWalkingText(step.distanceText)}
                                </span>
                            ` : ""}
                        </div>
                    </div>
                `).join("")}
            </div>

            <div class="walking-step-endpoint">
                <span class="walking-step-dot"></span>
                <strong>${escapeWalkingText(names.end)}</strong>
            </div>
        </div>
    `;
}

// mr.eum수정부분
// 자동차 경로도 도보와 동일한 방식으로 단계별 길안내를 표시합니다.
function renderDrivingStepDetails(route) {
    const steps =
        route?.legs?.flatMap(leg => leg?.steps || []) || [];

    const drivingSteps = steps
        .filter(step => {
            const mode =
                String(step?.travelMode || "").toUpperCase();

            return (
                !mode ||
                mode === "DRIVING" ||
                mode === "DRIVE"
            );
        })
        .map(step => {
            const instruction =
                step?.instructions ||
                step?.navigationInstruction?.instructions ||
                "";

            const maneuver =
                step?.maneuver ||
                step?.navigationInstruction?.maneuver ||
                "";

            const distanceMeters =
                Number(step?.distanceMeters);

            const distanceText =
                step?.localizedValues?.distance ||
                (
                    Number.isFinite(distanceMeters)
                        ? distanceMeters >= 1000
                            ? `${(distanceMeters / 1000).toFixed(1)} km`
                            : `${Math.round(distanceMeters)} m`
                        : ""
                );

            return {
                instruction:
                    String(instruction)
                        .replace(/<[^>]*>/g, "")
                        .trim(),

                maneuver:
                    String(maneuver).trim(),

                distanceText:
                    String(distanceText).trim()
            };
        })
        .filter(step =>
            step.instruction ||
            step.distanceText
        );

    if (!drivingSteps.length) {
        return `
            <div class="walking-step-empty">
                ${escapeWalkingText(
                    rt(
                        "상세 자동차 안내가 없습니다.",
                        "詳細な自動車案内はありません。",
                        "Detailed driving instructions are unavailable."
                    )
                )}
            </div>
        `;
    }

    const names =
        getRoutePlaceNames(route);

    return `
        <div class="walking-step-details">
            <div class="walking-step-endpoint">
                <span class="walking-step-dot"></span>
                <strong>
                    ${escapeWalkingText(names.start)}
                </strong>
            </div>

            <div class="walking-step-list">
                ${drivingSteps.map(step => `
                    <div class="walking-step-item">

                        <span class="walking-step-icon">
                            <i
                                class="ti ${getWalkingManeuverIcon(step.maneuver)}"
                                aria-hidden="true"
                            ></i>
                        </span>

                        <div class="walking-step-content">

                            <span class="walking-step-instruction">
                                ${escapeWalkingText(step.instruction)}
                            </span>

                            ${step.distanceText ? `
                                <span class="walking-step-distance">
                                    ${escapeWalkingText(step.distanceText)}
                                </span>
                            ` : ""}

                        </div>
                    </div>
                `).join("")}
            </div>

            <div class="walking-step-endpoint">
                <span class="walking-step-dot"></span>
                <strong>
                    ${escapeWalkingText(names.end)}
                </strong>
            </div>
        </div>
    `;
}

// mr.eum수정부분
// 자동차 경로의 통행료를 Google Routes API 응답에서 가져옵니다.
// mr.eum수정부분
// Google Routes JS SDK의 Route 객체에서 자동차 통행료를 읽습니다.
// 공식 응답 필드는 travelAdvisory.tollInfo.estimatedPrices(복수형)입니다.
function getDrivingTollText(route) {
    const tollInfo =
        route?.travelAdvisory?.tollInfo
        || route?.legs?.[0]?.travelAdvisory?.tollInfo;

    if (!tollInfo) {
        return "";
    }

    // Google Routes JS SDK의 실제 tollInfo 구조를 확인하기 위한 로그
    console.log("MR.EUM 통행료 tollInfo =", tollInfo);
    console.log(
        "MR.EUM 통행료 estimatedPrices =",
        tollInfo?.estimatedPrices
    );
    console.log(
        "MR.EUM 통행료 estimatedPrice =",
        tollInfo?.estimatedPrice
    );

    const estimatedPrices =
        Array.isArray(tollInfo.estimatedPrices)
            ? tollInfo.estimatedPrices
            : Array.isArray(tollInfo.estimatedPrice)
                ? tollInfo.estimatedPrice
                : [];

    if (!estimatedPrices.length) {
        return rt(
            "통행료 정보 확인 필요",
            "通行料金情報を確認してください",
            "Toll information unavailable"
        );
    }

    const price = estimatedPrices[0];

    const units = Number(price?.units ?? 0);
    const nanos = Number(price?.nanos ?? 0);

    if (!Number.isFinite(units) || !Number.isFinite(nanos)) {
        return rt(
            "통행료 정보 확인 필요",
            "通行料金情報を確認してください",
            "Toll information unavailable"
        );
    }

    const numericPrice = units + nanos / 1e9;

    const currency =
        String(price?.currencyCode || "JPY").trim();

    // 일본 엔화는 소수점 없이 표시
    if (currency === "JPY") {
        return `${Math.round(numericPrice).toLocaleString()}円`;
    }

    try {
        return new Intl.NumberFormat(
            currentLanguage === "ko"
                ? "ko-KR"
                : currentLanguage === "ja"
                    ? "ja-JP"
                    : "en-US",
            {
                style: "currency",
                currency
            }
        ).format(numericPrice);
    } catch (error) {
        return `${currency} ${numericPrice}`;
    }
}

// mr.eum수정부분
function renderRouteResults(
    routes,
    routeStartTime = new Date()
) {
    if (!routeResult) {
        return;
    }

    const visibleRoutes = Array.isArray(routes)
        ? routes.slice(0, 5)
        : [];

    if (!visibleRoutes.length) {
        routeResult.innerHTML = "";
        routeResult.classList.remove("show");
        return;
    }

    // mr.eum수정부분
    // 추천 경로와 대안 경로를 별도 버튼 없이 처음부터 모두 표시합니다.
    routeResult.innerHTML = visibleRoutes
        .map((route, index) => {
            const isRecommended = index === 0;
            const travelMode = getSelectedTravelMode();
            const isWalking =
                travelMode === "WALKING";
            const isTransit =
                travelMode === "TRANSIT";

            const names = getRoutePlaceNames(route);

            const durationText =
                getRouteDurationText(route);

            const distanceText =
                getRouteDistanceText(route);

            // mr.eum수정부분
            // 자동차 경로에만 통행료 정보를 표시합니다.
            const tollText =
                travelMode === "DRIVING"
                    ? getDrivingTollText(route)
                    : "";
            
            // mr.eum수정부분
            // 한 번의 길찾기 결과에 포함된 모든 경로가 동일한 출발 시각을 사용하도록 합니다.
            const cardStartTime =
            routeStartTime || new Date();
            const routeDurationMillis =
                Number(route?.durationMillis)
                || Number(route?.legs?.[0]?.durationMillis)
                || Number(route?.duration?.seconds) * 1000
                || Number(route?.duration?.value) * 1000
                || 0;

            const routeEndTime = new Date(
                cardStartTime.getTime() + routeDurationMillis
            );

            const formatRouteClockTime = date => {
                return date.toLocaleTimeString(
                    currentLanguage === "en"
                        ? "en-US"
                        : currentLanguage === "ko"
                            ? "ko-KR"
                            : "ja-JP",
                    {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false
                    }
                );
            };

            // mr.eum수정부분
            // 모든 경로 카드에서 동일한 출발 시각을 표시하고 경로별 도착 시각만 다르게 표시합니다.
            const routeTimeText =
                isTransit &&
                route?.__navitime &&
                route?.navitimeFromTime &&
                route?.navitimeToTime
                    ? `${navitimeClockText(route.navitimeFromTime)} → ${navitimeClockText(route.navitimeToTime)}`
                    : `${formatRouteClockTime(cardStartTime)} → ${formatRouteClockTime(routeEndTime)}`;
            const routeLabel = isRecommended
                ? rt(
                    "추천",
                    "おすすめ",
                    "Recommended"
                )
                : rt(
                    `대안 ${index + 1}`,
                    `候補 ${index + 1}`,
                    `Option ${index + 1}`
                );

            // mr.eum수정부분
            // NAVITIME TRANSIT 경로에서는 실제 노선명과 환승 횟수를 표시합니다.
            const transitStepDetails = isTransit ? getGoogleTransitStepDetails(route) : [];
            const transitTransferCount = isTransit ? getGoogleTransitTransferCount(route) : 0;
            const transitFareText = isTransit ? getGoogleTransitFareText(route) : "";

            const transitLineSummary =
                isTransit &&
                route?.__navitime
                    ? getNavitimeTransitLineSummary(route)
                    : "";

            const lineText = isWalking
                ? `${names.start} → ${names.end}`
                : isTransit
                    ? `${names.start} → ${names.end}`
                    : rt("자동차 경로", "自動車ルート", "Driving route");

            // mr.eum수정부분
            // 이동수단에 맞는 상세 안내를 표시합니다.
            const details = isWalking
                ? renderWalkingStepDetails(route)
                : isTransit
<<<<<<< HEAD
                    ? (
                        route?.__navitime
                            ? renderNavitimeTransitDetails(route)
                            : (
                                transitStepDetails.length
                                    ? `<div class="transit-route-details"><div class="transit-detail-timeline">${transitStepDetails.map(item => `<div class="transit-detail-leg"><span class="transit-ride-meta">${escapeWalkingText(item)}</span></div>`).join("")}</div></div>`
                                    : ""
                            )
                    )
=======
                    ? (transitStepDetails.length
                        ? `<div class="transit-route-details"><div class="transit-detail-timeline">${transitStepDetails.map((item, stepIndex) => `<div class="transit-detail-leg"><span class="transit-ride-meta">${escapeWalkingText(item)}</span>${stepIndex < transitStepDetails.length - 1 ? `<span class="transit-transfer-hint">${escapeWalkingText(rt("환승", "乗換", "Transfer"))}</span>` : ""}</div>`).join("")}</div></div>`
                        : "")
>>>>>>> 0119ed4f96786e0ae7155a7232c3593ebe38634c
                    : renderDrivingStepDetails(route);

            return `
                <button
                    type="button"
                    class="route-option simple-route-option${isRecommended ? " active expanded" : ""}"
                    data-route-index="${index}"
                    aria-expanded="${isRecommended ? "true" : "false"}"
                >
                    <div class="route-summary">
                        <div class="route-summary-main">
                            <strong>
                                ${escapeWalkingText(durationText)}
                            </strong>

                            <span class="route-recommend-badge">
                                ${routeLabel}
                            </span>
                        </div>

                        <span class="route-summary-time">
                            <span class="route-summary-clock">
                                ${escapeWalkingText(routeTimeText)}
                            </span>
                            <b>·</b>
                            <span>
                                ${escapeWalkingText(distanceText)}
                            </span>
                            ${isTransit ? `
                                <b>·</b>
                                <span>${escapeWalkingText(
                                    rt(
                                        `환승 ${transitTransferCount}회`,
                                        `乗換 ${transitTransferCount}回`,
                                        `${transitTransferCount} transfer${transitTransferCount === 1 ? "" : "s"}`
                                    )
                                )}</span>
                            ` : ""}
                        </span>
                    </div>

                    <div class="route-line">
                        <span class="route-mode-icon">
                            <i
                                class="ti ${isWalking ? "ti-walk" : isTransit ? "ti-train" : "ti-car"}"
                                aria-hidden="true"
                            ></i>
                        </span>

                        <div class="route-line-chips">
                            <span class="route-line-primary">
                                ${escapeWalkingText(lineText)}
                            </span>

                            ${
                                isTransit &&
                                transitLineSummary
                                    ? `
                                        <small class="route-line-secondary">
                                            ${escapeWalkingText(transitLineSummary)}
                                        </small>
                                    `
                                    : ""
                            }
                        </div>

                        <i
                            class="ti ti-chevron-down simple-route-chevron"
                            aria-hidden="true"
                        ></i>
                    </div>

                    <div class="simple-route-details">

                        ${details}

                        
                        

                        ${tollText ? `
                            <div class="driving-toll">

                                <span class="driving-toll-label">
                                    ${escapeWalkingText(
                                        rt(
                                            "통행료",
                                            "通行料金",
                                            "Toll"
                                        )
                                    )}
                                </span>

                                <strong class="driving-toll-price">
                                    ${escapeWalkingText(tollText)}
                                </strong>

                            </div>
                        ` : ""}

                        ${transitFareText && !route?.__navitime ? `
                            <div class="transit-fare">
                                <span class="transit-fare-label">${escapeWalkingText(rt("교통비", "運賃", "Fare"))}</span>
                                <strong class="transit-fare-price">${escapeWalkingText(transitFareText)}</strong>
                            </div>
                        ` : ""}

                    </div>
                </button>
            `;
        })
        .join("");

    routeResult.classList.add("show");

    // mr.eum수정부분
    // 추천 경로는 처음부터 펼치고, 대안 경로는 카드만 표시한 채 상세 내용은 닫습니다.
    routeResult
        .querySelectorAll("[data-route-index]")
        .forEach(button => {
            button.addEventListener("click", () => {
                const index =
                    Number(button.dataset.routeIndex);

                selectRoute(index);
            });
        });
}


async function drawRoute(route, fitViewport = true, travelMode = getSelectedTravelMode()) {
    if (!route || !googleMap) {
        return;
    }

    clearRenderedRoute();

<<<<<<< HEAD
    // NAVITIME TRANSIT은 shape=true 응답의 GeoJSON을 직접 Google Map 위에 그립니다.
    if (
        route?.__navitime &&
        Array.isArray(route?.navitimeShapeSegments) &&
        route.navitimeShapeSegments.length
    ) {
        const bounds =
            new google.maps.LatLngBounds();

        const lines = [];

        route.navitimeShapeSegments.forEach(
            (segment, index) => {
                const path =
                    Array.isArray(segment?.path)
                        ? segment.path
                        : [];

                if (path.length < 2) {
                    return;
                }

                path.forEach(
                    point =>
                        bounds.extend(point)
                );

                const isWalk =
                    segment?.way === "walk";

                if (isWalk) {
                    const walkLine =
                        new google.maps.Polyline({
                            map:
                                googleMap,
                            path,
                            strokeOpacity:
                                0,
                            strokeWeight:
                                0,
                            zIndex:
                                11,
                            icons: [{
                                icon: {
                                    path:
                                        google.maps.SymbolPath.CIRCLE,
                                    fillColor:
                                        "#4285F4",
                                    fillOpacity:
                                        1,
                                    strokeColor:
                                        "#FFFFFF",
                                    strokeOpacity:
                                        0.95,
                                    strokeWeight:
                                        1,
                                    scale:
                                        NAVITIME_WALK_DOT_SCALE
                                },
                                offset:
                                    "0",
                                repeat:
                                    NAVITIME_WALK_DOT_REPEAT
                            }]
                        });

                    lines.push(
                        walkLine
                    );

                    return;
                }

                // NAVITIME shape_color=railway_line에서 내려온
                // inline.color를 실제 대중교통 노선색으로 사용합니다.
                const lineColor =
                    normalizeNavitimeColor(
                        segment?.color,
                        "#5B8DEF"
                    );

                // 확대/축소와 무관하게 화면상 굵기가 일정해 보이도록
                // NAVITIME 응답의 width/outline은 사용하지 않고,
                // 실제 노선색 + 고정 px 굵기 한 줄만 그립니다.
                const routeLine =
                    new google.maps.Polyline({
                        map:
                            googleMap,
                        path,
                        strokeColor:
                            lineColor,
                        strokeOpacity:
                            1,
                        strokeWeight:
                            NAVITIME_ROUTE_STROKE_WEIGHT,
                        zIndex:
                            20 + index
                    });

                lines.push(
                    routeLine
                );
            }
        );

        // Google Maps Polyline strokeWeight는 CSS px 기준이므로
        // 줌 레벨이 바뀌어도 별도 스케일 계산을 하지 않습니다.
        routePolylines =
            lines;

        const startPoint =
            route?.path?.[0] ||
            route?.navitimeShapeSegments?.[0]?.path?.[0];

        if (startPoint) {
            const startMarker =
                await createGoogleStyleRouteMarker({
                    position:
                        startPoint,
                    type:
                        "start",
                    title:
                        rt(
                            "출발지",
                            "出発地",
                            "Origin"
                        ),
                    zIndex:
                        40,
                    clickable:
                        false
                });

            if (startMarker) {
                routeMarkers.push(
                    startMarker
                );
            }
        }

        if (
            fitViewport &&
            !bounds.isEmpty()
        ) {
            googleMap.fitBounds(
                bounds,
                70
            );
        }

        return;
    }

    /*
        길찾기 경로는 Google Maps에 가까운 단순한 블루 계열로 통일한다.
        기존 치즈색 halo/메인선 조합은 떠 보일 수 있어, 흰색 halo + 블루 본선으로 정리한다.
        도보는 같은 톤의 점선으로만 차이를 주고, 출발/도착은 별도 핀으로 구분한다.
    */
    const path = Array.isArray(route.path)
        ? route.path.filter(Boolean)
=======
    const pathSegments = Array.isArray(route.pathSegments)
        ? route.pathSegments.filter(segment => Array.isArray(segment?.path) && segment.path.length >= 2)
>>>>>>> 0119ed4f96786e0ae7155a7232c3593ebe38634c
        : [];

    const path = pathSegments.length
        ? pathSegments.flatMap(segment => segment.path)
        : (Array.isArray(route.path) ? route.path.filter(Boolean) : []);

    if (!path.length) {
        console.warn("Routes API 경로 path가 비어 있습니다.", route);
        return;
    }

    const isWalking = travelMode === "WALKING";
    const polylines = [];

    // NAVITIME: 도보 점선 + 철도 노선색(야마노테=초록 등)으로 구간별 표시
    if (pathSegments.length && (travelMode === "TRANSIT" || route.provider === "navitime")) {
        pathSegments.forEach(segment => {
            if (segment.isWalk) {
                // 도보 모드와 동일한 파란 점선으로 표시한다.
                polylines.push(new google.maps.Polyline({
                    map: googleMap,
                    path: segment.path,
                    strokeOpacity: 0,
                    strokeWeight: 0,
                    zIndex: 12,
                    icons: [{
                        icon: {
                            path: google.maps.SymbolPath.CIRCLE,
                            fillColor: "#4285F4",
                            fillOpacity: 1,
                            strokeColor: "#FFFFFF",
                            strokeOpacity: 0.95,
                            strokeWeight: 1,
                            scale: 4.6
                        },
                        offset: "0",
                        repeat: "14px"
                    }]
                }));
                return;
            }

            polylines.push(new google.maps.Polyline({
                map: googleMap,
                path: segment.path,
                strokeColor: "#FFFFFF",
                strokeOpacity: 0.95,
                strokeWeight: 9,
                zIndex: 9
            }));

            polylines.push(new google.maps.Polyline({
                map: googleMap,
                path: segment.path,
                strokeColor: segment.color || "#4285F4",
                strokeOpacity: 1,
                strokeWeight: 5,
                zIndex: 10
            }));
        });
    } else if (isWalking) {
        polylines.push(new google.maps.Polyline({
            map: googleMap,
            path,
            strokeOpacity: 0,
            strokeWeight: 0,
            zIndex: 10,
            icons: [{
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    fillColor: "#4285F4",
                    fillOpacity: 1,
                    strokeColor: "#FFFFFF",
                    strokeOpacity: 0.95,
                    strokeWeight: 1,
                    scale: 4.6
                },
                offset: "0",
                repeat: "14px"
            }]
        }));
    } else {
        polylines.push(new google.maps.Polyline({
            map: googleMap,
            path,
            strokeColor: "#FFFFFF",
            strokeOpacity: 0.92,
            strokeWeight: 8,
            zIndex: 9
        }));

        polylines.push(new google.maps.Polyline({
            map: googleMap,
            path,
            strokeColor: "#4285F4",
            strokeOpacity: 1,
            strokeWeight: 5,
            zIndex: 10
        }));
    }

    routePolylines = polylines;

    /*
        최종 경로에서도 출발지에만 CHEESE MAP 로고 마커를 표시합니다.
        "출발" 텍스트와 도착지 마커는 제거합니다.
    */
    const startMarker =
        await createGoogleStyleRouteMarker({
            position:
                path[0],

            type:
                "start",

            title:
                currentLanguage === "ko"
                    ? "출발지"
                    : currentLanguage === "ja"
                        ? "出発地"
                        : "Origin",

            zIndex:
                30,

            clickable:
                false
        });

    if (startMarker) {
        routeMarkers.push(
            startMarker
        );
    }

    if (fitViewport) {
        if (route.viewport) {
            googleMap.fitBounds(route.viewport, 70);
        } else {
            const bounds = new google.maps.LatLngBounds();
            path.forEach(point => bounds.extend(point));
            googleMap.fitBounds(bounds, 70);
        }
    }
}


// mr.eum수정부분
// 선택된 도보/자동차 경로를 다시 클릭하면 상세 내용을 접을 수 있도록 합니다.
async function selectRoute(index) {
    const route = computedRoutes[index];

    if (!route) {
        return;
    }

    const buttons =
        routeResult?.querySelectorAll("[data-route-index]");

    const currentButton =
        routeResult?.querySelector(
            `[data-route-index="${index}"]`
        );

    const wasExpanded =
        currentButton?.classList.contains("expanded");

    // mr.eum수정부분
    // 같은 경로를 다시 클릭하면 상세 안내를 접습니다.
    if (wasExpanded) {
        currentButton.classList.remove("expanded");
        currentButton.setAttribute(
            "aria-expanded",
            "false"
        );

        return;
    }

    // 다른 경로를 선택하면 해당 경로를 지도에 표시합니다.
    await drawRoute(
        route,
        true,
        getSelectedTravelMode()
    );

    // mr.eum수정부분
    // 하나의 경로만 선택 및 펼침 상태가 되도록 관리합니다.
    buttons?.forEach(button => {
        const isActive =
            Number(button.dataset.routeIndex) === index;

        button.classList.toggle(
            "active",
            isActive
        );

        button.classList.toggle(
            "expanded",
            isActive
        );

        button.setAttribute(
            "aria-expanded",
            isActive
                ? "true"
                : "false"
        );
    });
}


/* =====================================================
   대중교통 - NAVITIME Route API
===================================================== */


/* =====================================================
   NAVITIME 대중교통 설정
   - WALKING / DRIVING은 기존 Google 유지
   - TRANSIT만 NAVITIME /route_transit 사용
   - 아래 endpoint / apiKey만 발급값에 맞게 입력
===================================================== */

const NAVITIME_ROUTE_STROKE_WEIGHT = 6;
const NAVITIME_WALK_DOT_SCALE = 3.6;
const NAVITIME_WALK_DOT_REPEAT = "13px";

const NAVITIME_TRANSIT_CONFIG = {
    endpoint:
        "https://navitime-route-totalnavi.p.rapidapi.com/route_transit",

    // RapidAPI의 X-RapidAPI-Key 값을 여기에 넣으세요.
    apiKey:
        "96cd9d8512msh98fc1f6e9f54dd6p1fa3c6jsn78dc7efbfba2",

    host:
        "navitime-route-totalnavi.p.rapidapi.com"
};

function getNavitimeLanguage() {
    return currentLanguage === "ko"
        ? "ko"
        : currentLanguage === "en"
            ? "en"
            : "ja";
}

function getNavitimePoint(location) {
    const normalized =
        normalizeGoogleRouteLocation(
            location
        );

    const lat =
        Number(
            normalized?.lat ??
            normalized?.latitude
        );

    const lon =
        Number(
            normalized?.lng ??
            normalized?.lon ??
            normalized?.longitude
        );

    if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lon)
    ) {
        return "";
    }

    return `${lat},${lon}`;
}

function getNavitimeStartTime(date = new Date()) {
    const pad = value =>
        String(value).padStart(2, "0");

    return (
        `${date.getFullYear()}-` +
        `${pad(date.getMonth() + 1)}-` +
        `${pad(date.getDate())}T` +
        `${pad(date.getHours())}:` +
        `${pad(date.getMinutes())}:00`
    );
}

function getNavitimeFareText(route) {
    const moveSummary =
        route?.summary?.move ||
        {};

    const referenceFare =
        moveSummary?.reference_fare ||
        route?.summary?.reference_fare ||
        route?.reference_fare ||
        {};

    const icFare =
        Number(
            referenceFare?.lowest_total_ic
        );

    const ticketFare =
        Number(
            referenceFare?.lowest_total_ticket
        );

    // reference_fare가 없는 응답도 있으므로 summary.move.fare의
    // IC(unit_48) / 일반(unit_0) 운임을 fallback으로 사용합니다.
    const fare =
        moveSummary?.fare ||
        {};

    const summaryIcFare =
        Number(fare?.unit_48);

    const summaryTicketFare =
        Number(fare?.unit_0);

    const amount =
        Number.isFinite(icFare)
            ? icFare
            : Number.isFinite(ticketFare)
                ? ticketFare
                : Number.isFinite(summaryIcFare)
                    ? summaryIcFare
                    : Number.isFinite(summaryTicketFare)
                        ? summaryTicketFare
                        : null;

    return Number.isFinite(amount)
        ? `${Math.round(amount).toLocaleString()}円`
        : "";
}


function navitimeClockText(value) {
    const raw = String(value || "").trim();

    if (!raw) {
        return "";
    }

    const match =
        raw.match(/T(\d{2}):(\d{2})/);

    if (match) {
        return `${match[1]}:${match[2]}`;
    }

    return raw;
}

function navitimeDistanceText(distance) {
    const meters =
        Number(distance);

    if (
        !Number.isFinite(meters) ||
        meters <= 0
    ) {
        return "";
    }

    return meters >= 1000
        ? `${(meters / 1000).toFixed(1)} km`
        : `${Math.round(meters)} m`;
}

function navitimeDurationText(minutes) {
    const value =
        Number(minutes);

    if (
        !Number.isFinite(value) ||
        value <= 0
    ) {
        return "";
    }

    return rt(
        `${Math.round(value)}분`,
        `${Math.round(value)}分`,
        `${Math.round(value)} min`
    );
}

function navitimeFareAmountText(value) {
    const amount =
        Number(value);

    return Number.isFinite(amount)
        ? `${Math.round(amount).toLocaleString()}円`
        : "";
}

function getNavitimeNumbering(point, direction = "departure") {
    const numbering =
        point?.numbering?.[direction];

    if (
        !Array.isArray(numbering) ||
        !numbering.length
    ) {
        return "";
    }

    const item =
        numbering[0] || {};

    return [
        item?.symbol,
        item?.number
    ]
        .filter(Boolean)
        .join("");
}

function getNavitimePointCoord(point) {
    const lat =
        Number(point?.coord?.lat);

    const lng =
        Number(point?.coord?.lon);

    if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lng)
    ) {
        return null;
    }

    return {
        lat,
        lng
    };
}


function normalizeNavitimeColor(
    value,
    fallback = "#5B8DEF"
) {
    const raw =
        String(value || "")
            .trim();

    if (!raw) {
        return fallback;
    }

    if (/^#[0-9a-f]{6}$/i.test(raw)) {
        return raw;
    }

    if (/^[0-9a-f]{6}$/i.test(raw)) {
        return `#${raw}`;
    }

    if (/^rgb\(/i.test(raw)) {
        return raw;
    }

    return fallback;
}


function getNavitimeShapeSegments(shapes) {
    const features =
        Array.isArray(shapes?.features)
            ? shapes.features
            : [];

    return features
        .map(feature => {
            const geometry =
                feature?.geometry || {};

            const coordinates =
                Array.isArray(
                    geometry?.coordinates
                )
                    ? geometry.coordinates
                    : [];

            const path =
                coordinates
                    .map(coord => {
                        if (
                            !Array.isArray(coord) ||
                            coord.length < 2
                        ) {
                            return null;
                        }

                        const lng =
                            Number(coord[0]);

                        const lat =
                            Number(coord[1]);

                        return (
                            Number.isFinite(lat) &&
                            Number.isFinite(lng)
                        )
                            ? { lat, lng }
                            : null;
                    })
                    .filter(Boolean);

            const properties =
                feature?.properties || {};

            const inline =
                properties?.inline || {};

            const outline =
                properties?.outline || {};

            return {
                path,
                way:
                    String(
                        properties?.ways || ""
                    ).toLowerCase(),
                transportType:
                    String(
                        properties?.transport_type ||
                        ""
                    ),
                color:
                    normalizeNavitimeColor(
                        inline?.color,
                        "#5B8DEF"
                    ),
                opacity:
                    Number(
                        inline?.opacity
                    ),
                width:
                    Number(
                        inline?.width
                    ),
                outlineColor:
                    normalizeNavitimeColor(
                        outline?.color,
                        "#FFFFFF"
                    ),
                outlineOpacity:
                    Number(
                        outline?.opacity
                    ),
                outlineWidth:
                    Number(
                        outline?.width
                    )
            };
        })
        .filter(
            segment =>
                segment.path.length >= 2
        );
}

function getNavitimeFallbackPath(sections) {
    return (Array.isArray(sections) ? sections : [])
        .filter(
            section =>
                String(section?.type || "").toLowerCase() === "point"
        )
        .map(getNavitimePointCoord)
        .filter(Boolean);
}

function getNavitimeMoveIcon(move) {
    const value =
        String(move || "").toLowerCase();

    if (value.includes("walk")) {
        return "ti-walk";
    }

    if (
        value.includes("bus") ||
        value.includes("shuttle")
    ) {
        return "ti-bus";
    }

    if (
        value.includes("air") ||
        value.includes("plane")
    ) {
        return "ti-plane";
    }

    return "ti-train";
}

function getNavitimeMoveLabel(section) {
    const move =
        String(section?.move || "").toLowerCase();

    if (move.includes("walk")) {
        return rt("도보", "徒歩", "Walk");
    }

    return (
        section?.lineName ||
        section?.companyName ||
        rt("대중교통", "公共交通", "Transit")
    );
}


function getNavitimeTransitLineSummary(route) {
    const sections =
        Array.isArray(route?.navitimeSections)
            ? route.navitimeSections
            : [];

    const labels = [];

    sections.forEach(section => {
        const move =
            String(section?.move || "")
                .toLowerCase();

        // 상단 요약에서는 도보를 완전히 제외합니다.
        if (move.includes("walk")) {
            return;
        }

        const label =
            String(
                section?.lineName ||
                section?.companyName ||
                ""
            ).trim();

        if (
            label &&
            !labels.includes(label)
        ) {
            labels.push(label);
        }
    });

    return labels.join(" → ");
}


function getNavitimeSectionFareDisplay(
    section
) {
    const move =
        String(
            section?.move || ""
        ).toLowerCase();

    // 도보에는 요금을 표시하지 않습니다.
    if (move.includes("walk")) {
        return "";
    }

    const fare =
        Number(
            section?.fare
        );

    if (
        !Number.isFinite(fare) ||
        fare <= 0
    ) {
        return "";
    }

    /*
        NAVITIME fare_break는 금액이 아니라
        "이 section에서 운임을 계산/출력하는가"를 나타내는 boolean입니다.

        unit_48 = IC 카드 운임
        unit_0  = 일반 운임

        true일 때만 해당 section의 transport.fare를 표시합니다.
    */
    const shouldShowFare =
        section?.fareBreakIc === true ||
        section?.fareBreakTicket === true;

    if (!shouldShowFare) {
        return "";
    }

    return `${Math.round(fare).toLocaleString()}円`;
}

function renderNavitimeTransitDetails(route) {
    const sections =
        Array.isArray(route?.navitimeSections)
            ? route.navitimeSections
            : [];

    if (!sections.length) {
        return "";
    }

    const totalFare =
        getGoogleTransitFareText(route);

    const departureTime =
        navitimeClockText(
            route?.navitimeFromTime
        );

    const arrivalTime =
        navitimeClockText(
            route?.navitimeToTime
        );

    const rows =
        sections.map((section, index) => {
            const nextSection =
                sections[index + 1] || null;

            const nextPlatform =
                String(
                    nextSection?.fromPlatform || ""
                ).trim();

            const moveValue =
                String(
                    section?.move || ""
                ).toLowerCase();

            const isWalk =
                moveValue.includes("walk");

            const duration =
                navitimeDurationText(
                    section?.time
                );

            const distance =
                navitimeDistanceText(
                    section?.distance
                );

            const departure =
                navitimeClockText(
                    section?.fromTime
                );

            const arrival =
                navitimeClockText(
                    section?.toTime
                );

            const fromName =
                section?.fromName ||
                rt("출발지", "出発地", "Origin");

            const toName =
                section?.toName ||
                rt("도착지", "目的地", "Destination");

            const fromAssist =
                getNavitimeStationAssistInfo({
                    platform:
                        section?.fromPlatform,
                    gateway:
                        section?.fromGateway,
                    numbering:
                        section?.fromNumbering
                });

            const toAssist =
                getNavitimeStationAssistInfo({
                    platform:
                        section?.toPlatform,
                    gateway:
                        section?.toGateway,
                    numbering:
                        section?.toNumbering
                });

            const fareText =
                getNavitimeSectionFareDisplay(
                    section
                );

            const lineColor =
                normalizeNavitimeColor(
                    section?.transportColor,
                    "#5B8DEF"
                );

            if (isWalk) {
                return `
                    <div class="navitime-step walk-step">
                        <div class="navitime-step-time">
                            ${escapeWalkingText(departure)}
                        </div>

                        <div class="navitime-step-line">
                            <span class="navitime-step-dot walk">
                                <i class="ti ti-walk"></i>
                            </span>
                            ${
                                index < sections.length - 1
                                    ? `<span class="navitime-step-connector walk"></span>`
                                    : ""
                            }
                        </div>

                        <div class="navitime-step-content">
                            <strong class="navitime-step-place">
                                ${escapeWalkingText(fromName)}
                            </strong>

                            <div class="navitime-walk-summary">
                                <i class="ti ti-walk"></i>
                                <span>${escapeWalkingText(
                                    rt("도보", "徒歩", "Walk")
                                )}</span>
                                ${duration ? `<span>${escapeWalkingText(duration)}</span>` : ""}
                                ${distance ? `<span>${escapeWalkingText(distance)}</span>` : ""}
                            </div>

                            <div class="navitime-arrival">
                                <span>${escapeWalkingText(arrival)}</span>
                                <strong>${escapeWalkingText(toName)}</strong>
                            </div>
                        </div>
                    </div>
                `;
            }

            const lineName =
                getNavitimeMoveLabel(
                    section
                );

            return `
                <div class="navitime-step transit-step">
                    <div class="navitime-step-time">
                        ${escapeWalkingText(departure)}
                    </div>

                    <div class="navitime-step-line">
                        <span
                            class="navitime-step-dot transit"
                            style="--navitime-line-color:${escapeWalkingText(lineColor)}"
                        >
                            <i class="ti ${getNavitimeMoveIcon(section?.move)}"></i>
                        </span>

                        ${
                            index < sections.length - 1
                                ? `
                                    <span
                                        class="navitime-step-connector transit"
                                        style="--navitime-line-color:${escapeWalkingText(lineColor)}"
                                    ></span>
                                `
                                : ""
                        }
                    </div>

                    <div class="navitime-step-content">
                        <div class="navitime-station-row">
                            <strong>${escapeWalkingText(fromName)}</strong>
                            ${
                                fromAssist
                                    ? `
                                        <span class="navitime-station-assist ${fromAssist.type}">
                                            <small>${escapeWalkingText(fromAssist.label)}</small>
                                            <b>${escapeWalkingText(fromAssist.text)}</b>
                                        </span>
                                    `
                                    : ""
                            }
                        </div>

                        <div
                            class="navitime-line-card"
                            style="--navitime-line-color:${escapeWalkingText(lineColor)}"
                        >
                            <span class="navitime-line-swatch"></span>

                            <div class="navitime-line-main">
                                <strong>${escapeWalkingText(lineName)}</strong>

                                ${
                                    section?.destinationName
                                        ? `<span>${escapeWalkingText(
                                            rt(
                                                `${section.destinationName} 방면`,
                                                `${section.destinationName}方面`,
                                                `Toward ${section.destinationName}`
                                            )
                                        )}</span>`
                                        : ""
                                }

                                ${
                                    section?.companyName
                                        ? `<small>${escapeWalkingText(section.companyName)}</small>`
                                        : ""
                                }
                            </div>

                            <div class="navitime-line-meta">
                                ${duration ? `<span>${escapeWalkingText(duration)}</span>` : ""}
                                ${fareText ? `<b>${escapeWalkingText(fareText)}</b>` : ""}
                            </div>
                        </div>

                        <div class="navitime-arrival">
                            <span>${escapeWalkingText(arrival)}</span>
                            <strong>${escapeWalkingText(toName)}</strong>
                            ${
                                toAssist
                                    ? `
                                        <span class="navitime-station-assist ${toAssist.type}">
                                            <small>${escapeWalkingText(toAssist.label)}</small>
                                            <b>${escapeWalkingText(toAssist.text)}</b>
                                        </span>
                                    `
                                    : ""
                            }
                        </div>

                        ${
                            section?.nextTransit
                                ? `
                                    <div class="navitime-transfer-row">
                                        <i class="ti ti-arrows-exchange"></i>
                                        <span>${escapeWalkingText(
                                            nextPlatform
                                                ? rt(
                                                    `환승 · ${nextPlatform}`,
                                                    `乗換 · ${nextPlatform}`,
                                                    `Transfer · ${nextPlatform}`
                                                )
                                                : rt(
                                                    "환승",
                                                    "乗換",
                                                    "Transfer"
                                                )
                                        )}</span>
                                    </div>
                                `
                                : ""
                        }
                    </div>
                </div>
            `;
        })
        .join("");

    return `
        <div class="cheese-transit-detail googlelike navitime-refined">
            <div class="navitime-route-head">
                <strong>${escapeWalkingText(departureTime || "-")}</strong>
                <span>→</span>
                <strong>${escapeWalkingText(arrivalTime || "-")}</strong>

                ${
                    Number(route?.transferCount) >= 0
                        ? `
                            <small>${escapeWalkingText(
                                rt(
                                    `환승 ${route.transferCount}회`,
                                    `乗換 ${route.transferCount}回`,
                                    `${route.transferCount} transfer${Number(route.transferCount) === 1 ? "" : "s"}`
                                )
                            )}</small>
                        `
                        : ""
                }
            </div>

            <div class="navitime-route-steps">
                ${rows}
            </div>

            ${totalFare ? `
                <div class="transit-fare total-only">
                    <span class="transit-fare-label">
                        ${escapeWalkingText(
                            rt(
                                "총 교통비",
                                "合計運賃",
                                "Total fare"
                            )
                        )}
                    </span>

                    <strong class="transit-fare-price">
                        ${escapeWalkingText(totalFare)}
                    </strong>
                </div>
            ` : ""}
        </div>
    `;
}


const NAVITIME_TRANSLATION_CACHE_KEY =
    "cheeseMapNavitimeTranslationV1";

function getNavitimeTranslationTargetLanguage() {
    return currentLanguage === "ko"
        ? "ko"
        : currentLanguage === "en"
            ? "en"
            : "ja";
}

function readNavitimeTranslationCache() {
    try {
        const value =
            JSON.parse(
                localStorage.getItem(
                    NAVITIME_TRANSLATION_CACHE_KEY
                ) || "{}"
            );

        return value &&
            typeof value === "object"
                ? value
                : {};
    } catch (error) {
        return {};
    }
}

function writeNavitimeTranslationCache(cache) {
    try {
        localStorage.setItem(
            NAVITIME_TRANSLATION_CACHE_KEY,
            JSON.stringify(cache || {})
        );
    } catch (error) {
        console.debug(
            "NAVITIME 번역 캐시 저장 실패:",
            error
        );
    }
}

function getNavitimeTranslationCacheKey(
    text,
    targetLanguage
) {
    return `${targetLanguage}:${String(text || "").trim()}`;
}

async function translateNavitimeText(
    text,
    targetLanguage
) {
    const original =
        String(text || "").trim();

    if (
        !original ||
        targetLanguage === "ja"
    ) {
        return original;
    }

    const cache =
        readNavitimeTranslationCache();

    const cacheKey =
        getNavitimeTranslationCacheKey(
            original,
            targetLanguage
        );

    if (
        typeof cache[cacheKey] === "string" &&
        cache[cacheKey].trim()
    ) {
        return cache[cacheKey].trim();
    }

    try {
        const result =
            await apiRequest(
                "/api/translate",
                {
                    method: "POST",
                    body: {
                        text: original,
                        targetLanguage
                    }
                }
            );

        const translatedText =
            String(
                result?.translatedText || ""
            ).trim();

        if (!translatedText) {
            return original;
        }

        cache[cacheKey] =
            translatedText;

        // 포트폴리오용 캐시가 너무 커지지 않게 최근 600개까지만 유지
        const keys =
            Object.keys(cache);

        if (keys.length > 600) {
            keys
                .slice(
                    0,
                    keys.length - 600
                )
                .forEach(key => {
                    delete cache[key];
                });
        }

        writeNavitimeTranslationCache(
            cache
        );

        return translatedText;
    } catch (error) {
        console.warn(
            "NAVITIME 경로명 번역 실패:",
            original,
            error
        );

        // 번역 API 실패 시 원문으로 계속 렌더링
        return original;
    }
}

function getRouteInputLabel(
    type
) {
    const id =
        type === "start"
            ? "startPoint"
            : "endPoint";

    return String(
        document
            .getElementById(id)
            ?.value || ""
    ).trim();
}

function replaceNavitimeEndpointName(
    value,
    type
) {
    const raw =
        String(value || "").trim();

    const lower =
        raw.toLowerCase();

    if (
        type === "start" &&
        (
            lower === "start" ||
            lower === "origin"
        )
    ) {
        return (
            getRouteInputLabel("start") ||
            rt("출발지", "出発地", "Origin")
        );
    }

    if (
        type === "goal" &&
        (
            lower === "goal" ||
            lower === "destination"
        )
    ) {
        return (
            getRouteInputLabel("goal") ||
            rt("도착지", "目的地", "Destination")
        );
    }

    return raw;
}

async function localizeNavitimeRoutes(
    routes
) {
    const targetLanguage =
        getNavitimeTranslationTargetLanguage();

    if (
        targetLanguage === "ja" ||
        !Array.isArray(routes)
    ) {
        // 일본어 UI에서는 NAVITIME 원문 그대로 사용
        return routes;
    }

    for (const route of routes) {
        if (!route?.__navitime) {
            continue;
        }

        const sections =
            Array.isArray(route.navitimeSections)
                ? route.navitimeSections
                : [];

        for (
            let index = 0;
            index < sections.length;
            index += 1
        ) {
            const section =
                sections[index];

            const isFirst =
                index === 0;

            const isLast =
                index === sections.length - 1;

            const rawFromName =
                replaceNavitimeEndpointName(
                    section?.fromName,
                    isFirst
                        ? "start"
                        : ""
                );

            const rawToName =
                replaceNavitimeEndpointName(
                    section?.toName,
                    isLast
                        ? "goal"
                        : ""
                );

            const [
                fromName,
                toName,
                lineName,
                companyName,
                destinationName,
                fromPlatform,
                toPlatform,
                fromGateway,
                toGateway
            ] =
                await Promise.all([
                    translateNavitimeText(
                        rawFromName,
                        targetLanguage
                    ),
                    translateNavitimeText(
                        rawToName,
                        targetLanguage
                    ),
                    translateNavitimeText(
                        section?.lineName,
                        targetLanguage
                    ),
                    translateNavitimeText(
                        section?.companyName,
                        targetLanguage
                    ),
                    translateNavitimeText(
                        section?.destinationName,
                        targetLanguage
                    ),
                    translateNavitimeText(
                        section?.fromPlatform,
                        targetLanguage
                    ),
                    translateNavitimeText(
                        section?.toPlatform,
                        targetLanguage
                    ),
                    translateNavitimeText(
                        section?.fromGateway,
                        targetLanguage
                    ),
                    translateNavitimeText(
                        section?.toGateway,
                        targetLanguage
                    )
                ]);

            section.fromName =
                fromName;

            section.toName =
                toName;

            section.lineName =
                lineName;

            section.companyName =
                companyName;

            section.destinationName =
                destinationName;

            section.fromPlatform =
                fromPlatform;

            section.toPlatform =
                toPlatform;

            section.fromGateway =
                fromGateway;

            section.toGateway =
                toGateway;
        }

        // 요약 텍스트용 transitDetails도 번역 후 다시 동기화
        route.transitDetails =
            sections.map(section => ({
                lineName:
                    section.lineName ||
                    (
                        String(
                            section?.move || ""
                        ).toLowerCase().includes("walk")
                            ? rt("도보", "徒歩", "Walk")
                            : rt("대중교통", "公共交通", "Transit")
                    ),
                fromName:
                    section.fromName,
                toName:
                    section.toName,
                fromPlatform:
                    section.fromPlatform,
                toPlatform:
                    section.toPlatform,
                fromGateway:
                    section.fromGateway,
                toGateway:
                    section.toGateway,
                fromNumbering:
                    section.fromNumbering,
                toNumbering:
                    section.toNumbering,
                move:
                    section.move,
                fromTime:
                    section.fromTime,
                toTime:
                    section.toTime,
                time:
                    section.time,
                distance:
                    section.distance,
                fare:
                    section.fare,
                fareBreakIc:
                    section.fareBreakIc,
                fareBreakTicket:
                    section.fareBreakTicket,
                transportColor:
                    section.transportColor,
                nextTransit:
                    section.nextTransit,
                companyName:
                    section.companyName,
                destinationName:
                    section.destinationName
            }));
    }

    return routes;
}



function getNavitimePointPlatform(
    point,
    type = "start"
) {
    const value =
        type === "goal"
            ? point?.goal_platform
            : point?.start_platform;

    return String(value || "").trim();
}

function getNavitimePointGateway(point) {
    return String(
        point?.gateway || ""
    ).trim();
}

function getNavitimeStationAssistInfo({
    platform = "",
    gateway = "",
    numbering = ""
} = {}) {
    const normalizedPlatform =
        String(platform || "").trim();

    const normalizedGateway =
        String(gateway || "").trim();

    const normalizedNumbering =
        String(numbering || "").trim();

    if (normalizedPlatform) {
        return {
            type: "platform",
            text: normalizedPlatform,
            label: rt(
                "승강장",
                "ホーム",
                "Platform"
            )
        };
    }

    if (normalizedGateway) {
        return {
            type: "gateway",
            text: normalizedGateway,
            label: rt(
                "출구",
                "出口",
                "Exit"
            )
        };
    }

    if (normalizedNumbering) {
        return {
            type: "numbering",
            text: normalizedNumbering,
            label: rt(
                "역 번호",
                "駅番号",
                "Station No."
            )
        };
    }

    return null;
}


function normalizeNavitimeTransitRoute(route) {
    const summary =
        route?.summary || {};

    const moveSummary =
        summary?.move || {};

    const sections =
        Array.isArray(route?.sections)
            ? route.sections
            : [];

    const navitimeSections = [];

    sections.forEach((section, index) => {
        if (
            String(section?.type || "").toLowerCase() !== "move"
        ) {
            return;
        }

        const previousPoint =
            sections[index - 1]?.type === "point"
                ? sections[index - 1]
                : null;

        const nextPoint =
            sections[index + 1]?.type === "point"
                ? sections[index + 1]
                : null;

        const transport =
            section?.transport || {};

        const lineName =
            String(
                transport?.self_name ||
                section?.line_name ||
                transport?.type ||
                ""
            ).trim();

        const move =
            String(
                section?.move || ""
            ).trim();

        const fromName =
            String(
                previousPoint?.name || ""
            ).trim();

        const toName =
            String(
                nextPoint?.name || ""
            ).trim();

        const sectionFare =
            Number(
                transport?.fare?.unit_48 ??
                transport?.fare?.unit_0
            );

        const fareBreak =
            transport?.fare_break || {};

        const fareBreakIc =
            fareBreak?.unit_48 === true;

        const fareBreakTicket =
            fareBreak?.unit_0 === true;

        const transportColor =
            normalizeNavitimeColor(
                transport?.color,
                "#5B8DEF"
            );

        navitimeSections.push({
            move,
            lineName,
            fromName,
            toName,
            fromTime:
                String(section?.from_time || ""),
            toTime:
                String(section?.to_time || ""),
            time:
                Number(section?.time || 0),
            distance:
                Number(section?.distance || 0),
            nextTransit:
                Boolean(section?.next_transit),

            // transport.fare는 누적/구간 표현이 섞일 수 있으므로
            // 화면에서는 fare_break를 우선 사용하고 0엔은 숨깁니다.
            fare:
                Number.isFinite(sectionFare)
                    ? sectionFare
                    : null,

            fareBreakIc,
            fareBreakTicket,

            transportColor,

            companyName:
                String(
                    transport?.company?.name || ""
                ).trim(),
            destinationName:
                String(
                    transport?.destination?.name || ""
                ).trim(),
            fromPlatform:
                getNavitimePointPlatform(
                    previousPoint,
                    "start"
                ),
            toPlatform:
                getNavitimePointPlatform(
                    nextPoint,
                    "goal"
                ),
            fromGateway:
                getNavitimePointGateway(
                    previousPoint
                ),
            toGateway:
                getNavitimePointGateway(
                    nextPoint
                ),
            fromNumbering:
                getNavitimeNumbering(
                    previousPoint,
                    "departure"
                ),
            toNumbering:
                getNavitimeNumbering(
                    nextPoint,
                    "arrival"
                ),
            fromCoord:
                getNavitimePointCoord(
                    previousPoint
                ),
            toCoord:
                getNavitimePointCoord(
                    nextPoint
                ),
            raw:
                section
        });
    });

    const durationMinutes =
        Number(moveSummary?.time);

    const distanceMeters =
        Number(moveSummary?.distance);

    const transferCount =
        Number(moveSummary?.transit_count);

    const walkDistance =
        Number(moveSummary?.walk_distance);

    const navitimeShapeSegments =
        getNavitimeShapeSegments(
            route?.shapes
        );

    const fallbackPath =
        getNavitimeFallbackPath(
            sections
        );

    const navitimePath =
        navitimeShapeSegments.length
            ? navitimeShapeSegments.flatMap(
                segment => segment.path
            )
            : fallbackPath;

    return {
        __navitime: true,
        rawNavitimeRoute: route,

        // 상세 렌더용 NAVITIME 원본 기반 구간
        navitimeSections,

        transitDetails:
            navitimeSections.map(section => ({
                lineName:
                    section.lineName ||
                    (
                        section.move === "walk"
                            ? rt("도보", "徒歩", "Walk")
                            : rt("대중교통", "公共交通", "Transit")
                    ),
                fromName:
                    section.fromName,
                toName:
                    section.toName,
                fromPlatform:
                    section.fromPlatform,
                toPlatform:
                    section.toPlatform,
                fromGateway:
                    section.fromGateway,
                toGateway:
                    section.toGateway,
                fromNumbering:
                    section.fromNumbering,
                toNumbering:
                    section.toNumbering,
                move:
                    section.move,
                fromTime:
                    section.fromTime,
                toTime:
                    section.toTime,
                time:
                    section.time,
                distance:
                    section.distance,
                fare:
                    section.fare,
                fareBreakIc:
                    section.fareBreakIc,
                fareBreakTicket:
                    section.fareBreakTicket,
                transportColor:
                    section.transportColor,
                nextTransit:
                    section.nextTransit,
                companyName:
                    section.companyName,
                destinationName:
                    section.destinationName
            })),

        transferCount:
            Number.isFinite(transferCount)
                ? transferCount
                : 0,

        durationMillis:
            Number.isFinite(durationMinutes)
                ? durationMinutes * 60 * 1000
                : 0,

        distanceMeters:
            Number.isFinite(distanceMeters)
                ? distanceMeters
                : 0,

        navitimeFromTime:
            String(moveSummary?.from_time || ""),

        navitimeToTime:
            String(moveSummary?.to_time || ""),

        walkDistance:
            Number.isFinite(walkDistance)
                ? walkDistance
                : 0,

        localizedValues: {
            duration:
                Number.isFinite(durationMinutes)
                    ? rt(
                        `${durationMinutes}분`,
                        `${durationMinutes}分`,
                        `${durationMinutes} min`
                    )
                    : "",

            distance:
                Number.isFinite(distanceMeters)
                    ? (
                        distanceMeters >= 1000
                            ? `${(distanceMeters / 1000).toFixed(1)} km`
                            : `${Math.round(distanceMeters)} m`
                    )
                    : "",

            transitFare:
                getNavitimeFareText(route)
        },

        navitimeShapeSegments,
        path:
            navitimePath,
        legs: [],
        routeLabels: [],
        viewport: null,
        shapes:
            route?.shapes || null
    };
}

async function fetchNavitimeTransitRoutes(
    origin,
    destination
) {
    const endpoint =
        String(
            NAVITIME_TRANSIT_CONFIG.endpoint ||
            ""
        ).trim();

    if (!endpoint) {
        throw new Error(
            currentLanguage === "ko"
                ? "NAVITIME API endpoint를 설정해주세요."
                : currentLanguage === "ja"
                    ? "NAVITIME API endpointを設定してください。"
                    : "Set the NAVITIME API endpoint."
        );
    }

    const start =
        getNavitimePoint(origin);

    const goal =
        getNavitimePoint(destination);

    if (!start || !goal) {
        throw new Error(
            currentLanguage === "ko"
                ? "대중교통 출발지/도착지 좌표가 올바르지 않습니다."
                : currentLanguage === "ja"
                    ? "公共交通の出発地/目的地の座標が正しくありません。"
                    : "Transit origin/destination coordinates are invalid."
        );
    }

    const url =
        new URL(
            endpoint,
            window.location.origin
        );

    url.searchParams.set("start", start);
    url.searchParams.set("goal", goal);
    url.searchParams.set("datum", "wgs84");
    url.searchParams.set("term", "1440");
    url.searchParams.set("limit", "5");
    url.searchParams.set(
        "start_time",
        getNavitimeStartTime()
    );
    url.searchParams.set(
        "coord_unit",
        "degree"
    );

    // 지도에 실제 NAVITIME 경로를 그리기 위한 GeoJSON 형상
    url.searchParams.set("shape", "true");
    url.searchParams.set(
        "shape_color",
        "railway_line"
    );

    const apiKey =
        String(
            NAVITIME_TRANSIT_CONFIG.apiKey ||
            ""
        ).trim();

    if (
        !apiKey ||
        apiKey === "YOUR_RAPIDAPI_KEY"
    ) {
        throw new Error(
            currentLanguage === "ko"
                ? "NAVITIME RapidAPI 키를 설정해주세요."
                : currentLanguage === "ja"
                    ? "NAVITIME RapidAPIキーを設定してください。"
                    : "Set the NAVITIME RapidAPI key."
        );
    }

    const headers = {
        "Content-Type":
            "application/json",
        "x-rapidapi-host":
            NAVITIME_TRANSIT_CONFIG.host,
        "x-rapidapi-key":
            apiKey
    };

    console.log(
        "========== NAVITIME TRANSIT 요청 =========="
    );
    console.log(
        "url =",
        url.toString()
    );

    const response =
        await fetch(
            url.toString(),
            {
                method: "GET",
                headers
            }
        );

    const responseText =
        await response.text();

    if (!response.ok) {
        console.error(
            "NAVITIME TRANSIT 오류 =",
            response.status,
            responseText
        );

        throw new Error(
            `NAVITIME TRANSIT ${response.status}`
        );
    }

    let data = {};

    try {
        data =
            responseText
                ? JSON.parse(responseText)
                : {};
    } catch (error) {
        console.error(
            "NAVITIME 응답 JSON 파싱 실패:",
            responseText
        );
        throw error;
    }

    console.log(
        "========== NAVITIME TRANSIT 응답 =========="
    );
    console.log(data);

    const items =
        Array.isArray(data?.items)
            ? data.items
            : [];

    return items.map(
        normalizeNavitimeTransitRoute
    );
}


function routeLocale() {
    return currentLanguage === "ko" ? "ko-KR" : currentLanguage === "en" ? "en-US" : "ja-JP";
}
function rt(ko, ja, en) {
    return currentLanguage === "ko" ? ko : currentLanguage === "en" ? en : ja;
}

// NAVITIME / Google 대중교통 운임을 화면 표시용 문자열로 변환합니다.
function getGoogleTransitFareText(route) {
<<<<<<< HEAD
    if (route?.__navitime) {
        const fare =
            route?.localizedValues?.transitFare;

        return typeof fare === "string"
            ? fare
            : "";
    }

=======
    // Routes API의 transitFare, DirectionsService fare, NAVITIME fare를 모두 지원합니다.
>>>>>>> 0119ed4f96786e0ae7155a7232c3593ebe38634c
    const fare =
        route?.transitFare ||
        route?.travelAdvisory?.transitFare ||
        route?.localizedValues?.transitFare ||
        route?.fare;

    if (!fare) return "";

<<<<<<< HEAD
    if (
        typeof fare === "string" &&
        fare.trim()
    ) {
        return fare.trim();
    }

    if (
        typeof fare?.text === "string" &&
        fare.text.trim()
    ) {
        return fare.text.trim();
    }

    const currencyCode =
        fare?.currencyCode ||
        fare?.currency ||
        "";

    let amount = null;

    if (
        fare?.units !== undefined ||
        fare?.nanos !== undefined
    ) {
        amount =
            Number(fare.units || 0) +
            Number(fare.nanos || 0) / 1e9;
    } else if (
        fare?.value !== undefined
    ) {
        amount =
            Number(fare.value);
    }

    if (!Number.isFinite(amount)) {
        return "";
    }

    if (currencyCode === "JPY") {
        return `${Math.round(amount).toLocaleString()}円`;
    }

    if (!currencyCode) {
        return amount.toLocaleString();
    }

    try {
        return new Intl.NumberFormat(
            currentLanguage === "ko"
                ? "ko-KR"
                : currentLanguage === "ja"
                    ? "ja-JP"
                    : "en-US",
            {
                style: "currency",
                currency: currencyCode
            }
        ).format(amount);
=======
    const currencyCode = fare?.currencyCode || fare?.currency || "";
    let rawAmount = NaN;
    if (fare?.units !== undefined || fare?.nanos !== undefined) {
        rawAmount = Number(fare.units || 0) + Number(fare.nanos || 0) / 1e9;
    } else if (fare?.value !== undefined) {
        rawAmount = Number(fare.value);
    }
    if (!Number.isFinite(rawAmount)) return "";

    const fareAmount = rawAmount;

    if (currencyCode === "JPY") return `${Math.round(fareAmount).toLocaleString()}円`;
    if (!currencyCode) return fareAmount.toLocaleString();

    try {
        return new Intl.NumberFormat(
            currentLanguage === "ko" ? "ko-KR" : currentLanguage === "ja" ? "ja-JP" : "en-US",
            { style: "currency", currency: currencyCode }
        ).format(fareAmount);
>>>>>>> 0119ed4f96786e0ae7155a7232c3593ebe38634c
    } catch (error) {
        return `${currencyCode} ${fareAmount.toLocaleString()}`;
    }
}

// Google / NAVITIME TRANSIT 단계별 대중교통 정보를 추출합니다.
function getGoogleTransitStepDetails(route) {
<<<<<<< HEAD
    if (
        route?.__navitime &&
        Array.isArray(route?.transitDetails)
    ) {
        return route.transitDetails
            .map(detail => {
                const isWalk =
                    String(detail?.move || "") === "walk";

                const lineName =
                    isWalk
                        ? rt("도보", "徒歩", "Walk")
                        : (
                            detail?.lineName ||
                            rt("대중교통", "公共交通", "Transit")
                        );

                const placeText =
                    detail?.fromName &&
                    detail?.toName
                        ? `${detail.fromName} → ${detail.toName}`
                        : "";

                const timeText =
                    Number(detail?.time) > 0
                        ? rt(
                            `${detail.time}분`,
                            `${detail.time}分`,
                            `${detail.time} min`
                        )
                        : "";

                return [
                    lineName,
                    placeText,
                    timeText
                ]
                    .filter(Boolean)
                    .join(" · ");
            })
            .filter(Boolean);
=======
    if (Array.isArray(route?.transitStepDetails) && route.transitStepDetails.length) {
        return route.transitStepDetails;
>>>>>>> 0119ed4f96786e0ae7155a7232c3593ebe38634c
    }

    const details = [];

    for (const leg of route?.legs || []) {
        for (const step of leg?.steps || []) {
            const transit =
                step?.transitDetails ||
                step?.transit_details;

            if (!transit) continue;

            const line =
                transit?.line ||
                transit?.transitLine ||
                {};

            const vehicle =
                line?.vehicle ||
                transit?.transitLine?.vehicle ||
                {};

            const lineName =
                line?.name ||
                line?.shortName ||
                line?.short_name ||
                transit?.transitLine?.name ||
                vehicle?.name ||
                rt("대중교통", "公共交通", "Transit");

            const headsign = transit?.headsign || "";

            const stopCount =
                transit?.stopCount ??
                transit?.numStops ??
                transit?.num_stops;

            const parts = [
                lineName,
                headsign,
                Number.isFinite(Number(stopCount))
                    ? rt(
                        `${stopCount}정거장`,
                        `${stopCount}駅`,
                        `${stopCount} stops`
                    )
                    : ""
            ].filter(Boolean);

            if (parts.length) details.push(parts.join(" · "));
        }
    }

    return details;
}


// Google / NAVITIME TRANSIT의 환승 횟수를 계산합니다.
function getGoogleTransitTransferCount(route) {
<<<<<<< HEAD
    if (
        route?.__navitime &&
        Number.isFinite(
            Number(route?.transferCount)
        )
    ) {
        return Number(
            route.transferCount
        );
=======
    if (Number.isFinite(Number(route?.transitTransferCount))) {
        return Math.max(0, Number(route.transitTransferCount));
>>>>>>> 0119ed4f96786e0ae7155a7232c3593ebe38634c
    }

    let transitStepCount = 0;

    for (const leg of route?.legs || []) {
        for (const step of leg?.steps || []) {
            if (step?.transitDetails || step?.transit_details) {
                transitStepCount += 1;
            }
        }
    }

    return Math.max(0, transitStepCount - 1);
}
function resetPoiRouteSelection(
    clearCoordinates = true
) {
    mapRouteSelectionMode = false;
    mapRouteSelectionStep = 0;

    if (clearCoordinates) {
        selectedMapOrigin = null;
        selectedMapDestination = null;
    }
}




async function handleGoogleMapClick(event) {
    if (!event?.latLng) {
        return;
    }

    /*
        CHEESE MAP POI 우선 처리
        -----------------------------------------------------
        Google 기본 POI를 클릭했을 때는 길찾기 상태와 관계없이
        반드시 장소 상세 카드를 먼저 엽니다.

        이전 코드처럼 routePanel.show를 먼저 검사하면,
        길찾기 패널의 show 상태가 남아 있는 경우 POI 클릭이
        출발지/도착지 선택으로 먹혀서 "POI가 안 눌리는" 것처럼
        보일 수 있습니다.
    */
    if (event.placeId) {
        event.stop?.();

        /*
            POI → POI 길찾기 모드
            첫 번째 POI에서 "길찾기"를 누른 뒤에는 다음 POI 클릭을
            목적지 선택으로 처리한다. 이때 현재 위치/도쿄역 기본값은
            경로 계산에 끼어들지 않는다.
        */
        if (
            mapRouteSelectionMode &&
            selectedMapOrigin &&
            !selectedMapDestination
        ) {
            const destination = event.latLng.toJSON();

            let destinationName = getClickedMapPlaceName(
                event,
                currentLanguage === "ko" ? "선택한 장소" : "選択した場所"
            );

            try {
                const clickedPlace = await fetchGooglePoiDetails(event.placeId);
                destinationName = clickedPlace.displayName || destinationName;
            } catch (_) {
                // 이름 조회가 실패해도 좌표만으로 경로 계산은 가능하다.
            }

            selectedMapDestination = destination;
            mapRouteSelectionStep = 0;

            const endInput = document.getElementById("endPoint");
            if (endInput) {
                endInput.value = destinationName;
            }

            await addTemporaryRouteMarker(
                destination,
                "B",
                currentLanguage === "ko" ? "도착" : "到着"
            );

            showToast(
                currentLanguage === "ko"
                    ? `${destinationName}까지의 경로를 검색합니다.`
                    : `${destinationName}までのルートを検索します。`
            );

            await findRoute();
            return;
        }

        // 일반 POI 클릭은 기존처럼 상세 카드를 연다.
        routePanel?.classList.remove("show");
        placeCard?.classList.remove("route-focus");
        resetPoiRouteSelection(true);
        clearRenderedRoute();

        const clickedPoiName = getClickedMapPlaceName(
            event,
            currentLanguage === "ko" ? "선택한 장소" : "選択した場所"
        );

        await openGooglePoi(
            event.placeId,
            event.latLng.toJSON(),
            clickedPoiName
        );
        return;
    }

    /*
        POI가 아닌 지도 빈 곳은 길찾기 모드일 때만
        출발지/도착지 선택으로 사용합니다.
    */
    if (isRoutePanelOpen()) {
        await handleMapRouteSelectionClick(event);
        return;
    }

    placeCard?.classList.remove("show");
    placeCard?.classList.remove("route-focus");
}




function isRoutePanelOpen() {
    return Boolean(
        routePanel?.classList.contains("show") &&
        placeCard?.classList.contains("route-focus")
    );
}


function getClickedMapPlaceName(event, fallback) {
    return (
        event?.domEvent?.target?.getAttribute?.("aria-label") ||
        fallback
    );
}


async function createGoogleStyleRouteMarker({
    position,
    type = "start",
    text = "",
    title = "",
    zIndex = 30,
    clickable = false
}) {
    /*
        길찾기 마커는 출발지에만 표시합니다.
        별도 치즈/로고 커스텀 없이 Google Maps 기본 PinElement를 사용합니다.
    */
    if (type !== "start") {
        return null;
    }

    const markerTitle =
        String(
            title ||
            text ||
            (
                currentLanguage === "ko"
                    ? "출발지"
                    : currentLanguage === "ja"
                        ? "出発地"
                        : "Origin"
            )
        );

    /*
        Advanced Marker를 명시적으로 로드합니다.
        deprecated 된 google.maps.Marker는 더 이상 fallback으로 사용하지 않습니다.
    */
    const { AdvancedMarkerElement, PinElement } =
        await google.maps.importLibrary("marker");

    if (!AdvancedMarkerElement || !PinElement) {
        console.warn(
            "Google Maps Advanced Marker 라이브러리를 사용할 수 없습니다."
        );
        return null;
    }

    const pin = new PinElement({
        scale: 1
    });

    return new AdvancedMarkerElement({
        map: googleMap,
        position,
        title: markerTitle,
        content: pin,
        zIndex,
        gmpClickable: Boolean(clickable)
    });
}

async function addTemporaryRouteMarker(
    position,
    label,
    title
) {
    const markerType =
        label === "B"
            ? "end"
            : "start";

    /*
        도착지는 별도 마커를 표시하지 않습니다.
        지도 선택 중에도 출발지에만 CHEESE MAP 로고를 표시합니다.
    */
    if (
        markerType !== "start"
    ) {
        return null;
    }

    const marker =
        await createGoogleStyleRouteMarker({
            position,

            type:
                "start",

            title,

            zIndex:
                40,

            clickable:
                true
        });

    if (marker) {
        routeMarkers.push(
            marker
        );
    }

    return marker;
}


async function handleMapRouteSelectionClick(event) {
    if (
        !isRoutePanelOpen() ||
        !event?.latLng
    ) {
        return;
    }

    if (event.placeId) {
        event.stop?.();
    }

    const position =
        event.latLng.toJSON();

    let clickedPlaceName = getClickedMapPlaceName(
        event,
        rt("지도에서 선택한 장소", "地図で選択した場所", "Selected place on map")
    );

    if (event.placeId) {
        try {
            const clickedPlace =
                await fetchGooglePoiDetails(event.placeId);

            clickedPlaceName =
                clickedPlace.displayName || clickedPlaceName;
        } catch (error) {
            console.warn("선택한 POI 이름을 불러오지 못했습니다:", error);
        }
    }

    if (
        !selectedMapOrigin ||
        (
            selectedMapOrigin &&
            selectedMapDestination
        )
    ) {
        clearRenderedRoute();

        selectedMapOrigin = position;
        selectedMapDestination = null;
        mapRouteSelectionStep = 1;

        computedRoutes = [];
        const startInput =
            document.getElementById(
                "startPoint"
            );

        if (startInput) {
            startInput.value =
                clickedPlaceName;
        }

        await addTemporaryRouteMarker(
            position,
            "A",
            rt("출발지", "出発地", "Origin")
        );

        showToast(
            rt("출발지를 선택했습니다. 도착지를 눌러주세요.", "出発地を選択しました。目的地を選択してください。", "Origin selected. Choose a destination.")
        );

        return;
    }

    selectedMapDestination = position;
    mapRouteSelectionStep = 0;

    const endInput =
        document.getElementById(
            "endPoint"
        );

    if (endInput) {
        endInput.value =
            clickedPlaceName;
    }

    await addTemporaryRouteMarker(
        position,
        "B",
        currentLanguage === "ko"
            ? "도착지"
            : "目的地"
    );

    showToast(
        rt("도착지를 선택했습니다. 경로를 검색합니다.", "目的地を選択しました。ルートを検索します。", "Destination selected. Searching for a route.")
    );

    await findRoute();
}


async function ensureRouteMarkerLibrary() {
    if (!window.google?.maps?.importLibrary) {
        throw new Error("GOOGLE_MAPS_LIBRARY_UNAVAILABLE");
    }

    return google.maps.importLibrary("marker");
}


async function findRoute() {
    const startPointInput =
        document.getElementById("startPoint");

    const endPointInput =
        document.getElementById("endPoint");

    const startPoint =
        startPointInput?.value.trim();

    const endPoint =
        endPointInput?.value.trim();

    if (!endPoint) {
        showToast("toast.routeRequired");
        endPointInput?.focus();
        return;
    }

    if (!googleMap) {
        showToast("toast.mapNotReady");
        return;
    }


    const routeButton =
        document.getElementById("findRouteButton");

    routeButton?.setAttribute("disabled", "");

    if (routeButton) {
        routeButton.dataset.originalText =
            routeButton.textContent;

        routeButton.textContent =
            rt("경로 검색 중...", "ルート検索中...", "Searching route...");
    }

    try {
        // MR.EUM 수정부분:
        // 경로 검색 전에 Advanced Marker 라이브러리를 준비합니다.
        await ensureRouteMarkerLibrary();

        const origin =
            selectedMapOrigin ||
            await resolveRouteOrigin(
                startPoint
            );

        const destination =
            selectedMapDestination ||
            await resolveRouteDestination(
                endPoint
            );

        const travelMode =
            getSelectedTravelMode();

<<<<<<< HEAD
        
        if (!RouteClass) {
            const { Route } = await google.maps.importLibrary("routes");
            RouteClass = Route;
        }

        // Google Route.computeRoutes 공식 요청 형식에 맞춰
        // 모드별로 필요한 필드만 보낸다. TRANSIT에는 자동차용 옵션을 섞지 않는다.
        // mr.eum수정부분
        // 이동수단별로 Google에 허용되는 요청 옵션만 전달합니다.
        // WALKING / DRIVING은 Google Routes API를 사용하고
        // TRANSIT만 NAVITIME Route(totalnavi)를 사용합니다.
        const baseRequest = {
            origin: normalizeGoogleRouteLocation(origin),
            destination: normalizeGoogleRouteLocation(destination),
            travelMode,
            language: routeLocale(),
            units: google.maps.UnitSystem.METRIC,
            computeAlternativeRoutes: true,
            fields: [
                "path",
                "viewport",
                "legs",
                "routeLabels",
                "localizedValues",
                "durationMillis",
                "travelAdvisory"
            ]
        };

        // mr.eum수정부분
        // 대중교통은 NAVITIME Route(totalnavi) / route_transit로 검색합니다.
        if (travelMode === "TRANSIT") {
            const transitSearchStartedAt =
                new Date();

            try {
                const transitRoutes =
                    await fetchNavitimeTransitRoutes(
                        origin,
                        destination
                    );

                if (!transitRoutes.length) {
                    showToast(
                        currentLanguage === "ko"
                            ? "NAVITIME에서 대중교통 경로를 찾지 못했습니다."
                            : currentLanguage === "ja"
                                ? "NAVITIMEで公共交通ルートが見つかりませんでした。"
                                : "NAVITIME returned no transit route."
                    );

                    return [];
                }

                // RapidAPI 마켓의 NAVITIME route_transit는 lang 파라미터를
                // 지원하지 않으므로, 현재 사이트 언어가 ko/en이면
                // Cloud Translation API로 역/노선/방면/회사명을 번역합니다.
                await localizeNavitimeRoutes(
                    transitRoutes
                );

                computedRoutes =
                    transitRoutes;

                // 첫 번째 추천 경로를 지도에 즉시 표시합니다.
                await drawRoute(
                    computedRoutes[0],
                    true,
                    travelMode
                );

                renderRouteResults(
                    computedRoutes,
                    transitSearchStartedAt
                );

                mapRouteSelectionMode = false;
                mapRouteSelectionStep = 0;

                showToast(
                    currentLanguage === "ko"
                        ? "NAVITIME 대중교통 경로를 표시했습니다."
                        : currentLanguage === "ja"
                            ? "NAVITIMEの公共交通ルートを表示しました。"
                            : "NAVITIME transit routes displayed."
                );

                return computedRoutes;
            } catch (error) {
                console.error(
                    "NAVITIME TRANSIT 실패:",
                    error
                );

                showToast(
                    error?.message ||
                    (
                        currentLanguage === "ko"
                            ? "NAVITIME 대중교통 경로를 불러오지 못했습니다."
                            : currentLanguage === "ja"
                                ? "NAVITIMEの公共交通ルートを取得できませんでした。"
                                : "Could not load NAVITIME transit routes."
                    )
                );

                return [];
            }
=======
        // 일본 대중교통은 NAVITIME Route(totalnavi)를 사용합니다.
        if (travelMode === "TRANSIT") {
            const originCoord =
                typeof origin === "object"
                    ? origin
                    : await geocodeRouteLocation(origin);
            const destinationCoord =
                typeof destination === "object"
                    ? destination
                    : await geocodeRouteLocation(destination);

            const transitRoutes =
                await fetchNavitimeTransitRoutes(
                    originCoord,
                    destinationCoord
                );

            if (!transitRoutes.length) {
                console.error(
                    "========== NAVITIME TRANSIT 결과 없음 =========="
                );
                showToast(
                    rt(
                        "대중교통 경로를 찾지 못했습니다.",
                        "公共交通ルートが見つかりませんでした。",
                        "No transit routes found."
                    )
                );
                return [];
            }

            computedRoutes = transitRoutes;

            await drawRoute(
                computedRoutes[0],
                true,
                travelMode
            );

            renderRouteResults(
                computedRoutes,
                new Date()
            );

            mapRouteSelectionMode = false;
            mapRouteSelectionStep = 0;

            showToast(
                currentLanguage === "ko"
                    ? "NAVITIME 대중교통 경로를 표시했습니다."
                    : currentLanguage === "ja"
                        ? "NAVITIMEの公共交通ルートを表示しました。"
                        : "NAVITIME transit routes displayed."
            );

            return computedRoutes;
>>>>>>> 0119ed4f96786e0ae7155a7232c3593ebe38634c
        }

        if (!RouteClass) {
            const { Route } = await google.maps.importLibrary("routes");
            RouteClass = Route;
        }

        // Google Route.computeRoutes: 도보/자동차만 사용합니다.
        const baseRequest = {
            origin: normalizeGoogleRouteLocation(origin),
            destination: normalizeGoogleRouteLocation(destination),
            travelMode,
            language: routeLocale(),
            units: google.maps.UnitSystem.METRIC,
            computeAlternativeRoutes: true,
            fields: [
                "path",
                "viewport",
                "legs",
                "routeLabels",
                "localizedValues",
                "durationMillis",
                "travelAdvisory"
            ]
        };

        const routeSearchStartedAt = new Date();

        const request = {
            ...baseRequest,

            // mr.eum수정부분
            // 자동차 경로에서만 통행료 계산을 요청합니다.
            ...(travelMode === "DRIVING"
                ? {
                    extraComputations: ["TOLLS"],
                    routeModifiers: {
                        vehicleInfo: {
                            emissionType: "GASOLINE"
                        }
                    }
                }
                : {})
        };

        // mr.eum수정부분
        // Google Routes API 요청 객체를 확인합니다.
        console.log("========== MR.EUM Google Routes 요청 확인 ==========");
        console.log("travelMode =", travelMode);
        console.log("request =", request);

        const { routes = [] } =
            await RouteClass.computeRoutes(request);

        // MR.EUM 수정부분
        // Google Routes API가 반환한 자동차 경로의 통행료 구조를 확인합니다.
        console.log("========== MR.EUM 통행료 routes 응답 확인 ==========");
        routes.forEach((route, index) => {
            console.log(`자동차 경로 ${index + 1} tollInfo =`,
                route?.travelAdvisory?.tollInfo
            );
        });

        // mr.eum수정부분
        // Google Routes API가 실제로 반환한 routes 배열이 비어 있는지 확인합니다.
        // ZERO_RESULTS를 직접 발생시키지 않고 실제 반환값을 확인합니다.
        if (!routes.length) {
            console.error("========== MR.EUM Google TRANSIT routes 비어있음 ==========");
            console.dir(routes, { depth: null });

            console.error("========== MR.EUM Google TRANSIT 요청 최종값 ==========");
            console.dir(request, { depth: null });

            return [];
        }

        computedRoutes = routes;

        await drawRoute(
            computedRoutes[0],
            true,
            travelMode
        );

        // mr.eum수정부분
        // 검색 시작 시각을 모든 도보/자동차 경로 카드에 전달합니다.
        renderRouteResults(
            computedRoutes,
            routeSearchStartedAt
        );

        mapRouteSelectionMode = false;
        mapRouteSelectionStep = 0;

        showToast(
            rt("경로를 표시했습니다.", "ルートを表示しました.", "Route displayed.")
        );
    } catch (error) {
        const rawStatus =
            error?.code ||
            error?.message ||
            "UNKNOWN_ERROR";

        // mr.eum수정부분
        // 모든 경로 검색은 Google Routes API를 사용하므로 오류 로그도 Google 기준으로 통일합니다.
        console.error("Google Routes API 오류:", error);
        // mr.eum수정부분
        // catch 블록에서는 try 내부 변수를 직접 참조하지 않고 현재 선택된 이동수단을 다시 가져옵니다.
        console.error(
            "Google Routes API 오류 상세:",
            error?.message,
            error?.code,
            "travelMode:",
            getSelectedTravelMode()
        );

        const status =
            String(rawStatus).length > 120
                ? String(rawStatus).slice(0, 117) + "..."
                : String(rawStatus);

        clearRenderedRoute();
        computedRoutes = [];

        if (routeResult) {
            routeResult.classList.remove("show");
        }

        

        const geocodeFailed =
            String(status).includes(
                "GEOCODE_"
            );

        showToast(
            geocodeFailed
                ? rt("출발지 또는 도착지를 일본 지도에서 찾지 못했습니다. 역 이름이나 정확한 장소명을 입력해주세요.", "出発地または目的地が日本の地図で見つかりませんでした。駅名や正確な場所名を入力してください。", "Could not find the origin or destination in Japan. Enter a station or exact place name.")
                : rt(`경로를 찾지 못했습니다. (${status})`, `ルートが見つかりませんでした。(${status})`, `Route not found. (${status})`)
        );
    } finally {
        routeButton?.removeAttribute("disabled");

        if (routeButton) {
            routeButton.textContent =
                routeButton.dataset.originalText ||
                translate("route.search");
        }
    }
}


/* 이동 수단 탭 선택 */

document
    .querySelectorAll(
        ".transport-tabs button"
    )
    .forEach(button => {
        button.addEventListener(
            "click",
            () => {
                document
                    .querySelectorAll(
                        ".transport-tabs button"
                    )
                    .forEach(item => {
                        item.classList.remove(
                            "active"
                        );
                    });

                button.classList.add(
                    "active"
                );

                routeResult?.classList.remove(
                    "show"
                );

                clearRenderedRoute();
                computedRoutes = [];
            }
        );
    });


/* 경로 검색 */

document
    .getElementById("findRouteButton")
    ?.addEventListener(
        "click",
        findRoute
    );


document
    .getElementById("startPoint")
    ?.addEventListener(
        "input",
        () => {
            if (!mapRouteSelectionMode) {
                selectedMapOrigin = null;
            }
        }
    );


document
    .getElementById("endPoint")
    ?.addEventListener(
        "input",
        () => {
            if (!mapRouteSelectionMode) {
                selectedMapDestination = null;
            }
        }
    );


document
    .getElementById("endPoint")
    ?.addEventListener(
        "keydown",
        event => {
            if (event.key === "Enter") {
                event.preventDefault();
                findRoute();
            }
        }
    );



document
    .getElementById("placeRouteButton")
    ?.addEventListener(
        "click",
        async () => {
            let origin = null;
            let originName = "";

            if (selectedGooglePoi) {
                origin = {
                    ...selectedGooglePoi.position
                };

                // mr.eum수정부분
                // 장소에서 도보/자동차 길찾기를 시작할 때 현재 표시 중인 장소명을 사용합니다.
                originName =
                    selectedGooglePoi.name ||
                    rt("출발지", "出発地", "Origin");
            } else {
                const place = places[selectedPlaceKey];

                if (place) {
                    origin = {
                        lat: place.position.lat,
                        lng: place.position.lng
                    };
                    originName = place.name[currentLanguage];
                }
            }

            if (!origin) {
                showToast(
                    currentLanguage === "ko"
                        ? "출발지로 사용할 장소를 찾지 못했습니다."
                        : "出発地に使用する場所が見つかりませんでした。"
                );
                return;
            }

            clearRenderedRoute();
            computedRoutes = [];
            // 사용자가 길찾기를 누른 POI를 출발지로 고정한다.
            // 현재 위치(도쿄역 기본값)는 이 POI → POI 흐름에서 사용하지 않는다.
            selectedMapOrigin = origin;
            selectedMapDestination = null;
            mapRouteSelectionMode = true;
            mapRouteSelectionStep = 1;

            const startInput = document.getElementById("startPoint");
            const endInput = document.getElementById("endPoint");

            if (startInput) {
                startInput.value = originName;
            }

            if (endInput) {
                endInput.value = "";
                endInput.placeholder =
                    currentLanguage === "ko"
                        ? "지도에서 도착 POI를 선택하세요"
                        : "地図で目的地のPOIを選択してください";
            }

            placeCard?.classList.add("route-focus");
            routePanel?.classList.add("show");

            requestAnimationFrame(() => {
                routePanel?.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
            });

            await addTemporaryRouteMarker(
                origin,
                "A",
                currentLanguage === "ko" ? "출발" : "出発"
            );

            showToast(
                currentLanguage === "ko"
                    ? `${originName}을(를) 출발지로 설정했습니다. 도착할 POI를 눌러주세요.`
                    : `${originName}を出発地に設定しました。目的地のPOIを選択してください。`
            );
        }
    );

    



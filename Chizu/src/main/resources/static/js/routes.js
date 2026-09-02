    /* =====================================================
   길찾기 - Google Routes API
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
        Number.isFinite(value.lat) &&
        Number.isFinite(value.lng)
    ) {
        return value;
    }

    const text = String(value || "").trim();

    if (!text) {
        throw new Error("EMPTY_ROUTE_LOCATION");
    }

    /*
        별도 지오코딩 API를 사용하지 않는다.
        Google Routes API는 origin / destination에 주소 문자열을 직접
        받을 수 있고 내부에서 경로 계산용 위치로 해석한다.
    */
    return text;
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


function getRouteDurationText(route) {
    return (
        route?.localizedValues?.duration ||
        route?.legs?.[0]?.localizedValues?.duration ||
        (
            Number.isFinite(route?.durationMillis)
                ? `${Math.round(route.durationMillis / 60000)}분`
                : "-"
        )
    );
}


function getRouteDistanceText(route) {
    return (
        route?.localizedValues?.distance ||
        route?.legs?.[0]?.localizedValues?.distance ||
        (
            Number.isFinite(route?.distanceMeters)
                ? route.distanceMeters >= 1000
                    ? `${(route.distanceMeters / 1000).toFixed(1)} km`
                    : `${Math.round(route.distanceMeters)} m`
                : "-"
        )
    );
}

// =====================================================
// MR.EUM 수정부분
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

function getWalkingStepDetails(route) {
    const steps =
        route?.legs?.flatMap(leg => leg?.steps || []) || [];

    return steps
        .filter(step => {
            const mode = String(step?.travelMode || "").toUpperCase();
            return !mode || mode === "WALKING" || mode === "WALK";
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

            const distanceMeters = Number(step?.distanceMeters);

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
                instruction: String(instruction).trim(),
                maneuver: String(maneuver).trim(),
                distanceText
            };
        })
        .filter(step => step.instruction || step.distanceText);
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


function getTransitStepDetails(route) {
    const steps =
        route?.legs?.flatMap(leg => leg.steps || []) || [];

    return steps
        .filter(step => step.travelMode === "TRANSIT")
        .map(step => {
            const details = step.transitDetails;
            const line = details?.transitLine;

            const lineName =
                line?.shortName ||
                line?.name ||
                line?.vehicle?.name ||
                "";

            const departureStop =
                details?.departureStop?.name || "";

            const arrivalStop =
                details?.arrivalStop?.name || "";

            const stopCount =
                Number.isFinite(details?.stopCount)
                    ? details.stopCount
                    : null;

            return {
                lineName,
                departureStop,
                arrivalStop,
                stopCount,
                headsign: details?.headsign || ""
            };
        });
}


function getTransitRouteText(route) {
    const transitSteps =
        getTransitStepDetails(route);

    if (!transitSteps.length) {
        return "";
    }

    return transitSteps
        .slice(0, 3)
        .map(step => {
            const parts = [];

            if (step.lineName) {
                parts.push(step.lineName);
            }

            if (step.departureStop && step.arrivalStop) {
                parts.push(
                    `${step.departureStop} → ${step.arrivalStop}`
                );
            }

            if (step.stopCount !== null) {
                parts.push(
                    currentLanguage === "ko"
                        ? `${step.stopCount}개 정류장`
                        : `${step.stopCount}駅`
                );
            }

            return parts.join(" · ");
        })
        .filter(Boolean)
        .join("<br>");
}


function getTransitFareText(route) {
    return (
        route?.localizedValues?.transitFare ||
        route?.travelAdvisory?.transitFare?.text ||
        ""
    );
}


function getRouteSummary(route, index) {
    const transitText =
        getTransitRouteText(route);

    if (transitText) {
        return transitText;
    }

    const label =
        route?.routeLabels?.includes("DEFAULT_ROUTE")
            ? currentLanguage === "ko"
                ? "추천 경로"
                : "おすすめルート"
            : currentLanguage === "ko"
                ? `대체 경로 ${index + 1}`
                : `代替ルート ${index + 1}`;

    const instructions =
        route?.legs?.[0]?.stepsOverview
            ?.multiModalSegments
            ?.map(segment => segment.instructions)
            .filter(Boolean)
            .slice(0, 2)
            .join(" · ");

    return instructions || label;
}


function renderRouteResults(routes) {
    if (!routeResult) {
        return;
    }

    // =====================================================
    // MR.EUM 수정부분
    // 현재 선택된 교통수단 확인
    // 대중교통은 기존의 별도 렌더링을 사용하고
    // 여기서는 도보 / 자동차 경로를 보기 좋게 표시한다.
    // =====================================================

    const travelMode = getSelectedTravelMode();

    // 대중교통은 기존 Transit 전용 렌더링을 사용하므로
    // 여기서는 기존 방식 그대로 둔다.
    if (travelMode === "TRANSIT") {
        return;
    }

    // 도보 / 자동차에 따라 아이콘과 이름을 결정
    const isWalking = travelMode === "WALKING";

    const modeIcon = isWalking
        ? "ti-walk"
        : "ti-car";

    const modeName = isWalking
        ? rt("도보", "徒歩", "Walking")
        : rt("자동차", "自動車", "Driving");

    routeResult.innerHTML =
        routes.map((route, index) => {

            // 추천 경로인지 대체 경로인지 확인
            const routeLabel =
                index === 0
                    ? rt("추천", "おすすめ", "Recommended")
                    : rt(
                        `대안 ${index + 1}`,
                        `候補 ${index + 1}`,
                        `Option ${index + 1}`
                    );

            // 경로 설명
            const summary =
                getRouteSummary(route, index);

            return `
                <button
                    type="button"
                    class="route-option simple-route-option ${isWalking ? "walking-route-option" : "driving-route-option"}${index === 0 ? " active" : ""}"
                    data-route-index="${index}"
                >

                    <!-- 시간 + 추천 뱃지 -->
                    <div class="simple-route-header">

                        <div class="simple-route-time">
                           

                            <strong>
                                ${getRouteDurationText(route)}
                            </strong>

                            <span class="route-recommend-badge">
                                ${routeLabel}
                            </span>
                        </div>

                    </div>


                    <!-- 거리 -->
                    <div class="simple-route-distance">
                        ${getRouteDistanceText(route)}
                    </div>


                    <!-- 출발 → 이동수단 → 도착 -->
                    <div class="simple-route-path">
                        <div class="simple-route-point">
                            <span class="simple-route-dot"></span>
                            <span>${escapeWalkingText(getRoutePlaceNames(route).start)}</span>
                        </div>

                        <div class="simple-route-line">
                            <i class="ti ${modeIcon}" aria-hidden="true"></i>
                            <span>${modeName}</span>
                        </div>

                        <div class="simple-route-point">
                            <span class="simple-route-dot"></span>
                            <span>${escapeWalkingText(getRoutePlaceNames(route).end)}</span>
                        </div>
                    </div>

                    ${isWalking ? renderWalkingStepDetails(route) : ""}

                </button>
            `;
        }).join("");


    routeResult.classList.add("show");


    // =====================================================
    // MR.EUM 수정부분
    // 경로 카드를 클릭하면 해당 경로를 지도에 표시
    // =====================================================

    routeResult
        .querySelectorAll("[data-route-index]")
        .forEach(button => {

            button.addEventListener("click", () => {

                selectRoute(
                    Number(button.dataset.routeIndex)
                );

            });

        });
}


async function drawRoute(route, fitViewport = true, travelMode = getSelectedTravelMode()) {
    if (!route || !googleMap) {
        return;
    }

    clearRenderedRoute();

    /*
        길찾기 경로는 Google Maps에 가까운 단순한 블루 계열로 통일한다.
        기존 치즈색 halo/메인선 조합은 떠 보일 수 있어, 흰색 halo + 블루 본선으로 정리한다.
        도보는 같은 톤의 점선으로만 차이를 주고, 출발/도착은 별도 핀으로 구분한다.
    */
    const path = Array.isArray(route.path)
        ? route.path.filter(Boolean)
        : [];

    if (!path.length) {
        console.warn("Routes API 경로 path가 비어 있습니다.", route);
        return;
    }

    const isWalking = travelMode === "WALKING";

    const haloLine = !isWalking
        ? new google.maps.Polyline({
            map: googleMap,
            path,
            strokeColor: "#FFFFFF",
            strokeOpacity: 0.92,
            strokeWeight: 8,
            zIndex: 9
        })
        : null;

    let routeLine;

    if (isWalking) {
        routeLine = new google.maps.Polyline({
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
        });
    } else {
        routeLine = new google.maps.Polyline({
            map: googleMap,
            path,
            strokeColor: "#4285F4",
            strokeOpacity: 1,
            strokeWeight: 5,
            zIndex: 10
        });
    }

    routePolylines = haloLine ? [haloLine, routeLine] : [routeLine];

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


async function selectRoute(index) {
    const route = computedRoutes[index];

    if (!route) {
        return;
    }

    await drawRoute(route, true, getSelectedTravelMode());

    routeResult
        ?.querySelectorAll("[data-route-index]")
        .forEach(button => {
            const isActive =
                Number(button.dataset.routeIndex) === index;

            button.classList.toggle(
                "active",
                isActive
            );

            button.style.borderColor =
                isActive
                    ? "var(--yellow-dark)"
                    : "var(--gray-200)";

            button.style.background =
                isActive
                    ? "var(--yellow-light)"
                    : "var(--white)";
        });
}


/* =====================================================
   대중교통도 Google Routes API 사용
   - 기존 Transitous 호출/파싱 코드는 제거함
===================================================== */

function decodeTransitousPolyline(encoded, precision = 6) {
    const coordinates = [];
    let index = 0;
    let latitude = 0;
    let longitude = 0;
    const factor = 10 ** precision;

    const decodeValue = () => {
        let result = 0;
        let shift = 0;
        let byte;

        do {
            byte = encoded.charCodeAt(index++) - 63;
            result |= (byte & 31) << shift;
            shift += 5;
        } while (byte >= 32 && index < encoded.length);

        return (result & 1) ? ~(result >> 1) : (result >> 1);
    };

    while (index < encoded.length) {
        latitude += decodeValue();
        longitude += decodeValue();
        coordinates.push({
            lat: latitude / factor,
            lng: longitude / factor
        });
    }

    return coordinates;
}
function routeLocale() {
    return currentLanguage === "ko" ? "ko-KR" : currentLanguage === "en" ? "en-US" : "ja-JP";
}
function routeLanguagePreference() {
    return currentLanguage === "ko" ? "ko,ja,en" : currentLanguage === "en" ? "en,ja" : "ja,en";
}
function rt(ko, ja, en) {
    return currentLanguage === "ko" ? ko : currentLanguage === "en" ? en : ja;
}
function formatTransitousTime(value) {
    if (!value) return "--:--";

    return new Intl.DateTimeFormat(routeLocale(), {
        timeZone: "Asia/Tokyo",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    }).format(new Date(value));
}
function getTransitousTransitLegs(itinerary) {
    const streetModes = new Set(["WALK", "FOOT", "BIKE", "CAR"]);
    return (itinerary?.legs || []).filter(leg => !streetModes.has(leg.mode));
}
const TOKYO_LINE_NAMES = {
    JA: "JR 埼京線",
    JB: "JR 中央・総武線",
    JC: "JR 中央線快速",
    JE: "JR 京葉線",
    JH: "JR 横浜線",
    JK: "JR 京浜東北線",
    JL: "JR 常磐線",
    JM: "JR 武蔵野線",
    JN: "JR 南武線",
    JO: "JR 横須賀線",
    JS: "JR 湘南新宿ライン",
    JT: "JR 東海道線",
    JU: "JR 宇都宮線・高崎線",
    JY: "JR 山手線"
};

const TOKYO_TRANSIT_META = {
    JY: { ko: "JR 야마노테선", ja: "JR 山手線", en: "JR Yamanote Line", color: "#9acd32" },
    JK: { ko: "JR 게이힌토호쿠선", ja: "JR 京浜東北線", en: "JR Keihin-Tohoku Line", color: "#00b2e5" },
    JC: { ko: "JR 주오선 쾌속", ja: "JR 中央線快速", en: "JR Chuo Line (Rapid)", color: "#f15a22" },
    JB: { ko: "JR 주오·소부선", ja: "JR 中央・総武線", en: "JR Chuo-Sobu Line", color: "#ffd400" },
    JA: { ko: "JR 사이쿄선", ja: "JR 埼京線", en: "JR Saikyo Line", color: "#00ac9a" },
    JS: { ko: "JR 쇼난신주쿠라인", ja: "JR 湘南新宿ライン", en: "JR Shonan-Shinjuku Line", color: "#e21f26" },
    JT: { ko: "JR 도카이도선", ja: "JR 東海道線", en: "JR Tokaido Line", color: "#f68b1f" },
    JO: { ko: "JR 요코스카선", ja: "JR 横須賀線", en: "JR Yokosuka Line", color: "#0067c0" },
    JE: { ko: "JR 게이요선", ja: "JR 京葉線", en: "JR Keiyo Line", color: "#c9242f" },
    G:  { ko: "도쿄메트로 긴자선", ja: "東京メトロ銀座線", en: "Tokyo Metro Ginza Line", color: "#ffb300" },
    M:  { ko: "도쿄메트로 마루노우치선", ja: "東京メトロ丸ノ内線", en: "Tokyo Metro Marunouchi Line", color: "#e60012" },
    H:  { ko: "도쿄메트로 히비야선", ja: "東京メトロ日比谷線", en: "Tokyo Metro Hibiya Line", color: "#9caeb7" },
    T:  { ko: "도쿄메트로 도자이선", ja: "東京メトロ東西線", en: "Tokyo Metro Tozai Line", color: "#00a7db" },
    C:  { ko: "도쿄메트로 지요다선", ja: "東京メトロ千代田線", en: "Tokyo Metro Chiyoda Line", color: "#009944" },
    Y:  { ko: "도쿄메트로 유라쿠초선", ja: "東京メトロ有楽町線", en: "Tokyo Metro Yurakucho Line", color: "#d7c447" },
    Z:  { ko: "도쿄메트로 한조몬선", ja: "東京メトロ半蔵門線", en: "Tokyo Metro Hanzomon Line", color: "#9b7cb6" },
    N:  { ko: "도쿄메트로 난보쿠선", ja: "東京メトロ南北線", en: "Tokyo Metro Namboku Line", color: "#00ada9" },
    F:  { ko: "도쿄메트로 후쿠토신선", ja: "東京メトロ副都心線", en: "Tokyo Metro Fukutoshin Line", color: "#bb641d" },
    A:  { ko: "도에이 아사쿠사선", ja: "都営浅草線", en: "Toei Asakusa Line", color: "#e85298" },
    I:  { ko: "도에이 미타선", ja: "都営三田線", en: "Toei Mita Line", color: "#0079c2" },
    S:  { ko: "도에이 신주쿠선", ja: "都営新宿線", en: "Toei Shinjuku Line", color: "#6cbb5a" },
    E:  { ko: "도에이 오에도선", ja: "都営大江戸線", en: "Toei Oedo Line", color: "#b6007a" }
};

function getTransitousLineCode(leg) {
    const candidates = [leg?.routeShortName, leg?.route?.shortName, leg?.route?.routeShortName, leg?.line?.shortName, leg?.lineCode];
    for (const value of candidates) {
        const code = normalizeTransitLineCode(value);
        if (code && TOKYO_TRANSIT_META[code]) return code;
    }
    const name = String(getTransitousActualLineName(leg) || "");
    for (const [code, meta] of Object.entries(TOKYO_TRANSIT_META)) {
        if ([meta.ko, meta.ja, meta.en].some(v => v && name.toLowerCase().includes(v.toLowerCase().replace(/^jr\s*/i, "")))) return code;
    }
    return "";
}

function normalizeTransitColor(value) {
    const raw = String(value || "").trim().replace(/^#/, "");
    return /^[0-9a-fA-F]{6}$/.test(raw) ? `#${raw}` : "";
}

function getTransitousLineColor(leg) {
    const apiColor = [leg?.routeColor, leg?.route?.color, leg?.route?.routeColor, leg?.line?.color, leg?.transitLine?.color]
        .map(normalizeTransitColor).find(Boolean);
    if (apiColor) return apiColor;
    const code = getTransitousLineCode(leg);
    return TOKYO_TRANSIT_META[code]?.color || "#4285F4";
}

// 지도 위 경로는 실제 노선색 대신 치즈맵용 차분한 팔레트를 사용한다.
// 실제 노선색은 상세 경로의 작은 배지/라인 정보에만 남겨 가독성을 유지한다.
function getTransitousMapColor(leg) {
    const mode = String(leg?.mode || leg?.transportMode || leg?.route?.mode || "").toUpperCase();
    const lineName = [
        getTransitousActualLineName(leg),
        leg?.route?.shortName,
        leg?.route?.longName,
        leg?.category?.name
    ].filter(Boolean).join(" ").toUpperCase();

    if (/BUS|COACH/.test(mode) || /BUS|バス|버스/.test(lineName)) {
        return "#7C3AED"; // 버스: 보라
    }
    if (/SUBWAY|METRO/.test(mode) || /METRO|SUBWAY|地下鉄|メトロ|지하철|메트로/.test(lineName)) {
        return "#0F766E"; // 지하철: 청록
    }
    if (/TRAM|LIGHT_RAIL/.test(mode) || /TRAM|路面電車|市電|트램/.test(lineName)) {
        return "#0891B2"; // 노면전차: 청록-파랑
    }
    if (/FERRY|SHIP/.test(mode) || /FERRY|フェリー|船|페리/.test(lineName)) {
        return "#0284C7"; // 수상교통: 파랑
    }
    return "#2563EB"; // JR/철도: 차분한 파랑
}

function getLocalizedTransitLineName(leg) {
    const code = getTransitousLineCode(leg);
    const meta = TOKYO_TRANSIT_META[code];
    if (meta) return meta[currentLanguage] || meta.ja;
    return (
        getTransitousActualLineName(leg) ||
        cleanTransitousLineCandidate(leg?.category?.name) ||
        cleanTransitousLineCandidate(leg?.mode) ||
        rt("대중교통", "公共交通", "Transit")
    );
}


function normalizeTransitLineCode(value) {
    return String(value || "")
        .trim()
        .toUpperCase()
        .replace(/\s+/g, "");
}


function isTransitousInternalRouteId(value) {
    const text = String(value || "").trim();
    // Transitous/GTFS 내부 route id처럼 보이는 긴 숫자는 UI 노선명으로 사용하지 않는다.
    return /^\d{5,}$/.test(text);
}


function cleanTransitousLineCandidate(value) {
    if (value === null || value === undefined) {
        return "";
    }

    const text = String(value)
        .replace(/\s+/g, " ")
        .trim();

    if (!text || isTransitousInternalRouteId(text)) {
        return "";
    }

    if (/^(TRANSIT|RAIL|TRAIN|SUBWAY|METRO|TRAM|BUS|FERRY)$/i.test(text)) {
        return "";
    }

    if (/^https?:\/\//i.test(text)) {
        return "";
    }

    return text;
}


function collectTransitousLineCandidates(obj, path = "", depth = 0, out = []) {
    if (!obj || typeof obj !== "object" || depth > 5) {
        return out;
    }

    for (const [key, value] of Object.entries(obj)) {
        const nextPath = path ? `${path}.${key}` : key;
        const keyLower = key.toLowerCase();
        const pathLower = nextPath.toLowerCase();

        if (typeof value === "string" || typeof value === "number") {
            const candidate = cleanTransitousLineCandidate(value);
            if (!candidate) continue;

            const routeLikePath =
                /(route|line|service|product|network)/i.test(pathLower) &&
                /(name|label|short|long|display|code|text)/i.test(keyLower);

            const looksLikeHumanLineName =
                /(線|ライン|line|metro|subway|railway|express|新幹線|メトロ|地下鉄|電鉄|本線)/i.test(candidate);

            if (routeLikePath || looksLikeHumanLineName) {
                out.push({ value: candidate, path: nextPath });
            }
        } else if (value && typeof value === "object") {
            collectTransitousLineCandidates(value, nextPath, depth + 1, out);
        }
    }

    return out;
}


function getTransitousActualLineName(leg) {
    const explicitCandidates = [
        leg?.routeLongName,
        leg?.route?.longName,
        leg?.route?.routeLongName,
        leg?.route?.route_long_name,
        leg?.route?.displayName,
        leg?.route?.name,
        leg?.lineName,
        leg?.line?.longName,
        leg?.line?.displayName,
        leg?.line?.name,
        leg?.transitLine?.name,
        leg?.trip?.routeLongName,
        leg?.trip?.route?.longName,
        leg?.trip?.route?.name,
        leg?.serviceName,
        leg?.product?.name,
        leg?.displayName
    ];

    for (const value of explicitCandidates) {
        const cleaned = cleanTransitousLineCandidate(value);
        if (cleaned) return cleaned;
    }

    const shortCandidates = [
        leg?.routeShortName,
        leg?.route?.shortName,
        leg?.route?.routeShortName,
        leg?.route?.route_short_name,
        leg?.line?.shortName,
        leg?.lineCode
    ];

    for (const value of shortCandidates) {
        const cleaned = cleanTransitousLineCandidate(value);
        if (!cleaned) continue;

        const corrected = TOKYO_LINE_NAMES[normalizeTransitLineCode(cleaned)];
        if (corrected) return corrected;

        // 긴 숫자 내부 ID는 clean 단계에서 제거되고, 실제 단축 노선명만 여기까지 온다.
        return cleaned;
    }

    // API 버전에 따라 route/line 정보가 더 깊은 객체 안에 들어오는 경우를 대비해
    // 사람이 읽을 수 있는 노선명 후보를 재귀적으로 탐색한다.
    const deepCandidates = collectTransitousLineCandidates(leg);
    if (deepCandidates.length) {
        const best = deepCandidates.find(item =>
            /(線|ライン|line|metro|subway|railway|express|新幹線|メトロ|地下鉄|電鉄|本線)/i.test(item.value)
        ) || deepCandidates[0];

        return best.value;
    }

    const rawShort = String(
        leg?.routeShortName ||
        leg?.route?.shortName ||
        ""
    ).trim();

    if (rawShort && isTransitousInternalRouteId(rawShort)) {

    }

    return "";
}


function getTransitousLineName(leg) {
    const baseName =
        getTransitousActualLineName(leg) ||
        cleanTransitousLineCandidate(leg?.category?.name) ||
        cleanTransitousLineCandidate(leg?.mode) ||
        (currentLanguage === "ko" ? "대중교통" : "公共交通");

    const headsign =
        leg?.headsign ||
        leg?.trip?.headsign ||
        leg?.direction ||
        "";

    const directionText =
        headsign
            ? currentLanguage === "ko"
                ? ` · ${headsign} 방면`
                : ` · ${headsign}方面`
            : "";

    return `${baseName}${directionText}`;
}


function getTransitousSummaryLineName(leg) {
    return getLocalizedTransitLineName(leg);
}

async function geocodeTransitousRouteLocation(value) {
    if (
        value && typeof value === "object" &&
        Number.isFinite(Number(value.lat)) &&
        Number.isFinite(Number(value.lng))
    ) {
        return { ...value, lat: Number(value.lat), lng: Number(value.lng) };
    }

    const text = String(value || "").trim();
    if (!text) throw new Error("EMPTY_ROUTE_LOCATION");

    const params = new URLSearchParams({
        text,
        language: routeLanguagePreference(),
        place: `${TOKYO_STATION_POSITION.lat},${TOKYO_STATION_POSITION.lng}`,
        placeBias: "2",
        numResults: "8"
    });

    const response = await fetch(
        `https://api.transitous.org/api/v1/geocode?${params.toString()}`,
        { headers: { Accept: "application/json" } }
    );
    if (!response.ok) throw new Error(`TRANSITOUS_GEOCODE_HTTP_${response.status}`);

    const matches = await response.json();
    const arr = Array.isArray(matches) ? matches : [];
    const filtered = arr.filter(match => {
        const lat = Number(match?.lat);
        const lon = Number(match?.lon);
        const country = String(match?.country || "").toUpperCase();
        return country === "JP" || (
            Number.isFinite(lat) && Number.isFinite(lon) &&
            lat >= 30 && lat <= 46 && lon >= 129 && lon <= 146
        );
    });
    const best = filtered[0] || arr[0];
    if (!best || !Number.isFinite(Number(best.lat)) || !Number.isFinite(Number(best.lon))) {
        throw new Error("TRANSITOUS_GEOCODE_ZERO_RESULTS");
    }
    return {
        lat: Number(best.lat),
        lng: Number(best.lon),
        name: best.name || text,
        stopId: best.type === "STOP" ? best.id : null
    };
}

async function requestTransitousRoute(origin, destination) {
    origin = await geocodeTransitousRouteLocation(origin);
    destination = await geocodeTransitousRouteLocation(destination);

    const params = new URLSearchParams({
        fromPlace: origin.stopId || `${origin.lat},${origin.lng}`,
        toPlace: destination.stopId || `${destination.lat},${destination.lng}`,
        transitModes: "TRANSIT",
        directModes: "",
        preTransitModes: "WALK",
        postTransitModes: "WALK",
        detailedLegs: "true",
        detailedTransfers: "true",
        timetableView: "true",
        numItineraries: "5",
        maxItineraries: "5",
        language: routeLanguagePreference()
    });

    const response = await fetch(
        `https://api.transitous.org/api/v6/plan?${params.toString()}`,
        { headers: { Accept: "application/json" } }
    );

    if (!response.ok) {
        throw new Error(`TRANSITOUS_PLAN_HTTP_${response.status}`);
    }

    const data = await response.json();


    if (!Array.isArray(data?.itineraries) || !data.itineraries.length) {
        throw new Error("ZERO_TRANSIT_RESULTS");
    }

    return data;
}


function escapeTransitText(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function isTransitousWalkLeg(leg) {
    return ["WALK", "FOOT"].includes(
        String(leg?.mode || "").toUpperCase()
    );
}


function getTransitousPlaceName(place) {
    return (
        place?.name ||
        place?.stop?.name ||
        place?.station?.name ||
        place?.stopName ||
        ""
    );
}


function getTransitousPlatform(place) {
    const raw =
        place?.platformCode ||
        place?.platform ||
        place?.platformName ||
        place?.track ||
        place?.scheduledTrack ||
        place?.stop?.platformCode ||
        place?.stop?.platform ||
        place?.stop?.track ||
        "";

    const value = String(raw || "").trim();

    if (!value) {
        return "";
    }

    const alreadyHasLabel = /번|플랫폼|승강장|番線|ホーム|platform/i.test(value);

    if (alreadyHasLabel) {
        return value;
    }

    return currentLanguage === "ko"
        ? `${value}번 승강장`
        : `${value}番線`;
}


function getTransitousLegMinutes(leg) {
    if (Number.isFinite(Number(leg?.duration))) {
        return Math.max(1, Math.round(Number(leg.duration) / 60));
    }

    const start = new Date(leg?.startTime || leg?.departureTime || 0).getTime();
    const end = new Date(leg?.endTime || leg?.arrivalTime || 0).getTime();

    if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
        return Math.max(1, Math.round((end - start) / 60000));
    }

    return null;
}


function getTransitousStopCount(leg) {
    const directCount = [
        leg?.stopCount,
        leg?.numStops,
        leg?.stopsCount
    ].find(value => Number.isFinite(Number(value)));

    if (directCount !== undefined) {
        return Math.max(0, Number(directCount));
    }

    const intermediate =
        leg?.intermediateStops ||
        leg?.stopovers ||
        leg?.stops ||
        [];

    if (Array.isArray(intermediate) && intermediate.length) {
        // 중간역 배열에 출발/도착역이 포함되지 않는 경우가 많으므로 +1
        return Math.max(1, intermediate.length + 1);
    }

    return null;
}


function getTransitousHeadsign(leg) {
    return (
        leg?.headsign ||
        leg?.trip?.headsign ||
        leg?.direction ||
        ""
    );
}


function getTransitousLineBaseName(leg) {
    return getLocalizedTransitLineName(leg);
}


function renderTransitousLegDetail(leg, legIndex) {
    const fromName = escapeTransitText(getTransitousPlaceName(leg?.from));
    const toName = escapeTransitText(getTransitousPlaceName(leg?.to));
    const fromPlatform = escapeTransitText(getTransitousPlatform(leg?.from));
    const toPlatform = escapeTransitText(getTransitousPlatform(leg?.to));
    const startTime = formatTransitousTime(leg?.startTime || leg?.departureTime);
    const endTime = formatTransitousTime(leg?.endTime || leg?.arrivalTime);
    const minutes = getTransitousLegMinutes(leg);

    if (isTransitousWalkLeg(leg)) {
        const duration = minutes !== null ? rt(`약 ${minutes}분`, `約${minutes}分`, `About ${minutes} min`) : "";
        const walkMeta = [duration, fromName && toName ? `${fromName} → ${toName}` : ""].filter(Boolean).join(" · ");
        return `
            <div class="transit-detail-walk">
                <span class="transit-detail-icon"><i class="ti ti-walk"></i></span>
                <div>
                    <strong>${rt("도보 이동", "徒歩", "Walk")}</strong>
                    ${walkMeta ? `<span>${walkMeta}</span>` : ""}
                </div>
            </div>`;
    }

    const lineName = escapeTransitText(getTransitousLineBaseName(leg));
    const lineCode = escapeTransitText(getTransitousLineCode(leg));
    const lineColor = getTransitousLineColor(leg);
    const headsign = escapeTransitText(getTransitousHeadsign(leg));
    const stopCount = getTransitousStopCount(leg);
    const directionText = headsign ? rt(`${headsign} 방면`, `${headsign}方面`, `Toward ${headsign}`) : "";
    const stopCountText = stopCount !== null ? rt(`${stopCount}개 역`, `${stopCount}駅`, `${stopCount} stops`) : "";
    const durationText = minutes !== null ? rt(`약 ${minutes}분`, `約${minutes}分`, `About ${minutes} min`) : "";
    const rideMeta = [directionText, stopCountText, durationText].filter(Boolean).join(" · ");
    const departureMeta = [
        fromPlatform,
        startTime !== "--:--"
            ? rt(`${startTime} 출발`, `${startTime} 発`, `Departs ${startTime}`)
            : ""
    ].filter(Boolean).join(" · ");
    const arrivalMeta = [
        toPlatform,
        endTime !== "--:--"
            ? rt(`${endTime} 도착`, `${endTime} 着`, `Arrives ${endTime}`)
            : ""
    ].filter(Boolean).join(" · ");

    return `
        <div class="transit-detail-leg" style="--transit-line-color:${lineColor}">
            <div class="transit-detail-station">
                <span class="transit-station-dot"></span>
                <div>
                    <strong>${fromName || rt("출발역", "出発駅", "Departure stop")}</strong>
                    ${departureMeta ? `<span>${departureMeta}</span>` : ""}
                </div>
            </div>
            <div class="transit-detail-ride">
                <span class="transit-detail-icon"><i class="ti ti-train"></i></span>
                <div>
                    <div class="transit-line-title-row">
                        ${lineCode ? `<span class="transit-line-code" style="background:${lineColor}">${lineCode}</span>` : `<span class="transit-line-swatch" style="background:${lineColor}"></span>`}
                        <strong>${lineName}</strong>
                    </div>
                    ${rideMeta ? `<span class="transit-ride-meta">${rideMeta}</span>` : ""}
                </div>
            </div>
            <div class="transit-detail-station">
                <span class="transit-station-dot destination"></span>
                <div>
                    <strong>${toName || rt("도착역", "到着駅", "Arrival stop")}</strong>
                    ${arrivalMeta ? `<span>${arrivalMeta}</span>` : ""}
                </div>
            </div>
        </div>`;
}

function renderTransitousItineraryDetails(itinerary) {
    const legs = itinerary?.legs || [];

    if (!legs.length) {
        return "";
    }

    return `
        <div class="transit-route-details">
            <div class="transit-detail-header">
                <strong>${rt("상세 경로", "詳細ルート", "Route details")}</strong>
                <span>${rt("승강장 정보는 제공될 때만 표시", "番線情報は提供時のみ表示", "Platform info shown when available")}</span>
            </div>
            <div class="transit-detail-timeline">
                ${legs.map(renderTransitousLegDetail).join("")}
            </div>
        </div>
    `;
}


function renderTransitousResults(data) {
    if (!routeResult) {
        return;
    }

    transitousItineraries = data.itineraries.slice(0, 5);

    routeResult.innerHTML = transitousItineraries
        .map((it, index) => {
            const transitLegs = getTransitousTransitLegs(it);
            const lines = transitLegs
                .map(getTransitousSummaryLineName)
                .filter(Boolean)
                .filter(
                    (lineName, lineIndex, lineArray) =>
                        lineIndex === 0 ||
                        lineName !== lineArray[lineIndex - 1]
                )
                .join(" → ");

            const mins = Math.max(
                1,
                Math.round(Number(it.duration || 0) / 60)
            );

            const transferCount = Number(it.transfers || 0);
            const details = renderTransitousItineraryDetails(it);
            const lineChips = transitLegs.map(leg => ({
                name: getTransitousSummaryLineName(leg),
                code: getTransitousLineCode(leg),
                color: getTransitousLineColor(leg)
            })).filter((item, idx, arr) => item.name && (idx === 0 || item.name !== arr[idx - 1].name));
            const routeLabel = index === 0
                ? rt("추천", "おすすめ", "Recommended")
                : rt(`대안 ${index + 1}`, `候補 ${index + 1}`, `Option ${index + 1}`);

            return `
                <button
                    type="button"
                    class="route-option transit-route-option${index === 0 ? " active expanded" : ""}"
                    data-transit-route-index="${index}"
                    aria-expanded="${index === 0 ? "true" : "false"}"
                >
                    <div class="route-summary">
                        <div class="route-summary-main">
                            <strong>${rt(`${mins}분`, `${mins}分`, `${mins} min`)}</strong>
                            <span class="route-recommend-badge">${routeLabel}</span>
                        </div>
                        <span class="route-summary-time">
                            ${formatTransitousTime(it.startTime)} → ${formatTransitousTime(it.endTime)}
                            <b>·</b> ${rt(`환승 ${transferCount}회`, `乗換 ${transferCount}回`, `${transferCount} transfer${transferCount === 1 ? "" : "s"}`)}
                        </span>
                    </div>

                    <div class="route-line">
                        <span class="route-mode-icon"><i class="ti ti-train"></i></span>
                        <div class="route-line-chips">${lineChips.length ? lineChips.map(item => `<span class="route-line-chip"><i style="background:${item.color}"></i>${item.code ? `<b>${escapeTransitText(item.code)}</b>` : ""}<span>${escapeTransitText(item.name)}</span></span>`).join(`<em>→</em>`) : `<span>${escapeTransitText(rt("대중교통 경로", "公共交通ルート", "Transit route"))}</span>`}</div>
                        <i class="ti ti-chevron-down transit-route-chevron" aria-hidden="true"></i>
                    </div>

                    ${details}
                </button>
            `;
        })
        .join("");

    routeResult.classList.add("show");

    routeResult
        .querySelectorAll("[data-transit-route-index]")
        .forEach(button => {
            button.addEventListener("click", () => {
                selectTransitousRoute(
                    Number(button.dataset.transitRouteIndex)
                );
            });
        });
}


function drawTransitousRoute(it, fit = true) {
    if (!it || !googleMap) {
        return;
    }

    // 항상 기존에 그려진 경로를 먼저 완전히 제거한다.
    // 대안 1/2/3을 전환할 때 이전 대안의 선이 지도에 남지 않게 하는 핵심 처리다.
    clearRenderedRoute();

    // 이번에 선택된 단 하나의 itinerary가 만든 오버레이만 따로 모은다.
    // 전역 배열에 그때그때 push하지 않고 마지막에 한 번에 교체해서
    // 이전 대안의 polyline 참조가 섞이는 상황을 방지한다.
    const renderedPolylines = [];
    const renderedMarkers = [];
    const bounds = new google.maps.LatLngBounds();

    /*
        탑승 구간은 각 실제 철도/지하철 노선의 공식 색을 사용한다.
        API가 색을 주면 그 값을 우선하고, 없으면 도쿄 메트로/JR/도에이 노선 코드별 색을 사용한다.
        색을 알 수 없는 노선만 기본 Google 블루로 표시한다.
    */

    let previousLegEnd = null;

    const toLatLng = place => {
        const lat = Number(place?.lat ?? place?.latitude);
        const lng = Number(place?.lon ?? place?.lng ?? place?.longitude);
        return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
    };

    const pointDistanceMeters = (a, b) => {
        if (!a || !b) return Infinity;
        const rad = value => value * Math.PI / 180;
        const earth = 6371000;
        const dLat = rad(b.lat - a.lat);
        const dLng = rad(b.lng - a.lng);
        const lat1 = rad(a.lat);
        const lat2 = rad(b.lat);
        const h = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
        return 2 * earth * Math.asin(Math.min(1, Math.sqrt(h)));
    };

    /* API polyline이 비정상적으로 멀리 튀는 경우 지도 전체에 이상한 선이 생긴다.
       정상 경로는 그대로 두고, 명백한 좌표 튐만 버린다. */
    const isObviouslyBrokenPath = (path, legFrom, legTo, walk) => {
        if (!Array.isArray(path) || path.length < 2) return true;

        const directDistance = legFrom && legTo
            ? pointDistanceMeters(legFrom, legTo)
            : 0;

        // geometry 시작/끝이 실제 정류장·역 좌표와 지나치게 멀면 잘못된 polyline으로 본다.
        const endpointTolerance = walk
            ? Math.max(350, directDistance * 0.45)
            : Math.max(1200, directDistance * 0.45);

        if (
            legFrom &&
            pointDistanceMeters(legFrom, path[0]) > endpointTolerance
        ) {
            return true;
        }

        if (
            legTo &&
            pointDistanceMeters(path[path.length - 1], legTo) > endpointTolerance
        ) {
            return true;
        }

        // 인접한 점 하나가 갑자기 수 km 이상 점프하는 경우도 제거한다.
        const jumpLimit = walk
            ? Math.max(900, directDistance * 0.9)
            : Math.max(4500, directDistance * 1.15);

        for (let i = 1; i < path.length; i += 1) {
            if (pointDistanceMeters(path[i - 1], path[i]) > jumpLimit) {
                return true;
            }
        }

        return false;
    };

    const drawWalkDots = path => {
        if (!Array.isArray(path) || path.length < 2) return null;
        return new google.maps.Polyline({
            map: googleMap,
            path,
            strokeOpacity: 0,
            strokeWeight: 0,
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
            }],
            zIndex: 7
        });
    };

    (it.legs || []).forEach(leg => {
        const encoded =
            leg?.legGeometry?.points ||
            leg?.legGeometry;

        let path = [];
        if (typeof encoded === "string" && encoded) {
            path = decodeTransitousPolyline(encoded, 6);
        }

        const legFrom = toLatLng(leg?.from);
        const legTo = toLatLng(leg?.to);
        const walk = isTransitousWalkLeg(leg);

        if (path.length && isObviouslyBrokenPath(path, legFrom, legTo, walk)) {
            console.warn("비정상적으로 튀는 대중교통 geometry를 제외했습니다.", {
                from: leg?.from,
                to: leg?.to,
                route: leg?.route || leg?.line
            });
            path = [];
        }

        /* geometry가 없는 경우 직선으로 무조건 이어 버리면 복잡한 경로에서
           지도 전체를 가로지르는 이상한 선이 생길 수 있다.
           실제로 걸어가는 짧은 구간만 안전하게 점선 fallback을 허용한다. */
        if (!path.length && walk && legFrom && legTo) {
            const fallbackDistance = pointDistanceMeters(legFrom, legTo);

            if (fallbackDistance <= 1200) {
                path = [legFrom, legTo];
            }
        }

        if (!path.length) {
            previousLegEnd = null;
            return;
        }

        /* 연속 leg 사이의 아주 작은 좌표 오차만 점선으로 메운다.
           먼 구간까지 강제로 연결하면 복잡한 환승 경로에서 거대한 대각선이 생긴다. */
        if (previousLegEnd) {
            const gapDistance = pointDistanceMeters(previousLegEnd, path[0]);

            if (gapDistance > 8 && gapDistance <= 120) {
                const connector = drawWalkDots([previousLegEnd, path[0]]);
                if (connector) renderedPolylines.push(connector);
                bounds.extend(previousLegEnd);
                bounds.extend(path[0]);
            }
        }

        if (walk) {
            /* 환승 후 도보 구간: 파란 원형 점으로 또렷하게 표시 */
            const walkLine = drawWalkDots(path);
            if (walkLine) renderedPolylines.push(walkLine);
        } else {
            /* 크림색 halo를 깔아 지도 위에서 경로가 묻히지 않게 함 */
            const routeHalo = new google.maps.Polyline({
                map: googleMap,
                path,
                strokeColor: "#FFFFFF",
                strokeOpacity: 0.9,
                strokeWeight: 8,
                zIndex: 5
            });

            const routeLineColor = getTransitousLineColor(leg);
            const routeLine = new google.maps.Polyline({
                map: googleMap,
                path,
                strokeColor: routeLineColor,
                strokeOpacity: 1,
                strokeWeight: 5,
                zIndex: 6
            });

            renderedPolylines.push(routeHalo, routeLine);
        }

        path.forEach(point => bounds.extend(point));
        previousLegEnd = path[path.length - 1] || legTo || previousLegEnd;
    });

    const first = it.legs?.[0]?.from;
    const last = it.legs?.[it.legs.length - 1]?.to;

    const createRouteEndpointMarker = (position, type) => {
        const isStart = type === "start";
        const startInputValue =
            document.getElementById("startPoint")?.value || "";

        const markerText = isStart
            ? isCurrentLocationText(startInputValue)
                ? (currentLanguage === "ko" ? "현재 위치" : "現在地")
                : (currentLanguage === "ko" ? "출발" : "出発")
            : (currentLanguage === "ko" ? "도착" : "到着");

        const marker = createGoogleStyleRouteMarker({
            position,
            type: isStart ? "start" : "end",
            text: markerText,
            zIndex: 30,
            clickable: false
        });

        if (marker) {
            renderedMarkers.push(marker);
        }
    };

    if (first) {
        const position = {
            lat: Number(first.lat),
            lng: Number(first.lon)
        };

        if (Number.isFinite(position.lat) && Number.isFinite(position.lng)) {
            createRouteEndpointMarker(position, "start");
            bounds.extend(position);
        }
    }

    if (last) {
        const position = {
            lat: Number(last.lat),
            lng: Number(last.lon)
        };

        if (Number.isFinite(position.lat) && Number.isFinite(position.lng)) {
            createRouteEndpointMarker(position, "end");
            bounds.extend(position);
        }
    }

    // 선택된 대안 하나의 오버레이만 현재 경로로 등록한다.
    routePolylines = renderedPolylines;
    routeMarkers = renderedMarkers;

    if (fit && !bounds.isEmpty()) {
        googleMap.fitBounds(bounds, 70);
    }
}

function selectTransitousRoute(index) {
    const itinerary = transitousItineraries[index];

    if (!itinerary) {
        return;
    }

    drawTransitousRoute(itinerary, true);

    routeResult
        ?.querySelectorAll("[data-transit-route-index]")
        .forEach(button => {
            const selected =
                Number(button.dataset.transitRouteIndex) === index;

            button.classList.toggle("active", selected);
            button.classList.toggle("expanded", selected);
            button.setAttribute(
                "aria-expanded",
                selected ? "true" : "false"
            );
        });
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
        transitousItineraries = [];

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

        if (!RouteClass) {
            const { Route } = await google.maps.importLibrary("routes");
            RouteClass = Route;
        }

        // Google Route.computeRoutes 공식 요청 형식에 맞춰
        // 모드별로 필요한 필드만 보낸다. TRANSIT에는 자동차용 옵션을 섞지 않는다.
        const baseRequest = {
            origin: normalizeGoogleRouteLocation(origin),
            destination: normalizeGoogleRouteLocation(destination),
            travelMode,
            fields: [
                "path",
                "viewport",
                "routeLabels",
                "legs",
                "legs.steps",
                "legs.steps.distanceMeters",
                "legs.steps.staticDurationMillis",
                "legs.steps.startLocation",
                "legs.steps.endLocation",
                "legs.steps.instructions",
                "legs.steps.maneuver",
                "legs.steps.localizedValues",
                "legs.steps.travelMode",
                "travelAdvisory",
                "localizedValues"
            ]
        };

        // Google Maps Platform의 Routes API는 일본의 대중교통(TRANSIT) 경로를
        // 제공하지 않아 Tokyo에서 ZERO_RESULTS를 반환한다.
        // 따라서 일본 대중교통만 Transitous를 사용하고, 도보/자동차는 Google Routes를 사용한다.
        if (travelMode === "TRANSIT") {
            const transitData = await requestTransitousRoute(origin, destination);
            computedRoutes = [];
            renderTransitousResults(transitData);

            // 최초 검색 때도 대안 1만 선택해서 그린다.
            // 이후 대안 2/3 버튼을 누르면 selectTransitousRoute()가
            // 기존 선을 지우고 해당 대안 하나만 다시 그린다.
            selectTransitousRoute(0);

            mapRouteSelectionMode = false;
            mapRouteSelectionStep = 0;

            showToast(
                rt("대중교통 경로를 표시했습니다.", "公共交通ルートを表示しました。", "Transit route displayed.")
            );
            return;
        }

        const request = {
            ...baseRequest,
            computeAlternativeRoutes: true
        };
        const { routes = [] } = await RouteClass.computeRoutes(request);

        if (!routes.length) {
            throw new Error("ZERO_RESULTS");
        }

        computedRoutes = routes;

        await drawRoute(
            computedRoutes[0],
            true,
            travelMode
        );

        renderRouteResults(
            computedRoutes
        );

        mapRouteSelectionMode = false;
        mapRouteSelectionStep = 0;

        showToast(
            travelMode === "TRANSIT"
                ? (currentLanguage === "ko"
                    ? "Google 대중교통 경로를 표시했습니다."
                    : "Googleの公共交通ルートを表示しました。")
                : (rt("경로를 표시했습니다.", "ルートを表示しました.", "Route displayed."))
        );
    } catch (error) {
        const rawStatus =
            error?.code ||
            error?.message ||
            "UNKNOWN_ERROR";

        const status =
            String(rawStatus).length > 120
                ? String(rawStatus).slice(0, 117) + "..."
                : String(rawStatus);

        clearRenderedRoute();
        computedRoutes = [];

        if (routeResult) {
            routeResult.classList.remove("show");
        }

        const selectedMode =
            getSelectedTravelMode();

        const noTransitMessage =
            selectedMode === "TRANSIT" &&
            (
                status === "ZERO_RESULTS" ||
                String(status).includes("ZERO_RESULTS")
            );

        const geocodeFailed =
            String(status).includes(
                "GEOCODE_"
            );

        showToast(
            geocodeFailed
                ? rt("출발지 또는 도착지를 일본 지도에서 찾지 못했습니다. 역 이름이나 정확한 장소명을 입력해주세요.", "出発地または目的地が日本の地図で見つかりませんでした。駅名や正確な場所名を入力してください。", "Could not find the origin or destination in Japan. Enter a station or exact place name.")
                : noTransitMessage
                    ? rt("해당 출발지와 도착지 사이의 대중교통 경로가 없습니다. 같은 도시 안의 역이나 장소로 다시 확인해주세요.", "指定した出発地と目的地の間に公共交通ルートがありません。同じ都市内の駅や場所で確認してください。", "No transit route was found between these points. Check nearby stations or places.")
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
                transitousItineraries = [];
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
                originName = selectedGooglePoi.name;
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
            transitousItineraries = [];

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



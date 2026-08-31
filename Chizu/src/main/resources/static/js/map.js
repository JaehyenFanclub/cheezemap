
/* =====================================================
   커스텀 지도 마커
===================================================== */

function createCheeseMarkerClass() {
    if (CheeseMarker) {
        return;
    }

    CheeseMarker =
        class extends google.maps.OverlayView {
            constructor(options) {
                super();

                this.position =
                    options.position;

                this.placeKey =
                    options.placeKey;

                this.icon =
                    options.icon;

                this.category =
                    options.category || "tour";

                this.majorStation =
                    Boolean(options.majorStation);

                this.title =
                    options.title;

                this.visible = true;
                this.element = null;

                this.setMap(options.map);
            }


            onAdd() {
                const markerButton =
                    document.createElement(
                        "button"
                    );

                markerButton.type =
                    "button";

                markerButton.className =
                    `cheese-map-marker cheese-marker-${this.category}`;

                markerButton.title =
                    this.title;

                markerButton.setAttribute(
                    "aria-label",
                    this.title
                );

                markerButton.innerHTML = `
                    <i
                        class="ti ${this.icon}"
                        aria-hidden="true"
                    ></i>
                `;


                markerButton.addEventListener(
                    "click",
                    event => {
                        event.stopPropagation();

                        openPlace(
                            this.placeKey
                        );

                        googleMap?.panTo(
                            this.position
                        );

                        googleMap?.setZoom(15);
                    }
                );


                this.element =
                    markerButton;

                const panes =
                    this.getPanes();

                panes
                    ?.overlayMouseTarget
                    ?.appendChild(
                        markerButton
                    );
            }


            draw() {
                if (!this.element) {
                    return;
                }

                const projection =
                    this.getProjection();

                if (!projection) {
                    return;
                }

                const point =
                    projection
                        .fromLatLngToDivPixel(
                            this.position
                        );

                if (!point) {
                    return;
                }

                this.element.style.position =
                    "absolute";

                this.element.style.left =
                    `${point.x}px`;

                this.element.style.top =
                    `${point.y}px`;

                this.element.style.display =
                    this.visible
                        ? "flex"
                        : "none";
            }


            onRemove() {
                this.element?.remove();
                this.element = null;
            }


            setVisible(visible) {
                this.visible = visible;

                if (this.element) {
                    this.element.style.display =
                        visible
                            ? "flex"
                            : "none";
                }
            }
        };
}


/* =====================================================
   Google 지도 밝기별 스타일
===================================================== */

const LIGHT_MAP_STYLES = [];


/* =====================================================
   Google Cloud Map Style 카테고리 필터
   실제 Map ID는 js/map-style-config.js 에 입력합니다.
===================================================== */

const CATEGORY_MAP_ID_KEYS = {
    all: "all",
    food: "food",
    cafe: "cafe",
    convenience: "convenienceMedical",
    tour: "tour",
    transport: "transport"
};

function getCategoryMapId(category) {
    const key = CATEGORY_MAP_ID_KEYS[category] || "all";
    const value = window.CHEESE_MAP_IDS?.[key];
    return typeof value === "string" && value.trim() ? value.trim() : "";
}

function createCategoryMapOptions(center, zoom, category = "all") {
    const mapId = getCategoryMapId(category);
    const isDark = document.body.classList.contains("dark");
    const options = {
        center,
        zoom,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: false,
        clickableIcons: true,
        gestureHandling: "greedy",
        backgroundColor: isDark ? "#1d1c19" : "#f5f1e8"
    };

    if (mapId) {
        options.mapId = mapId;
        if (google.maps.ColorScheme) {
            options.colorScheme = isDark
                ? google.maps.ColorScheme.DARK
                : google.maps.ColorScheme.LIGHT;
        }
    } else {
        options.styles = isDark ? DARK_MAP_STYLES : [];
    }
    return options;
}

function bindGoogleMapRuntime() {
    createStationClickAreas();

    googleMap.addListener("click", handleGoogleMapClick);
    // Google 지도에서 역 이름 텍스트는 placeId가 잘 들어오지만,
    // JR/전철/지하철 아이콘은 placeId 없이 클릭되는 경우가 있다.
    // 그런 아이콘 클릭만 별도로 잡아서 주변의 실제 역 Place로 연결한다.
    googleMap.addListener("click", handleTransitPoiIconFallbackClick);
    googleMap.addListener("zoom_changed", refreshStationClickVisibility);
    googleMap.addListener("idle", () => {
        const toggle = document.getElementById("wheelchairToggle");
        if (toggle?.checked) scheduleWheelchairAccessibilitySearch();
    });
}



/* =====================================================
   Google 기본 전철/JR POI 아이콘 클릭 보정
===================================================== */

const nearbyTransitPoiCache = new Map();

function getGoogleMapClickDomLabel(event) {
    const target = event?.domEvent?.target;
    if (!target) return "";

    const labelled = target.closest?.("[aria-label], [title], [role='button']") || target;

    return [
        labelled?.getAttribute?.("aria-label"),
        labelled?.getAttribute?.("title"),
        labelled?.textContent,
        target?.getAttribute?.("aria-label"),
        target?.getAttribute?.("title")
    ]
        .filter(Boolean)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
}

function isTransitPoiIconClick(event) {
    if (event?.placeId || !event?.latLng) return false;

    const label = getGoogleMapClickDomLabel(event).toLowerCase();
    if (!label) return false;

    return /(^|\s)jr($|\s)|station|train|railway|subway|metro|transit|駅|電車|鉄道|地下鉄|전철|철도|지하철|(?:^|\s)역(?:$|\s)/i.test(label);
}

function normalizeTransitDisplayName(name = "") {
    return getPlaceDisplayName(String(name || "").trim());
}

function ensureTransitStationDisplaySuffix(name = "") {
    const raw = String(name || "").trim();
    if (!raw) {
        return currentLanguage === "ja"
            ? "駅"
            : currentLanguage === "en"
                ? "Station"
                : "역";
    }

    if (currentLanguage === "ja") {
        return /駅$/u.test(raw) ? raw : `${raw.replace(/\s*(駅|역|station)\s*$/iu, "").trim()}駅`;
    }

    if (currentLanguage === "en") {
        return /station$/iu.test(raw)
            ? raw
            : `${raw.replace(/\s*(駅|역|station)\s*$/iu, "").trim()} Station`;
    }

    return /역$/u.test(raw)
        ? raw
        : `${raw.replace(/\s*(駅|역|station)\s*$/iu, "").trim()}역`;
}

async function resolveNearbyTransitPoi(position) {
    if (!position || !window.google?.maps) return null;

    const lat = Number(position.lat);
    const lng = Number(position.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    // 같은 아이콘을 여러 번 눌러도 Places 요청을 반복하지 않도록 좌표 단위 캐시
    const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    if (nearbyTransitPoiCache.has(cacheKey)) {
        return nearbyTransitPoiCache.get(cacheKey);
    }

    try {
        const { Place } = await google.maps.importLibrary("places");
        let candidates = [];

        // Places API (New) Nearby Search가 사용 가능한 경우 가장 정확하게 주변 역만 찾는다.
        if (typeof Place.searchNearby === "function") {
            const response = await Place.searchNearby({
                fields: [
                    "id",
                    "displayName",
                    "location",
                    "primaryType",
                    "photos",
                    "rating",
                    "userRatingCount"
                ],
                locationRestriction: {
                    center: { lat, lng },
                    radius: 180
                },
                includedPrimaryTypes: [
                    "train_station",
                    "subway_station",
                    "transit_station"
                ],
                maxResultCount: 20,
                rankPreference: "DISTANCE",
                language: currentLanguage === "ko" ? "ko" : "ja",
                region: "JP"
            });

            candidates = response?.places || [];
        }

        // Nearby Search를 쓸 수 없는 환경이면 일본어 '駅' Text Search로 보조한다.
        if (!candidates.length && typeof Place.searchByText === "function") {
            const response = await Place.searchByText({
                textQuery: "駅",
                fields: [
                    "id",
                    "displayName",
                    "location",
                    "primaryType",
                    "photos",
                    "rating",
                    "userRatingCount"
                ],
                locationBias: {
                    center: { lat, lng },
                    radius: 250
                },
                language: "ja",
                region: "JP",
                maxResultCount: 20
            });

            candidates = response?.places || [];
        }

        const stationTypes = new Set([
            "train_station",
            "subway_station",
            "transit_station"
        ]);

        const ranked = candidates
            .map(candidate => {
                if (!candidate?.id || !candidate?.location) return null;

                const distance = distanceMetersBetween(position, candidate.location);
                if (!Number.isFinite(distance) || distance > 220) return null;

                const isStation = stationTypes.has(candidate.primaryType);
                const hasPhoto = Array.isArray(candidate.photos) && candidate.photos.length > 0;
                const reviewCount = Number(candidate.userRatingCount) || 0;

                // 아이콘 클릭에서는 '가장 가까운 실제 역'이 가장 중요하고,
                // 같은 거리대에서는 사진/평점 데이터가 있는 대표 Place를 조금 우대한다.
                let score = 1000 - Math.min(900, distance * 4);
                if (isStation) score += 350;
                if (hasPhoto) score += 80;
                if (reviewCount > 0) score += 60;

                return { candidate, distance, score };
            })
            .filter(Boolean)
            .sort((a, b) => b.score - a.score || a.distance - b.distance);

        const best = ranked[0]?.candidate || null;
        const result = best
            ? {
                placeId: best.id,
                name: String(best.displayName || "").trim(),
                position: best.location
                    ? {
                        lat: typeof best.location.lat === "function" ? best.location.lat() : Number(best.location.lat),
                        lng: typeof best.location.lng === "function" ? best.location.lng() : Number(best.location.lng)
                    }
                    : { lat, lng }
            }
            : null;

        nearbyTransitPoiCache.set(cacheKey, result);
        return result;
    } catch (error) {
        console.debug("전철/JR 아이콘 주변 역 검색 실패:", error);
        nearbyTransitPoiCache.set(cacheKey, null);
        return null;
    }
}

async function handleTransitPoiIconFallbackClick(event) {
    // 일반 POI/역 이름 텍스트 클릭은 기존 handleGoogleMapClick이 처리한다.
    if (!isTransitPoiIconClick(event)) return;

    // 길찾기에서 지도 목적지를 선택 중일 때는 기존 길찾기 클릭 처리를 방해하지 않는다.
    if (typeof isRoutePanelOpen === "function" && isRoutePanelOpen()) return;

    const clickPosition = event.latLng.toJSON();
    const station = await resolveNearbyTransitPoi(clickPosition);

    if (!station?.placeId) return;

    event.stop?.();

    const stationPosition = station.position || clickPosition;
    const stationName = String(station.name || "").trim();

    /*
        전철/JR 아이콘을 눌렀을 때는 주변의 다른 대표 장소로 Place ID 자체를
        갈아타지 않는다. 검색으로 찾은 실제 역 Place ID를 그대로 사용한다.

        단, 해당 역 Place의 photos가 비어 있는 경우에만 openGooglePoi 내부에서
        같은 역 이름/좌표의 다른 station 후보를 찾아 사진만 보충한다.
        이름/주소/평점/리뷰 수는 원래 역 Place의 값을 그대로 유지한다.
    */
    const stationDisplayName = ensureTransitStationDisplaySuffix(stationName);

    await openGooglePoi(
        station.placeId,
        stationPosition,
        stationName || (currentLanguage === "ko" ? "역" : "駅"),
        {
            forceTransportCategory: true,
            displayNameOverride: stationDisplayName,
            photoSearchNames: [stationName]
        }
    );
}


/* Map ID 전환 후 기존 오버레이를 새 지도에 다시 연결 */
function reattachMapObjectsAfterStyleSwitch() {
    if (!googleMap) return;

    if (currentLocationMarker?.setMap) currentLocationMarker.setMap(googleMap);

    cheeseMarkers.forEach(marker => {
        if (marker?.setMap) marker.setMap(googleMap);
    });

    wheelchairMarkers.forEach(marker => {
        if (marker?.setMap) marker.setMap(googleMap);
        else if (marker) marker.map = googleMap;
    });

    routePolylines.forEach(polyline => {
        if (polyline?.setMap) polyline.setMap(googleMap);
    });

    routeMarkers.forEach(marker => {
        if (marker?.setMap) marker.setMap(googleMap);
        else if (marker) marker.map = googleMap;
    });
}

function getActiveMapCategory() {
    return document.querySelector(
        ".filter-chip.active, .category-item.active"
    )?.dataset.category || "all";
}

function switchGoogleBasePoiCategory(category) {
    const mapId = getCategoryMapId(category);

    if (!mapId) {
        console.warn(`[CHEESE MAP] ${category} 카테고리 Map ID가 설정되지 않았습니다.`);
        showToast(
            currentLanguage === "ko"
                ? "Google Cloud Map ID를 설정하면 기본 POI 필터가 적용됩니다."
                : "Google Cloud Map IDを設定するとPOIフィルターが適用されます。"
        );
        return false;
    }

    const center = googleMap?.getCenter()?.toJSON?.() || { lat: 35.6896, lng: 139.7006 };
    const zoom = googleMap?.getZoom?.() || 13;
    const trafficWasVisible = Boolean(trafficLayer?.getMap?.());
    const mapElement = document.getElementById("googleMap");
    if (!mapElement) return false;

    clearStationClickAreas();
    googleMap = new google.maps.Map(
        mapElement,
        createCategoryMapOptions(center, zoom, category)
    );

    trafficLayer = new google.maps.TrafficLayer();
    if (trafficWasVisible) trafficLayer.setMap(googleMap);
    bindGoogleMapRuntime();
    reattachMapObjectsAfterStyleSwitch();

    return true;
}

const DARK_MAP_STYLES = [

    

    {
        elementType: "geometry",
        stylers: [
            { color: "#26241f" }
        ]
    },
    {
        elementType: "labels.text.fill",
        stylers: [
            { color: "#d8d0c2" }
        ]
    },
    {
        elementType: "labels.text.stroke",
        stylers: [
            { color: "#26241f" },
            { weight: 2 }
        ]
    },
    {
        featureType: "administrative",
        elementType: "geometry.stroke",
        stylers: [
            { color: "#4c4840" }
        ]
    },
    {
        featureType: "administrative.land_parcel",
        elementType: "labels.text.fill",
        stylers: [
            { color: "#8f887c" }
        ]
    },
    {
        featureType: "landscape",
        elementType: "geometry",
        stylers: [
            { color: "#26241f" }
        ]
    },
    {
        featureType: "landscape.man_made",
        elementType: "geometry",
        stylers: [
            { color: "#2e2b25" }
        ]
    },
    {
        featureType: "poi",
        elementType: "geometry",
        stylers: [
            { color: "#2d2a24" }
        ]
    },
    {
        featureType: "poi",
        elementType: "labels.text.fill",
        stylers: [
            { color: "#aaa294" }
        ]
    },
    {
        featureType: "poi.business",
        elementType: "labels.text.fill",
        stylers: [
            { color: "#928b80" }
        ]
    },
    {
        featureType: "poi.park",
        elementType: "geometry",
        stylers: [
            { color: "#2c3a2d" }
        ]
    },
    {
        featureType: "poi.park",
        elementType: "labels.text.fill",
        stylers: [
            { color: "#91a28b" }
        ]
    },
    {
        featureType: "road",
        elementType: "geometry",
        stylers: [
            { color: "#3c3932" }
        ]
    },
    {
        featureType: "road",
        elementType: "geometry.stroke",
        stylers: [
            { color: "#292720" }
        ]
    },
    {
        featureType: "road",
        elementType: "labels.text.fill",
        stylers: [
            { color: "#d3cbbb" }
        ]
    },
    {
        featureType: "road.arterial",
        elementType: "geometry",
        stylers: [
            { color: "#494437" }
        ]
    },
    {
        featureType: "road.highway",
        elementType: "geometry",
        stylers: [
            { color: "#6a5930" }
        ]
    },
    {
        featureType: "road.highway",
        elementType: "geometry.stroke",
        stylers: [
            { color: "#4f4328" }
        ]
    },
    {
        featureType: "road.highway",
        elementType: "labels.text.fill",
        stylers: [
            { color: "#f0dfa7" }
        ]
    },
    {
        featureType: "transit",
        elementType: "geometry",
        stylers: [
            { color: "#3a3730" }
        ]
    },
    {
        featureType: "transit.line",
        elementType: "geometry",
        stylers: [
            { color: "#59544b" }
        ]
    },
    {
        featureType: "water",
        elementType: "geometry",
        stylers: [
            { color: "#263d42" }
        ]
    },
    {
        featureType: "water",
        elementType: "labels.text.fill",
        stylers: [
            { color: "#88a8ad" }
        ]
    }
];


/* =====================================================
   현재 지역 - 브라우저 위치정보 + Google 역지오코딩
===================================================== */

let currentAreaAddressParts = null;
let currentAreaLocationState = "loading";

const TOKYO_WARD_KO = {
    "千代田区": "지요다구",
    "中央区": "주오구",
    "港区": "미나토구",
    "新宿区": "신주쿠구",
    "文京区": "분쿄구",
    "台東区": "다이토구",
    "墨田区": "스미다구",
    "江東区": "고토구",
    "品川区": "시나가와구",
    "目黒区": "메구로구",
    "大田区": "오타구",
    "世田谷区": "세타가야구",
    "渋谷区": "시부야구",
    "中野区": "나카노구",
    "杉並区": "스기나미구",
    "豊島区": "도시마구",
    "北区": "기타구",
    "荒川区": "아라카와구",
    "板橋区": "이타바시구",
    "練馬区": "네리마구",
    "足立区": "아다치구",
    "葛飾区": "가쓰시카구",
    "江戸川区": "에도가와구"
};

const PREFECTURE_KO = {
    "東京都": "도쿄도",
    "北海道": "홋카이도",
    "大阪府": "오사카부",
    "京都府": "교토부"
};

function getAddressComponent(components, types) {
    return components.find(component =>
        types.some(type => component.types?.includes(type))
    )?.long_name || "";
}

function normalizeCurrentAreaParts(result) {
    const components = result?.address_components || [];

    return {
        country: getAddressComponent(components, ["country"]),
        prefecture: getAddressComponent(components, ["administrative_area_level_1"]),
        city: getAddressComponent(components, [
            "locality",
            "administrative_area_level_2"
        ]),
        ward: getAddressComponent(components, [
            "sublocality_level_1",
            "sublocality"
        ]),
        formattedAddress: result?.formatted_address || ""
    };
}

function formatCurrentAreaName(parts) {
    if (!parts) {
        if (currentAreaLocationState === "loading") {
            return currentLanguage === "ja"
                ? "位置を確認中"
                : currentLanguage === "en"
                    ? "Checking location"
                    : "위치 확인 중";
        }

        return currentLanguage === "ja"
            ? "位置情報なし"
            : currentLanguage === "en"
                ? "Location unavailable"
                : "위치 정보 없음";
    }

    const district = parts.ward || parts.city;

    if (currentLanguage === "ko") {
        const prefecture = PREFECTURE_KO[parts.prefecture] || parts.prefecture;
        const koreanDistrict = TOKYO_WARD_KO[district] || district;
        const value = [prefecture, koreanDistrict].filter(Boolean).join(" ");
        return value || parts.formattedAddress || "현재 위치";
    }

    if (currentLanguage === "en") {
        const value = [district, parts.prefecture].filter(Boolean).join(", ");
        return value || parts.formattedAddress || "Current location";
    }

    const value = [parts.prefecture, district].filter(Boolean).join("");
    return value || parts.formattedAddress || "現在地";
}

function renderCurrentAreaName() {
    const element = document.getElementById("currentAreaName");
    if (!element) return;

    element.textContent = formatCurrentAreaName(currentAreaAddressParts);
    element.title = currentAreaAddressParts?.formattedAddress || "";
}

async function reverseGeocodeCurrentArea(position) {
    if (!window.google?.maps?.Geocoder) return null;

    const geocoder = new google.maps.Geocoder();
    const response = await geocoder.geocode({ location: position });
    const result = response.results?.[0];

    return result ? normalizeCurrentAreaParts(result) : null;
}

async function updateCurrentAreaFromPosition(position) {
    currentAreaLocationState = "loading";
    renderCurrentAreaName();

    try {
        currentAreaAddressParts =
            await reverseGeocodeCurrentArea(
                position
            );

        currentAreaLocationState =
            currentAreaAddressParts
                ? "ready"
                : "unavailable";
    } catch (error) {
        console.warn(
            "현재 지역 역지오코딩 실패:",
            error
        );

        currentAreaAddressParts = null;
        currentAreaLocationState = "unavailable";
    }

    renderCurrentAreaName();

    return currentAreaAddressParts;
}

window.updateCurrentAreaFromPosition =
    updateCurrentAreaFromPosition;

function refreshCurrentAreaFromGeolocation() {
    currentAreaLocationState = "loading";
    currentAreaAddressParts = null;
    renderCurrentAreaName();

    if (!navigator.geolocation) {
        currentAreaLocationState = "unavailable";
        renderCurrentAreaName();
        return;
    }

    navigator.geolocation.getCurrentPosition(
        async position => {
            const coords = {
                lat:
                    position.coords.latitude,
                lng:
                    position.coords.longitude
            };

            await updateCurrentAreaFromPosition(
                coords
            );
        },
        error => {
            console.warn("현재 위치를 가져오지 못했습니다:", error);
            currentAreaLocationState = "unavailable";
            renderCurrentAreaName();
        },
        {
            enableHighAccuracy: true,
            timeout: 8000,
            maximumAge: 300000
        }
    );
}

window.refreshCurrentAreaFromGeolocation = refreshCurrentAreaFromGeolocation;

function initGoogleMap() {
    const mapElement =
        document.getElementById(
            "googleMap"
        );

    if (
        !mapElement ||
        !window.google?.maps
    ) {
        console.error(
            "Google Maps API를 불러오지 못했습니다."
        );

        hideLoadingScreen();
        return;
    }



    const shinjuku = {
        lat: 35.6896,
        lng: 139.7006
    };


    googleMap = new google.maps.Map(
        mapElement,
        createCategoryMapOptions(shinjuku, 13, "all")
    );

    refreshCurrentAreaFromGeolocation();


    trafficLayer =
        new google.maps.TrafficLayer();


    // 역 클릭 영역 및 지도 이벤트 연결
    bindGoogleMapRuntime();


    google.maps.importLibrary("routes")
        .then(({ Route }) => {
            RouteClass = Route;
        })
        .catch(error => {
            console.error("Routes 라이브러리 로드 실패:", error);
            showToast(
                currentLanguage === "ko"
                    ? "경로 기능을 불러오지 못했습니다."
                    : "ルート機能を読み込めませんでした。"
            );
        });




    google.maps.event.addListenerOnce(
        googleMap,
        "idle",
        () => {
            const currentCenter = googleMap.getCenter();

            google.maps.event.trigger(
                googleMap,
                "resize"
            );

            if (currentCenter) {
                googleMap.setCenter(currentCenter);
            }

            requestAnimationFrame(() => {
                google.maps.event.trigger(
                    googleMap,
                    "resize"
                );

                if (currentCenter) {
                    googleMap.setCenter(currentCenter);
                }
            });

            const startPointInput =
                document.getElementById("startPoint");

            if (
                startPointInput &&
                (
                    !startPointInput.value.trim() ||
                    isCurrentLocationText(startPointInput.value)
                )
            ) {
                startPointInput.value =
                    currentLanguage === "ko"
                        ? "도쿄역"
                        : "東京駅";
            }

            hideLoadingScreen();
            showToast("toast.mapLoaded");

            /*
                지도 중심은 기존 설정을 유지하고,
                추천 장소만 실제 브라우저 현재 위치 800m를 사용합니다.
            */
            renderRecommendedPlaces(
                "all",
                {
                    force:
                        true
                }
            );
        }
    );
}


let mapResizeTimer = null;

window.addEventListener("resize", () => {
    clearTimeout(mapResizeTimer);

    mapResizeTimer = setTimeout(() => {
        if (!googleMap) {
            return;
        }

        const currentCenter = googleMap.getCenter();

        google.maps.event.trigger(
            googleMap,
            "resize"
        );

        if (currentCenter) {
            googleMap.setCenter(currentCenter);
        }
    }, 150);
});


window.initGoogleMap =
    initGoogleMap;


/* Google Maps API 인증 실패 */

window.gm_authFailure = function () {
    console.error(
        "Google Maps API 키 인증에 실패했습니다."
    );

    hideLoadingScreen();

    showToast(
        "Google Maps API 키를 확인해주세요."
    );
};


/* =====================================================
   지도 마커 생성
===================================================== */

function createCheeseMarkers() {
    /*
        음식점·카페·병원·관광지 등은 Google 기본 POI를 사용합니다.
        역은 일부 지도 라벨에서 placeId 클릭 이벤트가 발생하지 않으므로
        createStationClickAreas()가 투명 클릭 영역을 별도로 생성합니다.
    */
}


/* =====================================================
   역 전용 투명 클릭 영역
===================================================== */

function clearStationClickAreas() {
    stationClickMarkers.forEach(item => {
        item.marker.setMap(null);
    });

    stationClickMarkers.length = 0;
}


const stationGooglePlaceCache = new Map();

function distanceMetersBetween(a, b) {
    if (!a || !b) return Infinity;

    const lat1 = Number(a.lat);
    const lng1 = Number(a.lng);
    const lat2 = typeof b.lat === "function" ? b.lat() : Number(b.lat);
    const lng2 = typeof b.lng === "function" ? b.lng() : Number(b.lng);

    if (![lat1, lng1, lat2, lng2].every(Number.isFinite)) {
        return Infinity;
    }

    const toRad = value => value * Math.PI / 180;
    const earthRadius = 6371000;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const x = Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) ** 2;

    return 2 * earthRadius * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

async function resolveGoogleStationPlace(placeKey, place) {
    if (!place?.position) {
        return null;
    }

    const cached = stationGooglePlaceCache.get(placeKey);
    if (cached) {
        return cached;
    }

    const rawJa = String(place.name?.ja || "").trim();
    const rawKo = String(place.name?.ko || "").trim();
    const rawEn = String(place.name?.en || "").trim();
    const sourceName = rawJa || rawKo || rawEn;

    if (!sourceName) {
        return null;
    }

    /*
        Google 지도에서는 같은 역 주변에 이름 텍스트용 Place와
        JR/지하철 아이콘용 Place가 따로 존재할 수 있다.

        예)
        田町   <-> 田町駅
        東京   <-> 東京駅
        品川   <-> 品川駅

        역 아이콘을 눌렀을 때 빈 하위 Place를 그대로 쓰지 않고,
        '역/駅/Station'을 뺀 기본 이름이 같은 후보들 중에서
        사진/평점/리뷰 수가 가장 충실하고 좌표가 가까운 대표 Place를 선택한다.
        이렇게 하면 이름 텍스트와 역 아이콘을 눌러도 같은 상세정보로 연결된다.
    */
    const stripStationSuffix = value => String(value || "")
        .normalize("NFKC")
        .replace(/JR東日本|JR東海|JR西日本|JR|東京メトロ|都営地下鉄|都営/gi, "")
        .replace(/\s*(駅|역|station)\s*$/iu, "")
        .trim();

    const normalizeBaseName = value => stripStationSuffix(value)
        .replace(/[\s\-‐‑‒–—―・･·.,，。'"’“”()（）\[\]【】]/g, "")
        .toLowerCase();

    const rawNames = [...new Set([rawJa, rawKo, rawEn].filter(Boolean))];
    const baseNames = [...new Set(rawNames.map(stripStationSuffix).filter(Boolean))];
    const queries = [...new Set([...rawNames, ...baseNames])];
    const expectedBases = [...new Set(baseNames.map(normalizeBaseName).filter(Boolean))];

    const stationTypes = new Set([
        "train_station",
        "subway_station",
        "transit_station"
    ]);

    try {
        const { Place } = await google.maps.importLibrary("places");
        const candidatesById = new Map();

        for (const textQuery of queries) {
            try {
                const { places = [] } = await Place.searchByText({
                    textQuery,
                    fields: [
                        "id",
                        "displayName",
                        "location",
                        "primaryType",
                        "primaryTypeDisplayName",
                        "formattedAddress",
                        "rating",
                        "userRatingCount",
                        "photos"
                    ],
                    locationBias: {
                        center: place.position,
                        radius: 900
                    },
                    language: /[ぁ-んァ-ヶ一-龯駅]/u.test(textQuery) ? "ja" : undefined,
                    region: "JP",
                    maxResultCount: 20
                });

                places.forEach(candidate => {
                    if (candidate?.id && !candidatesById.has(candidate.id)) {
                        candidatesById.set(candidate.id, candidate);
                    }
                });
            } catch (queryError) {
                console.debug("역 대표 Place 검색 실패:", textQuery, queryError);
            }
        }

        const ranked = [...candidatesById.values()]
            .map(candidate => {
                if (!candidate?.id || !candidate?.location) return null;

                const distance = distanceMetersBetween(place.position, candidate.location);
                if (!Number.isFinite(distance) || distance > 900) return null;

                const candidateBase = normalizeBaseName(candidate.displayName);
                let nameScore = 0;

                for (const expected of expectedBases) {
                    if (!expected || !candidateBase) continue;
                    if (candidateBase === expected) {
                        nameScore = Math.max(nameScore, 1800);
                    } else if (
                        candidateBase.includes(expected) ||
                        expected.includes(candidateBase)
                    ) {
                        nameScore = Math.max(nameScore, 1200);
                    }
                }

                // 이름 뿌리가 다른 주변 장소는 절대 선택하지 않는다.
                if (nameScore < 1200) return null;

                const photos = Array.isArray(candidate.photos) ? candidate.photos : [];
                const reviewCount = Number(candidate.userRatingCount) || 0;
                const rating = Number(candidate.rating);
                const primaryType = String(candidate.primaryType || "").toLowerCase();
                const isStation = stationTypes.has(primaryType);

                let score = nameScore;
                if (photos.length > 0) score += 800;
                if (reviewCount > 0) score += 520;
                if (Number.isFinite(rating) && rating > 0) score += 120;
                if (isStation) score += 80;
                score += Math.min(260, Math.log10(reviewCount + 1) * 75);
                score -= Math.min(450, distance * 0.9);

                return {
                    candidate,
                    distance,
                    score,
                    hasPhotos: photos.length > 0,
                    reviewCount,
                    isStation
                };
            })
            .filter(Boolean)
            .sort((a, b) => b.score - a.score || a.distance - b.distance);

        const best = ranked.find(item => item.hasPhotos && item.reviewCount > 0) ||
            ranked.find(item => item.hasPhotos) ||
            ranked.find(item => item.reviewCount > 0) ||
            ranked[0];

        if (!best?.candidate?.id) {
            console.warn("동일 역 대표 Place 후보를 찾지 못했습니다:", sourceName);
            return null;
        }

        const candidate = best.candidate;
        const candidateDisplayName = String(candidate.displayName || sourceName).trim();
        const displayName = stripStationSuffix(candidateDisplayName) || candidateDisplayName;

        const result = {
            placeId: candidate.id,
            position: {
                lat: typeof candidate.location.lat === "function"
                    ? candidate.location.lat()
                    : Number(candidate.location.lat),
                lng: typeof candidate.location.lng === "function"
                    ? candidate.location.lng()
                    : Number(candidate.location.lng)
            },
            displayName,
            originalDisplayName: candidateDisplayName,
            sourceStationName: sourceName,
            distance: best.distance
        };

        console.debug("역/역명 동일 상세정보 연결:", {
            requested: sourceName,
            selected: candidateDisplayName,
            shownAs: displayName,
            primaryType: candidate.primaryType,
            placeId: candidate.id,
            photos: best.hasPhotos,
            reviews: best.reviewCount,
            distance: Math.round(best.distance)
        });

        stationGooglePlaceCache.set(placeKey, result);
        return result;
    } catch (error) {
        console.warn("역 대표 Google Place 검색 실패:", sourceName, error);
        return null;
    }
}

function createStationClickAreas() {
    /*
        역 위에 투명한 google.maps.Marker 클릭 영역을 덮어두면
        Google 기본 POI(JR/지하철/역 아이콘)의 실제 placeId 클릭을 가로채게 된다.

        그 결과:
        - 지도 글자(예: 新橋)는 Google Place 상세정보가 정상 표시되지만
        - JR/전철 아이콘은 로컬 places 데이터/별도 resolver를 타면서
          사진·리뷰가 비는 서로 다른 카드가 열릴 수 있었다.

        이제 투명 역 클릭 마커를 만들지 않고 Google 지도 기본 POI 클릭을
        그대로 사용한다. 그러면 아이콘이 실제 placeId를 제공하는 경우
        그 Place 자체의 상세정보를 openGooglePoi 흐름에서 사용할 수 있다.
    */
    clearStationClickAreas();
}


function refreshStationClickVisibility() {
    const zoom = googleMap?.getZoom() || 13;

    stationClickMarkers.forEach(item => {
        const place = places[item.placeKey];

        if (!place) {
            item.marker.setVisible(false);
            return;
        }

        let visible = true;

        if (zoom <= 10) {
            visible = false;
        } else if (zoom === 11) {
            visible = Boolean(place.majorStation);
        } else if (zoom === 12) {
            visible = Boolean(
                place.majorStation ||
                place.secondaryStation
            );
        }

        item.marker.setVisible(visible);
    });
}


/* =====================================================
   카테고리별 지도 마커 필터링
===================================================== */

function shouldShowStationMarker(item) {
    if (item.type !== "transport") {
        return true;
    }

    const zoom =
        googleMap?.getZoom() || 13;

    if (zoom <= 10) {
        return false;
    }

    if (zoom === 11) {
        return item.majorStation;
    }

    if (zoom === 12) {
        return (
            item.majorStation ||
            places[item.placeKey]?.secondaryStation
        );
    }

    return true;
}


function refreshMarkerVisibility() {
    const activeCategoryButton =
        document.querySelector(
            ".category-item.active, .filter-chip.active"
        );

    const category =
        activeCategoryButton?.dataset.category ||
        "all";

    cheeseMarkers.forEach(item => {
        const categoryVisible =
            category === "all" ||
            item.type === category;

        const zoomVisible =
            shouldShowStationMarker(item);

        item.marker.setVisible(
            categoryVisible &&
            zoomVisible
        );
    });
}


function filterMarkers(category) {
    /*
        Google 기본 POI는 지도 스타일이 관리하므로
        별도의 커스텀 마커 필터링을 하지 않습니다.
    */
}


/* =====================================================
   지도 위 카테고리 버튼 상태
===================================================== */

function updateCategoryButtons(category) {
    document
        .querySelectorAll(
            ".category-item, .filter-chip"
        )
        .forEach(button => {
            button.classList.toggle(
                "active",
                button.dataset.category ===
                    category
            );
        });
}


/* 카테고리 버튼 클릭 */

document
    .querySelectorAll(
        ".category-item, .filter-chip"
    )
    .forEach(button => {
        button.addEventListener(
            "click",
            () => {
                const category =
                    button.dataset.category;

                updateCategoryButtons(category);
                switchGoogleBasePoiCategory(category);
                filterMarkers(category);
                renderRecommendedPlaces(category);
            }
        );
    });
    /* =====================================================
   주변 추천 UI 보정
   index.html이 예전 구조여도 JS가 필요한 요소를 직접 만듭니다.
===================================================== */

function ensureNearbyRecommendationUi() {
    const panel = document.querySelector(".recommend-panel");
    if (!panel) return null;

    panel.id = panel.id || "recommendPanel";

    const header = panel.querySelector(".recommend-header");
    if (!header) return null;

    let titleArea = Array.from(header.children).find(child => child.querySelector?.("h2"));
    if (!titleArea) {
        titleArea = document.createElement("div");
        titleArea.innerHTML = `<small>NEARBY PICKS</small><h2>주변 추천 장소</h2>`;
        header.prepend(titleArea);
    }
    titleArea.classList.add("recommend-title-area");

    let context = document.getElementById("recommendContext");
    if (!context) {
        context = document.createElement("p");
        context.id = "recommendContext";
        context.className = "recommend-context";
        context.textContent = `현재 위치 기준 · ${RECOMMEND_RADIUS_METERS}m`;
        titleArea.appendChild(context);
    }

    let actions = header.querySelector(".recommend-header-actions");
    if (!actions) {
        actions = document.createElement("div");
        actions.className = "recommend-header-actions";
        const collapseButton = document.getElementById("hideRecommendButton");
        if (collapseButton) {
            header.appendChild(actions);
            actions.appendChild(collapseButton);
        } else {
            header.appendChild(actions);
        }
    }

    let refresh = document.getElementById("recommendRefreshButton");
    if (!refresh) {
        refresh = document.createElement("button");
        refresh.type = "button";
        refresh.id = "recommendRefreshButton";
        refresh.title = "현재 위치에서 추천 새로고침";
        refresh.setAttribute("aria-label", "현재 위치에서 추천 새로고침");
        refresh.innerHTML = '<i class="ti ti-current-location"></i>';
        actions.prepend(refresh);
        refresh.addEventListener("click", async event => {
            event.stopPropagation();
            nearbyRecommendationState.places = [];
            nearbyRecommendationState.center = null;
            nearbyRecommendationState.lastLoadedAt = 0;
            await renderRecommendedPlaces("all", { force: true });
        });
    }

    let mode = document.getElementById("recommendMode");
    if (!mode) {
        mode = document.createElement("div");
        mode.id = "recommendMode";
        mode.className = "recommend-mode";
        header.insertAdjacentElement("afterend", mode);
    }

    let list = document.getElementById("placeList");
    if (!list) {
        list = document.createElement("div");
        list.id = "placeList";
        list.className = "place-list";
        panel.appendChild(list);
    }

    if (!panel.dataset.recommendInitialized) {
        panel.classList.remove("collapsed");
        const collapseButton = document.getElementById("hideRecommendButton");
        if (collapseButton) {
            collapseButton.textContent = "−";
            collapseButton.setAttribute("aria-expanded", "true");
        }
        panel.dataset.recommendInitialized = "true";
    }

    return { panel, context, mode, list, refresh };
}

/* =====================================================
   주변 추천 장소
   - 실제 브라우저 현재 위치 기준 반경 800m
   - 위치 권한 거부/실패 시 도쿄역 기준
   - 로그인 사용자: 백엔드 GET /place/recommend 개인화 추천 우선
   - 개인화 결과 부족/오류: Google Places 주변 인기 장소로 보충
   - 비로그인 사용자: Google Places Nearby Search로 기본 추천
===================================================== */

const RECOMMEND_RADIUS_METERS = 800;
const RECOMMEND_AUDIENCE_STORAGE_KEY = "cheeseMapRecommendAudienceV1";

const nearbyRecommendationState = {
    places: [],
    center: null,
    centerSource: null,
    lastLoadedAt: 0,
    loadingPromise: null,
    recommendationSource: "none"
};

function getRecommendationAudience() {
    const saved = String(
        localStorage.getItem(RECOMMEND_AUDIENCE_STORAGE_KEY) || "personal"
    ).toLowerCase();

    return ["personal", "male", "female"].includes(saved)
        ? saved
        : "personal";
}

function setRecommendationAudience(audience) {
    const normalized = ["personal", "male", "female"].includes(audience)
        ? audience
        : "personal";

    localStorage.setItem(RECOMMEND_AUDIENCE_STORAGE_KEY, normalized);
    return normalized;
}

function getRecommendationNickname() {
    const nickname = String(
        currentUser?.nickname ||
        currentUser?.userNickname ||
        ""
    ).trim();

    if (nickname) return nickname;

    return currentLanguage === "ja"
        ? "自分"
        : currentLanguage === "en"
            ? "My"
            : "내";
}

function getRecommendationAudienceLabel(audience) {
    if (audience === "male") {
        return currentLanguage === "ja"
            ? "男性カテゴリ"
            : currentLanguage === "en"
                ? "Men's categories"
                : "남성 카테고리";
    }

    if (audience === "female") {
        return currentLanguage === "ja"
            ? "女性カテゴリ"
            : currentLanguage === "en"
                ? "Women's categories"
                : "여성 카테고리";
    }

    const nickname = getRecommendationNickname();

    if (currentLanguage === "ja") {
        return nickname === "自分"
            ? "自分向けカテゴリ"
            : `${nickname}さんのカテゴリ`;
    }

    if (currentLanguage === "en") {
        return nickname === "My"
            ? "My categories"
            : `${nickname}'s categories`;
    }

    return nickname === "내"
        ? "내 맞춤 카테고리"
        : `${nickname}님의 카테고리`;
}

function getRecommendationAudienceDescription(audience) {
    if (audience === "male") {
        return currentLanguage === "ja"
            ? "男性ユーザー全体の利用データを反映"
            : currentLanguage === "en"
                ? "Based on activity from male users"
                : "남성 사용자 전체의 이용 데이터 반영";
    }

    if (audience === "female") {
        return currentLanguage === "ja"
            ? "女性ユーザー全体の利用データを反映"
            : currentLanguage === "en"
                ? "Based on activity from female users"
                : "여성 사용자 전체의 이용 데이터 반영";
    }

    return currentLanguage === "ja"
        ? "レビュー · いいね · お気に入りなどを反映"
        : currentLanguage === "en"
            ? "Based on reviews, likes, favorites and more"
            : "리뷰 · 좋아요 · 즐겨찾기 등 내 활동 반영";
}

function getRecommendationAudienceBadge(audience) {
    if (audience === "male") {
        return currentLanguage === "ja"
            ? "男性全体"
            : currentLanguage === "en"
                ? "All men"
                : "남성 전체";
    }

    if (audience === "female") {
        return currentLanguage === "ja"
            ? "女性全体"
            : currentLanguage === "en"
                ? "All women"
                : "여성 전체";
    }

    return currentLanguage === "ja"
        ? "個人向け"
        : currentLanguage === "en"
            ? "Personal"
            : "개인 맞춤";
}

function getRecommendationAudienceIcon(audience) {
    if (audience === "male") {
        return "ti-user";
    }

    if (audience === "female") {
        return "ti-user-heart";
    }

    return "ti-sparkles";
}

function getRecommendationAudienceMenuTitle() {
    return currentLanguage === "ja"
        ? "おすすめ 기준 선택"
        : currentLanguage === "en"
            ? "Choose recommendation type"
            : "추천 기준 선택";
}

function getRecommendationAudienceMenuSubtitle() {
    return currentLanguage === "ja"
        ? "見たい 추천 방식을 선택하면 주변 추천 장소가 다시 정렬됩니다."
        : currentLanguage === "en"
            ? "Choose how nearby picks should be tailored."
            : "보고 싶은 추천 방식을 고르면 주변 추천 장소가 다시 정렬됩니다.";
}

function getActiveRecommendationMapCategory() {
    return (
        document.querySelector(
            ".category-item.active, .filter-chip.active"
        )?.dataset.category ||
        "all"
    );
}

function renderRecommendationAudienceControl() {
    const mode = document.getElementById("recommendMode");
    if (!mode) return;

    const audience = getRecommendationAudience();
    const options = ["personal", "male", "female"];

    mode.innerHTML = `
        <div class="recommend-audience-selector">
            <button
                type="button"
                class="recommend-audience-trigger"
                id="recommendAudienceTrigger"
                aria-expanded="false"
                aria-controls="recommendAudienceMenu"
            >
                <i class="ti ${getRecommendationAudienceIcon(audience)}"></i>
                <span>${escapeGroupHtml(getRecommendationAudienceLabel(audience))}</span>
                <i class="ti ti-chevron-down recommend-audience-chevron"></i>
            </button>

            <div
                class="recommend-audience-menu"
                id="recommendAudienceMenu"
                hidden
            >
                ${options.map(option => `
                    <button
                        type="button"
                        class="recommend-audience-option ${option === audience ? "active" : ""}"
                        data-audience="${option}"
                        data-recommend-audience="${option}"
                    >
                        <span class="recommend-audience-option-icon">
                            <i class="ti ${getRecommendationAudienceIcon(option)}"></i>
                        </span>
                        <span class="recommend-audience-option-label">
                            ${escapeGroupHtml(getRecommendationAudienceLabel(option))}
                        </span>
                        <span class="recommend-audience-option-check">
                            <i class="ti ${option === audience ? "ti-check" : "ti-chevron-right"}"></i>
                        </span>
                    </button>
                `).join("")}
            </div>
        </div>
    `;

    const trigger = mode.querySelector("#recommendAudienceTrigger");
    const menu = mode.querySelector("#recommendAudienceMenu");

    trigger?.addEventListener("click", event => {
        event.stopPropagation();
        const willOpen = Boolean(menu?.hidden);
        if (menu) menu.hidden = !willOpen;
        trigger.setAttribute("aria-expanded", String(willOpen));
        mode.classList.toggle("open", willOpen);
    });

    mode.querySelectorAll("[data-recommend-audience]").forEach(button => {
        button.addEventListener("click", async () => {
            const nextAudience = setRecommendationAudience(
                button.dataset.recommendAudience
            );

            if (menu) menu.hidden = true;
            trigger?.setAttribute("aria-expanded", "false");
            mode.classList.remove("open");

            nearbyRecommendationState.recommendationSource = "none";
            nearbyRecommendationState.places = [];
            nearbyRecommendationState.lastLoadedAt = 0;

            renderRecommendationAudienceControl();

            await renderRecommendedPlaces(
                getActiveRecommendationMapCategory(),
                { force: true, audience: nextAudience }
            );
        });
    });
}

function getRecommendationSettings() {
    if (typeof readCheeseSettings === "function") {
        return readCheeseSettings();
    }

    try {
        return JSON.parse(
            localStorage.getItem(
                "cheeseMapSettings"
            ) || "{}"
        );
    } catch {
        return {};
    }
}

function getRecommendationGender() {
    const sex =
        currentUser?.sex;

    /*
        현재 프로젝트 회원가입 매핑:
        남성 = true
        여성 = false

        문자열 응답에도 대응합니다.
    */
    if (
        sex === true ||
        sex === 1 ||
        String(sex).toLowerCase() === "true" ||
        String(sex).toLowerCase() === "male" ||
        String(sex) === "남" ||
        String(sex) === "남성"
    ) {
        return "male";
    }

    if (
        sex === false ||
        sex === 0 ||
        String(sex).toLowerCase() === "false" ||
        String(sex).toLowerCase() === "female" ||
        String(sex) === "여" ||
        String(sex) === "여성"
    ) {
        return "female";
    }

    return "neutral";
}

function normalizeRecommendationText(value) {
    if (
        value &&
        typeof value === "object"
    ) {
        return (
            value[currentLanguage] ||
            value.ko ||
            value.ja ||
            value.en ||
            ""
        );
    }

    return String(
        value || ""
    );
}

function calculateDistanceMeters(
    pointA,
    pointB
) {
    const toRad =
        degree =>
            degree *
            Math.PI /
            180;

    const lat1 =
        Number(
            pointA?.lat
        );

    const lng1 =
        Number(
            pointA?.lng
        );

    const lat2 =
        Number(
            pointB?.lat
        );

    const lng2 =
        Number(
            pointB?.lng
        );

    if (
        ![
            lat1,
            lng1,
            lat2,
            lng2
        ].every(Number.isFinite)
    ) {
        return Number.POSITIVE_INFINITY;
    }

    const earthRadius =
        6371000;

    const dLat =
        toRad(
            lat2 - lat1
        );

    const dLng =
        toRad(
            lng2 - lng1
        );

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) ** 2;

    return (
        earthRadius *
        2 *
        Math.atan2(
            Math.sqrt(a),
            Math.sqrt(1 - a)
        )
    );
}

function locationToPlainObject(
    location
) {
    if (!location) {
        return null;
    }

    const lat =
        typeof location.lat ===
        "function"
            ? location.lat()
            : Number(
                location.lat
            );

    const lng =
        typeof location.lng ===
        "function"
            ? location.lng()
            : Number(
                location.lng
            );

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

function getRecommendationCategory(
    place
) {
    const type =
        String(
            place?.primaryType ||
            ""
        ).toLowerCase();

    const name =
        String(
            place?.displayName ||
            ""
        ).toLowerCase();

    const text =
        `${type} ${name}`;

    if (
        /karaoke|カラオケ|노래방/.test(
            text
        )
    ) {
        return "karaoke";
    }

    if (
        /ramen|ラーメン|라멘/.test(
            text
        )
    ) {
        return "ramen";
    }

    if (
        /izakaya|居酒屋|이자카야/.test(
            text
        )
    ) {
        return "izakaya";
    }

    if (
        /yakiniku|焼肉|야키니쿠|barbecue/.test(
            text
        )
    ) {
        return "yakiniku";
    }

    if (
        /night_club|bar|pub|バー|바\b/.test(
            text
        )
    ) {
        return "nightlife";
    }

    if (
        /amusement|arcade|game|ゲーム|오락|게임/.test(
            text
        )
    ) {
        return "amusement";
    }

    if (
        /cafe|coffee|カフェ|喫茶|카페|커피/.test(
            text
        )
    ) {
        return "cafe";
    }

    if (
        /bakery|dessert|ice_cream|ベーカリー|スイーツ|디저트|베이커리/.test(
            text
        )
    ) {
        return "dessert";
    }

    if (
        /shopping|department_store|mall|clothing|store|ショッピング|百貨店|쇼핑|백화점/.test(
            text
        )
    ) {
        return "shopping";
    }

    if (
        /museum|art_gallery|gallery|博物館|美術館|박물관|미술관/.test(
            text
        )
    ) {
        return "culture";
    }

    if (
        /park|garden|公園|庭園|공원/.test(
            text
        )
    ) {
        return "park";
    }

    if (
        /restaurant|food|meal|japanese_restaurant|レストラン|料理|음식|식당/.test(
            text
        )
    ) {
        return "restaurant";
    }

    return "other";
}

function getRecommendationCategoryLabel(
    place
) {
    const type =
        getRecommendationCategory(
            place
        );

    const labels = {
        karaoke: {
            ko: "노래방",
            ja: "カラオケ",
            en: "Karaoke"
        },
        ramen: {
            ko: "라멘",
            ja: "ラーメン",
            en: "Ramen"
        },
        izakaya: {
            ko: "이자카야",
            ja: "居酒屋",
            en: "Izakaya"
        },
        yakiniku: {
            ko: "야키니쿠",
            ja: "焼肉",
            en: "Yakiniku"
        },
        nightlife: {
            ko: "바 · 술집",
            ja: "バー",
            en: "Bar"
        },
        amusement: {
            ko: "오락",
            ja: "アミューズメント",
            en: "Amusement"
        },
        cafe: {
            ko: "카페",
            ja: "カフェ",
            en: "Cafe"
        },
        dessert: {
            ko: "디저트",
            ja: "スイーツ",
            en: "Dessert"
        },
        shopping: {
            ko: "쇼핑",
            ja: "ショッピング",
            en: "Shopping"
        },
        culture: {
            ko: "문화 · 전시",
            ja: "文化・展示",
            en: "Culture"
        },
        park: {
            ko: "공원",
            ja: "公園",
            en: "Park"
        },
        restaurant: {
            ko: "음식점",
            ja: "レストラン",
            en: "Restaurant"
        },
        other: {
            ko: "주변 장소",
            ja: "周辺スポット",
            en: "Nearby"
        }
    };

    const language =
        ["ko", "ja", "en"].includes(
            currentLanguage
        )
            ? currentLanguage
            : "ko";

    return (
        labels[type]?.[language] ||
        place?.primaryTypeDisplayName ||
        labels.other[language]
    );
}

function getRecommendationGenderWeight(
    place,
    gender,
    useGender
) {
    /*
        성별 추천은 프론트 하드코딩으로 계산하지 않습니다.
        남성/여성 선택 시 백엔드 PlacePreference 집계 결과의
        serverScore / hitCount를 그대로 사용합니다.
        Google fallback에서는 성별에 대한 추측 가중치를 넣지 않습니다.
    */
    return 0;
}

function getRecommendationScore(
    place,
    center,
    useGender,
    gender
) {
    if (place?.recommendationSource === "backend") {
        return {
            score: Number(place.serverScore) || 0,
            distance: Number(place.serverDistanceMeters) || 0,
            genderScore: 0
        };
    }

    const point =
        locationToPlainObject(
            place.location
        );

    const distance =
        calculateDistanceMeters(
            center,
            point
        );

    const rating =
        Number(
            place.rating
        );

    const reviewCount =
        Number(
            place.userRatingCount
        );

    /*
        기본 점수
        - 거리      42점
        - 평점      25점
        - 리뷰 수   15점
        - 성별 가중 18점

        총점 100점 안팎
    */
    const distanceScore =
        Number.isFinite(
            distance
        )
            ? Math.max(
                0,
                42 *
                (
                    1 -
                    distance /
                    RECOMMEND_RADIUS_METERS
                )
            )
            : 0;

    const ratingScore =
        Number.isFinite(
            rating
        )
            ? Math.max(
                0,
                Math.min(
                    25,
                    rating /
                    5 *
                    25
                )
            )
            : 0;

    const reviewScore =
        Number.isFinite(
            reviewCount
        ) &&
        reviewCount > 0
            ? Math.min(
                15,
                Math.log10(
                    reviewCount + 1
                ) /
                4 *
                15
            )
            : 0;

    const genderScore =
        getRecommendationGenderWeight(
            place,
            gender,
            useGender
        );

    return {
        score:
            distanceScore +
            ratingScore +
            reviewScore +
            genderScore,

        distance,
        genderScore
    };
}

function getRecommendationModeText(
    useGender,
    gender
) {
    if (!useGender) {
        return currentLanguage === "ja"
            ? "距離・評価・レビュー数でおすすめ"
            : currentLanguage === "en"
                ? "Ranked by distance, rating and reviews"
                : "거리 · 평점 · 리뷰 수 기준";
    }

    if (gender === "male") {
        return currentLanguage === "ja"
            ? "男性ユーザーの利用データを反映"
            : currentLanguage === "en"
                ? "Based on male user activity"
                : "남성 사용자 이용 데이터 기반";
    }

    if (gender === "female") {
        return currentLanguage === "ja"
            ? "女性ユーザーの利用データを反映"
            : currentLanguage === "en"
                ? "Based on female user activity"
                : "여성 사용자 이용 데이터 기반";
    }

    return currentLanguage === "ja"
        ? "距離・評価・レビュー数でおすすめ"
        : currentLanguage === "en"
            ? "Ranked by distance, rating and reviews"
            : "거리 · 평점 · 리뷰 수 기준";
}

function getRecommendationCenterText() {
    if (
        nearbyRecommendationState.centerSource ===
        "geolocation"
    ) {
        return currentLanguage === "ja"
            ? `現在地から ${RECOMMEND_RADIUS_METERS}m`
            : currentLanguage === "en"
                ? `Within ${RECOMMEND_RADIUS_METERS}m of your location`
                : `현재 위치 기준 · ${RECOMMEND_RADIUS_METERS}m`;
    }

    return currentLanguage === "ja"
        ? `東京駅から ${RECOMMEND_RADIUS_METERS}m · 位置情報の代替`
        : currentLanguage === "en"
            ? `${RECOMMEND_RADIUS_METERS}m from Tokyo Station · location fallback`
            : `도쿄역 기준 · ${RECOMMEND_RADIUS_METERS}m · 위치 권한 대체`;
}

function getCurrentPositionForRecommendations() {
    return new Promise(resolve => {
        const fallback = {
            lat:
                Number(
                    TOKYO_STATION_POSITION?.lat
                ) ||
                35.681236,

            lng:
                Number(
                    TOKYO_STATION_POSITION?.lng
                ) ||
                139.767125
        };

        if (
            !navigator.geolocation
        ) {
            resolve({
                center:
                    fallback,
                source:
                    "tokyo"
            });

            return;
        }

        navigator.geolocation
            .getCurrentPosition(
                position => {
                    resolve({
                        center: {
                            lat:
                                position.coords.latitude,
                            lng:
                                position.coords.longitude
                        },

                        source:
                            "geolocation"
                    });
                },

                () => {
                    resolve({
                        center:
                            fallback,
                        source:
                            "tokyo"
                    });
                },

                {
                    enableHighAccuracy:
                        true,

                    timeout:
                        7000,

                    maximumAge:
                        120000
                }
            );
    });
}

async function searchGoogleNearbyRecommendationPlaces() {
    const {
        Place,
        SearchNearbyRankPreference
    } = await google.maps.importLibrary("places");

    const result = await Place.searchNearby({
        fields: [
            "id",
            "displayName",
            "formattedAddress",
            "location",
            "primaryType",
            "primaryTypeDisplayName",
            "rating",
            "userRatingCount",
            "businessStatus",
            "photos"
        ],
        locationRestriction: {
            center: nearbyRecommendationState.center,
            radius: RECOMMEND_RADIUS_METERS
        },
        maxResultCount: 20,
        rankPreference: SearchNearbyRankPreference.POPULARITY,
        language:
            currentLanguage === "ja"
                ? "ja"
                : currentLanguage === "en"
                    ? "en"
                    : "ko"
    });

    return (result.places || []).filter(place => {
        const point = locationToPlainObject(place.location);
        const distance = calculateDistanceMeters(
            nearbyRecommendationState.center,
            point
        );

        return Boolean(
            place?.id &&
            point &&
            distance <= RECOMMEND_RADIUS_METERS
        );
    });
}

async function loadNearbyRecommendationPlaces(
    force = false,
    audience = getRecommendationAudience()
) {
    const now = Date.now();
    const loggedIn = Boolean(getAuthToken());
    const wantsPersonalBackend = loggedIn && audience === "personal";
    const wantsGenderBackend = loggedIn && (audience === "male" || audience === "female");
    const wantsBackend = wantsPersonalBackend || wantsGenderBackend;
    const expectedRecommendationSource = wantsBackend
        ? (wantsGenderBackend ? `backend-${audience}` : "backend-personal")
        : "google";

    if (
        !force &&
        nearbyRecommendationState.recommendationSource === expectedRecommendationSource &&
        nearbyRecommendationState.places.length &&
        now - nearbyRecommendationState.lastLoadedAt < 120000
    ) {
        return nearbyRecommendationState.places;
    }

    if (!force && nearbyRecommendationState.loadingPromise) {
        return nearbyRecommendationState.loadingPromise;
    }

    nearbyRecommendationState.loadingPromise = (async () => {
        if (!googleMap || !window.google?.maps) {
            return [];
        }

        const locationResult = await getCurrentPositionForRecommendations();
        nearbyRecommendationState.center = locationResult.center;
        nearbyRecommendationState.centerSource = locationResult.source;

        /*
            추천 기준별 백엔드 API
            - personal: 현재 로그인 사용자의 개인화 추천
            - male/female: 전체 남성/여성 사용자의 PlacePreference 집계 추천

            성별 API가 아직 배포되지 않았거나 API가 실패하면
            프론트에서 임의의 남/여 취향을 하드코딩하지 않고
            Google 주변 인기 장소만 fallback으로 보여줍니다.
        */
        if (wantsBackend) {
            try {
                const query = new URLSearchParams({
                    lat: String(nearbyRecommendationState.center.lat),
                    lng: String(nearbyRecommendationState.center.lng),
                    radius: String(RECOMMEND_RADIUS_METERS),
                    limit: "20"
                });

                let endpoint = `/place/recommend?${query.toString()}`;

                if (wantsGenderBackend) {
                    query.set(
                        "gender",
                        audience === "male" ? "MALE" : "FEMALE"
                    );
                    endpoint = `/place/recommend/gender?${query.toString()}`;
                }

                const rows = await apiRequest(endpoint, {
                    auth: true
                });

                nearbyRecommendationState.recommendationSource = expectedRecommendationSource;
                nearbyRecommendationState.places = (Array.isArray(rows) ? rows : [])
                    .map(row => ({
                        id: `backend_${row.placeId}`,
                        backendPlaceId: Number(row.placeId),
                        googlePlaceId: row.googlePlaceId || "",
                        displayName: row.placeName || `장소 #${row.placeId}`,
                        formattedAddress: row.placeAddress || "",
                        location: {
                            lat: Number(row.placeLatitude),
                            lng: Number(row.placeLongitude)
                        },
                        primaryType: row.placeCategory || "other",
                        primaryTypeDisplayName: row.placeCategory || "",
                        rating: Number(row.avgRating),
                        userRatingCount: Number(row.reviewCount),
                        hitCount: Number(row.hitCount),
                        serverDistanceMeters: Number(row.distanceMeters),
                        serverScore: Number(row.score),
                        recommendationSource: "backend",
                        recommendationAudience: audience
                    }))
                    .filter(place => {
                        const point = locationToPlainObject(place.location);
                        return (
                            Number.isFinite(place.backendPlaceId) &&
                            place.backendPlaceId > 0 &&
                            point
                        );
                    });

                nearbyRecommendationState.lastLoadedAt = Date.now();
                return nearbyRecommendationState.places;
            } catch (error) {
                console.warn(
                    audience === "personal"
                        ? "개인화 추천 API 실패 - Google 주변추천으로 전환:"
                        : `${audience === "male" ? "남성" : "여성"} 사용자 추천 API 실패 - Google 주변추천으로 전환:`,
                    error
                );
            }
        }

        nearbyRecommendationState.recommendationSource = "google";
        nearbyRecommendationState.places = await searchGoogleNearbyRecommendationPlaces();
        nearbyRecommendationState.lastLoadedAt = Date.now();

        return nearbyRecommendationState.places;
    })()
        .catch(error => {
            console.error("주변 추천 장소 검색 실패:", error);
            throw error;
        })
        .finally(() => {
            nearbyRecommendationState.loadingPromise = null;
        });

    return nearbyRecommendationState.loadingPromise;
}

function doesRecommendationMatchMapCategory(
    place,
    category
) {
    if (
        !category ||
        category === "all"
    ) {
        return true;
    }

    const recommendationCategory =
        getRecommendationCategory(
            place
        );

    const mapping = {
        food: [
            "restaurant",
            "ramen",
            "izakaya",
            "yakiniku"
        ],
        cafe: [
            "cafe",
            "dessert"
        ],
        shopping: [
            "shopping"
        ],
        tour: [
            "culture",
            "park",
            "amusement",
            "other"
        ],
        park: [
            "park"
        ]
    };

    return (
        mapping[category]
            ?.includes(
                recommendationCategory
            ) ??
        true
    );
}

function renderRecommendationLoading() {
    ensureNearbyRecommendationUi();

    const list =
        document.getElementById(
            "placeList"
        );

    if (!list) {
        return;
    }

    list.innerHTML = `
        <div class="recommend-loading">
            <span class="recommend-spinner"></span>
            <p>
                ${
                    currentLanguage === "ja"
                        ? "現在地からおすすめを探しています。"
                        : currentLanguage === "en"
                            ? "Finding places near you."
                            : "현재 위치에서 추천 장소를 찾고 있어요."
                }
            </p>
        </div>
    `;
}

function renderRecommendationError(
    error
) {
    const list =
        document.getElementById(
            "placeList"
        );

    if (!list) {
        return;
    }

    const message =
        String(
            error?.message ||
            error ||
            ""
        );

    const quota =
        /quota|429|RESOURCE_EXHAUSTED/i
            .test(
                message
            );

    list.innerHTML = `
        <div class="recommend-empty">
            <i class="ti ti-map-off"></i>

            <strong>
                ${
                    quota
                        ? "Places API 할당량을 확인해주세요."
                        : "추천 장소를 불러오지 못했습니다."
                }
            </strong>

            <small>
                ${
                    quota
                        ? "Google Places API 사용량이 초기화되면 다시 시도할 수 있어요."
                        : "위치 권한 또는 Places API 설정을 확인해주세요."
                }
            </small>
        </div>
    `;
}

async function renderRecommendedPlaces(
    category = "all",
    options = {}
) {
    ensureNearbyRecommendationUi();

    const list =
        document.getElementById(
            "placeList"
        );

    const context =
        document.getElementById(
            "recommendContext"
        );

    const mode =
        document.getElementById(
            "recommendMode"
        );

    if (!list) {
        return;
    }

    const settings =
        getRecommendationSettings();

    const audience =
        options.audience ||
        getRecommendationAudience();

    renderRecommendationAudienceControl();

    if (
        settings.recommendVisible ===
        false
    ) {
        return;
    }

    if (
        !googleMap ||
        !window.google?.maps
    ) {
        renderRecommendationLoading();
        return;
    }

    renderRecommendationLoading();

    try {
        const sourcePlaces =
            await loadNearbyRecommendationPlaces(
                Boolean(
                    options.force
                ),
                audience
            );

        const usingBackendRecommendation =
            String(nearbyRecommendationState.recommendationSource || "")
                .startsWith("backend-");

        const basis =
            settings.recommendBasis ||
            document.documentElement
                .dataset.recommendBasis ||
            "gender";

        const profileGender =
            getRecommendationGender();

        const selectedGender =
            audience === "male" || audience === "female"
                ? audience
                : profileGender;

        /*
            남/여 추천은 서버 집계 점수로만 처리합니다.
            Google fallback에는 성별 하드코딩 가중치를 적용하지 않습니다.
        */
        const useGender = false;

        let ranked =
            sourcePlaces
                .filter(place =>
                    doesRecommendationMatchMapCategory(
                        place,
                        category
                    )
                )
                .map(place => ({
                    place,
                    ...getRecommendationScore(
                        place,
                        nearbyRecommendationState.center,
                        useGender,
                        selectedGender
                    )
                }))
                .sort(
                    (a, b) =>
                        b.score -
                        a.score
                )
                .slice(
                    0,
                    5
                );

        /*
            개인화 추천이 5개보다 적으면 부족한 자리만 Google 주변 장소로 채웁니다.
            DB 추천 순서는 그대로 유지하고 Google 결과는 뒤에만 추가합니다.
            따라서 기존 사용자에게는 개인화가 우선되고,
            데이터가 적은 신규 사용자는 빈 추천창을 보지 않게 됩니다.
        */
        let usedGoogleFallback = false;

        if (usingBackendRecommendation && ranked.length < 5) {
            try {
                const googlePlaces = await searchGoogleNearbyRecommendationPlaces();

                const existingBackendIds = new Set(
                    ranked
                        .map(item => String(item.place?.googlePlaceId || "").trim())
                        .filter(Boolean)
                );

                const existingSignatures = new Set(
                    ranked.map(item => {
                        const name = String(item.place?.displayName || "")
                            .trim()
                            .toLowerCase();
                        const address = String(item.place?.formattedAddress || "")
                            .trim()
                            .toLowerCase();
                        return `${name}|${address}`;
                    })
                );

                const googleRanked = googlePlaces
                    .filter(place =>
                        doesRecommendationMatchMapCategory(
                            place,
                            category
                        )
                    )
                    .filter(place => {
                        const googleId = String(place?.id || "").trim();
                        if (googleId && existingBackendIds.has(googleId)) {
                            return false;
                        }

                        const signature = `${String(place?.displayName || "").trim().toLowerCase()}|${String(place?.formattedAddress || "").trim().toLowerCase()}`;
                        return !existingSignatures.has(signature);
                    })
                    .map(place => ({
                        place,
                        ...getRecommendationScore(
                            place,
                            nearbyRecommendationState.center,
                            false,
                            "neutral"
                        )
                    }))
                    .sort((a, b) => b.score - a.score)
                    .slice(0, 5 - ranked.length);

                if (googleRanked.length) {
                    ranked = [...ranked, ...googleRanked];
                    usedGoogleFallback = true;
                }
            } catch (fallbackError) {
                console.warn(
                    "추천 부족분 Google 보충 실패:",
                    fallbackError
                );
            }
        }

        if (context) {
            context.textContent =
                getRecommendationCenterText();
        }

        if (mode) {
            let recommendationStatus = "";

            if (audience === "personal") {
                if (usingBackendRecommendation) {
                    recommendationStatus = usedGoogleFallback
                        ? (
                            currentLanguage === "ja"
                                ? "パーソナライズ推薦 + 周辺人気スポットで補完"
                                : currentLanguage === "en"
                                    ? "Personalized picks + nearby popular places"
                                    : "개인화 추천 + 주변 인기 장소 보충"
                        )
                        : (
                            currentLanguage === "ja"
                                ? "自分の利用データを反映したおすすめ"
                                : currentLanguage === "en"
                                    ? "Recommendations based on your activity"
                                    : "내 활동 데이터를 반영한 맞춤 추천"
                        );
                } else {
                    recommendationStatus = currentLanguage === "ja"
                        ? "個人データが不足しているため周辺人気スポットを表示"
                        : currentLanguage === "en"
                            ? "Showing nearby popular places while personalization is unavailable"
                            : "개인화 데이터가 부족해 주변 인기 장소로 보충 중";
                }
            } else {
                if (usingBackendRecommendation) {
                    recommendationStatus = getRecommendationModeText(
                        true,
                        selectedGender
                    );
                } else {
                    recommendationStatus = audience === "male"
                        ? (
                            currentLanguage === "ja"
                                ? "男性ユーザーデータを取得できないため周辺人気スポットを表示"
                                : currentLanguage === "en"
                                    ? "Showing nearby popular places until male user data is available"
                                    : "남성 사용자 데이터를 불러오지 못해 주변 인기 장소 표시 중"
                        )
                        : (
                            currentLanguage === "ja"
                                ? "女性ユーザーデータを取得できないため周辺人気スポットを表示"
                                : currentLanguage === "en"
                                    ? "Showing nearby popular places until female user data is available"
                                    : "여성 사용자 데이터를 불러오지 못해 주변 인기 장소 표시 중"
                        );
                }
            }

            renderRecommendationAudienceControl(
                recommendationStatus
            );
        }

        if (!ranked.length) {
            list.innerHTML = `
                <div class="recommend-empty">
                    <i class="ti ti-map-search"></i>
                    <strong>800m 안에서 추천할 장소를 찾지 못했어요.</strong>
                    <small>지도 카테고리를 '전체'로 바꾸거나 위치를 다시 확인해보세요.</small>
                </div>
            `;

            return;
        }

        list.innerHTML =
            ranked
                .map(
                    ({
                        place,
                        distance,
                        genderScore
                    }) => {
                        const point =
                            locationToPlainObject(
                                place.location
                            );

                        const visual =
                            getPoiVisualByType(
                                place.primaryType
                            );

                        const rating =
                            Number(
                                place.rating
                            );

                        const reviews =
                            Number(
                                place.userRatingCount
                            );

                        const tailored =
                            useGender &&
                            genderScore > 0;

                        return `
                            <article
                                class="mini-place"
                                ${place.backendPlaceId ? `data-backend-place-id="${place.backendPlaceId}"` : `data-google-place-id="${place.id}"`}
                                data-lat="${point?.lat ?? ""}"
                                data-lng="${point?.lng ?? ""}"
                                tabindex="0"
                                role="button"
                                aria-label="${escapeGroupHtml(place.displayName || "추천 장소")}"
                            >
                                <div
                                    class="mini-image"
                                    style="background:${visual.bg}"
                                >
                                    <i
                                        class="${visual.iconClass}"
                                        style="color:${visual.iconColor}"
                                        aria-hidden="true"
                                    ></i>
                                </div>

                                <div class="mini-place-copy">
                                    <div class="mini-place-topline">
                                        <span class="mini-place-category">
                                            ${escapeGroupHtml(getRecommendationCategoryLabel(place))}
                                        </span>

                                        ${
                                            tailored
                                                ? `<span class="mini-place-fit">
                                                        <i class="ti ti-sparkles"></i>
                                                        맞춤
                                                   </span>`
                                                : ""
                                        }
                                    </div>

                                    <strong>
                                        ${escapeGroupHtml(place.displayName || "추천 장소")}
                                    </strong>

                                    <small class="mini-place-stats">
                                        <span>
                                            <i class="ti ti-walk"></i>
                                            ${Math.max(0, Math.round(distance))}m
                                        </span>

                                        ${
                                            Number.isFinite(rating)
                                                ? `<span>
                                                        <i class="ti ti-star-filled"></i>
                                                        ${rating.toFixed(1)}
                                                   </span>`
                                                : ""
                                        }

                                        ${
                                            Number.isFinite(reviews) &&
                                            reviews > 0
                                                ? `<span>
                                                        리뷰 ${reviews.toLocaleString()}
                                                   </span>`
                                                : ""
                                        }
                                    </small>
                                </div>

                                <i
                                    class="ti ti-chevron-right mini-place-arrow"
                                    aria-hidden="true"
                                ></i>
                            </article>
                        `;
                    }
                )
                .join("");

        list
            .querySelectorAll(
                ".mini-place"
            )
            .forEach(card => {
                const openCard =
                    async () => {
                        const backendPlaceId =
                            Number(card.dataset.backendPlaceId);

                        const googlePlaceId =
                            card.dataset.googlePlaceId || "";

                        const lat =
                            Number(
                                card.dataset.lat
                            );

                        const lng =
                            Number(
                                card.dataset.lng
                            );

                        if (
                            Number.isFinite(backendPlaceId) &&
                            backendPlaceId > 0 &&
                            typeof openBackendPlaceById === "function"
                        ) {
                            await openBackendPlaceById(backendPlaceId);
                        } else if (googlePlaceId) {
                            await openGooglePoi(
                                googlePlaceId,
                                {
                                    lat,
                                    lng
                                },
                                card.getAttribute("aria-label") || ""
                            );
                        }

                        if (
                            Number.isFinite(lat) &&
                            Number.isFinite(lng)
                        ) {
                            googleMap?.panTo({
                                lat,
                                lng
                            });

                            if (
                                (googleMap?.getZoom() || 0) <
                                15
                            ) {
                                googleMap?.setZoom(
                                    15
                                );
                            }
                        }
                    };

                card.addEventListener(
                    "click",
                    openCard
                );

                card.addEventListener(
                    "keydown",
                    event => {
                        if (
                            event.key ===
                            "Enter" ||
                            event.key ===
                            " "
                        ) {
                            event.preventDefault();
                            openCard();
                        }
                    }
                );
            });
    } catch (error) {
        renderRecommendationError(
            error
        );
    }
}


/* =====================================================
   장소 상세 - 메뉴 / 리뷰
   실제 데이터 렌더링은 reviews.js에서 백엔드 API 기준으로 처리합니다.
===================================================== */

/*
   과거 화면 시연용 메뉴/리뷰 mock 데이터 제거.
   실제 메뉴/리뷰 렌더링은 reviews.js에서 백엔드 API 기준으로 처리합니다.
*/

// MR.EUM 수정부분: 장소 상세의 메뉴/리뷰를 함께 갱신합니다.
function renderPlaceExtraSections(placeKey) {
    /* reviews.js의 실제 백엔드 렌더러가 로드된 뒤에만 호출합니다. */
    if (typeof renderPlaceMenu === "function") {
        renderPlaceMenu(placeKey);
    }
    if (typeof renderPlaceReviews === "function") {
        renderPlaceReviews(placeKey);
    }
}

/* =====================================================
   장소 상세 카드
===================================================== */

/** Place API 응답으로 프론트 places 캐시/카드를 맞춥니다. */
function applyBackendPlaceToLocalPlace(placeKey, backendPlace) {
    if (!placeKey || !places[placeKey] || !backendPlace) {
        return;
    }

    const local = places[placeKey];
    const name = backendPlace.placeName || backendPlace.name;
    const category = backendPlace.placeCategory || backendPlace.category;
    const address = backendPlace.placeAddress || backendPlace.address;
    const rating = Number(backendPlace.avgRating ?? backendPlace.rating);
    const reviewCount = Number(backendPlace.reviewCount ?? backendPlace.userRatingCount);

    if (name) {
        local.name = { ko: name, ja: name, en: name };
    }
    if (category) {
        local.category = { ko: category, ja: category, en: category };
    }
    if (address) {
        local.address = { ko: address, ja: address, en: address };
    }
    if (Number.isFinite(rating)) {
        local.rating = rating;
    }
    if (Number.isFinite(reviewCount)) {
        local.reviewCount = reviewCount;
    }

    local.backendPlaceId = Number(backendPlace.placeId) || local.backendPlaceId || null;
}

async function openPlace(placeKey) {
    if (!places[placeKey]) {
        return;
    }

    selectedPlaceKey = placeKey;
    selectedGooglePoi = null;

    const favoriteButton = document.getElementById("favoriteButton");
    const saveButton = document.getElementById("saveButton");

    if (favoriteButton) {
        favoriteButton.disabled = false;
        favoriteButton.removeAttribute("title");
    }

    if (saveButton) {
        saveButton.disabled = false;
    }

    // 먼저 로컬로 카드를 연 뒤, Place 가 있으면 Place 기준으로 갱신합니다.
    updatePlaceCard(placeKey);

    placeCard?.classList.add("show");
    routePanel?.classList.remove("show");
    placeCard?.classList.remove("route-focus");

    if (typeof ensureBackendPlace !== "function") {
        return;
    }

    try {
        const backendPlace = await ensureBackendPlace(placeKey);
        if (selectedPlaceKey !== placeKey || selectedGooglePoi) {
            return;
        }
        applyBackendPlaceToLocalPlace(placeKey, backendPlace);
        updatePlaceCard(placeKey);
    } catch (error) {
        // 비로그인 등 Place 생성 불가 시 로컬 카드 유지
        console.warn("Place 카드 동기화 실패:", error);
    }
}


function getPlaceDisplayName(name = "") {
    // Google의 실제 Place 이름을 그대로 표시한다.
    // 東京駅(Tokyo Station)과 東京(Tokyo)은 서로 다른 Place이므로 합치지 않는다.
    return String(name || "").trim();
}

/** 리뷰가 없으면 카드 상단 별점/리뷰 수 행을 숨깁니다. */
function setPlaceCardRatingRowVisible(reviewCount) {
    const ratingRow = document.querySelector("#placeCard .rating-row");
    if (!ratingRow) return;
    const count = Number(reviewCount);
    ratingRow.hidden = !(Number.isFinite(count) && count > 0);
}


function isStationPoiType(type = "") {
    return [
        "train_station",
        "subway_station",
        "transit_station"
    ].includes(String(type || "").toLowerCase());
}

function updatePlaceCard(placeKey) {
    const place =
        places[placeKey];

    if (!place) {
        return;
    }


    const placeName =
        document.getElementById(
            "placeName"
        );

    const placeCategory =
        document.getElementById(
            "placeCategory"
        );

    const placeRating =
        document.getElementById(
            "placeRating"
        );

    const placeReviewCount =
        document.getElementById(
            "placeReview"
        );

    const placeAddress =
        document.getElementById(
            "placeAddress"
        );

    const placeCrowd =
        document.getElementById(
            "placeCrowd"
        );

    const placeImageIcon =
        document.getElementById(
            "placeIcon"
        );

    const placeImage =
        document.getElementById(
            "placeImage"
        );


    if (placeName) {
        placeName.textContent = getPlaceDisplayName(
            place.name[currentLanguage] || place.name.ko || ""
        );
    }

    if (placeCategory) {
        // 역 POI는 화면에서 "역"이라는 일반 분류명을 반복하지 않고
        // 실제 장소 이름만 제목에 보여주므로 카테고리는 "교통"으로 단순화한다.
        placeCategory.textContent = place.type === "transport"
            ? (currentLanguage === "ko" ? "교통" : "交通")
            : (place.category[currentLanguage] || place.category.ko || "");
    }

    if (placeRating) {
        placeRating.textContent =
            Number(place.rating || 0).toFixed(1);
    }

    if (placeReviewCount) {
        const count = Number(place.reviewCount || 0);
        placeReviewCount.textContent =
            currentLanguage === "ko"
                ? `리뷰 ${count.toLocaleString()}개`
                : currentLanguage === "en"
                    ? `${count.toLocaleString()} reviews`
                    : `レビュー ${count.toLocaleString()}件`;
        setPlaceCardRatingRowVisible(count);
    } else {
        setPlaceCardRatingRowVisible(place.reviewCount);
    }

    if (placeAddress) {
        placeAddress.textContent =
            place.address[currentLanguage] || place.address.ko || "";
    }

    // 내부 샘플 장소에는 검증 가능한 Google 영업시간이 없으므로 표시하지 않습니다.
    const placeBusinessInfo = document.getElementById("placeBusinessInfo");
    if (placeBusinessInfo) {
        placeBusinessInfo.hidden = true;
    }

    if (placeCrowd) {
        placeCrowd.textContent =
            place.crowd?.[currentLanguage] || place.crowd?.ko || "";
    }

    if (placeImageIcon) {
        placeImageIcon.className =
            `ti ${place.icon}`;
        placeImageIcon.style.display = "";
    }

    if (placeImage) {
        placeImage.style.background =
            place.color;
        placeImage.querySelectorAll(
            ".google-place-main-photo, .google-place-photo-attribution, .google-place-photo-carousel"
        ).forEach(el => el.remove());
        placeImage.style.backgroundImage = "";
    }


    placeCard.dataset.placeKey =
        placeKey;
    if (place.backendPlaceId) {
        placeCard.dataset.backendPlaceId = String(place.backendPlaceId);
    } else {
        delete placeCard.dataset.backendPlaceId;
    }
    delete placeCard.dataset.googlePlaceId;


    updateFavoriteButtons();

    // MR.EUM 수정부분: 장소 정보가 갱신될 때 메뉴/리뷰도 함께 갱신합니다.
    renderPlaceExtraSections(placeKey);
}


/* =====================================================
   Google 기본 POI 상세 정보
===================================================== */

async function fetchGooglePoiDetails(placeId) {
    if (!placeId) {
        throw new Error("PLACE_ID_REQUIRED");
    }

    const language = currentLanguage === "ko" ? "ko" : "ja";
    const requestKey = `${language}:${placeId}`;

    // 같은 클릭 이벤트가 겹쳐 같은 Place Details 요청이 동시에 나가는 것을 방지합니다.
    // 응답 자체는 저장하지 않고, 진행 중인 Promise만 잠깐 공유합니다.
    if (googlePoiRequestInFlight.has(requestKey)) {
        return googlePoiRequestInFlight.get(requestKey);
    }

    const requestPromise = (async () => {
        const { Place } = await google.maps.importLibrary("places");

        const poi = new Place({
            id: placeId,
            requestedLanguage: language,
            requestedRegion: "JP"
        });

        // PlacesService(Legacy)는 사용하지 않습니다.
        // Place(New) + fetchFields()만 사용하고 카드에 필요한 필드만 요청합니다.
        await poi.fetchFields({
            fields: [
                "displayName",
                "formattedAddress",
                "location",
                "primaryType",
                "primaryTypeDisplayName",
                "rating",
                "userRatingCount",
                "currentOpeningHours",
                "businessStatus",
                "photos"
            ]
        });

        // Places API (New) JS Place 클래스의 photos를 프론트에서 직접 사용합니다.
        // 백엔드 AutoPlace 조회가 실패해도 대표사진 표시에는 영향을 주지 않습니다.
        const resolvedPhotos = Array.isArray(poi.photos) ? poi.photos : [];

        return {
            id: poi.id || placeId,
            displayName: poi.displayName || "",
            formattedAddress: poi.formattedAddress || "",
            location: poi.location || null,
            primaryType: poi.primaryType || "",
            primaryTypeDisplayName: poi.primaryTypeDisplayName || "",
            rating: poi.rating,
            userRatingCount: poi.userRatingCount,
            businessStatus: poi.businessStatus || "",
            currentOpeningHours: poi.currentOpeningHours || null,
            photos: resolvedPhotos,
            accessibilityOptions: null
        };
    })();

    googlePoiRequestInFlight.set(requestKey, requestPromise);

    try {
        return await requestPromise;
    } catch (error) {
        console.error("Places API (New) 조회 실패:", error);
        throw error;
    } finally {
        googlePoiRequestInFlight.delete(requestKey);
    }
}


function getGooglePoiTypeLabel(types = []) {
    const labels = {
        train_station: { ko: "기차역", ja: "鉄道駅" },
        subway_station: { ko: "지하철역", ja: "地下鉄駅" },
        transit_station: { ko: "교통 시설", ja: "交通施設" },
        bus_station: { ko: "버스 터미널", ja: "バスターミナル" },
        bus_stop: { ko: "버스 정류장", ja: "バス停" },
        restaurant: { ko: "음식점", ja: "飲食店" },
        cafe: { ko: "카페", ja: "カフェ" },
        tourist_attraction: { ko: "관광지", ja: "観光地" },
        museum: { ko: "박물관", ja: "博物館" },
        shopping_mall: { ko: "쇼핑몰", ja: "ショッピングモール" },
        department_store: { ko: "백화점", ja: "百貨店" },
        hospital: { ko: "병원", ja: "病院" },
        school: { ko: "학교", ja: "学校" },
        university: { ko: "대학교", ja: "大学" },
        park: { ko: "공원", ja: "公園" },
        lodging: { ko: "숙박 시설", ja: "宿泊施設" },
        hotel: { ko: "호텔", ja: "ホテル" },
        motel: { ko: "모텔", ja: "モーテル" },
        hostel: { ko: "호스텔", ja: "ホステル" },
        guest_house: { ko: "게스트하우스", ja: "ゲストハウス" },
        inn: { ko: "숙박 시설", ja: "宿泊施設" },
        resort_hotel: { ko: "리조트 호텔", ja: "リゾートホテル" },
        bed_and_breakfast: { ko: "숙박 시설", ja: "B&B" },
        extended_stay_hotel: { ko: "레지던스 호텔", ja: "長期滞在型ホテル" },
        japanese_inn: { ko: "료칸", ja: "旅館" },
        convenience_store: { ko: "편의점", ja: "コンビニ" }
    };

    for (const type of types) {
        if (labels[type]) {
            return labels[type][currentLanguage] || labels[type].ko;
        }
    }

    return currentLanguage === "ko"
        ? "Google 지도 장소"
        : "Google マップの場所";
}


function normalizeNearbyPhotoPlaceName(value) {
    return String(value || "")
        .normalize("NFKC")
        .toLowerCase()
        .replace(/jr東日本|jr東海|jr西日本|jr|東京メトロ|都営地下鉄|都営/g, "")
        .replace(/station|駅|역/g, "")
        .replace(/[\s\-‐‑‒–—―・･·.,，。'"’“”()（）\[\]【】]/g, "")
        .trim();
}

async function resolveNearbyPlacePhotoFallback(searchNames = [], position = null) {
    if (!position || !window.google?.maps) {
        return [];
    }

    const rawNames = [...new Set(
        (Array.isArray(searchNames) ? searchNames : [searchNames])
            .map(name => String(name || "").trim())
            .filter(Boolean)
    )];

    if (!rawNames.length) {
        return [];
    }

    const stationTypes = new Set([
        "train_station",
        "subway_station",
        "transit_station"
    ]);

    const normalizeStationBase = value => String(value || "")
        .normalize("NFKC")
        .toLowerCase()
        .replace(/jr東日本|jr東海|jr西日本|jr|東京メトロ|都営地下鉄|都営/g, "")
        .replace(/\s*(station|駅|역)\s*$/iu, "")
        .replace(/[\s\-‐‑‒–—―・･·.,，。'"’“”()（）\[\]【】]/g, "")
        .trim();

    const expectedBases = [...new Set(
        rawNames.map(normalizeStationBase).filter(Boolean)
    )];

    try {
        const { Place } = await google.maps.importLibrary("places");
        const candidatesById = new Map();

        // 역의 정체성은 유지한다. 검색어는 원래 역명과 역 접미사를 보강한 형태만 사용한다.
        const queries = [...new Set(rawNames.flatMap(name => {
            const base = name.replace(/\s*(station|駅|역)\s*$/iu, "").trim();
            const list = [name];
            if (base) {
                list.push(`${base}駅`);
                list.push(`${base} station`);
            }
            return list;
        }))];

        for (const textQuery of queries) {
            try {
                const { places = [] } = await Place.searchByText({
                    textQuery,
                    fields: [
                        "id",
                        "displayName",
                        "location",
                        "primaryType",
                        "photos"
                    ],
                    locationBias: {
                        center: position,
                        radius: 500
                    },
                    language: /[ぁ-んァ-ヶ一-龯駅]/u.test(textQuery) ? "ja" : undefined,
                    region: "JP",
                    maxResultCount: 20
                });

                places.forEach(candidate => {
                    if (candidate?.id && !candidatesById.has(candidate.id)) {
                        candidatesById.set(candidate.id, candidate);
                    }
                });
            } catch (queryError) {
                console.debug("역 사진 fallback 검색 실패:", textQuery, queryError);
            }
        }

        const ranked = [...candidatesById.values()]
            .map(candidate => {
                const photos = Array.isArray(candidate?.photos) ? candidate.photos : [];
                if (!photos.length || !candidate?.location) return null;

                const primaryType = String(candidate.primaryType || "").toLowerCase();
                if (!stationTypes.has(primaryType)) return null;

                const distance = distanceMetersBetween(position, candidate.location);
                if (!Number.isFinite(distance) || distance > 600) return null;

                const candidateBase = normalizeStationBase(candidate.displayName);
                let nameScore = 0;
                for (const expected of expectedBases) {
                    if (!expected || !candidateBase) continue;
                    if (candidateBase === expected) {
                        nameScore = Math.max(nameScore, 1400);
                    } else if (
                        candidateBase.includes(expected) ||
                        expected.includes(candidateBase)
                    ) {
                        nameScore = Math.max(nameScore, 900);
                    }
                }

                // 같은 역 이름이 아닌 주변 역/시설 사진은 절대 섞지 않는다.
                if (nameScore < 900) return null;

                const score = nameScore - Math.min(500, distance * 1.2);
                return { candidate, photos, distance, score };
            })
            .filter(Boolean)
            .sort((a, b) => b.score - a.score || a.distance - b.distance);

        const best = ranked[0];
        if (!best) return [];

        console.debug("동일 역 사진만 fallback:", {
            requested: rawNames,
            selected: best.candidate.displayName,
            type: best.candidate.primaryType,
            distance: Math.round(best.distance),
            photos: best.photos.length
        });

        return best.photos;
    } catch (error) {
        console.warn("동일 역 사진 fallback 실패:", error);
        return [];
    }
}


function isGenericPoiDisplayName(value) {
    const name =
        String(value || "")
            .trim()
            .toLowerCase();

    return !name ||
        name === "선택한 장소" ||
        name === "選択した場所" ||
        name === "selected place" ||
        name === "google place" ||
        name === "place";
}

function firstRealPoiDisplayName(...values) {
    for (const value of values) {
        const name =
            String(value || "")
                .trim();

        if (
            name &&
            !isGenericPoiDisplayName(name)
        ) {
            return name;
        }
    }

    return "";
}


async function openGooglePoi(placeId, fallbackPosition, fallbackName = "", options = {}) {
    const normalizedPlaceId = typeof normalizeGooglePlaceId === "function"
        ? normalizeGooglePlaceId(placeId)
        : String(placeId || "").replace(/^places\//, "");

    if (!normalizedPlaceId || !googleMap) {
        return;
    }

    const safePosition = fallbackPosition &&
        Number.isFinite(Number(fallbackPosition.lat)) &&
        Number.isFinite(Number(fallbackPosition.lng))
        ? {
            lat: Number(fallbackPosition.lat),
            lng: Number(fallbackPosition.lng)
        }
        : null;

    const rawFallbackName = String(fallbackName || "").trim();
    const hasRealFallbackName = Boolean(rawFallbackName) &&
        rawFallbackName !== "선택한 장소" &&
        rawFallbackName !== "選択した場所" &&
        rawFallbackName.toLowerCase() !== "selected place" &&
        rawFallbackName.toLowerCase() !== "place";

    const safeName = hasRealFallbackName
        ? rawFallbackName
        : (
            currentLanguage === "ko"
                ? "장소 정보 불러오는 중..."
                : currentLanguage === "ja"
                    ? "場所情報を読み込み中..."
                    : "Loading place..."
        );

    const rawDisplayNameOverride =
        String(
            options?.displayNameOverride || ""
        ).trim();

    const displayNameOverride =
        isGenericPoiDisplayName(
            rawDisplayNameOverride
        )
            ? ""
            : rawDisplayNameOverride;

    const forceTransportCategory =
        Boolean(
            options?.forceTransportCategory
        );

    /*
        마이페이지의 "장소 보기"처럼 외부 목록에서 장소를 열 때만
        지도도 해당 장소로 이동 + 확대합니다.
        일반 지도 POI 클릭에는 강제 확대를 적용하지 않습니다.
    */
    const focusMap =
        Boolean(
            options?.focusMap
        );

    const focusZoom =
        Number.isFinite(
            Number(options?.focusZoom)
        )
            ? Number(options.focusZoom)
            : 16;

    const fallbackPoi = {
        id: normalizedPlaceId,
        displayName: displayNameOverride || safeName,
        formattedAddress: "",
        location: safePosition,
        primaryType: "",
        primaryTypeDisplayName: "",
        rating: null,
        userRatingCount: null,
        businessStatus: "",
        currentOpeningHours: null,
        photos: []
    };

    selectedPlaceKey = null;
    selectedGooglePoi = {
        placeId: normalizedPlaceId,
        name: displayNameOverride || safeName,
        position: safePosition,
        address: "",
        primaryType: "",
        primaryTypeDisplayName: "",
        category: forceTransportCategory
            ? (currentLanguage === "ko" ? "교통" : "交通")
            : getGooglePoiTypeLabel([]),
        rating: 0,
        reviewCount: 0,
        userRatingCount: 0,
        photos: []
    };

    // 상세정보를 받기 전에는 기본 아이콘만 표시하고, 사진은 Places API (New) 조회 후 표시합니다.
    updateGooglePoiCard(fallbackPoi, null, {
        loadPhoto: false
    });

    placeCard?.classList.add("show");
    routePanel?.classList.remove("show");
    placeCard?.classList.remove("route-focus");

    if (safePosition) {
        googleMap.panTo(safePosition);

        if (focusMap) {
            googleMap.setZoom(focusZoom);
        }
    }

    try {
        const poi = await fetchGooglePoiDetails(normalizedPlaceId);

        // 원래 Place 정보는 그대로 유지하고, 사진만 비어 있을 때 주변의
        // 동일 장소 후보(예: 東京駅 ↔ 東京, 品川駅 ↔ 品川)에서 보충한다.
        if (!Array.isArray(poi.photos) || poi.photos.length === 0) {
            const fallbackPhotos = await resolveNearbyPlacePhotoFallback(
                [
                    ...(Array.isArray(options?.photoSearchNames)
                        ? options.photoSearchNames
                        : []),
                    poi.displayName,
                    rawFallbackName
                ],
                safePosition || (poi.location ? {
                    lat: typeof poi.location.lat === "function"
                        ? poi.location.lat()
                        : Number(poi.location.lat),
                    lng: typeof poi.location.lng === "function"
                        ? poi.location.lng()
                        : Number(poi.location.lng)
                } : null)
            );

            if (fallbackPhotos.length) {
                poi.photos = fallbackPhotos;
            }
        }

        const position = poi.location
            ? {
                lat: typeof poi.location.lat === "function"
                    ? poi.location.lat()
                    : Number(poi.location.lat),
                lng: typeof poi.location.lng === "function"
                    ? poi.location.lng()
                    : Number(poi.location.lng)
            }
            : safePosition;

        /*
            DB 좌표가 조금 다르거나 fallback 좌표만 있었더라도,
            Google 상세정보의 실제 좌표가 도착하면 그 위치로 다시 정확히 맞춥니다.
        */
        if (
            focusMap &&
            position &&
            Number.isFinite(Number(position.lat)) &&
            Number.isFinite(Number(position.lng))
        ) {
            googleMap.panTo({
                lat: Number(position.lat),
                lng: Number(position.lng)
            });
            googleMap.setZoom(focusZoom);
        }

        const resolvedName =
            firstRealPoiDisplayName(
                poi.displayName,
                displayNameOverride,
                rawFallbackName
            );

        const name =
            resolvedName ||
            safeName;

        const resolvedPlaceId = typeof normalizeGooglePlaceId === "function"
            ? normalizeGooglePlaceId(poi.id || normalizedPlaceId)
            : (poi.id || normalizedPlaceId);

        selectedGooglePoi = {
            ...selectedGooglePoi,
            placeId: resolvedPlaceId,
            name,
            position,
            address: poi.formattedAddress || "",
            primaryType: poi.primaryType || "",
            primaryTypeDisplayName: poi.primaryTypeDisplayName || "",
            category: forceTransportCategory || isStationPoiType(poi.primaryType)
                ? (currentLanguage === "ko" ? "교통" : "交通")
                : (poi.primaryTypeDisplayName || getGooglePoiTypeLabel(poi.primaryType ? [poi.primaryType] : [])),
            rating: Number(poi.rating) || 0,
            reviewCount: Number(poi.userRatingCount) || 0,
            userRatingCount: Number(poi.userRatingCount) || 0,
            photos: Array.isArray(poi.photos) ? poi.photos : []
        };

        let autoPlace = null;
        try {
            autoPlace = await ensureBackendPlace();
            selectedGooglePoi.autoPlace = autoPlace;
            selectedGooglePoi.backendPlaceId =
                Number(autoPlace.placeId);

            if (placeCard) {
                placeCard.dataset.backendPlaceId =
                    String(autoPlace.placeId);
            }

            if (
                typeof updateFavoriteButtons === "function"
            ) {
                updateFavoriteButtons();
            }
        } catch (backendError) {
            console.warn("AutoPlace 백엔드 연결 실패:", backendError);
        }

        // Place 클래스의 필드들은 getter 기반이라 {...poi}로 펼치면
        // photos/rating/userRatingCount 같은 상세 필드가 빠질 수 있다.
        // 표시 이름만 바꾸더라도 필요한 필드는 명시적으로 복사해서 카드에 전달한다.
        const cardPoi = {
            id: resolvedPlaceId,
            displayName:
                firstRealPoiDisplayName(
                    poi.displayName,
                    displayNameOverride,
                    name,
                    autoPlace?.placeName,
                    autoPlace?.name
                ) ||
                (
                    currentLanguage === "ko"
                        ? "장소 정보 불러오는 중..."
                        : currentLanguage === "ja"
                            ? "場所情報を読み込み中..."
                            : "Loading place..."
                ),
            formattedAddress: poi.formattedAddress || "",
            location: poi.location || position || safePosition,
            primaryType: poi.primaryType || "",
            primaryTypeDisplayName: poi.primaryTypeDisplayName || "",
            rating: poi.rating,
            userRatingCount: poi.userRatingCount,
            businessStatus: poi.businessStatus || "",
            currentOpeningHours: poi.currentOpeningHours || null,
            photos: Array.isArray(poi.photos) ? poi.photos : []
        };

        // Google 상세 조회가 끝난 뒤 Places API (New) 사진/평점/리뷰수를 그대로 카드에 반영한다.
        updateGooglePoiCard(cardPoi, autoPlace, {
            loadPhoto: true,
            forceTransportCategory
        });
    } catch (error) {
        console.warn("Google POI 상세정보 조회 실패:", error);

        const errorText = String(
            error?.message ||
            error?.status ||
            error ||
            ""
        );

        const isQuotaError = /RESOURCE_EXHAUSTED|429|quota/i.test(errorText);

        if (isQuotaError) {
            console.warn("Google Places 일일 할당량 초과: 장소 상세정보를 불러오지 못했습니다.");
        }
    }
}


/* =====================================================
   POI 종류별 아이콘 / 색상
===================================================== */

function getPoiVisualByType(type = "") {
    const normalizedType = String(type || "").toLowerCase();

    const visuals = {
        train_station: {
            iconClass: "ti ti-train",
            iconColor: "#2563eb",
            bg: "linear-gradient(135deg, #dbeafe, #60a5fa)"
        },
        subway_station: {
            iconClass: "ti ti-train",
            iconColor: "#2563eb",
            bg: "linear-gradient(135deg, #dbeafe, #60a5fa)"
        },
        transit_station: {
            iconClass: "ti ti-train",
            iconColor: "#2563eb",
            bg: "linear-gradient(135deg, #dbeafe, #60a5fa)"
        },
        bus_station: {
            iconClass: "ti ti-bus",
            iconColor: "#2563eb",
            bg: "linear-gradient(135deg, #dbeafe, #60a5fa)"
        },
        bus_stop: {
            iconClass: "ti ti-bus-stop",
            iconColor: "#2563eb",
            bg: "linear-gradient(135deg, #dbeafe, #60a5fa)"
        },
        park: {
            iconClass: "ti ti-trees",
            iconColor: "#15803d",
            bg: "linear-gradient(135deg, #dcfce7, #4ade80)"
        },
        museum: {
            iconClass: "ti ti-building-bank",
            iconColor: "#7e22ce",
            bg: "linear-gradient(135deg, #f3e8ff, #c084fc)"
        },
        art_gallery: {
            iconClass: "ti ti-palette",
            iconColor: "#7e22ce",
            bg: "linear-gradient(135deg, #f3e8ff, #c084fc)"
        },
        cafe: {
            iconClass: "ti ti-coffee",
            iconColor: "#92400e",
            bg: "linear-gradient(135deg, #fef3c7, #d97706)"
        },
        restaurant: {
            iconClass: "ti ti-bowl-chopsticks",
            iconColor: "#c2410c",
            bg: "linear-gradient(135deg, #ffedd5, #fb923c)"
        },
        shopping_mall: {
            iconClass: "ti ti-shopping-bag",
            iconColor: "#be185d",
            bg: "linear-gradient(135deg, #fce7f3, #f472b6)"
        },
        department_store: {
            iconClass: "ti ti-building-store",
            iconColor: "#be185d",
            bg: "linear-gradient(135deg, #fce7f3, #f472b6)"
        },
        hospital: {
            iconClass: "ti ti-building-hospital",
            iconColor: "#dc2626",
            bg: "linear-gradient(135deg, #fee2e2, #f87171)"
        },
        school: {
            iconClass: "ti ti-school",
            iconColor: "#0f766e",
            bg: "linear-gradient(135deg, #ccfbf1, #5eead4)"
        },
        university: {
            iconClass: "ti ti-school",
            iconColor: "#0f766e",
            bg: "linear-gradient(135deg, #ccfbf1, #5eead4)"
        },
        lodging: {
            iconClass: "ti ti-bed",
            iconColor: "#4f46e5",
            bg: "linear-gradient(135deg, #e0e7ff, #818cf8)"
        },
        convenience_store: {
            iconClass: "ti ti-building-store",
            iconColor: "#a16207",
            bg: "linear-gradient(135deg, #fef9c3, #facc15)"
        },
        tourist_attraction: {
            iconClass: "ti ti-camera",
            iconColor: "#0f766e",
            bg: "linear-gradient(135deg, #ccfbf1, #2dd4bf)"
        }
    };

    if (visuals[normalizedType]) {
        return visuals[normalizedType];
    }

    if (normalizedType.includes("station")) {
        return visuals.train_station;
    }

    return {
        iconClass: "ti ti-map-pin",
        iconColor: "#a16207",
        bg: "linear-gradient(135deg, #ffe5a7, #f4bc45)"
    };
}

function getTokyoWeekTime() {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Tokyo",
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23"
    }).formatToParts(new Date());

    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    const dayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

    return {
        day: dayMap[values.weekday],
        hour: Number(values.hour),
        minute: Number(values.minute)
    };
}

function getGoogleOpeningSummary(openingHours) {
    const periods = Array.isArray(openingHours?.periods) ? openingHours.periods : [];
    if (!periods.length) return null;

    const now = getTokyoWeekTime();
    if (!Number.isFinite(now.day) || !Number.isFinite(now.hour) || !Number.isFinite(now.minute)) {
        return null;
    }

    const weekMinutes = 7 * 24 * 60;
    const nowMinutes = now.day * 24 * 60 + now.hour * 60 + now.minute;

    for (const period of periods) {
        if (!period?.open) continue;

        let start = period.open.day * 24 * 60 + period.open.hour * 60 + period.open.minute;

        // close가 없는 기간은 24시간 영업으로 간주합니다.
        if (!period.close) {
            return { isOpen: true, closingTime: null };
        }

        let end = period.close.day * 24 * 60 + period.close.hour * 60 + period.close.minute;
        if (end <= start) end += weekMinutes;

        const candidates = [nowMinutes, nowMinutes + weekMinutes];
        if (candidates.some(value => value >= start && value < end)) {
            const hh = String(period.close.hour).padStart(2, "0");
            const mm = String(period.close.minute).padStart(2, "0");
            return { isOpen: true, closingTime: `${hh}:${mm}` };
        }
    }

    return { isOpen: false, closingTime: null };
}

function renderGoogleBusinessInfo(poi) {
    const wrapper = document.getElementById("placeBusinessInfo");
    const status = document.getElementById("placeOpenStatus");
    const closingInfo = document.getElementById("placeClosingInfo");
    const closingTime = document.getElementById("placeClosingTime");

    if (!wrapper || !status || !closingInfo || !closingTime) return;

    const summary = getGoogleOpeningSummary(poi.currentOpeningHours);

    // Google이 영업시간 데이터를 주지 않은 장소는 추측해서 표시하지 않습니다.
    if (!summary) {
        wrapper.hidden = true;
        status.textContent = "";
        closingInfo.hidden = true;
        closingTime.textContent = "";
        return;
    }

    wrapper.hidden = false;
    status.textContent = summary.isOpen
        ? (currentLanguage === "ko" ? "영업 중" : "営業中")
        : (currentLanguage === "ko" ? "영업 종료" : "営業時間外");
    status.classList.toggle("is-open", summary.isOpen);
    status.classList.toggle("is-closed", !summary.isOpen);

    if (summary.isOpen && summary.closingTime) {
        closingInfo.hidden = false;
        closingTime.textContent = summary.closingTime;
    } else {
        closingInfo.hidden = true;
        closingTime.textContent = "";
    }
}

async function renderGooglePoiMainPhoto(placeImage, placeIcon, poi, autoPlace, visual) {
    if (!placeImage) return;

    placeImage.querySelectorAll(
        ".google-place-main-photo, .google-place-photo-attribution, .google-place-photo-carousel"
    ).forEach(el => el.remove());
    placeImage.style.backgroundImage = "";
    placeImage.style.backgroundSize = "";
    placeImage.style.backgroundPosition = "";
    placeImage.style.backgroundRepeat = "";

    const showFallback = () => {
        placeImage.style.background = visual.bg;
        if (placeIcon) {
            placeIcon.className = visual.iconClass;
            placeIcon.style.color = visual.iconColor;
            placeIcon.style.display = "";
        }
    };

    showFallback();

    const MAX_PLACE_PHOTOS = 5;
    const photoUrls = [];
    const seen = new Set();

    const pushUrl = url => {
        if (
            !url ||
            seen.has(url) ||
            photoUrls.length >= MAX_PLACE_PHOTOS
        ) {
            return;
        }

        seen.add(url);
        photoUrls.push(url);
    };

    // 1순위: Places API (New) Photo 객체에서 최대 5장
    const googlePhotos = Array.isArray(poi?.photos) ? poi.photos : [];
    for (const photo of googlePhotos.slice(0, MAX_PLACE_PHOTOS)) {
        try {
            if (typeof photo?.getURI === "function") {
                pushUrl(photo.getURI({ maxWidth: 1200, maxHeight: 800 }));
            } else if (typeof photo?.getUrl === "function") {
                pushUrl(photo.getUrl({ maxWidth: 1200, maxHeight: 800 }));
            }
        } catch (_) {
            // 다음 사진 후보를 계속 시도합니다.
        }
    }

    // 2순위: DB에 저장된 Google Places 사진 URL로 부족한 장수 보충
    const backendUrls = Array.isArray(autoPlace?.photoUrls)
        ? autoPlace.photoUrls.filter(Boolean)
        : [];
    backendUrls.forEach(pushUrl);

    if (!photoUrls.length) return;

    const carousel = document.createElement("div");
    carousel.className = "google-place-photo-carousel";
    carousel.setAttribute(
        "aria-label",
        currentLanguage === "ja"
            ? "場所の写真"
            : currentLanguage === "en"
                ? "Place photos"
                : "장소 사진"
    );

    const track = document.createElement("div");
    track.className = "google-place-photo-track";
    carousel.appendChild(track);

    const slides = photoUrls.map((url, index) => {
        const slide = document.createElement("div");
        slide.className = "google-place-photo-slide";
        slide.setAttribute("aria-hidden", index === 0 ? "false" : "true");

        const img = document.createElement("img");
        img.className = "google-place-main-photo";
        const photoLabel = currentLanguage === "ja"
            ? "写真"
            : currentLanguage === "en"
                ? "photo"
                : "사진";
        const placeName = poi?.displayName || selectedGooglePoi?.name || "장소";
        img.alt = `${placeName} ${photoLabel} ${index + 1}`;
        img.loading = index === 0 ? "eager" : "lazy";
        img.draggable = false;
        img.src = url;
        img.addEventListener("error", () => {
            slide.remove();
        }, { once: true });

        slide.appendChild(img);
        track.appendChild(slide);
        return slide;
    });

    let currentIndex = 0;
    const dots = [];

    const updateCarousel = nextIndex => {
        const activeSlides = Array.from(track.querySelectorAll(".google-place-photo-slide"));
        if (!activeSlides.length) {
            carousel.remove();
            showFallback();
            return;
        }

        currentIndex = Math.max(0, Math.min(nextIndex, activeSlides.length - 1));
        track.style.transform = `translateX(-${currentIndex * 100}%)`;
        activeSlides.forEach((slide, index) => {
            slide.setAttribute("aria-hidden", index === currentIndex ? "false" : "true");
        });
        dots.forEach((dot, index) => dot.classList.toggle("active", index === currentIndex));

        const prev = carousel.querySelector(".google-place-photo-prev");
        const next = carousel.querySelector(".google-place-photo-next");
        if (prev) prev.disabled = currentIndex === 0;
        if (next) next.disabled = currentIndex === activeSlides.length - 1;
    };

    if (photoUrls.length > 1) {
        const makeArrow = (direction, icon, label) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = `google-place-photo-nav google-place-photo-${direction}`;
            button.setAttribute("aria-label", label);
            button.innerHTML = `<i class="ti ${icon}" aria-hidden="true"></i>`;
            button.addEventListener("click", event => {
                event.stopPropagation();
                updateCarousel(currentIndex + (direction === "next" ? 1 : -1));
            });
            return button;
        };

        carousel.appendChild(makeArrow(
            "prev",
            "ti-chevron-left",
            currentLanguage === "ja" ? "前の写真" : currentLanguage === "en" ? "Previous photo" : "이전 사진"
        ));
        carousel.appendChild(makeArrow(
            "next",
            "ti-chevron-right",
            currentLanguage === "ja" ? "次の写真" : currentLanguage === "en" ? "Next photo" : "다음 사진"
        ));

        const indicator = document.createElement("div");
        indicator.className = "google-place-photo-dots";
        photoUrls.forEach((_, index) => {
            const dot = document.createElement("button");
            dot.type = "button";
            dot.className = "google-place-photo-dot";
            dot.setAttribute("aria-label", `${index + 1}`);
            dot.addEventListener("click", event => {
                event.stopPropagation();
                updateCarousel(index);
            });
            dots.push(dot);
            indicator.appendChild(dot);
        });
        carousel.appendChild(indicator);

        let touchStartX = null;
        carousel.addEventListener("touchstart", event => {
            touchStartX = event.touches?.[0]?.clientX ?? null;
        }, { passive: true });
        carousel.addEventListener("touchend", event => {
            if (touchStartX == null) return;
            const endX = event.changedTouches?.[0]?.clientX;
            if (typeof endX !== "number") return;
            const delta = endX - touchStartX;
            if (Math.abs(delta) > 36) {
                updateCarousel(currentIndex + (delta < 0 ? 1 : -1));
            }
            touchStartX = null;
        }, { passive: true });
    }

    placeImage.style.background = "none";
    if (placeIcon) placeIcon.style.display = "none";
    placeImage.appendChild(carousel);
    updateCarousel(0);
}

function isGenericPlaceCategory(value) {
    const text =
        String(value || "")
            .trim()
            .toLowerCase();

    return !text ||
        text === "google 지도 장소" ||
        text === "google マップの場所" ||
        text === "google maps place" ||
        text === "장소" ||
        text === "スポット" ||
        text === "place";
}

function getGooglePoiCategoryLabel(poi, forceTransportCategory = false) {
    if (
        forceTransportCategory ||
        isStationPoiType(poi?.primaryType)
    ) {
        return currentLanguage === "ko"
            ? "교통"
            : currentLanguage === "ja"
                ? "交通"
                : "Transit";
    }

    const mapped =
        getGooglePoiTypeLabel(
            poi?.primaryType
                ? [poi.primaryType]
                : []
        );

    const hasMappedCategory =
        !isGenericPlaceCategory(
            mapped
        );

    if (hasMappedCategory) {
        return mapped;
    }

    const apiDisplay =
        String(
            poi?.primaryTypeDisplayName || ""
        ).trim();

    if (apiDisplay) {
        return apiDisplay;
    }

    return currentLanguage === "ko"
        ? "장소"
        : currentLanguage === "ja"
            ? "スポット"
            : "Place";
}


function updateGooglePoiCard(poi, autoPlace = null, options = {}) {
    const { loadPhoto = true, forceTransportCategory = false } = options;
    const name =
        firstRealPoiDisplayName(
            poi?.displayName,
            autoPlace?.placeName,
            autoPlace?.name,
            selectedGooglePoi?.name
        ) ||
        (
            currentLanguage === "ko"
                ? "장소 정보 불러오는 중..."
                : currentLanguage === "ja"
                    ? "場所情報を読み込み中..."
                    : "Loading place..."
        );

    const category =
        getGooglePoiCategoryLabel(
            poi,
            forceTransportCategory
        );

    // Place 가 있으면 Cheese Map 별점/리뷰를 우선 표시합니다.
    // 없으면 Google / AutoPlace 평점으로 보완합니다.
    const placeAvg = Number(autoPlace?.avgRating);
    const placeReviews = Number(autoPlace?.reviewCount);
    const hasPlaceStats = autoPlace?.placeId && (
        Number.isFinite(placeAvg) || Number.isFinite(placeReviews)
    );
    const directRating = Number(poi?.rating);
    const backendRating = Number(autoPlace?.rating);
    const rating = hasPlaceStats && Number.isFinite(placeAvg)
        ? placeAvg
        : (Number.isFinite(directRating) && directRating > 0
            ? directRating
            : backendRating);

    // Google userRatingCount는 카드에 표시하지 않는다.
    // Place가 있으면 Cheese Map 리뷰 수, 없으면 0으로 두고 reviews.js가 DB 개수로 갱신한다.
    const reviewCount = hasPlaceStats && Number.isFinite(placeReviews)
        ? placeReviews
        : 0;

    const placeName = document.getElementById("placeName");
    const placeCategory = document.getElementById("placeCategory");
    const placeRating = document.getElementById("placeRating");
    const placeReview = document.getElementById("placeReview");
    const placeReviewCount = document.getElementById("placeReviewCount");
    const placeAddress = document.getElementById("placeAddress");
    const placeIcon = document.getElementById("placeIcon");
    const placeImage = document.getElementById("placeImage");
    const favoriteButton = document.getElementById("favoriteButton");
    const saveButton = document.getElementById("saveButton");

    if (placeName) {
        const actualName =
            firstRealPoiDisplayName(
                poi?.displayName,
                autoPlace?.placeName,
                autoPlace?.name,
                selectedGooglePoi?.name,
                name
            ) ||
            (
                currentLanguage === "ko"
                    ? "장소 정보 불러오는 중..."
                    : currentLanguage === "ja"
                        ? "場所情報を読み込み中..."
                        : "Loading place..."
            );

        /*
            "선택한 장소"는 어떤 경로로도 화면 제목에 출력하지 않습니다.
        */
        placeName.textContent =
            getPlaceDisplayName(
                actualName
            );
    }

    if (placeCategory) {
        const backendCategory =
            autoPlace?.placeCategory ||
            autoPlace?.category ||
            "";

        placeCategory.textContent =
            !isGenericPlaceCategory(
                backendCategory
            )
                ? backendCategory
                : category;
    }

    if (placeRating) {
        placeRating.textContent = Number.isFinite(rating)
            ? rating.toFixed(1)
            : "-";
    }

    const safeReviewCount = Number.isFinite(reviewCount) ? reviewCount : 0;
    const reviewText = currentLanguage === "ko"
        ? `리뷰 ${safeReviewCount.toLocaleString()}개`
        : currentLanguage === "en"
            ? `${safeReviewCount.toLocaleString()} reviews`
            : `レビュー ${safeReviewCount.toLocaleString()}件`;

    if (placeReview) {
        placeReview.textContent = reviewText;
    }

    if (placeReviewCount) {
        placeReviewCount.textContent = reviewText;
    }

    setPlaceCardRatingRowVisible(safeReviewCount);

    if (placeAddress) {
        /*
            Google POI 카드에서는 현재 클릭한 실제 Place의 주소를 가장 우선합니다.
            DB/AutoPlace에 예전 빈 주소나 임시 주소가 남아 있어도
            실제 Google formattedAddress가 있으면 그 값을 사용합니다.
        */
        placeAddress.textContent =
            poi.formattedAddress ||
            autoPlace?.placeAddress ||
            autoPlace?.address ||
            selectedGooglePoi?.address ||
            (currentLanguage === "ko"
                ? "주소 정보 없음"
                : currentLanguage === "ja"
                    ? "住所情報なし"
                    : "Address unavailable");
    }

    renderGoogleBusinessInfo(poi);

    const visual = getPoiVisualByType(poi.primaryType || "");

    if (loadPhoto) {
        // Places API (New) 사진을 최대 3장 슬라이드로 표시합니다.
        renderGooglePoiMainPhoto(
            placeImage,
            placeIcon,
            poi,
            autoPlace,
            visual
        );
    }

    // MR.EUM 수정부분: Google 장소도 음식점(restaurant)일 때만 메뉴를 표시합니다.
    const menuSection = document.getElementById("placeMenuSection");
    const poiType = String(poi.primaryType || "").toLowerCase();
    if (menuSection) {
        menuSection.style.display = poiType.endsWith("restaurant") ? "block" : "none";
    }

    if (placeCard) {
        const normalizedGoogleId =
            typeof normalizeGooglePlaceId === "function"
                ? normalizeGooglePlaceId(
                    poi.id ||
                    selectedGooglePoi?.placeId ||
                    ""
                )
                : String(
                    poi.id ||
                    selectedGooglePoi?.placeId ||
                    ""
                ).replace(/^places\//, "");

        const googleKey =
            normalizedGoogleId
                ? `google_${normalizedGoogleId}`
                : "";

        if (googleKey) {
            selectedPlaceKey = googleKey;
            placeCard.dataset.placeKey = googleKey;
        }

        placeCard.dataset.googlePlaceId =
            normalizedGoogleId;

        const backendId =
            Number(
                autoPlace?.placeId ||
                selectedGooglePoi?.backendPlaceId
            );

        if (
            Number.isFinite(backendId) &&
            backendId > 0
        ) {
            placeCard.dataset.backendPlaceId =
                String(backendId);

            if (selectedGooglePoi) {
                selectedGooglePoi.backendPlaceId =
                    backendId;
            }
        } else {
            delete placeCard.dataset.backendPlaceId;
        }
    }

    if (favoriteButton) {
        favoriteButton.disabled = false;
        favoriteButton.removeAttribute("title");
    }

    if (saveButton) {
        saveButton.disabled = false;
        saveButton.removeAttribute("title");
    }

    if (typeof updateFavoriteButtons === "function") {
        updateFavoriteButtons();
    }

    renderPlaceReviews("");
}


/* =====================================================
   카테고리 필터
===================================================== */

function filterCategory(category) {
    updateCategoryButtons(category);
    switchGoogleBasePoiCategory(category);
    filterMarkers(category);
    renderRecommendedPlaces(category);
}


/* =====================================================
   사이드바 열기·닫기
===================================================== */

document
    .getElementById("menuButton")
    ?.addEventListener(
        "click",
        () => {
            sidebar?.classList.toggle(
                "open"
            );
        }
    );


/* 화면의 다른 곳을 누르면 모바일 사이드바 닫기 */

document.addEventListener(
    "click",
    event => {
        if (
            window.innerWidth > 850 ||
            !sidebar?.classList.contains(
                "open"
            )
        ) {
            return;
        }

        const menuButton =
            document.getElementById(
                "menuButton"
            );

        if (
            sidebar.contains(event.target) ||
            menuButton?.contains(event.target)
        ) {
            return;
        }

        sidebar.classList.remove("open");
    }
);


/* =====================================================
   사이드바 주요 메뉴
===================================================== */

document
    .querySelectorAll(".side-item")
    .forEach(button => {
        button.addEventListener(
            "click",
            async () => {
                document
                    .querySelectorAll(
                        ".side-item"
                    )
                    .forEach(item => {
                        item.classList.remove(
                            "active"
                        );
                    });


                button.classList.add(
                    "active"
                );


                const panel =
                    button.dataset.panel;


                if (panel === "home") {
                    routePanel?.classList.remove(
                        "show"
                    );
                    placeCard?.classList.remove("route-focus");

                    placeCard?.classList.remove(
                        "show"
                    );

                    googleMap?.panTo({
                        lat: 35.6896,
                        lng: 139.7006
                    });

                    googleMap?.setZoom(13);
                }


                if (panel === "explore") {
                    routePanel?.classList.remove(
                        "show"
                    );
                    placeCard?.classList.remove("route-focus");

                    placeCard?.classList.remove(
                        "show"
                    );

                    googleMap?.setZoom(14);

                    showToast(
                        currentLanguage === "ko"
                            ? "주변 추천 장소를 표시했습니다."
                            : "周辺のおすすめスポットを表示しました。"
                    );
                }


                if (panel === "route") {
                    resetPoiRouteSelection(true);
                    clearRenderedRoute();

                    if (placeCard?.classList.contains("show")) {
                        routePanel?.classList.add("show");
                        requestAnimationFrame(() => {
                            routePanel?.scrollIntoView({
                                behavior: "smooth",
                                block: "start"
                            });
                        });
                    } else {
                        showToast(
                            currentLanguage === "ko"
                                ? "지도에서 목적지를 먼저 선택한 뒤 장소 정보의 길찾기를 눌러주세요."
                                : "地図で目的地を選択してから、スポット情報のルート検索を押してください。"
                        );
                    }
                }


                if (panel === "favorite") {
                    /*
                        사이드바 즐겨찾기 버튼
                        → 마이페이지의 즐겨찾기 탭을 바로 엽니다.
                    */
                    if (!getAuthToken()) {
                        currentUser = null;
                        updateHeaderAuthState();
                        openModal(loginModal);
                    } else {
                        try {
                            /*
                                새로고침 직후 currentUser가 비어 있어도
                                서버에서 실제 로그인 사용자 정보를 다시 읽습니다.
                            */
                            if (!currentUser) {
                                await fetchCurrentUser();
                                updateHeaderAuthState();
                            }

                            setMyPageTab("favorites");
                            renderMyPage();
                            openModal(mypageModal);
                        } catch (error) {
                            console.error("즐겨찾기 열기 실패:", error);

                            clearAuthToken();
                            currentUser = null;
                            localStorage.removeItem(STORAGE_KEYS.user);
                            updateHeaderAuthState();
                            openModal(loginModal);

                            showToast(
                                currentLanguage === "ko"
                                    ? "로그인 정보를 다시 확인해주세요."
                                    : currentLanguage === "ja"
                                        ? "ログイン情報をもう一度確認してください。"
                                        : "Please sign in again."
                            );
                        }
                    }
                }


                if (panel === "group") {
                    openModal(groupModal);
                    renderGroupManager();
                }


                if (
                    window.innerWidth <= 850
                ) {
                    sidebar?.classList.remove(
                        "open"
                    );
                }
            }
        );
    });


/* =====================================================
   로고 클릭 시 홈으로 이동
===================================================== */

document
    .getElementById("brandButton")
    ?.addEventListener(
        "click",
        event => {
            event.preventDefault();

            routePanel?.classList.remove(
                "show"
            );
            placeCard?.classList.remove("route-focus");

            placeCard?.classList.remove(
                "show"
            );

            document
                .querySelectorAll(
                    ".side-item"
                )
                .forEach(item => {
                    item.classList.toggle(
                        "active",
                        item.dataset.panel ===
                            "home"
                    );
                });

            filterCategory("all");

            googleMap?.panTo({
                lat: 35.6896,
                lng: 139.7006
            });

            googleMap?.setZoom(13);
        }
    );


/* =====================================================
   플로팅 패널 닫기
===================================================== */

document
    .querySelectorAll("[data-close]")
    .forEach(button => {
        button.addEventListener(
            "click",
            () => {
                const panelId =
                    button.dataset.close;

                document
                    .getElementById(panelId)
                    ?.classList.remove(
                        "show"
                    );

                if (panelId === "routePanel") {
                    placeCard?.classList.remove("route-focus");
                    resetPoiRouteSelection(true);
                    clearRenderedRoute();

                    const placeContent = document.querySelector(
                        ".place-side-panel .place-content"
                    );

                    placeContent?.scrollTo({
                        top: 0,
                        behavior: "smooth"
                    });
                }
            }
        );
    });


/* 주변 추천 새로고침 */

document
    .getElementById(
        "recommendRefreshButton"
    )
    ?.addEventListener(
        "click",
        async event => {
            event.stopPropagation();

            nearbyRecommendationState.places =
                [];

            nearbyRecommendationState.center =
                null;

            nearbyRecommendationState.lastLoadedAt =
                0;

            await renderRecommendedPlaces(
                "all",
                {
                    force:
                        true
                }
            );
        }
    );


/* =====================================================
   추천 장소 패널 접기
===================================================== */

document
    .getElementById(
        "hideRecommendButton"
    )
    ?.addEventListener(
        "click",
        event => {
            event.stopPropagation();

            const recommendPanel =
                document.getElementById(
                    "recommendPanel"
                );

            const hideButton =
                event.currentTarget;

            const isCollapsed =
                recommendPanel?.classList.toggle(
                    "collapsed"
                );

            hideButton.textContent =
                isCollapsed ? "+" : "−";

            hideButton.setAttribute(
                "aria-label",
                currentLanguage === "ko"
                    ? isCollapsed
                        ? "추천 장소 펼치기"
                        : "추천 장소 접기"
                    : isCollapsed
                        ? "おすすめスポットを開く"
                        : "おすすめスポットを閉じる"
            );
        }
    );


/* =====================================================
   장소 검색
===================================================== */

function normalizeSearchText(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "");
}


async function searchPlace() {
    const input = document.getElementById("searchInput");
    const rawKeyword = String(input?.value || "").trim();
    const keyword = normalizeSearchText(rawKeyword);

    if (!keyword) {
        showToast("toast.searchRequired");
        input?.focus();
        return;
    }

    /*
        검색창 검색도 지도 POI 클릭과 동일하게 Google Place ID -> Place Details
        흐름을 사용한다. 기존 로컬 places 객체를 먼저 열면 역 검색에서
        사진/평점/리뷰 수가 없는 샘플 데이터 카드로 떨어질 수 있다.
    */
    try {
        const { Place } = await google.maps.importLibrary("places");
        const center = googleMap?.getCenter?.();
        const centerPoint = center
            ? {
                lat: typeof center.lat === "function" ? center.lat() : Number(center.lat),
                lng: typeof center.lng === "function" ? center.lng() : Number(center.lng)
            }
            : null;

        const stationQuery = /(?:역|駅|station|jr|전철|철도|지하철|metro|subway)/iu.test(rawKeyword);

        const request = {
            textQuery: rawKeyword,
            fields: [
                "id",
                "displayName",
                "location",
                "primaryType",
                "primaryTypeDisplayName",
                "photos",
                "rating",
                "userRatingCount",
                "formattedAddress"
            ],
            language: currentLanguage === "ko" ? "ko" : "ja",
            region: "JP",
            maxResultCount: 20
        };

        if (centerPoint && Number.isFinite(centerPoint.lat) && Number.isFinite(centerPoint.lng)) {
            request.locationBias = {
                center: centerPoint,
                radius: 50000
            };
        }

        const { places: googleResults = [] } = await Place.searchByText(request);

        if (googleResults.length) {
            const stationTypes = new Set([
                "train_station",
                "subway_station",
                "transit_station"
            ]);

            const ranked = googleResults
                .map((candidate, index) => {
                    const type = String(candidate?.primaryType || "").toLowerCase();
                    const isStation = stationTypes.has(type);
                    const photoCount = Array.isArray(candidate?.photos) ? candidate.photos.length : 0;
                    const reviewCount = Number(candidate?.userRatingCount) || 0;
                    const rating = Number(candidate?.rating) || 0;

                    let score = 1000 - index * 10;

                    if (stationQuery) {
                        score += isStation ? 3000 : -1200;
                    }

                    if (photoCount > 0) score += 500 + Math.min(photoCount, 10) * 15;
                    if (reviewCount > 0) score += 400 + Math.min(reviewCount, 5000) / 25;
                    if (rating > 0) score += rating * 20;

                    return { candidate, score };
                })
                .sort((a, b) => b.score - a.score);

            const best = ranked[0]?.candidate;

            if (best?.id) {
                const position = best.location
                    ? {
                        lat: typeof best.location.lat === "function"
                            ? best.location.lat()
                            : Number(best.location.lat),
                        lng: typeof best.location.lng === "function"
                            ? best.location.lng()
                            : Number(best.location.lng)
                    }
                    : centerPoint;

                console.debug("검색창 Google Place 선택:", {
                    query: rawKeyword,
                    id: best.id,
                    name: best.displayName,
                    type: best.primaryType,
                    photos: Array.isArray(best.photos) ? best.photos.length : 0,
                    rating: best.rating,
                    userRatingCount: best.userRatingCount
                });

                await openGooglePoi(
                    best.id,
                    position,
                    best.displayName || rawKeyword,
                    {
                        displayNameOverride: best.displayName || "",
                        photoSearchNames: [best.displayName || rawKeyword]
                    }
                );

                if (position) {
                    googleMap?.panTo(position);
                    googleMap?.setZoom(16);
                }

                showToast("toast.searchFound");
                return;
            }
        }
    } catch (error) {
        console.warn("Google Places 검색 실패, 로컬 검색으로 fallback:", error);
    }

    // Google 검색이 실패한 경우에만 기존 로컬 장소 데이터로 fallback한다.
    const result = Object.entries(places)
        .find(([, place]) => {
            const searchableText = [
                place.name.ko,
                place.name.ja,
                place.category.ko,
                place.category.ja,
                place.address.ko,
                place.address.ja
            ]
                .map(normalizeSearchText)
                .join(" ");

            return searchableText.includes(keyword);
        });

    if (!result) {
        showToast("toast.noResult");
        return;
    }

    const [placeKey, place] = result;

    openPlace(placeKey);
    filterCategory(place.type);
    googleMap?.panTo(place.position);
    googleMap?.setZoom(16);
    showToast("toast.searchFound");
}

document
    .getElementById("searchButton")
    ?.addEventListener(
        "click",
        searchPlace
    );


document
    .getElementById("searchInput")
    ?.addEventListener(
        "keydown",
        event => {
            if (event.key === "Enter") {
                event.preventDefault();
                searchPlace();
            }
        }
    );

/* =====================================================
   추천 UI / 추천 검색 강제 초기화
===================================================== */

function bootNearbyRecommendations() {
    ensureNearbyRecommendationUi();

    const tryLoad = () => {
        if (googleMap && window.google?.maps) {
            renderRecommendedPlaces("all", {
                force: nearbyRecommendationState.places.length === 0
            });
            return true;
        }
        return false;
    };

    if (tryLoad()) return;

    let attempts = 0;
    const timer = window.setInterval(() => {
        attempts += 1;
        if (tryLoad() || attempts >= 30) {
            window.clearInterval(timer);
        }
    }, 500);
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootNearbyRecommendations, { once: true });
} else {
    bootNearbyRecommendations();
}


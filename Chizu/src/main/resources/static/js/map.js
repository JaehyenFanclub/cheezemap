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
    googleMap.addListener("zoom_changed", refreshStationClickVisibility);
    googleMap.addListener("idle", () => {
        const toggle = document.getElementById("wheelchairToggle");
        if (toggle?.checked) scheduleWheelchairAccessibilitySearch();
    });
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


function createStationClickAreas() {
    if (!googleMap || !window.google?.maps) {
        return;
    }

    clearStationClickAreas();

    Object.entries(places)
        .filter(([, place]) => {
            return (
                place.type === "transport" &&
                Number.isFinite(place.position?.lat) &&
                Number.isFinite(place.position?.lng)
            );
        })
        .forEach(([placeKey, place]) => {
            const marker = new google.maps.Marker({
                map: googleMap,
                position: place.position,
                title: place.name[currentLanguage],
                clickable: true,
                optimized: false,
                zIndex: 20,

                // Google 기본 역 모양은 그대로 두고 클릭 영역만 덮습니다.
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 18,
                    fillColor: "#000000",
                    fillOpacity: 0.001,
                    strokeColor: "#000000",
                    strokeOpacity: 0,
                    strokeWeight: 0
                }
            });

            marker.addListener("click", async () => {
                const position = {
                    lat: place.position.lat,
                    lng: place.position.lng
                };

                /*
                    장소 카드에서 길찾기를 누른 상태라면
                    이 역을 다음 출발지 또는 도착지로 사용합니다.
                */
                if (isRoutePanelOpen()) {
                    await handleMapRouteSelectionClick({
                        latLng: new google.maps.LatLng(
                            position.lat,
                            position.lng
                        ),
                        domEvent: {
                            target: {
                                getAttribute(attributeName) {
                                    return attributeName === "aria-label"
                                        ? place.name[currentLanguage]
                                        : null;
                                }
                            }
                        }
                    });

                    return;
                }

                openPlace(placeKey);
                googleMap.panTo(position);

                if ((googleMap.getZoom() || 0) < 15) {
                    googleMap.setZoom(15);
                }
            });

            stationClickMarkers.push({
                marker,
                placeKey,
                type: place.type,
                majorStation: Boolean(place.majorStation)
            });
        });

    refreshStationClickVisibility();
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
   - Google Places API (New) Nearby Search 사용
   - 거리 + 평점 + 리뷰 수 + 성별 카테고리 가중치
   - "성별 구분 없이" 설정 시 성별 가중치 제거
===================================================== */

const RECOMMEND_RADIUS_METERS = 800;

const nearbyRecommendationState = {
    center: null,
    centerSource: "loading",
    places: [],
    loadingPromise: null,
    lastLoadedAt: 0
};

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
    if (
        !useGender ||
        gender === "neutral"
    ) {
        return 0;
    }

    const category =
        getRecommendationCategory(
            place
        );

    /*
        성별은 완전 필터가 아니라 '가산점'으로만 사용합니다.
        따라서 반대 성별 목록의 카테고리도
        거리/평점/리뷰가 좋으면 충분히 추천될 수 있습니다.
    */
    const maleWeights = {
        ramen: 18,
        izakaya: 18,
        yakiniku: 16,
        karaoke: 15,
        nightlife: 13,
        amusement: 12,
        restaurant: 8,
        cafe: 3,
        culture: 3,
        shopping: 2,
        park: 3,
        dessert: 2
    };

    const femaleWeights = {
        cafe: 18,
        dessert: 17,
        shopping: 15,
        karaoke: 14,
        culture: 13,
        park: 9,
        restaurant: 8,
        ramen: 4,
        izakaya: 3,
        nightlife: 2,
        amusement: 5
    };

    return (
        gender === "male"
            ? maleWeights[category]
            : femaleWeights[category]
    ) || 0;
}

function getRecommendationScore(
    place,
    center,
    useGender,
    gender
) {
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
            ? "男性向けカテゴリに加点"
            : currentLanguage === "en"
                ? "Male preference weighting applied"
                : "남성 선호 카테고리 가중치 적용";
    }

    if (gender === "female") {
        return currentLanguage === "ja"
            ? "女性向けカテゴリに加点"
            : currentLanguage === "en"
                ? "Female preference weighting applied"
                : "여성 선호 카테고리 가중치 적용";
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

async function loadNearbyRecommendationPlaces(
    force = false
) {
    const now =
        Date.now();

    if (
        !force &&
        nearbyRecommendationState.places.length &&
        now -
        nearbyRecommendationState.lastLoadedAt <
        120000
    ) {
        return nearbyRecommendationState.places;
    }

    if (
        !force &&
        nearbyRecommendationState.loadingPromise
    ) {
        return nearbyRecommendationState.loadingPromise;
    }

    nearbyRecommendationState.loadingPromise =
        (async () => {
            if (
                !googleMap ||
                !window.google?.maps
            ) {
                return [];
            }

            const locationResult =
                await getCurrentPositionForRecommendations();

            nearbyRecommendationState.center =
                locationResult.center;

            nearbyRecommendationState.centerSource =
                locationResult.source;

            const {
                Place,
                SearchNearbyRankPreference
            } =
                await google.maps.importLibrary(
                    "places"
                );

            const result =
                await Place.searchNearby({
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
                        center:
                            nearbyRecommendationState.center,

                        radius:
                            RECOMMEND_RADIUS_METERS
                    },

                    maxResultCount:
                        20,

                    rankPreference:
                        SearchNearbyRankPreference.POPULARITY,

                    language:
                        currentLanguage === "ja"
                            ? "ja"
                            : currentLanguage === "en"
                                ? "en"
                                : "ko"
                });

            nearbyRecommendationState.places =
                (result.places || [])
                    .filter(place => {
                        const point =
                            locationToPlainObject(
                                place.location
                            );

                        const distance =
                            calculateDistanceMeters(
                                nearbyRecommendationState.center,
                                point
                            );

                        return (
                            place?.id &&
                            point &&
                            distance <=
                            RECOMMEND_RADIUS_METERS
                        );
                    });

            nearbyRecommendationState.lastLoadedAt =
                Date.now();

            return nearbyRecommendationState.places;
        })()
            .catch(error => {
                console.error(
                    "주변 추천 장소 검색 실패:",
                    error
                );

                throw error;
            })
            .finally(() => {
                nearbyRecommendationState.loadingPromise =
                    null;
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
                )
            );

        const basis =
            settings.recommendBasis ||
            document.documentElement
                .dataset.recommendBasis ||
            "gender";

        const gender =
            getRecommendationGender();

        const useGender =
            basis !== "all" &&
            gender !== "neutral";

        const ranked =
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
                        gender
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

        if (context) {
            context.textContent =
                getRecommendationCenterText();
        }

        if (mode) {
            mode.innerHTML = `
                <i class="ti ti-sparkles"></i>

                <span>
                    ${getRecommendationModeText(useGender, gender)}
                </span>
            `;
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
                                data-google-place-id="${place.id}"
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
                        const placeId =
                            card.dataset
                                .googlePlaceId;

                        const lat =
                            Number(
                                card.dataset.lat
                            );

                        const lng =
                            Number(
                                card.dataset.lng
                            );

                        await openGooglePoi(
                            placeId,
                            {
                                lat,
                                lng
                            },
                            card.getAttribute("aria-label") || ""
                        );

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
   MR.EUM 수정부분
   장소 상세 - 메뉴 / 리뷰

   현재는 화면 구현용 Mock 데이터입니다.
   실제 API 연결 시 이 데이터 부분만 API 응답으로 교체합니다.
===================================================== */

// MR.EUM 수정부분: 음식점(type: food)용 메뉴 시연 데이터
const placeMenuDemoData = {
    ramen: [
        { menuName: { ko: "치즈 라멘", ja: "チーズラーメン" }, menuValue: "980", menuInfo: { ko: "치즈와 라멘을 함께 즐기는 대표 메뉴", ja: "チーズとラーメンを一緒に楽しめる人気メニュー" }, photoUrl: "" },
        { menuName: { ko: "매운 치즈 라멘", ja: "辛チーズラーメン" }, menuValue: "1,080", menuInfo: { ko: "매콤한 육수에 치즈를 더한 메뉴", ja: "ピリ辛スープにチーズを加えたメニュー" }, photoUrl: "" },
        { menuName: { ko: "교자", ja: "餃子" }, menuValue: "450", menuInfo: { ko: "바삭하게 구운 일본식 만두", ja: "香ばしく焼き上げた餃子" }, photoUrl: "" }
    ],
    ichiranShibuya: [
        { menuName: { ko: "천연 돈골 라멘", ja: "天然とんこつラーメン" }, menuValue: "980", menuInfo: { ko: "이치란 대표 돈코츠 라멘", ja: "一蘭の代表的な天然とんこつラーメン" }, photoUrl: "" },
        { menuName: { ko: "추가 차슈", ja: "追加チャーシュー" }, menuValue: "250", menuInfo: { ko: "라멘에 추가할 수 있는 차슈", ja: "ラーメンに追加できるチャーシュー" }, photoUrl: "" }
    ],
    tsukijiOuterMarket: [
        { menuName: { ko: "참치 초밥", ja: "まぐろ寿司" }, menuValue: "1,200", menuInfo: { ko: "쓰키지에서 즐기는 대표 해산물 메뉴", ja: "築地で楽しめる人気の海鮮メニュー" }, photoUrl: "" },
        { menuName: { ko: "해산물 덮밥", ja: "海鮮丼" }, menuValue: "1,500", menuInfo: { ko: "신선한 해산물을 올린 덮밥", ja: "新鮮な海鮮をのせた丼" }, photoUrl: "" }
    ]
};

// MR.EUM 수정부분: 장소 상세 리뷰는 마이페이지의 내 리뷰만 사용합니다.
// 실제 백엔드 리뷰 API가 연결되면 이 배열 대신 API 응답을 사용합니다.

// MR.EUM 수정부분: 현재 언어에 맞는 텍스트를 반환합니다.
function getLocalizedPlaceText(value) {
    if (value && typeof value === "object") {
        return value[currentLanguage] || value.ko || value.ja || "";
    }
    return value || "";
}

// MR.EUM 수정부분: 장소별 메뉴 데이터를 가져옵니다.
function getPlaceMenuData(placeKey) {
    return placeMenuDemoData[placeKey] || [];
}

// MR.EUM 수정부분: 마이페이지 등록 장소(cafe, park)의 내 리뷰와 타인 리뷰를 조건 분기하여 반환
function getPlaceReviewData(placeKey) {
    const allowedPlaces = ["cafe", "park"];
    if (!allowedPlaces.includes(placeKey)) return []; // 2곳을 제외한 모든 곳은 리뷰 차단
    
    return mockReviews
        .filter(review => review.placeKey === placeKey)
        .map(review => ({
            ...review,
            // 객체에 적힌 작성자가 '엄용민'이거나 isMine이 true인 것만 진짜 내 리뷰로 인정하네
            isMine: review.isMine === true || review.userName === "엄용민"
        }));
}

// MR.EUM 수정부분: 리뷰 별점을 문자로 표시합니다.
function getReviewStars(rating) {
    const score = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)));
    return "★".repeat(score) + "☆".repeat(5 - score);
}

// MR.EUM 수정부분: 메뉴는 음식점(type: food)에서만 표시합니다.
function renderPlaceMenu(placeKey) {
    const list = document.getElementById("placeMenuList");
    const count = document.getElementById("placeMenuCount");
    const menuSection = document.getElementById("placeMenuSection");
    const place = places[placeKey];

    if (!list) return;

    if (!place || place.type !== "food") {
        if (menuSection) menuSection.style.display = "none";
        return;
    }

    if (menuSection) menuSection.style.display = "block";

    const menus = getPlaceMenuData(placeKey);

    if (count) {
        count.textContent = `${menus.length}${translate("place.menuCount")}`;
    }

    if (!menus.length) {
        list.innerHTML = `<p class="place-empty-text">${translate("place.menuEmpty")}</p>`;
        return;
    }

    list.innerHTML = menus.map(menu => {
        const menuName = getLocalizedPlaceText(menu.menuName);
        const menuInfo = getLocalizedPlaceText(menu.menuInfo) || translate("place.menuDescriptionEmpty");
        const price = String(menu.menuValue || "").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        const image = menu.photoUrl
            ? `<img src="${menu.photoUrl}" alt="${menuName}">`
            : `<i class="ti ti-tools-kitchen-2"></i>`;

        return `
            <article class="place-menu-item">
                <div class="place-menu-thumb">${image}</div>
                <div class="place-menu-info">
                    <strong>${menuName}</strong>
                    <p>${menuInfo}</p>
                </div>
                <strong class="place-menu-price">¥${price}</strong>
            </article>
        `;
    }).join("");
}

// MR.EUM 수정부분: 내 리뷰가 없는 장소는 "등록된 리뷰가 없습니다"로 완벽 분기
function renderPlaceReviews(placeKey) {
    const list = document.getElementById("placeReviewList");
    const score = document.getElementById("placeReviewScore");
    const stars = document.getElementById("placeReviewStars");
    const summary = document.getElementById("placeReviewSummaryText");

    if (!list) return;

    // 위에서 수정한 함수를 통해 현재 장소의 리뷰만 가져옵니다.
    const reviews = getPlaceReviewData(placeKey);
    const place = places[placeKey];
    const average = Number(place?.rating);

    // [중요] 리뷰가 없는 장소 스코어보드 초기화 및 예외 처리
    if (!reviews.length) {
        if (score) score.textContent = Number.isFinite(average) ? average.toFixed(1) : "-";
        if (stars) stars.textContent = Number.isFinite(average) ? getReviewStars(average) : "☆☆☆☆☆";
        if (summary) summary.textContent = `${translate("place.reviewCount")} 0${currentLanguage === "ko" ? "개" : "件"}`;
        
        list.innerHTML = `<p class="place-empty-text">${translate("place.reviewEmpty")}</p>`;
        return;
    }

    // 리뷰가 존재하는 장소(cafe, park)의 정상 출력부
    if (score) {
        score.textContent = Number.isFinite(average) ? average.toFixed(1) : "-";
    }

    if (stars) {
        stars.textContent = Number.isFinite(average) ? getReviewStars(average) : "☆☆☆☆☆";
    }

    if (summary) {
        summary.textContent = `${translate("place.reviewCount")} ${reviews.length}${currentLanguage === "ko" ? "개" : "件"}`;
    }

    list.innerHTML = reviews.slice(0, 3).map(review => {
        const content = getLocalizedPlaceText(review.content);
        const reviewIndex = mockReviews.findIndex(r => r.placeKey === placeKey && r.date === review.date);

        return `
            <article class="place-review-item" data-review-index="${reviewIndex}">
                <div class="place-review-top">
                    <div class="place-review-user-wrap">
                        <span class="place-review-user">${review.userName}</span>
                        <span class="place-review-rating">${getReviewStars(review.rating)}</span>
                    </div>
                    ${review.isMine ? `
                    <button type="button" class="place-review-edit-toggle" data-review-edit-toggle>
                        ${translate("place.reviewEdit")}
                    </button>` : ""}
                </div>
                <div class="place-review-view" data-review-view>
                    <p class="place-review-content">${content}</p>
                    <span class="place-review-date">${review.date}</span>
                </div>
                <div class="place-review-edit" data-review-edit hidden>
                    <div class="place-review-edit-stars" data-review-edit-stars>
                        ${[1,2,3,4,5].map(rating => `
                            <button type="button" data-edit-rating="${rating}" class="${rating <= Number(review.rating) ? "selected" : ""}">${rating <= Number(review.rating) ? "★" : "☆"}</button>
                        `).join("")}
                    </div>
                    <textarea data-review-edit-content maxlength="500">${content}</textarea>
                    <div class="place-review-edit-actions">
                        <button type="button" class="place-review-edit-cancel" data-review-edit-cancel>
                            ${translate("place.reviewEditCancel")}
                        </button>
                        <button type="button" class="place-review-edit-save" data-review-edit-save>
                            ${translate("place.reviewEditSave")}
                        </button>
                    </div>
                </div>
            </article>
        `;
    }).join("");
}

// MR.EUM 수정부분: 장소 상세의 메뉴/리뷰를 함께 갱신합니다.
function renderPlaceExtraSections(placeKey) {
    renderPlaceMenu(placeKey);
    renderPlaceReviews(placeKey);
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
        placeName.textContent =
            place.name[currentLanguage] || place.name.ko || "";
    }

    if (placeCategory) {
        placeCategory.textContent =
            place.category[currentLanguage] || place.category.ko || "";
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


async function openGooglePoi(placeId, fallbackPosition, fallbackName = "") {
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
        : (currentLanguage === "ko" ? "선택한 장소" : "選択した場所");

    const fallbackPoi = {
        id: normalizedPlaceId,
        displayName: safeName,
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
        name: safeName,
        position: safePosition,
        address: "",
        primaryType: "",
        primaryTypeDisplayName: "",
        category: getGooglePoiTypeLabel([]),
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
    }

    try {
        const poi = await fetchGooglePoiDetails(normalizedPlaceId);

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

        const resolvedName = String(poi.displayName || rawFallbackName || "").trim();
        const hasResolvedName = Boolean(resolvedName) &&
            resolvedName !== "선택한 장소" &&
            resolvedName !== "選択した場所" &&
            resolvedName.toLowerCase() !== "selected place" &&
            resolvedName.toLowerCase() !== "place";

        const name = hasResolvedName
            ? resolvedName
            : safeName;

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
            category: poi.primaryTypeDisplayName || getGooglePoiTypeLabel(poi.primaryType ? [poi.primaryType] : []),
            rating: Number(poi.rating) || 0,
            reviewCount: Number(poi.userRatingCount) || 0,
            userRatingCount: Number(poi.userRatingCount) || 0,
            photos: Array.isArray(poi.photos) ? poi.photos : []
        };

        let autoPlace = null;
        try {
            autoPlace = await ensureBackendPlace();
            selectedGooglePoi.autoPlace = autoPlace;
            selectedGooglePoi.backendPlaceId = autoPlace.placeId;
        } catch (backendError) {
            console.warn("AutoPlace 백엔드 연결 실패:", backendError);
        }

        // Google 상세 조회가 끝난 뒤 Places API (New) 사진으로 갱신합니다.
        updateGooglePoiCard({ ...poi, id: resolvedPlaceId }, autoPlace, {
            loadPhoto: true
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

    const photoUrls = [];
    const seen = new Set();
    const pushUrl = url => {
        if (!url || seen.has(url) || photoUrls.length >= 3) return;
        seen.add(url);
        photoUrls.push(url);
    };

    // 1순위: Places API (New) Photo 객체에서 최대 3장
    const googlePhotos = Array.isArray(poi?.photos) ? poi.photos : [];
    for (const photo of googlePhotos.slice(0, 3)) {
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
    carousel.setAttribute("aria-label", currentLanguage === "ja" ? "場所の写真" : currentLanguage === "en" ? "Place photos" : "장소 사진");

    const track = document.createElement("div");
    track.className = "google-place-photo-track";
    carousel.appendChild(track);

    const slides = photoUrls.map((url, index) => {
        const slide = document.createElement("div");
        slide.className = "google-place-photo-slide";
        slide.setAttribute("aria-hidden", index === 0 ? "false" : "true");

        const img = document.createElement("img");
        img.className = "google-place-main-photo";
        img.alt = `${poi?.displayName || selectedGooglePoi?.name || "장소"} ${currentLanguage === "ja" ? "写真" : currentLanguage === "en" ? "photo" : "사진"} ${index + 1}`;
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

function debugGooglePoiPhotos(poi, autoPlace) {
    const directPhotos = Array.isArray(poi?.photos) ? poi.photos : [];
    const backendUrls = Array.isArray(autoPlace?.photoUrls) ? autoPlace.photoUrls : [];
}

function updateGooglePoiCard(poi, autoPlace = null, options = {}) {
    const { loadPhoto = true } = options;
    debugGooglePoiPhotos(poi, autoPlace);
    const name =
        poi.displayName ||
        (currentLanguage === "ko"
            ? "선택한 장소"
            : "選択した場所");

    const category =
        poi.primaryTypeDisplayName ||
        getGooglePoiTypeLabel(
            poi.primaryType ? [poi.primaryType] : []
        );

    // Place 가 있으면 Cheese Map 별점/리뷰를 우선 표시합니다.
    const placeAvg = Number(autoPlace?.avgRating);
    const placeReviews = Number(autoPlace?.reviewCount);
    const hasPlaceStats = autoPlace?.placeId && (
        Number.isFinite(placeAvg) || Number.isFinite(placeReviews)
    );
    const rating = hasPlaceStats && Number.isFinite(placeAvg)
        ? placeAvg
        : Number(poi.rating);
    const reviewCount = hasPlaceStats && Number.isFinite(placeReviews)
        ? placeReviews
        : Number(poi.userRatingCount);

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
        placeName.textContent = autoPlace?.placeName || autoPlace?.name || name;
    }

    if (placeCategory) {
        placeCategory.textContent = autoPlace?.placeCategory || autoPlace?.category || category;
    }

    if (placeRating) {
        placeRating.textContent = Number.isFinite(rating)
            ? rating.toFixed(1)
            : "-";
    }

    const reviewText = Number.isFinite(reviewCount)
        ? currentLanguage === "ko"
            ? `리뷰 ${reviewCount.toLocaleString()}개`
            : currentLanguage === "en"
                ? `${reviewCount.toLocaleString()} reviews`
                : `レビュー ${reviewCount.toLocaleString()}件`
        : currentLanguage === "ko"
            ? "리뷰 정보 없음"
            : "レビュー情報なし";

    if (placeReview) {
        placeReview.textContent = reviewText;
    }

    if (placeReviewCount) {
        placeReviewCount.textContent = reviewText;
    }

    if (placeAddress) {
        placeAddress.textContent =
            autoPlace?.placeAddress ||
            autoPlace?.address ||
            poi.formattedAddress ||
            (currentLanguage === "ko"
                ? "주소 정보 없음"
                : "住所情報なし");
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
        placeCard.dataset.placeKey = "";
        placeCard.dataset.googlePlaceId = poi.id || "";
        if (autoPlace?.placeId) {
            placeCard.dataset.backendPlaceId = String(autoPlace.placeId);
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
                                기존 localStorage 사용자 정보에 id가 없거나
                                새로고침 직후라 currentUser가 비어 있어도
                                서버에서 실제 로그인 사용자 정보를 다시 읽습니다.
                            */
                            if (!currentUser?.id) {
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


function searchPlace() {
    const input =
        document.getElementById(
            "searchInput"
        );

    const keyword =
        normalizeSearchText(
            input?.value
        );


    if (!keyword) {
        showToast(
            "toast.searchRequired"
        );

        input?.focus();
        return;
    }


    const result =
        Object.entries(places)
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

                return searchableText.includes(
                    keyword
                );
            });


    if (!result) {
        showToast(
            "toast.noResult"
        );

        return;
    }


    const [placeKey, place] =
        result;


    openPlace(placeKey);

    filterCategory(
        place.type
    );

    googleMap?.panTo(
        place.position
    );

    googleMap?.setZoom(16);


    showToast(
        "toast.searchFound"
    );
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


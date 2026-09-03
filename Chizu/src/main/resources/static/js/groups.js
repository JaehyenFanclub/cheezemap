/* =====================================================
   그룹 관리 - Spring Boot API 연결
===================================================== */

const GROUP_STORAGE_KEY = "cheeseMapGroups"; // 기존 설정 초기화 코드 호환용

let selectedGroupId = null;
let groupCache = [];

/* =====================================================
   장소 → 그룹 저장 전용 UI
   백엔드 수정 없이 기존 그룹 API만 사용
===================================================== */

const GROUP_PLACE_MEMO_KEY =
    "cheeseMapGroupPlaceMemosV1";

let groupSaveDraft = {
    placeKey: null,
    memo: "",
    selectedGroupId: null
};

function readGroupPlaceMemos() {
    try {
        const value =
            JSON.parse(
                localStorage.getItem(
                    GROUP_PLACE_MEMO_KEY
                ) || "{}"
            );

        return value &&
            typeof value === "object"
            ? value
            : {};
    } catch {
        return {};
    }
}

function writeGroupPlaceMemos(
    value
) {
    localStorage.setItem(
        GROUP_PLACE_MEMO_KEY,
        JSON.stringify(
            value
        )
    );
}

function groupPlaceMemoKey(
    groupId,
    placeKey
) {
    return `${groupId}:${placeKey}`;
}

function saveGroupPlaceMemo(
    groupId,
    placeKey,
    memo
) {
    const all =
        readGroupPlaceMemos();

    const key =
        groupPlaceMemoKey(
            groupId,
            placeKey
        );

    const cleaned =
        String(
            memo || ""
        ).trim();

    if (cleaned) {
        all[key] =
            cleaned;
    } else {
        delete all[key];
    }

    writeGroupPlaceMemos(
        all
    );
}

function getGroupPlaceMemo(
    groupId,
    placeKey
) {
    const all =
        readGroupPlaceMemos();

    return (
        all[
            groupPlaceMemoKey(
                groupId,
                placeKey
            )
        ] || ""
    );
}

function normalizeGroupSaveText(
    value
) {
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

function getGroupSaveCategoryPreset(
    placeKey = selectedPlaceKey
) {
    const place =
        placeKey
            ? places[placeKey]
            : null;

    /*
        그룹 목록에 저장된 장소의 카테고리를 표시할 때는
        "현재 지도에서 열려 있는 다른 장소(selectedGooglePoi / placeCategory)"
        정보를 섞으면 안 됩니다.

        이전에는 예를 들어:
        저장 장소 = 호텔
        현재 지도에서 마지막으로 본 장소 = 카페
        인 경우 rawCategory에 "호텔 카페"가 같이 들어가고,
        presets에서 cafe가 hotel보다 먼저 검사되어 호텔도 카페로 표시될 수 있었습니다.

        placeKey로 실제 저장 장소를 찾을 수 있으면 그 장소 데이터만 사용합니다.
        현재 선택 장소를 저장하는 특수 흐름에서만 전역 POI/DOM 값을 fallback으로 사용합니다.
    */
    const hasStoredPlace =
        Boolean(
            placeKey &&
            place
        );

    const rawCategory = (
        hasStoredPlace
            ? [
                normalizeGroupSaveText(
                    place?.category
                ),
                place?.type
            ]
            : [
                selectedGooglePoi?.primaryType,
                selectedGooglePoi?.primaryTypeDisplayName,
                document
                    .getElementById(
                        "placeCategory"
                    )
                    ?.textContent
            ]
    )
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

    const presets = [
        {
            test:
                /(restaurant|food|meal|라멘|음식|식당|맛집|고기|초밥|스시|이자카야)/i,
            key: "food",
            label: "음식점",
            icon: "ti-bowl-chopsticks",
            detail: "맛집 · 식사"
        },
        {
            test:
                /(cafe|coffee|카페|커피|베이커리|디저트)/i,
            key: "cafe",
            label: "카페",
            icon: "ti-coffee",
            detail: "카페 · 디저트"
        },
        {
            test:
                /(convenience|편의점|store|마트)/i,
            key: "convenience",
            label: "편의점",
            icon: "ti-building-store",
            detail: "편의 · 쇼핑"
        },
        {
            test:
                /(museum|gallery|박물관|미술관|전시|문화센터|문화센)/i,
            key: "museum",
            label: "박물관 · 문화",
            icon: "ti-building-community",
            detail: "문화 · 전시"
        },
        {
            test:
                /(station|subway|train|rail|역|교통|버스)/i,
            key: "transit",
            label: "교통 · 역",
            icon: "ti-train",
            detail: "교통 · 이동"
        },
        {
            test:
                /(park|garden|공원|정원)/i,
            key: "park",
            label: "공원",
            icon: "ti-trees",
            detail: "공원 · 산책"
        },
        {
            test:
                /(university|college|school|대학교|대학|학교)/i,
            key: "education",
            label: "교육",
            icon: "ti-school",
            detail: "대학 · 교육"
        },
        {
            test:
                /(hotel|lodging|motel|hostel|guest_house|inn|resort|호텔|숙소|숙박|료칸)/i,
            key: "hotel",
            label: "호텔",
            icon: "ti-bed",
            detail: "호텔 · 숙박"
        },
        {
            test:
                /(shopping|mall|department|백화점|쇼핑|상점)/i,
            key: "shopping",
            label: "쇼핑",
            icon: "ti-shopping-bag",
            detail: "쇼핑 · 상점"
        },
        {
            test:
                /(hospital|clinic|병원|의원|약국)/i,
            key: "medical",
            label: "의료",
            icon: "ti-building-hospital",
            detail: "병원 · 의료"
        },
        {
            test:
                /(tour|attraction|landmark|관광|명소|사찰|신사|temple|shrine)/i,
            key: "tour",
            label: "관광지",
            icon: "ti-camera",
            detail: "관광 · 명소"
        }
    ];

    return (
        presets.find(
            preset =>
                preset.test.test(
                    rawCategory
                )
        ) || {
            key: "place",
            label:
                document
                    .getElementById(
                        "placeCategory"
                    )
                    ?.textContent
                    ?.trim() ||
                normalizeGroupSaveText(
                    place?.category
                ) ||
                "장소",
            icon:
                place?.icon ||
                "ti-map-pin",
            detail: "장소"
        }
    );
}

function getActiveGroupSavePlaceKey() {
    if (
        selectedPlaceKey &&
        places[selectedPlaceKey]
    ) {
        return selectedPlaceKey;
    }

    if (
        selectedGooglePoi?.placeId
    ) {
        const key =
            `google_${selectedGooglePoi.placeId}`;

        if (!places[key]) {
            const name =
                selectedGooglePoi.name ||
                document
                    .getElementById(
                        "placeName"
                    )
                    ?.textContent
                    ?.trim() ||
                "Google Place";

            const category =
                selectedGooglePoi.primaryTypeDisplayName ||
                document
                    .getElementById(
                        "placeCategory"
                    )
                    ?.textContent
                    ?.trim() ||
                "Google 장소";

            const address =
                selectedGooglePoi.address ||
                document
                    .getElementById(
                        "placeAddress"
                    )
                    ?.textContent
                    ?.trim() ||
                "";

            places[key] = {
                name: {
                    ko: name,
                    ja: name,
                    en: name
                },
                category: {
                    ko: category,
                    ja: category,
                    en: category
                },
                type:
                    selectedGooglePoi.primaryType ||
                    "tour",
                rating:
                    Number(
                        selectedGooglePoi.rating
                    ) ||
                    Number(
                        document
                            .getElementById(
                                "placeRating"
                            )
                            ?.textContent
                    ) ||
                    0,
                reviewCount:
                    Number(
                        selectedGooglePoi.userRatingCount
                    ) || 0,
                address: {
                    ko: address,
                    ja: address,
                    en: address
                },
                crowd: {
                    ko: "보통",
                    ja: "普通",
                    en: "Normal"
                },
                icon:
                    "ti-map-pin",
                color:
                    "linear-gradient(135deg, #ffe5a7, #f4bc45)",
                position:
                    selectedGooglePoi.position
            };
        }

        selectedPlaceKey =
            key;

        if (placeCard) {
            placeCard.dataset.placeKey =
                key;
        }

        return key;
    }

    const cardKey =
        placeCard?.dataset.placeKey;

    return (
        cardKey &&
        places[cardKey]
            ? cardKey
            : null
    );
}

function getGroupSavePlaceView(
    placeKey
) {
    const place =
        places[placeKey] || {};

    const preset =
        getGroupSaveCategoryPreset(
            placeKey
        );

    const name =
        document
            .getElementById(
                "placeName"
            )
            ?.textContent
            ?.trim() ||
        normalizeGroupSaveText(
            place.name
        ) ||
        "장소";

    const category =
        document
            .getElementById(
                "placeCategory"
            )
            ?.textContent
            ?.trim() ||
        normalizeGroupSaveText(
            place.category
        ) ||
        preset.label;

    const address =
        document
            .getElementById(
                "placeAddress"
            )
            ?.textContent
            ?.trim() ||
        normalizeGroupSaveText(
            place.address
        );

    const ratingText =
        document
            .getElementById(
                "placeRating"
            )
            ?.textContent
            ?.trim();

    const reviewText =
        document
            .getElementById(
                "placeReview"
            )
            ?.textContent
            ?.trim();

    const rating =
        ratingText &&
        ratingText !== "-"
            ? ratingText
            : Number(
                place.rating
            ) > 0
                ? Number(
                    place.rating
                ).toFixed(1)
                : "";

    const reviews =
        reviewText ||
        (
            Number(
                place.reviewCount
            ) > 0
                ? `리뷰 ${Number(place.reviewCount).toLocaleString()}개`
                : ""
        );

    return {
        placeKey,
        preset,
        name,
        category,
        address,
        rating,
        reviews
    };
}

function buildGroupSaveInfoItems(
    view
) {
    const items = [];

    if (view.address) {
        items.push({
            icon:
                "ti-map-pin",
            label:
                "주소",
            value:
                view.address,
            wide:
                true
        });
    }

    if (
        view.rating ||
        view.reviews
    ) {
        items.push({
            icon:
                "ti-star",
            label:
                "평점",
            value:
                [
                    view.rating
                        ? `★ ${view.rating}`
                        : "",
                    view.reviews
                ]
                    .filter(Boolean)
                    .join(" · ")
        });
    }

    items.push({
        icon:
            view.preset.icon,
        label:
            "분류",
        value:
            view.preset.detail
    });

    /*
        음식점/카페는 영업 정보가 중요한 카테고리이므로
        현재 카드에 표시된 텍스트가 있으면 추가합니다.
    */
    if (
        ["food", "cafe", "convenience", "shopping"]
            .includes(
                view.preset.key
            )
    ) {
        const statusText =
            selectedGooglePoi
                ?.businessStatus;

        if (statusText) {
            items.push({
                icon:
                    "ti-clock",
                label:
                    "영업",
                value:
                    statusText
            });
        }
    }

    return items;
}

function setGroupSaveStep(
    step
) {
    const placeStep =
        document.getElementById(
            "groupSavePlaceStep"
        );

    const groupStep =
        document.getElementById(
            "groupSaveGroupStep"
        );

    const showGroup =
        step === "group";

    if (placeStep) {
        placeStep.hidden =
            showGroup;

        placeStep.classList.toggle(
            "active",
            !showGroup
        );
    }

    if (groupStep) {
        groupStep.hidden =
            !showGroup;

        groupStep.classList.toggle(
            "active",
            showGroup
        );
    }
}

function renderGroupSavePlaceStep() {
    const placeKey =
        groupSaveDraft.placeKey;

    if (
        !placeKey ||
        !places[placeKey]
    ) {
        return;
    }

    const view =
        getGroupSavePlaceView(
            placeKey
        );

    const icon =
        document.getElementById(
            "groupSavePlaceIcon"
        );

    const category =
        document.getElementById(
            "groupSavePlaceCategory"
        );

    const name =
        document.getElementById(
            "groupSavePlaceName"
        );

    const meta =
        document.getElementById(
            "groupSavePlaceMeta"
        );

    const info =
        document.getElementById(
            "groupSaveInfoGrid"
        );

    const memo =
        document.getElementById(
            "groupSaveMemo"
        );

    const count =
        document.getElementById(
            "groupSaveMemoCount"
        );

    if (icon) {
        icon.dataset.category =
            view.preset.key;

        icon.innerHTML =
            `<i class="ti ${view.preset.icon}"></i>`;
    }

    if (category) {
        category.textContent =
            view.preset.label;
    }

    if (name) {
        name.textContent =
            view.name;
    }

    if (meta) {
        meta.innerHTML = `
            ${
                view.rating
                    ? `<span><i class="ti ti-star-filled"></i>${escapeGroupHtml(view.rating)}</span>`
                    : ""
            }

            ${
                view.reviews
                    ? `<span>${escapeGroupHtml(view.reviews)}</span>`
                    : ""
            }
        `;
    }

    if (info) {
        info.innerHTML =
            buildGroupSaveInfoItems(
                view
            )
                .map(item => `
                    <div class="group-save-info-item ${item.wide ? "wide" : ""}">
                        <i class="ti ${item.icon}"></i>

                        <div>
                            <small>${escapeGroupHtml(item.label)}</small>
                            <strong>${escapeGroupHtml(item.value)}</strong>
                        </div>
                    </div>
                `)
                .join("");
    }

    if (memo) {
        memo.value =
            groupSaveDraft.memo ||
            "";

        if (count) {
            count.textContent =
                String(
                    memo.value.length
                );
        }
    }
}

async function renderGroupSaveGroupStep() {
    const list =
        document.getElementById(
            "groupSaveGroupList"
        );

    const selectedPlace =
        document.getElementById(
            "groupSaveSelectedPlace"
        );

    const confirm =
        document.getElementById(
            "groupSaveConfirmButton"
        );

    if (!list) {
        return;
    }

    const view =
        getGroupSavePlaceView(
            groupSaveDraft.placeKey
        );

    if (selectedPlace) {
        selectedPlace.innerHTML = `
            <span class="group-save-mini-icon" data-category="${view.preset.key}">
                <i class="ti ${view.preset.icon}"></i>
            </span>

            <div>
                <small>${escapeGroupHtml(view.preset.label)}</small>
                <strong>${escapeGroupHtml(view.name)}</strong>
            </div>
        `;
    }

    list.innerHTML = `
        <div class="group-save-loading">
            그룹을 불러오는 중...
        </div>
    `;

    try {
        await loadGroupsFromServer();
    } catch (error) {
        list.innerHTML = `
            <div class="group-save-empty">
                <i class="ti ti-alert-circle"></i>
                <strong>그룹을 불러오지 못했습니다.</strong>
                <p>${escapeGroupHtml(error.message)}</p>
            </div>
        `;
        return;
    }

    if (!groupCache.length) {
        groupSaveDraft.selectedGroupId =
            null;

        if (confirm) {
            confirm.disabled =
                true;
        }

        list.innerHTML = `
            <div class="group-save-empty">
                <i class="ti ti-users-group"></i>
                <strong>아직 만든 그룹이 없어요.</strong>
                <p>새 그룹을 만든 뒤 이 장소를 바로 추가할 수 있어요.</p>
            </div>
        `;

        return;
    }

    if (
        !groupSaveDraft.selectedGroupId ||
        !groupCache.some(
            group =>
                String(
                    group.groupId
                ) ===
                String(
                    groupSaveDraft.selectedGroupId
                )
        )
    ) {
        groupSaveDraft.selectedGroupId =
            groupCache[0].groupId;
    }

    list.innerHTML =
        groupCache
            .map(group => {
                const active =
                    String(
                        group.groupId
                    ) ===
                    String(
                        groupSaveDraft.selectedGroupId
                    );

                return `
                    <label class="group-save-group-option ${active ? "active" : ""}">
                        <input
                            type="radio"
                            name="groupSaveTarget"
                            value="${group.groupId}"
                            ${active ? "checked" : ""}
                        >

                        <span class="group-save-radio">
                            <i class="ti ti-check"></i>
                        </span>

                        <span class="group-save-group-icon">
                            <i class="ti ti-users-group"></i>
                        </span>

                        <span class="group-save-group-copy">
                            <strong>${escapeGroupHtml(group.groupName)}</strong>
                            <small>
                                ${formatGroupDate(group.groupDate)}
                                · ${(group.placeBackendIds || []).length}곳
                            </small>
                        </span>
                    </label>
                `;
            })
            .join("");

    list
        .querySelectorAll(
            'input[name="groupSaveTarget"]'
        )
        .forEach(input => {
            input.addEventListener(
                "change",
                () => {
                    groupSaveDraft.selectedGroupId =
                        input.value;

                    list
                        .querySelectorAll(
                            ".group-save-group-option"
                        )
                        .forEach(option => {
                            option.classList.toggle(
                                "active",
                                option.contains(
                                    input
                                ) &&
                                input.checked
                            );
                        });

                    if (confirm) {
                        confirm.disabled =
                            false;
                    }
                }
            );
        });

    if (confirm) {
        confirm.disabled =
            !groupSaveDraft.selectedGroupId;
    }
}

async function openGroupPlaceSaveModal() {
    if (!getAuthToken()) {
        showToast(
            "로그인이 필요합니다."
        );

        openModal(
            loginModal
        );

        return;
    }

    const placeKey =
        getActiveGroupSavePlaceKey();

    if (
        !placeKey ||
        !places[placeKey]
    ) {
        showToast(
            "현재 장소 정보를 불러오지 못했습니다."
        );

        return;
    }

    groupSaveDraft = {
        placeKey,
        memo: "",
        selectedGroupId: null
    };

    setGroupSaveStep(
        "place"
    );

    renderGroupSavePlaceStep();

    openModal(
        document.getElementById(
            "groupPlaceSaveModal"
        )
    );
}

async function savePlaceToSelectedGroup() {
    const groupId =
        Number(
            groupSaveDraft.selectedGroupId
        );

    const placeKey =
        groupSaveDraft.placeKey;

    if (
        !groupId ||
        !placeKey
    ) {
        showToast(
            "저장할 그룹을 선택해 주세요."
        );

        return;
    }

    const button =
        document.getElementById(
            "groupSaveConfirmButton"
        );

    try {
        if (button) {
            button.disabled =
                true;

            button.innerHTML = `
                <span class="group-save-button-spinner"></span>
                저장 중...
            `;
        }

        const backendPlace =
            await ensureBackendPlace(
                placeKey
            );
        const placeId = Number(backendPlace?.placeId);
        if (!Number.isFinite(placeId) || placeId <= 0) {
            throw new Error("장소를 서버에 연결하지 못했습니다. 다시 시도해 주세요.");
        }

        const group =
            groupCache.find(
                item =>
                    Number(
                        item.groupId
                    ) ===
                    groupId
            );

        const alreadySaved =
            group?.placeBackendIds
                ?.map(Number)
                .includes(placeId);

        if (!alreadySaved) {
            await apiRequest(
                `/group/${groupId}/addPlace`,
                {
                    method:
                        "POST",
                    auth:
                        true,
                    body: {
                        placeId,
                        groupId
                    }
                }
            );
        }

        saveGroupPlaceMemo(
            groupId,
            placeKey,
            groupSaveDraft.memo
        );

        selectedGroupId =
            groupId;

        closeModal(
            document.getElementById(
                "groupPlaceSaveModal"
            )
        );

        openModal(
            groupModal
        );

        await renderGroupManager();

        selectedGroupId =
            groupId;

        renderGroupManagerFromCache();

        showToast(
            alreadySaved
                ? "이미 저장된 장소입니다. 메모를 업데이트했습니다."
                : "내 그룹에 장소를 저장했습니다."
        );

    } catch (error) {
        console.error(
            "그룹 장소 저장 실패:",
            error
        );

        showToast(
            error?.message ||
            "장소를 그룹에 저장하지 못했습니다."
        );
    } finally {
        if (button) {
            button.disabled =
                !groupSaveDraft.selectedGroupId;

            button.textContent =
                "선택한 그룹에 저장";
        }
    }
}


function formatGroupDate(value) {
    if (!value) return "-";
    const date = new Date(String(value).replace(" ", "T"));
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat(
        currentLanguage === "ja" ? "ja-JP" : currentLanguage === "en" ? "en-US" : "ko-KR",
        { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }
    ).format(date);
}

function toBackendDate(value) {
    if (!value) return "";
    return value.length === 16 ? `${value.replace("T", " ")}:00` : value.replace("T", " ");
}

function toInputDate(value) {
    if (!value) return "";
    return String(value).replace(" ", "T").slice(0, 16);
}

async function hydrateGroup(raw) {
    const placeBackendIds = []
        .concat(raw.placeIds ?? raw.placeId ?? [])
        .map(Number)
        .filter(id => Number.isFinite(id) && id > 0);

    const placeIds = [];
    for (const backendId of placeBackendIds) {
        try {
            const data = await getBackendPlaceById(backendId);
            const key = typeof registerFrontendPlaceFromBackend === "function"
                ? registerFrontendPlaceFromBackend(data)
                : await backendPlaceIdToFrontendKey(backendId);
            if (key) placeIds.push(key);
        } catch (error) {
            console.warn("그룹 장소 로드 실패:", backendId, error);
        }
    }
    const rawCloneCount = Number(
        raw.cloneCount ??
        raw.shareCount ??
        raw.importCount ??
        0
    );

    return {
        groupId: raw.groupId,
        groupDate: raw.groupDate,
        groupMemo: raw.groupMemo || "",
        groupName: raw.groupName,
        placeIds,
        placeBackendIds,

        // 백에서 cloneCount를 내려주면 실제 "가져가기 횟수"를 표시합니다.
        // 아직 필드가 없거나 값이 없으면 0회로 표시합니다.
        cloneCount:
            Number.isFinite(rawCloneCount) && rawCloneCount >= 0
                ? rawCloneCount
                : 0
    };
}

async function loadGroupsFromServer() {
    if (!getAuthToken()) {
        groupCache = [];
        return groupCache;
    }

    // 기존 백엔드 /group/my 는 그룹 상세가 아니라 { groups: [id...] } 형태입니다.
    const response = await apiRequest("/group/my", { auth: true });
    const groupIds = Array.isArray(response)
        ? response
        : (Array.isArray(response?.groups) ? response.groups : []);

    const details = await Promise.all(
        groupIds.map(async groupId => {
            const detail = await apiRequest(`/group/${groupId}`);
            return { groupId: Number(groupId), ...detail };
        })
    );

    groupCache = await Promise.all(details.map(hydrateGroup));
    return groupCache;
}

function getGroups() {
    return groupCache;
}

function getGroupPlaces(group) {
    const frontendKeys =
        group.placeIds || [];

    const backendIds =
        group.placeBackendIds || [];

    return frontendKeys
        .map((placeKey, index) => ({
            placeKey,
            place:
                places[placeKey],
            backendPlaceId:
                Number(
                    backendIds[index]
                ) || null
        }))
        .filter(item =>
            item.place
        );
}

function renderEmptyGroupDetail(message = "새 그룹을 만들어 보세요") {
    const panel = document.getElementById("groupDetailPanel");
    if (!panel) return;
    panel.innerHTML = `
        <div class="group-empty-state">
            <div class="group-empty-icon"><i class="ti ti-users-group"></i></div>
            <strong>${escapeGroupHtml(message)}</strong>
            <p>날짜와 장소를 묶어서 여행 계획을 관리할 수 있어요.</p>
        </div>`;
}

async function renderGroupManager() {
    const groupList = document.getElementById("groupList");
    if (!groupList) return;

    if (!getAuthToken()) {
        groupList.innerHTML = `<div class="group-list-empty"><i class="ti ti-lock"></i><p>로그인 후 그룹을 사용할 수 있어요.</p></div>`;
        renderEmptyGroupDetail("로그인이 필요합니다");
        return;
    }

    groupList.innerHTML = `<div class="group-list-empty"><p>그룹을 불러오는 중...</p></div>`;
    try {
        await loadGroupsFromServer();
    } catch (error) {
        groupList.innerHTML = `<div class="group-list-empty"><p>${escapeGroupHtml(error.message)}</p></div>`;
        return;
    }

    const badge = document.getElementById("groupCountBadge");
    if (badge) badge.textContent = groupCache.length;

    if (!groupCache.length) {
        groupList.innerHTML = `<div class="group-list-empty"><i class="ti ti-users-group"></i><p>아직 만든 그룹이 없어요.</p></div>`;
        selectedGroupId = null;
        renderEmptyGroupDetail();
        return;
    }

    if (!selectedGroupId || !groupCache.some(g => String(g.groupId) === String(selectedGroupId))) {
        selectedGroupId = groupCache[0].groupId;
    }

    groupList.innerHTML = groupCache.map(group => `
        <button type="button" class="group-list-item ${String(group.groupId) === String(selectedGroupId) ? "active" : ""}" data-group-id="${group.groupId}">
            <span class="group-list-icon"><i class="ti ti-users-group"></i></span>
            <span class="group-list-copy"><strong>${escapeGroupHtml(group.groupName)}</strong><small>${formatGroupDate(group.groupDate)}</small></span>
            <span
                class="group-list-count"
                title="저장된 장소 ${(group.placeIds || []).length}곳"
                aria-label="저장된 장소 ${(group.placeIds || []).length}곳"
            >
                <i class="ti ti-map-pin"></i>
                <span>${(group.placeIds || []).length}</span>
            </span>
        </button>`).join("");

    groupList.querySelectorAll("[data-group-id]").forEach(button => {
        button.addEventListener("click", () => {
            selectedGroupId = button.dataset.groupId;
            renderGroupManagerFromCache();
        });
    });
    renderSelectedGroup();
}

function renderGroupManagerFromCache() {
    const groupList = document.getElementById("groupList");
    if (!groupList) return;
    groupList.querySelectorAll("[data-group-id]").forEach(button => {
        button.classList.toggle("active", String(button.dataset.groupId) === String(selectedGroupId));
    });
    renderSelectedGroup();
}

function renderSelectedGroup() {
    const group = groupCache.find(item => String(item.groupId) === String(selectedGroupId));
    const panel = document.getElementById("groupDetailPanel");
    if (!panel) return;
    if (!group) return renderEmptyGroupDetail();

    const groupPlaces = getGroupPlaces(group);
    const cloneCount = Number(group.cloneCount) || 0;

    panel.innerHTML = `
        <div class="group-detail-header">
            <div>
                <span class="group-detail-date"><i class="ti ti-calendar-event"></i>${formatGroupDate(group.groupDate)}</span>
                <h3>${escapeGroupHtml(group.groupName)}</h3>
                <p>${escapeGroupHtml(group.groupMemo || "작성된 메모가 없습니다.")}</p>
            </div>
            <div class="group-detail-actions">
                <button type="button" data-group-action="edit"><i class="ti ti-edit"></i>수정</button>
                <button type="button" data-group-action="share"><i class="ti ti-link"></i>공유</button>
                <button type="button" class="danger" data-group-action="delete"><i class="ti ti-trash"></i>삭제</button>
            </div>
        </div>

        <div class="group-detail-meta">
            <span
                class="group-detail-meta-chip group-clone-count"
                title="다른 사용자가 이 그룹을 가져간 횟수"
            >
                <i class="ti ti-download"></i>
                가져가기 ${cloneCount}회
            </span>
        </div>

        <div class="group-place-summary"><strong>저장된 장소</strong><span>${groupPlaces.length}곳</span></div>
        <div class="group-place-list">
            ${groupPlaces.length ? groupPlaces.map(({ placeKey, place, backendPlaceId }) => {
                const preset = getGroupSaveCategoryPreset(placeKey);
                const memo = getGroupPlaceMemo(group.groupId, placeKey);

                return `
                    <article class="group-place-card">
                        <div
                            class="group-place-card-icon category-${preset.key}"
                            data-category="${preset.key}"
                        >
                            <i class="ti ${preset.icon}"></i>
                        </div>

                        <div>
                            <strong>${escapeGroupHtml(localizedValue(place.name))}</strong>
                            <span>${escapeGroupHtml(preset.label)}</span>
                            ${
                                memo
                                    ? `<small class="group-place-card-memo"><i class="ti ti-note"></i>${escapeGroupHtml(memo)}</small>`
                                    : ""
                            }
                        </div>

                        <button
                            type="button"
                            data-group-place="${placeKey}"
                            data-group-backend-place-id="${backendPlaceId || ""}"
                        >
                            지도 보기
                        </button>
                    </article>
                `;
            }).join("") : `<div class="group-place-empty"><i class="ti ti-map-pin-off"></i><p>저장된 장소가 없습니다.</p></div>`}
        </div>`;

    panel.querySelector('[data-group-action="edit"]')?.addEventListener("click", () => openGroupForm(group));
    panel.querySelector('[data-group-action="share"]')?.addEventListener("click", () => shareGroup(group));
    panel.querySelector('[data-group-action="delete"]')?.addEventListener("click", () => deleteGroup(group.groupId));
    panel
        .querySelectorAll(
            "[data-group-place]"
        )
        .forEach(button =>
            button.addEventListener(
                "click",
                async () => {
                    const key =
                        button.dataset.groupPlace;

                    const backendPlaceId =
                        Number(
                            button.dataset
                                .groupBackendPlaceId
                        );

                    closeModal(
                        groupModal
                    );

                    /*
                        그룹 장소는 DB에 이미 저장된 장소이므로
                        로컬 places 객체만 여는 openPlace()가 아니라
                        백엔드 placeId를 기준으로 다시 엽니다.

                        Google 장소라면 openBackendPlaceById()
                        → googlePlaceId
                        → openGooglePoi()
                        흐름으로 들어가서 사진/주소/상세정보까지
                        Google Places에서 정상 복원됩니다.
                    */
                    if (
                        Number.isFinite(
                            backendPlaceId
                        ) &&
                        backendPlaceId > 0 &&
                        typeof openBackendPlaceById ===
                            "function"
                    ) {
                        try {
                            await openBackendPlaceById(
                                backendPlaceId
                            );

                            return;
                        } catch (error) {
                            console.error(
                                "그룹 장소 상세 열기 실패:",
                                error
                            );
                        }
                    }

                    /*
                        과거 데이터 등으로 backend placeId가 없을 때만
                        기존 로컬 장소 열기를 fallback으로 사용합니다.
                    */
                    if (
                        !key ||
                        !places[key]
                    ) {
                        return;
                    }

                    await openPlace(
                        key
                    );

                    const position =
                        places[key]
                            ?.position;

                    if (
                        Number.isFinite(
                            Number(
                                position?.lat
                            )
                        ) &&
                        Number.isFinite(
                            Number(
                                position?.lng
                            )
                        )
                    ) {
                        googleMap?.panTo(
                            position
                        );

                        googleMap?.setZoom(
                            15
                        );
                    }
                }
            )
        );
}

function groupPickerLocalizedType(type = "") {
    const normalized =
        String(type || "")
            .trim()
            .replaceAll("_", " ");

    if (!normalized) {
        return "장소";
    }

    const koMap = {
        restaurant: "음식점",
        cafe: "카페",
        bakery: "베이커리",
        bar: "바",
        hotel: "호텔",
        lodging: "숙박",
        tourist_attraction: "관광 명소",
        park: "공원",
        museum: "박물관",
        shopping_mall: "쇼핑몰",
        store: "상점",
        train_station: "기차역",
        subway_station: "지하철역",
        transit_station: "교통",
        airport: "공항",
        hospital: "병원",
        pharmacy: "약국"
    };

    return koMap[type] ||
        normalized.replace(
            /\b\w/g,
            char => char.toUpperCase()
        );
}

function ensureGroupSearchPlace(candidate) {
    if (!candidate?.id) {
        return null;
    }

    const placeKey =
        `google_${candidate.id}`;

    const location =
        candidate.location;

    const lat =
        typeof location?.lat === "function"
            ? location.lat()
            : Number(location?.lat);

    const lng =
        typeof location?.lng === "function"
            ? location.lng()
            : Number(location?.lng);

    const name =
        String(
            candidate.displayName ||
            "Google Place"
        ).trim();

    const category =
        groupPickerLocalizedType(
            candidate.primaryType
        );

    const address =
        String(
            candidate.formattedAddress ||
            ""
        ).trim();

    places[placeKey] = {
        ...(places[placeKey] || {}),

        name: {
            ko: name,
            ja: name,
            en: name
        },

        category: {
            ko: category,
            ja: category,
            en: category
        },

        address: {
            ko: address,
            ja: address,
            en: address
        },

        type:
            [
                "train_station",
                "subway_station",
                "transit_station"
            ].includes(
                candidate.primaryType
            )
                ? "transport"
                : "tour",

        rating:
            Number(
                candidate.rating
            ) || 0,

        reviewCount:
            Number(
                candidate.userRatingCount
            ) || 0,

        crowd: {
            ko: "보통",
            ja: "普通",
            en: "Normal"
        },

        icon:
            "ti-map-pin",

        color:
            "linear-gradient(135deg, #ffe5a7, #f4bc45)",

        position: {
            lat,
            lng
        }
    };

    return placeKey;
}

function getGroupPickerSelectedKeys() {
    return new Set(
        Array
            .from(
                document.querySelectorAll(
                    'input[name="groupPlace"]:checked'
                )
            )
            .map(input =>
                String(input.value)
            )
    );
}

function groupPickerPlaceOptionHtml(
    placeKey,
    place,
    selected = false,
    extraClass = ""
) {
    const name =
        localizedValue(
            place?.name
        ) ||
        "장소";

    const category =
        localizedValue(
            place?.category
        ) ||
        "장소";

    const address =
        localizedValue(
            place?.address
        ) ||
        "";

    return `
        <label class="group-place-option ${extraClass}">
            <input
                type="checkbox"
                name="groupPlace"
                value="${escapeGroupHtml(placeKey)}"
                ${selected ? "checked" : ""}
            >

            <span class="group-place-check">
                <i class="ti ti-check"></i>
            </span>

            <span class="group-picker-place-copy">
                <strong>${escapeGroupHtml(name)}</strong>
                <small>
                    ${escapeGroupHtml(category)}
                    ${address ? ` · ${escapeGroupHtml(address)}` : ""}
                </small>
            </span>
        </label>
    `;
}

function bindGroupPickerCheckedStyle(container) {
    container
        ?.querySelectorAll(
            '.group-place-option input[name="groupPlace"]'
        )
        .forEach(input => {
            const option =
                input.closest(
                    ".group-place-option"
                );

            option?.classList.toggle(
                "selected",
                input.checked
            );

            input.addEventListener(
                "change",
                () => {
                    option?.classList.toggle(
                        "selected",
                        input.checked
                    );
                }
            );
        });
}

async function searchGroupPickerPlaces(query) {
    const text =
        String(query || "")
            .trim();

    if (!text) {
        return [];
    }

    if (!window.google?.maps?.importLibrary) {
        throw new Error(
            "Google Places를 아직 사용할 수 없습니다."
        );
    }

    const { Place } =
        await google.maps.importLibrary(
            "places"
        );

    if (
        typeof Place.searchByText !==
        "function"
    ) {
        throw new Error(
            "장소 검색 기능을 사용할 수 없습니다."
        );
    }

    const center =
        googleMap
            ?.getCenter
            ?.()
            ?.toJSON
            ?.() ||
        {
            lat: 35.6895,
            lng: 139.6917
        };

    const response =
        await Place.searchByText({
            textQuery:
                text,

            fields: [
                "id",
                "displayName",
                "formattedAddress",
                "location",
                "primaryType",
                "rating",
                "userRatingCount"
            ],

            locationBias: {
                center,
                radius: 30000
            },

            language:
                currentLanguage === "ko"
                    ? "ko"
                    : currentLanguage === "en"
                        ? "en"
                        : "ja",

            region:
                "JP",

            maxResultCount:
                12
        });

    return response?.places || [];
}

async function renderGroupPickerSearchResults(
    query
) {
    const resultContainer =
        document.getElementById(
            "groupPlaceSearchResults"
        );

    if (!resultContainer) {
        return;
    }

    const text =
        String(query || "")
            .trim();

    if (!text) {
        resultContainer.innerHTML = "";

        return;
    }

    resultContainer.innerHTML = `
        <div class="group-picker-search-empty">
            <i class="ti ti-loader-2"></i>
            검색 중...
        </div>
    `;

    try {
        const selected =
            getGroupPickerSelectedKeys();

        const candidates =
            await searchGroupPickerPlaces(
                text
            );

        if (!candidates.length) {
            resultContainer.innerHTML = `
                <div class="group-picker-search-empty">
                    검색 결과가 없습니다.
                </div>
            `;

            return;
        }

        const rows =
            candidates
                .map(candidate => {
                    const placeKey =
                        ensureGroupSearchPlace(
                            candidate
                        );

                    if (
                        !placeKey ||
                        !places[placeKey]
                    ) {
                        return "";
                    }

                    return groupPickerPlaceOptionHtml(
                        placeKey,
                        places[placeKey],
                        selected.has(
                            placeKey
                        ),
                        "group-picker-search-option"
                    );
                })
                .filter(Boolean)
                .join("");

        resultContainer.innerHTML =
            rows;

        bindGroupPickerCheckedStyle(
            resultContainer
        );
    } catch (error) {
        console.error(
            "그룹 장소 검색 실패:",
            error
        );

        resultContainer.innerHTML = `
            <div class="group-picker-search-empty error">
                ${escapeGroupHtml(
                    error?.message ||
                    "장소 검색에 실패했습니다."
                )}
            </div>
        `;
    }
}

function renderExistingGroupPicker(
    selectedKeys,
    currentGroupId = null
) {
    const list =
        document.getElementById(
            "groupExistingPlaceGroups"
        );

    if (!list) {
        return;
    }

    const groups =
        groupCache.filter(group =>
            !currentGroupId ||
            String(group.groupId) !==
                String(currentGroupId)
        );

    if (!groups.length) {
        list.innerHTML = `
            <div class="group-picker-empty-groups">
                기존 그룹이 없습니다.
            </div>
        `;

        return;
    }

    list.innerHTML =
        groups
            .map(group => {
                const groupPlaces =
                    getGroupPlaces(group);

                return `
                    <section
                        class="group-picker-existing-group"
                        data-picker-group="${group.groupId}"
                    >
                        <button
                            type="button"
                            class="group-picker-existing-group-toggle"
                            data-picker-group-toggle="${group.groupId}"
                            aria-expanded="false"
                        >
                            <span class="group-picker-existing-group-icon">
                                <i class="ti ti-users-group"></i>
                            </span>

                            <span class="group-picker-existing-group-copy">
                                <strong>
                                    ${escapeGroupHtml(group.groupName)}
                                </strong>

                                <small>
                                    ${groupPlaces.length}곳
                                </small>
                            </span>

                            <i
                                class="ti ti-chevron-down group-picker-chevron"
                            ></i>
                        </button>

                        <div
                            class="group-picker-existing-places"
                            data-picker-group-places="${group.groupId}"
                            hidden
                        >
                            ${
                                groupPlaces.length
                                    ? groupPlaces
                                        .map(
                                            ({
                                                placeKey,
                                                place
                                            }) =>
                                                groupPickerPlaceOptionHtml(
                                                    placeKey,
                                                    place,
                                                    selectedKeys.has(
                                                        String(placeKey)
                                                    ),
                                                    "group-picker-existing-place"
                                                )
                                        )
                                        .join("")
                                    : `
                                        <div class="group-picker-empty-groups">
                                            저장된 장소가 없습니다.
                                        </div>
                                    `
                            }
                        </div>
                    </section>
                `;
            })
            .join("");

    list
        .querySelectorAll(
            "[data-picker-group-toggle]"
        )
        .forEach(button => {
            button.addEventListener(
                "click",
                () => {
                    const groupId =
                        button.dataset
                            .pickerGroupToggle;

                    const placesPanel =
                        list.querySelector(
                            `[data-picker-group-places="${groupId}"]`
                        );

                    const expanded =
                        button.getAttribute(
                            "aria-expanded"
                        ) === "true";

                    button.setAttribute(
                        "aria-expanded",
                        String(!expanded)
                    );

                    if (placesPanel) {
                        placesPanel.hidden =
                            expanded;
                    }
                }
            );
        });

    bindGroupPickerCheckedStyle(
        list
    );
}

function renderGroupPlaceOptions(
    selectedPlaceIds = [],
    options = {}
) {
    const container =
        document.getElementById(
            "groupPlaceOptions"
        );

    if (!container) {
        return;
    }

    const selected =
        new Set(
            selectedPlaceIds.map(
                String
            )
        );

    const lockedPlaceKey =
        options.lockedPlaceKey
            ? String(
                options.lockedPlaceKey
            )
            : null;

    /*
        POI 상세에서 "그룹 저장 → 새 그룹 만들기"로 들어온 경우는
        이미 장소가 확정되어 있으므로 기존 단일 카드 UI를 그대로 유지합니다.
    */
    if (
        lockedPlaceKey &&
        places[lockedPlaceKey]
    ) {
        const view =
            getGroupSavePlaceView(
                lockedPlaceKey
            );

        const infoItems =
            buildGroupSaveInfoItems(
                view
            );

        container.classList.add(
            "group-place-options--single"
        );

        container.innerHTML = `
            <div class="group-create-selected-place">
                <input
                    type="checkbox"
                    name="groupPlace"
                    value="${escapeGroupHtml(lockedPlaceKey)}"
                    checked
                    hidden
                >

                <div class="group-create-place-hero">
                    <span class="group-create-place-icon category-${escapeGroupHtml(view.preset.key)}">
                        <i class="ti ${escapeGroupHtml(view.preset.icon)}"></i>
                    </span>

                    <div class="group-create-place-copy">
                        <span class="group-create-place-category">
                            ${escapeGroupHtml(
                                view.preset.detail ||
                                view.category ||
                                view.preset.label
                            )}
                        </span>

                        <strong>
                            ${escapeGroupHtml(view.name)}
                        </strong>
                    </div>
                </div>

                <div class="group-create-place-details">
                    ${infoItems.map(item => `
                        <div class="group-create-place-detail ${item.wide ? "wide" : ""}">
                            <span class="group-create-place-detail-icon">
                                <i class="ti ${escapeGroupHtml(item.icon)}"></i>
                            </span>

                            <span class="group-create-place-detail-copy">
                                <small>
                                    ${escapeGroupHtml(item.label)}
                                </small>

                                <strong>
                                    ${escapeGroupHtml(item.value)}
                                </strong>
                            </span>
                        </div>
                    `).join("")}
                </div>
            </div>
        `;

        return;
    }

    container.classList.remove(
        "group-place-options--single"
    );

    container.innerHTML = `
        <div class="group-picker">
            <section class="group-picker-section">
                <div class="group-picker-section-heading">
                    <div>
                        <strong>기존 그룹에서 가져오기</strong>
                    </div>
                </div>

                <div
                    class="group-picker-existing-groups"
                    id="groupExistingPlaceGroups"
                ></div>
            </section>

            <div class="group-picker-divider">
                <span>또는</span>
            </div>

            <section class="group-picker-section">
                <div class="group-picker-section-heading">
                    <div>
                        <strong>장소 검색</strong>
                    </div>
                </div>

                <div class="group-picker-search-bar">
                    <i class="ti ti-search"></i>

                    <input
                        type="search"
                        id="groupPlaceSearchInput"
                        placeholder="예: 신주쿠 카페, 도쿄역"
                        autocomplete="off"
                    >

                    <button
                        type="button"
                        id="groupPlaceSearchButton"
                    >
                        검색
                    </button>
                </div>

                <div
                    class="group-picker-search-results"
                    id="groupPlaceSearchResults"
                >
                </div>
            </section>
        </div>
    `;

    renderExistingGroupPicker(
        selected,
        options.currentGroupId || null
    );

    const searchInput =
        document.getElementById(
            "groupPlaceSearchInput"
        );

    const searchButton =
        document.getElementById(
            "groupPlaceSearchButton"
        );

    const runSearch =
        () =>
            renderGroupPickerSearchResults(
                searchInput?.value
            );

    searchButton?.addEventListener(
        "click",
        runSearch
    );

    searchInput?.addEventListener(
        "keydown",
        event => {
            if (event.key === "Enter") {
                event.preventDefault();
                runSearch();
            }
        }
    );
}

async function openGroupForm(
    group = null,
    options = {}
) {
    if (!getAuthToken()) {
        showToast(
            "로그인이 필요합니다."
        );

        openModal(
            loginModal
        );

        return;
    }

    const title =
        document.getElementById(
            "groupFormTitle"
        );

    const editId =
        document.getElementById(
            "groupEditId"
        );

    const name =
        document.getElementById(
            "groupName"
        );

    const date =
        document.getElementById(
            "groupDate"
        );

    const memo =
        document.getElementById(
            "groupMemo"
        );

    if (title) {
        title.textContent =
            group
                ? "그룹 수정"
                : "새 그룹 만들기";
    }

    if (editId) {
        editId.value =
            group?.groupId || "";
    }

    if (name) {
        name.value =
            group?.groupName || "";
    }

    if (date) {
        date.value =
            toInputDate(
                group?.groupDate
            ) ||
            new Date()
                .toISOString()
                .slice(0, 16);
    }

    if (memo) {
        memo.value =
            group?.groupMemo || "";
    }

    /*
        새 그룹/그룹 수정 창을 열 때 서버의 실제 내 그룹 목록을 다시 읽습니다.
        기존 하드코딩 장소 목록은 사용하지 않습니다.
    */
    if (!options.placeKey) {
        try {
            await loadGroupsFromServer();
        } catch (error) {
            console.warn(
                "그룹 선택용 기존 그룹 로드 실패:",
                error
            );

            groupCache =
                Array.isArray(groupCache)
                    ? groupCache
                    : [];
        }
    }

    renderGroupPlaceOptions(
        group?.placeIds ||
        (
            options.placeKey
                ? [options.placeKey]
                : []
        ),
        {
            lockedPlaceKey:
                !group &&
                options.placeKey
                    ? options.placeKey
                    : null,

            currentGroupId:
                group?.groupId || null
        }
    );

    openModal(
        groupFormModal
    );

    setTimeout(
        () => name?.focus(),
        50
    );
}

async function resolveSelectedPlaceIds(frontendKeys) {
    const ids = [];
    for (const key of frontendKeys) {
        const p = await ensureBackendPlace(key);
        ids.push(Number(p.placeId));
    }
    return ids;
}

async function syncGroupPlaces(groupId, oldIds, newIds) {
    const oldSet = new Set((oldIds || []).map(Number));
    const newSet = new Set((newIds || []).map(Number));
    for (const placeId of newSet) {
        if (!oldSet.has(placeId)) {
            await apiRequest(`/group/${groupId}/addPlace`, { method: "POST", auth: true, body: { placeId, groupId: Number(groupId) } });
        }
    }
    for (const placeId of oldSet) {
        if (!newSet.has(placeId)) {
            await apiRequest(
                `/group/${groupId}/deletePlace`,
                {
                    method: "DELETE",
                    auth: true,
                    body: {
                        placeId,
                        groupId: Number(groupId)
                    }
                }
            );
        }
    }
}

async function submitGroupForm(event) {
    event.preventDefault();

    const editId =
        document.getElementById("groupEditId")?.value;

    const groupName =
        document.getElementById("groupName")
            ?.value.trim();

    const groupDate =
        document.getElementById("groupDate")
            ?.value;

    const groupMemo =
        document.getElementById("groupMemo")
            ?.value.trim() || "";

    const frontendKeys =
        Array
            .from(
                document.querySelectorAll(
                    'input[name="groupPlace"]:checked'
                )
            )
            .map(input => input.value);

    if (!groupName || !groupDate) {
        showToast(
            "그룹 이름과 날짜를 입력해 주세요."
        );

        return;
    }

    try {
        if (!getAuthToken()) {
            throw new Error("로그인이 필요합니다.");
        }

/*
            =============================
            그룹 수정
            =============================
        */
        if (editId) {
            const target =
                groupCache.find(
                    group =>
                        String(group.groupId) ===
                        String(editId)
                );

            /*
                그룹 자체를 먼저 수정합니다.
                장소 변환/저장이 실패해도
                그룹 수정 내용은 DB에 남습니다.
            */
            await apiRequest(
                `/group/${editId}/update`,
                {
                    method: "PUT",
                    auth: true,

                    body: {
                        groupDate:
                            toBackendDate(
                                groupDate
                            ),

                        groupMemo,
                        groupName
                    }
                }
            );

            selectedGroupId =
                Number(editId);

            /*
                장소 연결은 그룹 수정 성공 후
                별도로 처리합니다.
            */
            try {
                const backendPlaceIds =
                    await resolveSelectedPlaceIds(
                        frontendKeys
                    );

                await syncGroupPlaces(
                    Number(editId),
                    target?.placeBackendIds || [],
                    backendPlaceIds
                );

            } catch (placeError) {
                console.error(
                    "그룹 장소 연결 실패:",
                    placeError
                );

                showToast(
                    "그룹은 수정됐지만 일부 장소 저장에 실패했습니다."
                );
            }
        }

        /*
            =============================
            새 그룹 생성
            =============================
        */
        else {
            /*
                중요:
                장소를 먼저 DB에 등록하지 않고
                그룹 자체를 가장 먼저 생성합니다.

                따라서 장소 등록이 실패해도
                table_group에는 그룹이 남습니다.
            */
            const created =
                await apiRequest(
                    "/group/create",
                    {
                        method: "POST",
                        auth: true,

                        body: {
                            groupDate:
                                toBackendDate(
                                    groupDate
                                ),

                            groupMemo,
                            groupName
                        }
                    }
                );

            if (!created?.groupId) {
                throw new Error(
                    "그룹은 요청됐지만 groupId를 받지 못했습니다."
                );
            }

            selectedGroupId =
                Number(created.groupId);

            /*
                그룹 생성이 성공한 다음에
                선택 장소를 DB와 연결합니다.
            */
            if (frontendKeys.length) {
                try {
                    const backendPlaceIds =
                        await resolveSelectedPlaceIds(
                            frontendKeys
                        );

                    await syncGroupPlaces(
                        selectedGroupId,
                        [],
                        backendPlaceIds
                    );

                } catch (placeError) {
                    console.error(
                        "그룹은 생성됐지만 장소 연결 실패:",
                        placeError
                    );

                    showToast(
                        "그룹은 생성됐지만 일부 장소 저장에 실패했습니다."
                    );
                }
            }
        }

        closeModal(
            groupFormModal
        );

        openModal(
            groupModal
        );

        await renderGroupManager();

        showToast(
            editId
                ? "그룹을 수정했습니다."
                : "새 그룹을 만들었습니다."
        );

    } catch (error) {
        console.error(
            "그룹 저장 실패:",
            error
        );

        showToast(
            error?.message ||
            "그룹 저장에 실패했습니다."
        );
    }
}

async function deleteGroup(groupId) {
    const target = groupCache.find(g => String(g.groupId) === String(groupId));
    if (!target || !window.confirm(`"${target.groupName}" 그룹을 삭제할까요?`)) return;
    try {
        await apiRequest(`/group/${groupId}/delete`, { method: "DELETE", auth: true });
        selectedGroupId = null;
        await renderGroupManager();
        showToast("그룹을 삭제했습니다.");
    } catch (error) { showToast(error.message); }
}

async function shareGroup(group) {
    try {
        // 백의 share API 호출은 그대로 수행하되,
        // 복사되는 링크 형식은 백 라우트와 동일하게
        // 반드시 /group/{groupId} 로 고정합니다.
        await apiRequest(
            `/group/${group.groupId}/share`,
            { auth: true }
        );

        const groupId = Number(group?.groupId);

        if (!Number.isFinite(groupId) || groupId <= 0) {
            throw new Error("올바른 그룹 ID가 없습니다.");
        }

        const shareUrl =
            `${window.location.origin}/group/${groupId}`;

        await navigator.clipboard.writeText(shareUrl);
        showToast("공유 링크를 복사했습니다.");
    } catch (error) {
        showToast(error.message);
    }
}

async function submitSharedGroup(event) {
    event.preventDefault();

    // async/await 이후에는 event.currentTarget이 null이 될 수 있으므로
    // submit 시점의 form 참조를 미리 보관합니다.
    const form = event.currentTarget;

    const sharedUrl =
        document
            .getElementById("sharedGroupUrl")
            ?.value
            .trim();

    if (!sharedUrl) {
        return;
    }

    let groupId;

    try {
        const url = new URL(
            sharedUrl,
            window.location.origin
        );

        // 백에서 내려주는 공유 URL 형식:
        // http://host/group/{groupId}
        groupId =
            url.pathname.match(
                /\/group\/(\d+)\/?$/
            )?.[1];
    } catch {
        return showToast(
            "올바른 공유 링크를 입력해 주세요."
        );
    }

    if (!groupId || !/^\d+$/.test(String(groupId))) {
        return showToast(
            "그룹 ID를 찾을 수 없습니다."
        );
    }

    try {
        // 원본 그룹 GET은 제거합니다.
        // 현재 백의 clone API가 원본 그룹을 직접 조회하고,
        // groupName/groupMemo가 빈 문자열이면 원본 값을 그대로 복사합니다.
        await apiRequest(
            `/group/${groupId}/clone`,
            {
                method: "POST",
                auth: true,
                body: {
                    groupDate: toBackendDate(
                        document
                            .getElementById("sharedGroupDate")
                            ?.value ||
                        new Date()
                            .toISOString()
                            .slice(0, 16)
                    ),
                    groupMemo:
                        document
                            .getElementById("sharedGroupMemo")
                            ?.value
                            .trim() || "",
                    groupName:
                        document
                            .getElementById("sharedGroupName")
                            ?.value
                            .trim() || ""
                }
            }
        );

        closeModal(sharedGroupModal);
        openModal(groupModal);

        if (form && typeof form.reset === "function") {
            form.reset();
        }

        await renderGroupManager();

        showToast(
            "공유 그룹을 내 그룹으로 저장했습니다."
        );
    } catch (error) {
        showToast(error.message);
    }
}

document.getElementById("openGroupCreateButton")?.addEventListener("click", () => openGroupForm());
document.getElementById("openSharedGroupButton")?.addEventListener("click", () => openModal(sharedGroupModal));
document.getElementById("groupForm")?.addEventListener("submit", submitGroupForm);
document.getElementById("sharedGroupForm")?.addEventListener("submit", submitSharedGroup);


/* 장소 → 그룹 저장 전용 모달 이벤트 */

document
    .getElementById(
        "groupSaveMemo"
    )
    ?.addEventListener(
        "input",
        event => {
            groupSaveDraft.memo =
                event.target.value;

            const count =
                document.getElementById(
                    "groupSaveMemoCount"
                );

            if (count) {
                count.textContent =
                    String(
                        event.target.value.length
                    );
            }
        }
    );

document
    .getElementById(
        "groupSaveNextButton"
    )
    ?.addEventListener(
        "click",
        async () => {
            setGroupSaveStep(
                "group"
            );

            await renderGroupSaveGroupStep();
        }
    );

[
    "groupSaveBackButton",
    "groupSaveBackFooterButton"
]
    .forEach(id => {
        document
            .getElementById(
                id
            )
            ?.addEventListener(
                "click",
                () => {
                    setGroupSaveStep(
                        "place"
                    );

                    renderGroupSavePlaceStep();
                }
            );
    });

document
    .getElementById(
        "groupSaveCreateGroupButton"
    )
    ?.addEventListener(
        "click",
        () => {
            const placeKey =
                groupSaveDraft.placeKey;

            closeModal(
                document.getElementById(
                    "groupPlaceSaveModal"
                )
            );

            openGroupForm(
                null,
                {
                    placeKey
                }
            );
        }
    );

document
    .getElementById(
        "groupSaveConfirmButton"
    )
    ?.addEventListener(
        "click",
        savePlaceToSelectedGroup
    );

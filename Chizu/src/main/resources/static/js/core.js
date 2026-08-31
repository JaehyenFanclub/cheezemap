/* =====================================================
   CHEESE MAP 다국어 문구
===================================================== */

const translations = {
    ko: {
        "loading.message": "도쿄 지도를 준비하고 있어요",

        "search.placeholder": "장소, 역, 음식점을 검색하세요",
        "search.button": "검색",

        "menu.home": "홈",
        "menu.explore": "주변 탐색",
        "menu.route": "길찾기",
        "menu.favorite": "즐겨찾기",
        "menu.group": "그룹",

        "category.title": "카테고리",
        "category.all": "전체",
        "category.food": "음식점",
        "category.cafe": "카페",
        "category.convenience": "편의·의료",
        "category.tour": "관광지",
        "category.transport": "교통",

        "layer.title": "지도 레이어",
        "layer.traffic": "실시간 교통",
        "layer.crowd": "혼잡도",
        "layer.danger": "위험지역",
        "layer.wheelchair": "휠체어 접근성",

        "common.settings": "설정",

        "map.currentArea": "현재 지역",
        "map.shinjuku": "도쿄도 신주쿠구",

        "crowd.title": "혼잡도",
        "crowd.low": "한산",
        "crowd.normal": "보통",
        "crowd.high": "혼잡",

        "route.title": "길찾기",
        "route.start": "출발지",
        "route.end": "도착지",
        "route.currentLocation": "현재 위치",
        "route.endPlaceholder": "도착지를 입력하세요",
        "route.transit": "대중교통",
        "route.walking": "도보",
        "route.driving": "자동차",
        "route.search": "경로 검색",
        "route.back": "뒤로",

        "recommend.title": "주변 추천 장소",

        "place.open": "영업 중",
        "place.outlet": "콘센트",
        "place.solo": "혼밥 가능",
        "place.crowd": "현재 혼잡도",
        "place.closing": "영업 종료",
        "place.save": "저장",
        "place.share": "공유",
        // MR.EUM 수정부분: 그룹 저장 버튼 한국어
        "place.groupSave": "그룹 저장",

        // MR.EUM 수정부분: 장소 상세 메뉴/리뷰 다국어 문구
        "place.menu": "메뉴",
        "place.menuCount": "개",
        "place.menuLoading": "메뉴 정보를 불러오는 중입니다.",
        "place.menuEmpty": "등록된 메뉴가 없습니다.",
        "place.menuDescriptionEmpty": "메뉴 설명이 없습니다.",
        "place.reviews": "리뷰",
        "place.reviewWrite": "리뷰 작성",
        "place.reviewCount": "리뷰",
        "place.reviewLoading": "리뷰를 불러오는 중입니다.",
        "place.reviewEmpty": "등록된 리뷰가 없습니다.",
        // MR.EUM 수정부분: 리뷰 수정 토글 문구
        "place.reviewEdit": "수정",
        "place.reviewEditSave": "수정 완료",
        "place.reviewEditCancel": "취소",

        "review.writeTitle": "리뷰 작성",
        "review.ratingLabel": "별점을 선택해주세요",
        "review.ratingHelp": "별점을 선택해주세요.",
        "review.rating1": "매우 불만족",
        "review.rating2": "불만족",
        "review.rating3": "보통",
        "review.rating4": "만족",
        "review.rating5": "매우 만족",
        "review.contentLabel": "리뷰 내용",
        "review.contentPlaceholder": "리뷰를 작성해주세요.",
        "review.photoLabel": "사진 추가",
        "review.photoAdd": "사진 추가",
        "review.cancel": "취소",
        "review.submit": "리뷰 등록",

        "auth.login": "로그인",
        "message.inbox": "쪽지함",
        "auth.logout": "로그아웃",
        "auth.signup": "회원가입",
        "auth.email": "이메일",
        "auth.password": "비밀번호",
        "auth.nickname": "닉네임",
        "auth.passwordConfirm": "비밀번호 확인",
        "auth.passwordPlaceholder": "비밀번호를 입력하세요",

        "auth.loginTitle": "치즈 맵에 로그인",
        "auth.loginDescription":
            "일본을 땅따먹자.",

        "auth.signupTitle": "치즈 맵 회원가입",
        "auth.signupDescription":
            "나만의 도쿄 장소를 저장해보세요.",

        "auth.orContinueWith": "다른 계정으로 로그인 또는 회원가입",
        "auth.goSignup": "치즈맵 계정으로 회원가입",
        "auth.goLogin": "이미 계정이 있어요",

        "mypage.title": "마이페이지",
        "mypage.reviews": "내 리뷰",
        "mypage.likes": "내 좋아요",
        "mypage.favorites": "즐겨찾기",
        "mypage.edit": "프로필 수정",

        "weather.clear": "맑음",
        "weather.mainlyClear": "대체로 맑음",
        "weather.cloudy": "구름",
        "weather.overcast": "흐림",
        "weather.fog": "안개",
        "weather.rain": "비",
        "weather.snow": "눈",
        "weather.thunder": "뇌우",
        "weather.unknown": "날씨 정보",

        "toast.mapLoaded": "구글 지도를 불러왔습니다.",
        "toast.mapNotReady": "지도가 아직 준비되지 않았습니다.",
        "toast.searchRequired": "검색어를 입력해주세요.",
        "toast.noResult": "검색 결과를 찾지 못했습니다.",
        "toast.searchFound": "검색 결과를 찾았습니다.",
        "toast.routeRequired": "도착지를 입력해주세요.",
        "toast.routeShown": "샘플 경로를 표시했습니다.",
        "toast.loginRequired": "로그인이 필요한 기능입니다.",
        "toast.loginSuccess": "로그인했습니다.",
        "toast.logoutSuccess": "로그아웃했습니다.",
        "toast.signupSuccess": "회원가입이 완료되었습니다.",
        "toast.saved": "좋아요에 저장했습니다.",
        "toast.removed": "좋아요에서 삭제했습니다.",
        "toast.linkCopied": "공유 링크를 복사했습니다.",
        "toast.linkFailed": "공유 링크 복사에 실패했습니다.",
        "toast.currentLocation": "현재 위치로 이동했습니다.",
        "toast.locationFailed": "현재 위치를 가져오지 못했습니다.",
        "toast.trafficOn": "실시간 교통 레이어를 켰습니다.",
        "toast.trafficOff": "실시간 교통 레이어를 껐습니다.",
        "toast.weatherFailed": "날씨 정보를 불러오지 못했습니다.",

        "error.login": "이메일과 비밀번호를 입력해주세요.",
        "error.signup": "모든 항목을 입력해주세요.",
        "error.passwordLength": "비밀번호는 6자 이상이어야 합니다.",
        "error.passwordMismatch": "비밀번호가 서로 다릅니다.",

        "empty.reviews": "작성한 리뷰가 없습니다.",
        "empty.likes": "좋아요한 장소가 없습니다.",
        "empty.favorites": "즐겨찾기한 장소가 없습니다."
    },


    en: {
        "loading.message": "Preparing the Tokyo map",
        "search.placeholder": "Search places, stations, restaurants",
        "search.button": "Search",
        "menu.home": "Home",
        "menu.explore": "Explore nearby",
        "menu.route": "Directions",
        "menu.favorite": "Favorites",
        "menu.group": "Groups",
        "category.title": "Categories",
        "category.all": "All",
        "category.food": "Restaurants",
        "category.cafe": "Cafes",
        "category.convenience": "Convenience & Medical",
        "category.tour": "Attractions",
        "category.transport": "Transport",
        "layer.title": "Map layers",
        "layer.traffic": "Live traffic",
        "layer.crowd": "Crowding",
        "layer.danger": "Risk areas",
        "layer.wheelchair": "Wheelchair access",
        "common.settings": "Settings",
        "map.currentArea": "Current area",
        "map.shinjuku": "Shinjuku, Tokyo",
        "crowd.title": "Crowding",
        "crowd.low": "Quiet",
        "crowd.normal": "Normal",
        "crowd.high": "Busy",
        "route.title": "Directions",
        "route.start": "Start",
        "route.end": "Destination",
        "route.currentLocation": "Current location",
        "route.endPlaceholder": "Enter destination",
        "route.transit": "Transit",
        "route.walking": "Walking",
        "route.driving": "Driving",
        "route.search": "Find route",
        "route.back": "Back",
        "recommend.title": "Recommended nearby",
        "place.open": "Open",
        "place.outlet": "Power outlets",
        "place.solo": "Good for solo visits",
        "place.crowd": "Current crowding",
        "place.closing": "Closes",
        "place.save": "Save",
        "place.share": "Share",
        "place.groupSave": "Save to group",
        "place.menu": "Menu",
        "place.menuCount": "items",
        "place.menuLoading": "Loading menu information.",
        "place.menuEmpty": "No menu items available.",
        "place.menuDescriptionEmpty": "No menu description.",
        "place.reviews": "Reviews",
        "place.reviewWrite": "Write review",
        "place.reviewCount": "reviews",
        "place.reviewLoading": "Loading reviews.",
        "place.reviewEmpty": "No reviews yet.",
        "place.reviewEdit": "Edit",
        "place.reviewEditSave": "Save changes",
        "place.reviewEditCancel": "Cancel",
        "review.writeTitle": "Write a review",
        "review.ratingLabel": "Choose a rating",
        "review.ratingHelp": "Choose a rating.",
        "review.rating1": "Very dissatisfied",
        "review.rating2": "Dissatisfied",
        "review.rating3": "Okay",
        "review.rating4": "Satisfied",
        "review.rating5": "Very satisfied",
        "review.contentLabel": "Review",
        "review.contentPlaceholder": "Write your review.",
        "review.photoLabel": "Add photos",
        "review.photoAdd": "Add photo",
        "review.cancel": "Cancel",
        "review.submit": "Post review",
        "auth.login": "Log in",
        "message.inbox": "Messages",
        "auth.logout": "Log out",
        "auth.signup": "Sign up",
        "auth.email": "Email",
        "auth.password": "Password",
        "auth.nickname": "Nickname",
        "auth.passwordConfirm": "Confirm password",
        "auth.passwordPlaceholder": "Enter your password",
        "auth.loginTitle": "Log in to CHEESE MAP",
        "auth.loginDescription": "Save favorites and travel plans.",
        "auth.signupTitle": "Create a CHEESE MAP account",
        "auth.signupDescription": "Save your favorite places in Tokyo.",
        "auth.orContinueWith": "Sign in or sign up with another account",
        "auth.goSignup": "Create a CHEESE MAP account",
        "auth.goLogin": "Already have an account?",
        "mypage.title": "My page",
        "mypage.reviews": "My reviews",
        "mypage.likes": "My likes",
        "mypage.favorites": "Favorites",
        "mypage.edit": "Edit profile",
        "weather.clear": "Clear",
        "weather.mainlyClear": "Mostly clear",
        "weather.cloudy": "Cloudy",
        "weather.overcast": "Overcast",
        "weather.fog": "Fog",
        "weather.rain": "Rain",
        "weather.snow": "Snow",
        "weather.thunder": "Thunderstorm",
        "weather.unknown": "Weather",
        "toast.mapLoaded": "Google Maps loaded.",
        "toast.mapNotReady": "The map is still loading.",
        "toast.searchRequired": "Enter a search term.",
        "toast.noResult": "No results found.",
        "toast.searchFound": "Search result found.",
        "toast.routeRequired": "Enter a destination.",
        "toast.routeShown": "Route displayed.",
        "toast.loginRequired": "Please log in first.",
        "toast.loginSuccess": "Logged in.",
        "toast.logoutSuccess": "Logged out.",
        "toast.signupSuccess": "Account created.",
        "toast.saved": "Saved to likes.",
        "toast.removed": "Removed from likes.",
        "toast.linkCopied": "Link copied.",
        "toast.linkFailed": "Could not copy the link.",
        "toast.currentLocation": "Moved to your current location.",
        "toast.locationFailed": "Could not get your current location.",
        "toast.trafficOn": "Live traffic enabled.",
        "toast.trafficOff": "Live traffic disabled.",
        "toast.weatherFailed": "Could not load weather.",
        "error.login": "Enter your email and password.",
        "error.signup": "Please fill in all fields.",
        "error.passwordLength": "Password must be at least 6 characters.",
        "error.passwordMismatch": "Passwords do not match.",
        "empty.reviews": "You have not written any reviews.",
        "empty.likes": "You have not liked any places.",
        "empty.favorites": "You have no saved favorites."
    },

    ja: {
        "loading.message": "東京の地図を準備しています",

        "search.placeholder": "場所・駅・飲食店を検索",
        "search.button": "検索",

        "menu.home": "ホーム",
        "menu.explore": "周辺検索",
        "menu.route": "ルート検索",
        "menu.favorite": "お気に入り",
        "menu.group": "グループ",

        "category.title": "カテゴリー",
        "category.all": "すべて",
        "category.food": "飲食店",
        "category.cafe": "カフェ",
        "category.convenience": "便利・医療",
        "category.tour": "観光地",
        "category.transport": "交通",

        "layer.title": "地図レイヤー",
        "layer.traffic": "リアルタイム交通",
        "layer.crowd": "混雑度",
        "layer.danger": "危険地域",
        "layer.wheelchair": "車椅子対応",

        "common.settings": "設定",

        "map.currentArea": "現在の地域",
        "map.shinjuku": "東京都新宿区",

        "crowd.title": "混雑度",
        "crowd.low": "空いている",
        "crowd.normal": "普通",
        "crowd.high": "混雑",

        "route.title": "ルート検索",
        "route.start": "出発地",
        "route.end": "目的地",
        "route.currentLocation": "現在地",
        "route.endPlaceholder": "目的地を入力してください",
        "route.transit": "公共交通",
        "route.walking": "徒歩",
        "route.driving": "車",
        "route.search": "ルート検索",
        "route.back": "戻る",

        "recommend.title": "周辺のおすすめスポット",

        "place.open": "営業中",
        "place.outlet": "コンセント",
        "place.solo": "一人でも利用可能",
        "place.crowd": "現在の混雑度",
        "place.closing": "閉店時間",
        "place.save": "保存",
        "place.share": "共有",
        // MR.EUM 수정부분: 그룹 저장 버튼 일본어
        "place.groupSave": "グループに保存",

        // MR.EUM 수정부분: 장소 상세 메뉴/리뷰 다국어 문구
        "place.menu": "メニュー",
        "place.menuCount": "件",
        "place.menuLoading": "メニュー情報を読み込んでいます。",
        "place.menuEmpty": "登録されたメニューはありません。",
        "place.menuDescriptionEmpty": "メニューの説明はありません。",
        "place.reviews": "レビュー",
        "place.reviewWrite": "レビューを書く",
        "place.reviewCount": "レビュー",
        "place.reviewLoading": "レビューを読み込んでいます。",
        "place.reviewEmpty": "登録されたレビューはありません。",
        // MR.EUM 수정부분: レビュー編集トグル文言
        "place.reviewEdit": "編集",
        "place.reviewEditSave": "編集を保存",
        "place.reviewEditCancel": "キャンセル",

        "review.writeTitle": "レビューを書く",
        "review.ratingLabel": "評価を選択してください",
        "review.ratingHelp": "評価を選択してください。",
        "review.rating1": "とても不満",
        "review.rating2": "不満",
        "review.rating3": "普通",
        "review.rating4": "満足",
        "review.rating5": "とても満足",
        "review.contentLabel": "レビュー内容",
        "review.contentPlaceholder": "レビューを入力してください。",
        "review.photoLabel": "写真を追加",
        "review.photoAdd": "写真を追加",
        "review.cancel": "キャンセル",
        "review.submit": "レビューを投稿",

        "auth.login": "ログイン",
        "message.inbox": "メッセージ",
        "auth.logout": "ログアウト",
        "auth.signup": "新規登録",
        "auth.email": "メールアドレス",
        "auth.password": "パスワード",
        "auth.nickname": "ニックネーム",
        "auth.passwordConfirm": "パスワード確認",
        "auth.passwordPlaceholder": "パスワードを入力してください",

        "auth.loginTitle": "チーズマップにログイン",
        "auth.loginDescription":
            "お気に入りや旅行プランを保存できます。",

        "auth.signupTitle": "チーズマップ新規登録",
        "auth.signupDescription":
            "お気に入りの東京スポットを保存しましょう。",

        "auth.orContinueWith": "他のアカウントでログイン・新規登録",
        "auth.goSignup": "チーズマップのアカウントを作成",
        "auth.goLogin": "すでにアカウントをお持ちですか",

        "mypage.title": "マイページ",
        "mypage.reviews": "自分のレビュー",
        "mypage.likes": "いいね",
        "mypage.favorites": "お気に入り",
        "mypage.edit": "プロフィール編集",

        "weather.clear": "晴れ",
        "weather.mainlyClear": "ほぼ晴れ",
        "weather.cloudy": "くもり",
        "weather.overcast": "曇天",
        "weather.fog": "霧",
        "weather.rain": "雨",
        "weather.snow": "雪",
        "weather.thunder": "雷雨",
        "weather.unknown": "天気情報",

        "toast.mapLoaded": "Googleマップを読み込みました。",
        "toast.mapNotReady": "地図はまだ準備中です。",
        "toast.searchRequired": "検索語を入力してください。",
        "toast.noResult": "検索結果が見つかりませんでした。",
        "toast.searchFound": "検索結果が見つかりました。",
        "toast.routeRequired": "目的地を入力してください。",
        "toast.routeShown": "サンプルルートを表示しました。",
        "toast.loginRequired": "ログインが必要です。",
        "toast.loginSuccess": "ログインしました。",
        "toast.logoutSuccess": "ログアウトしました。",
        "toast.signupSuccess": "新規登録が完了しました。",
        "toast.saved": "お気に入りに保存しました。",
        "toast.removed": "お気に入りから削除しました。",
        "toast.linkCopied": "共有リンクをコピーしました。",
        "toast.linkFailed": "リンクのコピーに失敗しました。",
        "toast.currentLocation": "現在地へ移動しました。",
        "toast.locationFailed": "現在地を取得できませんでした。",
        "toast.trafficOn": "交通レイヤーを表示しました。",
        "toast.trafficOff": "交通レイヤーを非表示にしました。",
        "toast.weatherFailed": "天気情報を取得できませんでした。",

        "error.login":
            "メールアドレスとパスワードを入力してください。",

        "error.signup":
            "すべての項目を入力してください。",

        "error.passwordLength":
            "パスワードは6文字以上で入力してください。",

        "error.passwordMismatch":
            "パスワードが一致しません。",

        "empty.reviews":
            "投稿したレビューはありません。",

        "empty.likes":
            "いいねした場所はありません。",

        "empty.favorites":
            "お気に入りの場所はありません。"
    }
};


/* =====================================================
   장소 데이터
===================================================== */

const places = {
    ramen: {
        name: {
            ko: "멘야 치즈",
            ja: "麺屋チーズ"
        },

        category: {
            ko: "라멘 · 음식점",
            ja: "ラーメン · 飲食店"
        },

        type: "food",
        rating: 4.8,
        reviewCount: 246,

        address: {
            ko: "도쿄도 신주쿠구 · 현재 위치에서 180m",
            ja: "東京都新宿区 · 現在地から180m"
        },

        crowd: {
            ko: "혼잡",
            ja: "混雑"
        },

        icon: "ti-bowl-chopsticks",

        color:
            "linear-gradient(135deg, #ffd68a, #ed8d3f)",

        position: {
            lat: 35.6938,
            lng: 139.7034
        }
    },

    cafe: {
        name: {
            ko: "치즈 카페 신주쿠점",
            ja: "チーズカフェ新宿店"
        },

        category: {
            ko: "카페",
            ja: "カフェ"
        },

        type: "cafe",
        rating: 4.7,
        reviewCount: 128,

        address: {
            ko: "도쿄도 신주쿠구 · 신주쿠역에서 250m",
            ja: "東京都新宿区 · 新宿駅から250m"
        },

        crowd: {
            ko: "보통",
            ja: "普通"
        },

        icon: "ti-coffee",

        color:
            "linear-gradient(135deg, #f7c665, #bf7852)",

        position: {
            lat: 35.6897,
            lng: 139.7004
        }
    },

    park: {
        name: {
            ko: "신주쿠 중앙공원",
            ja: "新宿中央公園"
        },

        category: {
            ko: "공원 · 관광지",
            ja: "公園 · 観光地"
        },

        type: "tour",
        rating: 4.6,
        reviewCount: 1024,

        address: {
            ko: "도쿄도 신주쿠구 · 현재 위치에서 600m",
            ja: "東京都新宿区 · 現在地から600m"
        },

        crowd: {
            ko: "한산",
            ja: "空いている"
        },

        icon: "ti-trees",

        color:
            "linear-gradient(135deg, #b8dbad, #68a86c)",

        position: {
            lat: 35.6896,
            lng: 139.6917
        }
    },

    store: {
        name: {
            ko: "패밀리마트 신주쿠점",
            ja: "ファミリーマート新宿店"
        },

        category: {
            ko: "편의점",
            ja: "コンビニ"
        },

        type: "convenience",
        rating: 4.2,
        reviewCount: 82,

        address: {
            ko: "도쿄도 신주쿠구 · 현재 위치에서 320m",
            ja: "東京都新宿区 · 現在地から320m"
        },

        crowd: {
            ko: "보통",
            ja: "普通"
        },

        icon: "ti-building-store",

        color:
            "linear-gradient(135deg, #ffe5a7, #f4bc45)",

        position: {
            lat: 35.6951,
            lng: 139.6984
        }
    },

    station: {
        name: {
            ko: "신주쿠역",
            ja: "新宿駅"
        },

        category: {
            ko: "교통 · JR",
            ja: "交通 · JR"
        },

        type: "transport",
        rating: 4.3,
        reviewCount: 3214,

        address: {
            ko: "JR 야마노테선 · 중앙선 · 소부선",
            ja: "JR山手線 · 中央線 · 総武線"
        },

        crowd: {
            ko: "혼잡",
            ja: "混雑"
        },

        icon: "ti-train",

        color:
            "linear-gradient(135deg, #f8d57a, #d49b2c)",

        position: {
            lat: 35.6909,
            lng: 139.7003
        }
    },

    bakery: {
        name: {
            ko: "치즈 베이커리",
            ja: "チーズベーカリー"
        },

        category: {
            ko: "베이커리 · 카페",
            ja: "ベーカリー · カフェ"
        },

        type: "cafe",
        rating: 4.5,
        reviewCount: 97,

        address: {
            ko: "도쿄도 나카노구 · 현재 위치에서 430m",
            ja: "東京都中野区 · 現在地から430m"
        },

        crowd: {
            ko: "한산",
            ja: "空いている"
        },

        icon: "ti-bread",

        color:
            "linear-gradient(135deg, #ffe0a4, #d9a358)",

        position: {
            lat: 35.7061,
            lng: 139.6658
        }
    }
};

/*
    시연 안정성을 위해 API가 아니라 로컬 데이터로 표시하는
    도쿄 주요 장소입니다. 필요할 때 이 객체에 장소를 추가하면 됩니다.
*/
Object.assign(places, {
    tokyoStation: {
        name: { ko: "도쿄역", ja: "東京駅" },
        category: { ko: "교통 · JR", ja: "交通 · JR" },
        type: "transport",
        rating: 4.5,
        reviewCount: 12000,
        address: { ko: "도쿄도 지요다구 마루노우치", ja: "東京都千代田区丸の内" },
        crowd: { ko: "혼잡", ja: "混雑" },
        icon: "ti-train",
        color: "linear-gradient(135deg, #dcecf2, #9fc8d7)",
        position: { lat: 35.681236, lng: 139.767125 }
    },

    shibuyaStation: {
        name: { ko: "시부야역", ja: "渋谷駅" },
        category: { ko: "교통 · JR", ja: "交通 · JR" },
        type: "transport",
        rating: 4.4,
        reviewCount: 9200,
        address: { ko: "도쿄도 시부야구", ja: "東京都渋谷区" },
        crowd: { ko: "혼잡", ja: "混雑" },
        icon: "ti-train",
        color: "linear-gradient(135deg, #dcecf2, #9fc8d7)",
        position: { lat: 35.658034, lng: 139.701636 }
    },

    uenoStation: {
        name: { ko: "우에노역", ja: "上野駅" },
        category: { ko: "교통 · JR", ja: "交通 · JR" },
        type: "transport",
        rating: 4.3,
        reviewCount: 6400,
        address: { ko: "도쿄도 다이토구", ja: "東京都台東区" },
        crowd: { ko: "보통", ja: "普通" },
        icon: "ti-train",
        color: "linear-gradient(135deg, #dcecf2, #9fc8d7)",
        position: { lat: 35.713768, lng: 139.777254 }
    },

    tokyoNationalMuseum: {
        name: { ko: "도쿄국립박물관", ja: "東京国立博物館" },
        category: { ko: "박물관 · 관광지", ja: "博物館 · 観光地" },
        type: "tour",
        rating: 4.6,
        reviewCount: 28000,
        address: { ko: "도쿄도 다이토구 우에노공원", ja: "東京都台東区上野公園" },
        crowd: { ko: "보통", ja: "普通" },
        icon: "ti-building-bank",
        color: "linear-gradient(135deg, #fff0b1, #e4b84f)",
        position: { lat: 35.718835, lng: 139.776521 }
    },

    teamLabPlanets: {
        name: { ko: "팀랩 플래닛 도쿄", ja: "チームラボプラネッツ TOKYO" },
        category: { ko: "미술관 · 관광지", ja: "美術館 · 観光地" },
        type: "tour",
        rating: 4.6,
        reviewCount: 36000,
        address: { ko: "도쿄도 고토구 도요스", ja: "東京都江東区豊洲" },
        crowd: { ko: "혼잡", ja: "混雑" },
        icon: "ti-sparkles",
        color: "linear-gradient(135deg, #fff0b1, #e4b84f)",
        position: { lat: 35.649120, lng: 139.789780 }
    },

    sensoJi: {
        name: { ko: "센소지", ja: "浅草寺" },
        category: { ko: "사찰 · 관광지", ja: "寺院 · 観光地" },
        type: "tour",
        rating: 4.5,
        reviewCount: 75000,
        address: { ko: "도쿄도 다이토구 아사쿠사", ja: "東京都台東区浅草" },
        crowd: { ko: "혼잡", ja: "混雑" },
        icon: "ti-building-pavilion",
        color: "linear-gradient(135deg, #fff0b1, #e4b84f)",
        position: { lat: 35.714765, lng: 139.796655 }
    },

    tokyoTower: {
        name: { ko: "도쿄타워", ja: "東京タワー" },
        category: { ko: "전망대 · 관광지", ja: "展望台 · 観光地" },
        type: "tour",
        rating: 4.5,
        reviewCount: 68000,
        address: { ko: "도쿄도 미나토구 시바공원", ja: "東京都港区芝公園" },
        crowd: { ko: "보통", ja: "普通" },
        icon: "ti-building-lighthouse",
        color: "linear-gradient(135deg, #fff0b1, #e4b84f)",
        position: { lat: 35.658581, lng: 139.745433 }
    },

    meijiJingu: {
        name: { ko: "메이지 신궁", ja: "明治神宮" },
        category: { ko: "신사 · 관광지", ja: "神社 · 観光地" },
        type: "tour",
        rating: 4.6,
        reviewCount: 42000,
        address: { ko: "도쿄도 시부야구 요요기", ja: "東京都渋谷区代々木" },
        crowd: { ko: "보통", ja: "普通" },
        icon: "ti-torii",
        color: "linear-gradient(135deg, #fff0b1, #e4b84f)",
        position: { lat: 35.676398, lng: 139.699326 }
    },

    uenoPark: {
        name: { ko: "우에노 공원", ja: "上野公園" },
        category: { ko: "공원", ja: "公園" },
        type: "tour",
        rating: 4.5,
        reviewCount: 30000,
        address: { ko: "도쿄도 다이토구", ja: "東京都台東区" },
        crowd: { ko: "보통", ja: "普通" },
        icon: "ti-trees",
        color: "linear-gradient(135deg, #e3f1df, #9ac691)",
        position: { lat: 35.714800, lng: 139.774500 }
    },

    yoyogiPark: {
        name: { ko: "요요기 공원", ja: "代々木公園" },
        category: { ko: "공원", ja: "公園" },
        type: "tour",
        rating: 4.5,
        reviewCount: 24000,
        address: { ko: "도쿄도 시부야구", ja: "東京都渋谷区" },
        crowd: { ko: "한산", ja: "空いている" },
        icon: "ti-trees",
        color: "linear-gradient(135deg, #e3f1df, #9ac691)",
        position: { lat: 35.671700, lng: 139.694900 }
    },

    blueBottleShinjuku: {
        name: { ko: "블루보틀 신주쿠", ja: "ブルーボトルコーヒー 新宿" },
        category: { ko: "카페", ja: "カフェ" },
        type: "cafe",
        rating: 4.2,
        reviewCount: 2300,
        address: { ko: "도쿄도 신주쿠구", ja: "東京都新宿区" },
        crowd: { ko: "보통", ja: "普通" },
        icon: "ti-coffee",
        color: "linear-gradient(135deg, #f6e0ca, #d4a778)",
        position: { lat: 35.688879, lng: 139.702409 }
    },

    starbucksReserve: {
        name: { ko: "스타벅스 리저브 로스터리 도쿄", ja: "スターバックス リザーブ ロースタリー 東京" },
        category: { ko: "카페", ja: "カフェ" },
        type: "cafe",
        rating: 4.4,
        reviewCount: 12000,
        address: { ko: "도쿄도 메구로구 아오바다이", ja: "東京都目黒区青葉台" },
        crowd: { ko: "혼잡", ja: "混雑" },
        icon: "ti-coffee",
        color: "linear-gradient(135deg, #f6e0ca, #d4a778)",
        position: { lat: 35.649100, lng: 139.692800 }
    },

    ichiranShibuya: {
        name: { ko: "이치란 시부야점", ja: "一蘭 渋谷店" },
        category: { ko: "라멘 · 음식점", ja: "ラーメン · 飲食店" },
        type: "food",
        rating: 4.3,
        reviewCount: 11000,
        address: { ko: "도쿄도 시부야구", ja: "東京都渋谷区" },
        crowd: { ko: "혼잡", ja: "混雑" },
        icon: "ti-bowl-chopsticks",
        color: "linear-gradient(135deg, #f9d9c3, #df9568)",
        position: { lat: 35.660344, lng: 139.698779 }
    },

    tsukijiOuterMarket: {
        name: { ko: "쓰키지 장외시장", ja: "築地場外市場" },
        category: { ko: "시장 · 음식점", ja: "市場 · 飲食店" },
        type: "food",
        rating: 4.4,
        reviewCount: 58000,
        address: { ko: "도쿄도 주오구 쓰키지", ja: "東京都中央区築地" },
        crowd: { ko: "혼잡", ja: "混雑" },
        icon: "ti-fish",
        color: "linear-gradient(135deg, #f9d9c3, #df9568)",
        position: { lat: 35.665486, lng: 139.770667 }
    },

    familyMartShibuya: {
        name: { ko: "패밀리마트 시부야점", ja: "ファミリーマート 渋谷店" },
        category: { ko: "편의점", ja: "コンビニ" },
        type: "convenience",
        rating: 4.0,
        reviewCount: 420,
        address: { ko: "도쿄도 시부야구", ja: "東京都渋谷区" },
        crowd: { ko: "보통", ja: "普通" },
        icon: "ti-building-store",
        color: "linear-gradient(135deg, #e0efdf, #9dc7a5)",
        position: { lat: 35.659100, lng: 139.700900 }
    },

    sevenElevenTokyo: {
        name: { ko: "세븐일레븐 도쿄역점", ja: "セブン-イレブン 東京駅店" },
        category: { ko: "편의점", ja: "コンビニ" },
        type: "convenience",
        rating: 4.0,
        reviewCount: 380,
        address: { ko: "도쿄도 지요다구", ja: "東京都千代田区" },
        crowd: { ko: "보통", ja: "普通" },
        icon: "ti-building-store",
        color: "linear-gradient(135deg, #e0efdf, #9dc7a5)",
        position: { lat: 35.681900, lng: 139.766600 }
    }
});


/* =====================================================
   도쿄 주요 역 데이터
   - 야마노테선 전 역
   - 주요 환승역 추가
   - 확대 수준에 따라 노출 개수 조절
===================================================== */

const TOKYO_STATIONS = [
    { key: "tokyo", ko: "도쿄역", ja: "東京駅", lat: 35.681236, lng: 139.767125, major: true },
    { key: "kanda", ko: "간다역", ja: "神田駅", lat: 35.691690, lng: 139.770883, major: false },
    { key: "akihabara", ko: "아키하바라역", ja: "秋葉原駅", lat: 35.698683, lng: 139.773130, major: true },
    { key: "okachimachi", ko: "오카치마치역", ja: "御徒町駅", lat: 35.707438, lng: 139.774632, major: false },
    { key: "ueno", ko: "우에노역", ja: "上野駅", lat: 35.713768, lng: 139.777254, major: true },
    { key: "uguisudani", ko: "우구이스다니역", ja: "鶯谷駅", lat: 35.721484, lng: 139.778015, major: false },
    { key: "nippori", ko: "닛포리역", ja: "日暮里駅", lat: 35.727772, lng: 139.770987, major: true },
    { key: "nishinippori", ko: "니시닛포리역", ja: "西日暮里駅", lat: 35.732135, lng: 139.766787, major: false },
    { key: "tabata", ko: "다바타역", ja: "田端駅", lat: 35.738062, lng: 139.760859, major: false },
    { key: "komagome", ko: "고마고메역", ja: "駒込駅", lat: 35.736489, lng: 139.746875, major: false },
    { key: "sugamo", ko: "스가모역", ja: "巣鴨駅", lat: 35.733445, lng: 139.739255, major: false },
    { key: "otsuka", ko: "오츠카역", ja: "大塚駅", lat: 35.731401, lng: 139.728662, major: false },
    { key: "ikebukuro", ko: "이케부쿠로역", ja: "池袋駅", lat: 35.729503, lng: 139.710900, major: true },
    { key: "mejiro", ko: "메지로역", ja: "目白駅", lat: 35.721204, lng: 139.706587, major: false },
    { key: "takadanobaba", ko: "다카다노바바역", ja: "高田馬場駅", lat: 35.712677, lng: 139.703715, major: true },
    { key: "shinokubo", ko: "신오쿠보역", ja: "新大久保駅", lat: 35.701306, lng: 139.700044, major: false },
    { key: "shinjuku", ko: "신주쿠역", ja: "新宿駅", lat: 35.690921, lng: 139.700258, major: true },
    { key: "yoyogi", ko: "요요기역", ja: "代々木駅", lat: 35.683061, lng: 139.702042, major: false },
    { key: "harajuku", ko: "하라주쿠역", ja: "原宿駅", lat: 35.670168, lng: 139.702687, major: true },
    { key: "shibuya", ko: "시부야역", ja: "渋谷駅", lat: 35.658034, lng: 139.701636, major: true },
    { key: "ebisu", ko: "에비스역", ja: "恵比寿駅", lat: 35.646690, lng: 139.710106, major: true },
    { key: "meguro", ko: "메구로역", ja: "目黒駅", lat: 35.633998, lng: 139.715828, major: true },
    { key: "gotanda", ko: "고탄다역", ja: "五反田駅", lat: 35.626446, lng: 139.723444, major: false },
    { key: "osaki", ko: "오사키역", ja: "大崎駅", lat: 35.619700, lng: 139.728553, major: true },
    { key: "shinagawa", ko: "시나가와역", ja: "品川駅", lat: 35.628471, lng: 139.738760, major: true },
    { key: "takanawagateway", ko: "다카나와 게이트웨이역", ja: "高輪ゲートウェイ駅", lat: 35.635533, lng: 139.740725, major: false },
    { key: "tamachi", ko: "다마치역", ja: "田町駅", lat: 35.645736, lng: 139.747575, major: false },
    { key: "hamamatsucho", ko: "하마마쓰초역", ja: "浜松町駅", lat: 35.655391, lng: 139.757135, major: true },
    { key: "shimbashi", ko: "신바시역", ja: "新橋駅", lat: 35.666182, lng: 139.758590, major: true },
    { key: "yurakucho", ko: "유라쿠초역", ja: "有楽町駅", lat: 35.675069, lng: 139.763328, major: false },

    { key: "asakusa", ko: "아사쿠사역", ja: "浅草駅", lat: 35.710733, lng: 139.797592, major: true },
    { key: "oshiage", ko: "오시아게역", ja: "押上駅", lat: 35.710333, lng: 139.812677, major: true },
    { key: "kinshicho", ko: "긴시초역", ja: "錦糸町駅", lat: 35.696795, lng: 139.814294, major: true },
    { key: "ryogoku", ko: "료고쿠역", ja: "両国駅", lat: 35.696004, lng: 139.793294, major: false },
    { key: "nihombashi", ko: "니혼바시역", ja: "日本橋駅", lat: 35.682180, lng: 139.773727, major: true },
    { key: "ginza", ko: "긴자역", ja: "銀座駅", lat: 35.671989, lng: 139.764019, major: true },
    { key: "roppongi", ko: "롯폰기역", ja: "六本木駅", lat: 35.662811, lng: 139.731443, major: true },
    { key: "akasakamitsuke", ko: "아카사카미쓰케역", ja: "赤坂見附駅", lat: 35.676856, lng: 139.737047, major: true },
    { key: "iidabashi", ko: "이다바시역", ja: "飯田橋駅", lat: 35.702065, lng: 139.745088, major: true },
    { key: "ochanomizu", ko: "오차노미즈역", ja: "御茶ノ水駅", lat: 35.699605, lng: 139.765124, major: true },
    { key: "nakano", ko: "나카노역", ja: "中野駅", lat: 35.705765, lng: 139.665835, major: true },
    { key: "kichijoji", ko: "기치조지역", ja: "吉祥寺駅", lat: 35.703119, lng: 139.579756, major: true },
    { key: "shinjukusanchome", ko: "신주쿠산초메역", ja: "新宿三丁目駅", lat: 35.690553, lng: 139.706148, major: false, secondary: true },
    { key: "nishishinjuku", ko: "니시신주쿠역", ja: "西新宿駅", lat: 35.694245, lng: 139.692517, major: false, secondary: true },
    { key: "tochomae", ko: "도초마에역", ja: "都庁前駅", lat: 35.689674, lng: 139.691630, major: false, secondary: true },
    { key: "higashishinjuku", ko: "히가시신주쿠역", ja: "東新宿駅", lat: 35.697920, lng: 139.707530, major: false, secondary: false },
    { key: "shinjukugyoemmae", ko: "신주쿠교엔마에역", ja: "新宿御苑前駅", lat: 35.688580, lng: 139.710700, major: false, secondary: false },
    { key: "yotsuya", ko: "요쓰야역", ja: "四ツ谷駅", lat: 35.686014, lng: 139.730664, major: false, secondary: true },
    { key: "yotsuyasanchome", ko: "요쓰야산초메역", ja: "四谷三丁目駅", lat: 35.687968, lng: 139.720106, major: false, secondary: false },
    { key: "ichigaya", ko: "이치가야역", ja: "市ケ谷駅", lat: 35.691045, lng: 139.735530, major: false, secondary: true },
    { key: "kudanshita", ko: "구단시타역", ja: "九段下駅", lat: 35.695455, lng: 139.751217, major: false, secondary: true },
    { key: "jimbocho", ko: "진보초역", ja: "神保町駅", lat: 35.695930, lng: 139.757640, major: false, secondary: true },
    { key: "otemachi", ko: "오테마치역", ja: "大手町駅", lat: 35.684801, lng: 139.766148, major: true, secondary: true },
    { key: "takebashi", ko: "다케바시역", ja: "竹橋駅", lat: 35.690662, lng: 139.756698, major: false, secondary: false },
    { key: "hibiya", ko: "히비야역", ja: "日比谷駅", lat: 35.674919, lng: 139.760357, major: false, secondary: true },
    { key: "kasumigaseki", ko: "가스미가세키역", ja: "霞ケ関駅", lat: 35.673629, lng: 139.750655, major: false, secondary: true },
    { key: "toranomon", ko: "도라노몬역", ja: "虎ノ門駅", lat: 35.670246, lng: 139.749816, major: false, secondary: true },
    { key: "daimon", ko: "다이몬역", ja: "大門駅", lat: 35.655387, lng: 139.754753, major: false, secondary: true },
    { key: "shiodome", ko: "시오도메역", ja: "汐留駅", lat: 35.662969, lng: 139.759930, major: false, secondary: false },
    { key: "tsukiji", ko: "쓰키지역", ja: "築地駅", lat: 35.668142, lng: 139.772682, major: false, secondary: false },
    { key: "hatchobori", ko: "핫초보리역", ja: "八丁堀駅", lat: 35.674494, lng: 139.777691, major: false, secondary: true },
    { key: "kayabacho", ko: "가야바초역", ja: "茅場町駅", lat: 35.680190, lng: 139.780513, major: false, secondary: false },
    { key: "ningyocho", ko: "닌교초역", ja: "人形町駅", lat: 35.686316, lng: 139.782199, major: false, secondary: false },
    { key: "mitsukoshimae", ko: "미쓰코시마에역", ja: "三越前駅", lat: 35.684906, lng: 139.773642, major: false, secondary: false },
    { key: "asakusabashi", ko: "아사쿠사바시역", ja: "浅草橋駅", lat: 35.697362, lng: 139.784510, major: false, secondary: true },
    { key: "kuramae", ko: "구라마에역", ja: "蔵前駅", lat: 35.703286, lng: 139.790645, major: false, secondary: false },
    { key: "uenohirokoji", ko: "우에노히로코지역", ja: "上野広小路駅", lat: 35.707608, lng: 139.773135, major: false, secondary: false },
    { key: "suehirocho", ko: "스에히로초역", ja: "末広町駅", lat: 35.702972, lng: 139.771752, major: false, secondary: false },
    { key: "awajicho", ko: "아와지초역", ja: "淡路町駅", lat: 35.694959, lng: 139.767544, major: false, secondary: false },
    { key: "shin_ochanomizu", ko: "신오차노미즈역", ja: "新御茶ノ水駅", lat: 35.696320, lng: 139.765967, major: false, secondary: false },
    { key: "monzennakacho", ko: "몬젠나카초역", ja: "門前仲町駅", lat: 35.671977, lng: 139.795991, major: false, secondary: true },
    { key: "kiyosumishirakawa", ko: "기요스미시라카와역", ja: "清澄白河駅", lat: 35.682105, lng: 139.798851, major: false, secondary: false },
    { key: "toyosu", ko: "도요스역", ja: "豊洲駅", lat: 35.655184, lng: 139.796837, major: false, secondary: true },
    { key: "ariake", ko: "아리아케역", ja: "有明駅", lat: 35.634134, lng: 139.793073, major: false, secondary: false },
    { key: "odaibakaihinkoen", ko: "오다이바카이힌코엔역", ja: "お台場海浜公園駅", lat: 35.629820, lng: 139.778622, major: false, secondary: false },
    { key: "daikanyama", ko: "다이칸야마역", ja: "代官山駅", lat: 35.648128, lng: 139.703183, major: false, secondary: false },
    { key: "nakameguro", ko: "나카메구로역", ja: "中目黒駅", lat: 35.644307, lng: 139.699157, major: false, secondary: true },
    { key: "omotesando", ko: "오모테산도역", ja: "表参道駅", lat: 35.665247, lng: 139.712314, major: false, secondary: true },
    { key: "gaienmae", ko: "가이엔마에역", ja: "外苑前駅", lat: 35.670542, lng: 139.717781, major: false, secondary: false },
    { key: "aoyamaitchome", ko: "아오야마잇초메역", ja: "青山一丁目駅", lat: 35.672780, lng: 139.724182, major: false, secondary: true }
];


function addTokyoStationsToPlaces() {
    TOKYO_STATIONS.forEach(station => {
        const placeKey =
            `station_${station.key}`;

        if (places[placeKey]) {
            return;
        }

        places[placeKey] = {
            name: {
                ko: station.ko,
                ja: station.ja
            },

            category: {
                ko: "교통 · 역",
                ja: "交通 · 駅"
            },

            type: "transport",
            rating: 4.3,
            reviewCount: 0,

            address: {
                ko: "도쿄도 철도역",
                ja: "東京都内の鉄道駅"
            },

            crowd: {
                ko: station.major ? "혼잡" : "보통",
                ja: station.major ? "混雑" : "普通"
            },

            icon: "ti-train",

            color:
                "linear-gradient(135deg, #e8f4f7, #b7dbe5)",

            position: {
                lat: station.lat,
                lng: station.lng
            },

            majorStation:
                station.major,

            secondaryStation:
                [
                    "station_kanda",
                    "station_okachimachi",
                    "station_yoyogi",
                    "station_shinokubo",
                    "station_tamachi",
                    "station_yurakucho",
                    "station_ryogoku",
                    "station_gotanda",
                    "station_sugamo",
                    "station_mejiro"
                ].includes(placeKey)
        };
    });
}


addTokyoStationsToPlaces();



/* =====================================================
   공통 상태
===================================================== */

const STORAGE_KEYS = {
    language: "cheeseMapLanguage",
    user: "cheeseMapUser",
    likes: "cheeseMapLikes",
    favorites: "cheeseMapFavorites",
    darkMode: "cheeseMapDarkMode"
};

let currentLanguage =
    localStorage.getItem(STORAGE_KEYS.language) || "ko";

let currentUser =
    readStorage(STORAGE_KEYS.user, null);

let likedPlaces =
    readStorage(STORAGE_KEYS.likes, []);

let favoritePlaces =
    readStorage(STORAGE_KEYS.favorites, []);

let googleMap = null;
let trafficLayer = null;
let currentLocationMarker = null;
let RouteClass = null;
let computedRoutes = [];
let transitousItineraries = [];

let mapRouteSelectionMode = false;
let mapRouteSelectionStep = 0;
let selectedMapOrigin = null;
let selectedMapDestination = null;
let selectedGooglePoi = null;
let PlacesPlaceClass = null;
const googlePoiRequestInFlight = new Map();
let wheelchairMarkers = [];
let wheelchairSearchTimer = null;
let wheelchairSearchRequestId = 0;
let routePolylines = [];
let routeMarkers = [];
const TOKYO_STATION_POSITION = {
    lat: 35.681236,
    lng: 139.767125
};

let routeOriginPosition = TOKYO_STATION_POSITION;
let CheeseMarker = null;
let selectedPlaceKey = "cafe";

const cheeseMarkers = [];
const stationClickMarkers = [];


/* =====================================================
   DOM 요소
===================================================== */

const sidebar =
    document.getElementById("sidebar");

const placeCard =
    document.getElementById("placeCard");

const routePanel =
    document.getElementById("routePanel");

const routeResult =
    document.getElementById("routeResult");

const legendCard =
    document.getElementById("legendCard");

const toast =
    document.getElementById("toast");

const loginModal =
    document.getElementById("loginModal");

const signupModal =
    document.getElementById("signupModal");

const mypageModal =
    document.getElementById("mypageModal");

const groupModal =
    document.getElementById("groupModal");

const groupFormModal =
    document.getElementById("groupFormModal");

const sharedGroupModal =
    document.getElementById("sharedGroupModal");

const loadingScreen =
    document.getElementById("loadingScreen");


/* =====================================================
   공통 함수
===================================================== */

function escapeGroupHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function readStorage(key, fallbackValue) {
    try {
        const value = localStorage.getItem(key);

        if (!value) {
            return fallbackValue;
        }

        return JSON.parse(value);
    } catch (error) {
        console.error(`${key} 데이터를 읽지 못했습니다.`, error);
        return fallbackValue;
    }
}


function writeStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.error(`${key} 데이터를 저장하지 못했습니다.`, error);
    }
}


function translate(key) {
    return (
        translations[currentLanguage]?.[key] ||
        translations.ko[key] ||
        key
    );
}


function showToast(messageOrKey) {
    if (!toast) {
        return;
    }

    const message =
        translations[currentLanguage]?.[messageOrKey] ||
        messageOrKey;

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(window.cheeseToastTimer);

    window.cheeseToastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 2000);
}


function openModal(modal) {
    if (!modal) {
        return;
    }

    closeAllModals();
    modal.classList.add("show");

    const firstInput = modal.querySelector("input");

    if (firstInput) {
        setTimeout(() => firstInput.focus(), 50);
    }
}


function closeModal(modal) {
    modal?.classList.remove("show");
}


function closeAllModals() {
    document
        .querySelectorAll(".modal-backdrop.show")
        .forEach(modal => modal.classList.remove("show"));
}


function hideLoadingScreen() {
    const screen =
        document.getElementById("loadingScreen");

    if (!screen) {
        return;
    }

    screen.classList.add("is-hidden");

    setTimeout(() => {
        screen.remove();
    }, 500);
}


/* 지도 API가 실패해도 로딩 화면이 무한 유지되지 않게 처리 */
window.addEventListener("load", () => {
    setTimeout(hideLoadingScreen, 8000);
});


/* =====================================================
   언어 변환
===================================================== */

function applyLanguage(language) {
    currentLanguage = ["ko", "ja", "en"].includes(language) ? language : "ko";

    document.documentElement.lang = currentLanguage;
    localStorage.setItem(STORAGE_KEYS.language, currentLanguage);

    document
        .querySelectorAll("[data-i18n]")
        .forEach(element => {
            element.textContent = translate(element.dataset.i18n);
        });

    document
        .querySelectorAll("[data-i18n-placeholder]")
        .forEach(element => {
            element.placeholder =
                translate(element.dataset.i18nPlaceholder);
        });

    document
        .querySelectorAll("[data-i18n-value]")
        .forEach(element => {
            element.value = translate(element.dataset.i18nValue);
        });

    const languageLabel =
        document.getElementById("currentLanguageLabel");

    if (languageLabel) {
        languageLabel.textContent =
            currentLanguage === "ko" ? "한국어" : currentLanguage === "ja" ? "日本語" : "English";
    }

    if (typeof renderCurrentAreaName === "function") {
        renderCurrentAreaName();
    }

    renderRecommendedPlaces();
    updatePlaceCard(selectedPlaceKey);
    updateHeaderAuthState();

    // 역 투명 클릭 영역의 제목도 현재 언어로 다시 생성합니다.
    if (googleMap) {
        createStationClickAreas();
    }

    if (mypageModal?.classList.contains("show")) {
        renderMyPage();
    }

    const startPointInput =
        document.getElementById("startPoint");

    if (
        startPointInput &&
        (
            !startPointInput.value.trim() ||
            isCurrentLocationText(startPointInput.value) ||
            startPointInput.value === "도쿄역" ||
            startPointInput.value === "東京駅"
        )
    ) {
        startPointInput.value =
            currentLanguage === "ko"
                ? "도쿄역"
                : currentLanguage === "ja"
                    ? "東京駅"
                    : "Tokyo Station";
    }

    updateWeatherText();
}


/* =====================================================
   도쿄 현재 시간 및 날씨
===================================================== */

let tokyoClockTimer = null;
let lastWeatherData = null;


function getTokyoTime() {
    return new Intl.DateTimeFormat(
        currentLanguage === "ko" ? "ko-KR" : currentLanguage === "ja" ? "ja-JP" : "en-US",
        {
            timeZone: "Asia/Tokyo",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false
        }
    ).format(new Date());
}


function updateTokyoClock() {
    const dateTimeElement =
        document.getElementById("weatherDateTime");

    if (!dateTimeElement) {
        return;
    }

    dateTimeElement.textContent = getTokyoTime();
    dateTimeElement.dateTime = new Date().toISOString();
}


function startTokyoClock() {
    updateTokyoClock();
    clearInterval(tokyoClockTimer);
    tokyoClockTimer = setInterval(updateTokyoClock, 30 * 1000);
}


function getWeatherInfo(weatherCode) {
    if (weatherCode === 0) {
        return { textKey: "weather.clear", icon: "sun" };
    }

    if ([1, 2].includes(weatherCode)) {
        return { textKey: "weather.mainlyClear", icon: "cloud-sun" };
    }

    if (weatherCode === 3) {
        return { textKey: "weather.overcast", icon: "cloud" };
    }

    if ([45, 48].includes(weatherCode)) {
        return { textKey: "weather.fog", icon: "fog" };
    }

    if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82]
        .includes(weatherCode)) {
        return { textKey: "weather.rain", icon: "rain" };
    }

    if ([71, 73, 75, 77, 85, 86].includes(weatherCode)) {
        return { textKey: "weather.snow", icon: "snow" };
    }

    if ([95, 96, 99].includes(weatherCode)) {
        return { textKey: "weather.thunder", icon: "thunder" };
    }

    return { textKey: "weather.unknown", icon: "cloud" };
}


function getWeatherIconSvg(iconName) {
    const common = `
        viewBox="0 0 24 24"
        width="20"
        height="20"
        fill="none"
        stroke="currentColor"
        stroke-width="1.9"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
        focusable="false"
    `;

    const icons = {
        sun: `<svg ${common}>
            <circle cx="12" cy="12" r="3.5"></circle>
            <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.41M17.66 6.34l1.41-1.41"></path>
        </svg>`,
        "cloud-sun": `<svg ${common}>
            <path d="M8 7.5a4.5 4.5 0 0 1 8.36-2.32"></path>
            <path d="M16 2v2M21 7h-2M19.54 3.46l-1.42 1.42"></path>
            <path d="M7.5 19h9a3.5 3.5 0 0 0 .4-6.98A5.5 5.5 0 0 0 6.4 10.5 4.25 4.25 0 0 0 7.5 19Z"></path>
        </svg>`,
        cloud: `<svg ${common}>
            <path d="M6.5 19h10a3.5 3.5 0 0 0 .4-6.98A5.5 5.5 0 0 0 6.4 10.5 4.25 4.25 0 0 0 6.5 19Z"></path>
        </svg>`,
        fog: `<svg ${common}>
            <path d="M7 15h10a3 3 0 0 0 .34-5.98A4.8 4.8 0 0 0 8.2 7.8 3.6 3.6 0 0 0 7 15Z"></path>
            <path d="M5 18h14M7 21h10"></path>
        </svg>`,
        rain: `<svg ${common}>
            <path d="M6.5 15h10a3.5 3.5 0 0 0 .4-6.98A5.5 5.5 0 0 0 6.4 6.5 4.25 4.25 0 0 0 6.5 15Z"></path>
            <path d="M8 18l-1 2M12 18l-1 2M16 18l-1 2"></path>
        </svg>`,
        snow: `<svg ${common}>
            <path d="M6.5 14h10a3.5 3.5 0 0 0 .4-6.98A5.5 5.5 0 0 0 6.4 5.5 4.25 4.25 0 0 0 6.5 14Z"></path>
            <path d="M8 18h.01M12 20h.01M16 18h.01"></path>
        </svg>`,
        thunder: `<svg ${common}>
            <path d="M6.5 14h10a3.5 3.5 0 0 0 .4-6.98A5.5 5.5 0 0 0 6.4 5.5 4.25 4.25 0 0 0 6.5 14Z"></path>
            <path d="M13 14l-3 5h3l-1 3 4-6h-3l1-2"></path>
        </svg>`
    };

    return icons[iconName] || icons.cloud;
}

async function loadTokyoWeather() {
    const weatherButton =
        document.getElementById("weatherButton");

    const temperatureElement =
        document.getElementById("weatherTemperature");

    const weatherCondition =
        document.getElementById("weatherCondition");

    weatherButton?.classList.add("is-loading");

    if (temperatureElement) {
        temperatureElement.textContent = "--℃";
    }

    if (weatherCondition) {
        weatherCondition.textContent =
            currentLanguage === "ko" ? "날씨 확인 중" : "天気を確認中";
    }

    try {
        const currentVariables = [
            "temperature_2m",
            "apparent_temperature",
            "relative_humidity_2m",
            "weather_code",
            "wind_speed_10m"
        ].join(",");

        const url =
            "https://api.open-meteo.com/v1/forecast" +
            "?latitude=35.6762" +
            "&longitude=139.6503" +
            `&current=${currentVariables}` +
            "&timezone=Asia%2FTokyo";

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`날씨 API 오류: ${response.status}`);
        }

        const data = await response.json();
        const current = data.current;

        if (!current) {
            throw new Error("현재 날씨 데이터가 없습니다.");
        }

        lastWeatherData = {
            temperature: current.temperature_2m,
            apparentTemperature: current.apparent_temperature,
            humidity: current.relative_humidity_2m,
            weatherCode: current.weather_code,
            windSpeed: current.wind_speed_10m,
            observedAt: current.time
        };

        updateWeatherText();
    } catch (error) {
        console.error("도쿄 날씨 조회 실패:", error);

        if (weatherCondition) {
            weatherCondition.textContent =
                currentLanguage === "ko" ? "조회 실패" : "取得失敗";
        }

        showToast("toast.weatherFailed");
    } finally {
        weatherButton?.classList.remove("is-loading");
    }
}


function updateWeatherText() {
    const temperatureElement =
        document.getElementById("weatherTemperature");

    const weatherCondition =
        document.getElementById("weatherCondition");

    const weatherIcon =
        document.getElementById("weatherIcon");

    const weatherFeelsLike =
        document.getElementById("weatherFeelsLike");

    const weatherHumidity =
        document.getElementById("weatherHumidity");

    const weatherWind =
        document.getElementById("weatherWind");

    const feelsLikeLabel =
        document.getElementById("weatherFeelsLikeLabel");

    const humidityLabel =
        document.getElementById("weatherHumidityLabel");

    const windLabel =
        document.getElementById("weatherWindLabel");

    updateTokyoClock();

    if (feelsLikeLabel) {
        feelsLikeLabel.textContent =
            currentLanguage === "ko" ? "체감" : "体感";
    }

    if (humidityLabel) {
        humidityLabel.textContent =
            currentLanguage === "ko" ? "습도" : "湿度";
    }

    if (windLabel) {
        windLabel.textContent =
            currentLanguage === "ko" ? "풍속" : "風速";
    }

    if (!lastWeatherData) {
        return;
    }

    const weatherInfo =
        getWeatherInfo(lastWeatherData.weatherCode);

    const roundedTemperature =
        Math.round(lastWeatherData.temperature);

    if (temperatureElement) {
        temperatureElement.textContent = `${roundedTemperature}℃`;
    }

    if (weatherCondition) {
        weatherCondition.textContent = translate(weatherInfo.textKey);
    }

    if (weatherIcon) {
        weatherIcon.innerHTML = getWeatherIconSvg(weatherInfo.icon);
        weatherIcon.setAttribute(
            "aria-label",
            translate(weatherInfo.textKey)
        );
    }

    if (weatherFeelsLike) {
        weatherFeelsLike.textContent =
            `${Math.round(lastWeatherData.apparentTemperature)}℃`;
    }

    if (weatherHumidity) {
        weatherHumidity.textContent = `${lastWeatherData.humidity}%`;
    }

    if (weatherWind) {
        weatherWind.textContent = `${lastWeatherData.windSpeed}km/h`;
    }

    const weatherButton =
        document.getElementById("weatherButton");

    if (weatherButton) {
        const city = currentLanguage === "ko" ? "도쿄" : "東京";
        weatherButton.title =
            `${city} · ${translate(weatherInfo.textKey)} · ` +
            `${roundedTemperature}℃ · ${getTokyoTime()}`;
    }
}


/* 날씨 상세정보 닫기 */

function closeWeatherDetails() {
    const weatherButton =
        document.getElementById(
            "weatherButton"
        );

    const expandedContent =
        document.getElementById(
            "weatherExpandedContent"
        );

    weatherButton?.classList.remove("open");

    weatherButton?.setAttribute(
        "aria-expanded",
        "false"
    );

    expandedContent?.setAttribute(
        "aria-hidden",
        "true"
    );
}


/* 날씨 버튼 클릭 */

document
    .getElementById("weatherButton")
    ?.addEventListener(
        "click",
        event => {
            event.stopPropagation();

            if (!lastWeatherData) {
                loadTokyoWeather();
                return;
            }

            const weatherButton =
                event.currentTarget;

            const expandedContent =
                document.getElementById(
                    "weatherExpandedContent"
                );

            const isOpen =
                weatherButton.classList.toggle(
                    "open"
                );

            weatherButton.setAttribute(
                "aria-expanded",
                String(isOpen)
            );

            expandedContent?.setAttribute(
                "aria-hidden",
                String(!isOpen)
            );
        }
    );


/* 날씨 버튼 바깥 클릭 시 닫기 */

document.addEventListener(
    "click",
    event => {
        const weatherButton =
            document.getElementById(
                "weatherButton"
            );

        if (
            weatherButton &&
            !weatherButton.contains(
                event.target
            )
        ) {
            closeWeatherDetails();
        }
    }
);


/* ESC 키로 날씨 상세정보 닫기 */

document.addEventListener(
    "keydown",
    event => {
        if (event.key === "Escape") {
            closeWeatherDetails();
        }
    }
);



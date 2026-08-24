CHEESE MAP 정리본

파일 구조
- index.html
- css/base.css : 기본 레이아웃/헤더/사이드바
- css/map-ui.css : 지도 위 UI/장소 카드/반응형
- css/auth-profile.css : 로딩/로그인/마이페이지/다크모드 보정
- css/group-messages.css : 그룹/쪽지 UI
- css/place-panel-route.css : 장소 상세 사이드 패널/길찾기/리뷰
- js/core.js : 다국어/장소 데이터/상태/공통함수/날씨
- js/map.js : 지도/POI/검색/카테고리
- js/routes.js : 길찾기/Google Routes API (자동차·도보·대중교통)
- js/interactions.js : 좋아요/공유/지도컨트롤/레이어/다크모드
- js/account.js : 로그인/회원가입/마이페이지
- js/messages.js : 쪽지
- js/favorites-init.js : 최초 실행/즐겨찾기
- js/groups.js : 그룹
- js/reviews.js : 리뷰/장소 상세 패널

주요 수정
1. deprecated PlacesService.getDetails() 제거
2. Place(New) + fetchFields()만 사용
3. 같은 Place Details 요청이 동시에 중복 실행되지 않도록 in-flight dedupe 추가
4. 429/RESOURCE_EXHAUSTED 발생 시 quota 안내 메시지 분리
5. 기존 실행 순서를 유지하는 classic script 분할

주의
- 429 RESOURCE_EXHAUSTED 자체는 코드만으로 현재 할당량을 되살릴 수 없습니다. Google Cloud Console에서 Places API (New)의 GetPlace quota를 확인/증가하거나 일일 한도 리셋을 기다려야 합니다.
- google.maps.Marker 경고는 기능 장애가 아니며, AdvancedMarkerElement로 옮기려면 Map ID 설정과 기존 커스텀 marker icon 변환을 함께 해야 하므로 이번 정리본에서는 동작 보존을 위해 유지했습니다.

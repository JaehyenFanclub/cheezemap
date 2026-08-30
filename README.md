# 🧀 치즈맵 (Cheezemap)
<img src="https://via.placeholder.com/600x300/F4C430/ffffff?text=CHEESE+MAP" width=600; height=300 />
<br>

## ❇️ [프로젝트 개요](https://github.com/JaehyenFanclub/cheezemap)
#### 지도 위에서 장소를 찾고, 그룹으로 모아 공유하는 위치 기반 서비스
Google Maps POI와 Places API를 활용해 장소를 탐색하고, JWT·소셜 로그인으로 인증한 뒤 그룹·리뷰·메시지까지 이어지는 웹 애플리케이션입니다.

- [개발과정](#)
- [ERD]([#](https://www.erdcloud.com/d/g47ek3tiHtyLd5HNY))
- [API 명세서]([#-api-설계](https://app.notion.com/p/be6fac4c960783bb85188138d1710d4c?v=3e1fac4c9607837c83250868f457399a))
- [Convention](#)
- [그라운드 룰](#)

</br>

## 👨‍👩‍👧‍👦 팀원 소개
> GitHub 핸들 기준 초안입니다. 이름·역할·프로필 사진은 팀에서 채워 주세요.

| <div align="center">[hangw2130](https://github.com/hangw2130)</div> | <div align="center">[akaneblue](https://github.com/akaneblue)</div> | <div align="center">[jaeheon](https://github.com/)</div> | <div align="center">[Taeil](https://github.com/)</div> | <div align="center">[chatter](https://github.com/)</div> |
| :---------------------------------------------------------------------------- | :---------------------------------------------------------------------------- | :---------------------------------------------------------------------------- | :---------------------------------------------------------------------------- | :---------------------------------------------------------------------------- |
| <div align="center"><img src="https://via.placeholder.com/150" width=150 /></div> | <div align="center"><img src="https://via.placeholder.com/150" width=150 /></div> | <div align="center"><img src="https://via.placeholder.com/150" width=150 /></div> | <div align="center"><img src="https://via.placeholder.com/150" width=150 /></div> | <div align="center"><img src="https://via.placeholder.com/150" width=150 /></div> |
| <div align="center"> `인증/인가`<br>JWT 로그인<br>Google/Naver/LINE 소셜 로그인<br>`추천`<br>주변 장소 추천 로직<br>`유저`<br>마이페이지·비밀번호 변경</div> | <div align="center"> `공통`<br>저장소 운영<br>PR 리뷰·머지<br>`협업`<br>브랜치 관리</div> | <div align="center"> `프론트/지도`<br>CHEESE MAP UI<br>그룹·메시지 화면<br>`백엔드`<br>도메인 기능 연동</div> | <div align="center"> `장소`<br>장소 저장 검증<br>이름/주소 필수 처리</div> | <div align="center"> `협업`<br>(역할 작성 예정)</div> |

## 🚀 기술 스택

Category | Stack
--- | --- |
Language | ![Java](https://img.shields.io/badge/java%2017-007396?style=for-the-badge&logo=java&logoColor=white)
IDE | ![intellij-idea](https://img.shields.io/badge/intellij%20idea-000000?style=for-the-badge&logo=intellijidea&logoColor=white)
Framework | ![Spring Boot](https://img.shields.io/badge/Spring%20Boot%204.1.0-6DB33F?style=for-the-badge&logo=springboot&logoColor=white)
Build Tool | ![gradle](https://img.shields.io/badge/gradle-02303A?style=for-the-badge&logo=gradle&logoColor=white)
Database | ![MySQL](https://img.shields.io/badge/mysql-4479A1?style=for-the-badge&logo=mysql&logoColor=white)
Library | ![Spring Security](https://img.shields.io/badge/spring%20security-6DB33F?style=for-the-badge&logo=springsecurity&logoColor=white) ![JPA](https://img.shields.io/badge/JPA-6DB33F?style=for-the-badge) ![Thymeleaf](https://img.shields.io/badge/thymeleaf-005F0F?style=for-the-badge&logo=thymeleaf&logoColor=white) ![Lombok](https://img.shields.io/badge/lombok-BC3A2C?style=for-the-badge)
API | ![Swagger](https://img.shields.io/badge/springdoc%20openapi-85EA2D?style=for-the-badge&logo=swagger&logoColor=black) ![Google Maps](https://img.shields.io/badge/google%20maps-4285F4?style=for-the-badge&logo=googlemaps&logoColor=white) ![Google Places](https://img.shields.io/badge/google%20places%20api-EA4335?style=for-the-badge&logo=google&logoColor=white) ![OAuth2](https://img.shields.io/badge/oauth2-000000?style=for-the-badge)
Frontend | ![HTML5](https://img.shields.io/badge/html5-E34F26?style=for-the-badge&logo=html5&logoColor=white) ![JavaScript](https://img.shields.io/badge/javascript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
Tools | ![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=GitHub&logoColor=white) ![git](https://img.shields.io/badge/git-F05032?style=for-the-badge&logo=git&logoColor=white)

<details>
<summary><strong>📣기술 & 라이브러리 선정 이유</strong></summary>
<div markdown="1">
  <br/>
  <details>
  <summary><strong> 1️⃣ Spring Boot 4.1.0</strong></summary>
    <div markdown="1">

    1. 스타터 의존성으로 웹·보안·JPA를 빠르게 구성할 수 있습니다.
    2. 내장 서버로 별도의 WAS 없이 `Chizu` 모듈을 바로 실행할 수 있습니다.
    3. Spring Security OAuth2 Client와 JWT 필터를 함께 쓰기 좋습니다.
    4. springdoc-openapi로 Swagger UI를 바로 붙일 수 있습니다.

  </details>

  <details>
  <summary><strong> 2️⃣ MySQL</strong></summary>
    <div markdown="1">

    1. 장소·리뷰·그룹 등 관계형 데이터가 많아 RDB가 적합합니다.
    2. 로컬에서 `cheezemap_db`를 바로 띄워 개발할 수 있습니다.
    3. JPA `ddl-auto=update`로 엔티티와 스키마를 맞춰가며 개발합니다.
    4. 테스트는 H2를 런타임으로 둘 수 있게 구성해 두었습니다.

  </details>

  <details>
  <summary><strong> 3️⃣ JWT & Spring Security & OAuth2</strong></summary>
    <div markdown="1">

    1. 로컬 회원가입/로그인은 JWT 헤더 인증으로 Stateless하게 처리합니다.
    2. Google, Naver, LINE 소셜 로그인을 Spring Security OAuth2 Client로 연동합니다.
    3. 로그아웃 시 토큰 블랙리스트로 재사용을 막습니다.
    4. API와 정적 프론트(지도 화면)를 같은 서버에서 제공할 수 있습니다.

  </details>

  <details>
  <summary><strong> 4️⃣ Google Maps & Places API</strong></summary>
    <div markdown="1">

    1. 커스텀 마커 대신 Google 기본 POI를 사용해 지도 UX를 유지합니다.
    2. 카테고리별 Cloud Map ID로 음식점/카페/의료/관광/교통 POI를 필터링합니다.
    3. Places API(New)로 장소 상세·사진을 가져와 `AutoPlace`에 캐시합니다.
    4. Place ID가 바뀌는 경우 Text Search로 재조회하는 fallback이 있습니다.

  </details>

  <details>
  <summary><strong> 5️⃣ springdoc-openapi</strong></summary>
    <div markdown="1">

    1. 컨트롤러 어노테이션만으로 API 문서를 생성합니다.
    2. `/swagger-ui.html`에서 인증·장소·그룹 API를 바로 호출할 수 있습니다.
    3. 프론트와 백엔드가 같은 저장소에 있어 계약 확인이 쉽습니다.

  </details>

  <details>
  <summary><strong> 6️⃣ 정적 프론트 (HTML/JS)</strong></summary>
    <div markdown="1">

    1. Spring이 `static/`의 지도 UI를 바로 서빙합니다.
    2. 회원가입·프로필 수정 페이지를 별도 SPA 없이 제공합니다.
    3. 지도 클릭 → 장소 카드 → 그룹/리뷰 흐름을 한 화면에서 처리합니다.

  </details>

</div>
</details>
</br>

## 📁 아키텍처
```
Cheezemap/
├── Chizu/                          # Gradle Spring Boot 모듈 (여기가 실제 앱)
│   ├── build.gradle
│   ├── src/main/java/org/example/
│   │   ├── auth/                   # 소셜 로그인 (Google / Naver / LINE)
│   │   ├── user/                   # 회원가입, JWT 로그인, 마이페이지
│   │   ├── place/                  # 장소 CRUD, 선호도, 주변 추천
│   │   ├── autoPlace/              # Google Places 연동·캐시
│   │   ├── menu/                   # 장소별 메뉴·메뉴 사진
│   │   ├── group/                  # 그룹 CRUD, 공유, 복제
│   │   ├── placeGroup/             # 그룹-장소 매핑
│   │   ├── review/                 # 리뷰·사진·좋아요
│   │   ├── message/                # 1:1 메시지
│   │   ├── config/                 # Security, JWT, OpenAPI
│   │   └── exception/
│   └── src/main/resources/static/  # CHEESE MAP 지도 UI
└── uploads/                        # 리뷰/유저 이미지 저장
```

```
요청 흐름:
- 브라우저 → 정적 지도 UI (Google Maps JS)
- REST API → JWT 헤더 또는 OAuth2 콜백
- Google Places API → AutoPlace 저장 후 Place와 연결
- 추천 API → 반경 내 장소를 평점·리뷰 수·연령/성별 히트로 정렬
```

<br>

## 📊 ERD 설계
<img src="https://via.placeholder.com/800x500/ffffff/000000?text=ERD+Diagram" width="800px" />

### 테이블 구조 (엔티티 기준)
<details>
<summary><strong>상세 테이블 구조</strong></summary>

#### 👤 유저 관련
- 유저 (`users`) — 로컬/소셜 계정, 생년월일·성별
- 유저 사진 (`UserPhoto`)

#### 📍 장소 관련
- 장소 (`place`) — 좌표, 카테고리, Google Place ID, 평점 집계
- 장소 사진 (`PlacePhoto`)
- 장소 선호도 (`place_preference`) — 연령대·성별 세그먼트 hit
- 자동 수집 장소 (`autoPlace`) — Google Places 캐시
- 자동 수집 사진 (`AutoPlacePhoto`)

#### 🍽️ 메뉴 관련
- 메뉴 (`menu`)
- 메뉴 사진 (`MenuPhoto`)

#### 📁 그룹 관련
- 그룹 (`table_group`) — `group`은 SQL 예약어라 테이블명 변경
- 그룹-장소 (`PlaceGroup`)

#### ⭐ 리뷰 관련
- 리뷰 (`reviews`)
- 리뷰 사진 (`ReviewPhoto`)
- 리뷰 좋아요 (`ReviewLike`)

#### 💬 메시지 관련
- 메시지 (`Message`) — 송신/수신, 읽음, 수정 여부

</details>

<br>

## 🌐 API 설계
- Swagger UI: `http://localhost:8080/swagger-ui.html`

### 도메인 구성
```
✅ 인증/인가: 로컬 회원가입·로그인, JWT, 토큰 블랙리스트 로그아웃
✅ 소셜 로그인: Google / Naver / LINE OAuth2
✅ 장소: 등록/수정/삭제, 사진, 클릭 선호도 기록
✅ 추천: 현재 위치 반경 내 평점·리뷰·세그먼트 히트 가중 정렬
✅ Google Places: Place ID로 상세 조회·사진 프록시, 로컬 캐시
✅ 메뉴: 장소별 메뉴 CRUD 및 사진
✅ 그룹: 생성/수정/삭제, 장소 추가, 공유, 복제
✅ 리뷰: 작성/수정/삭제, 사진, 좋아요 토글
✅ 메시지: 송수신, 수정/삭제, 미읽음 개수, 닉네임 검색
✅ 유저: 마이페이지 조회/수정, 프로필 사진, 회원 탈퇴
```

<br>

##  🛠 주요 기능
```
🔐 인증: 회원가입 | JWT 로그인 | 로그아웃 | Google/Naver/LINE
👤 유저: 마이페이지 | 프로필 사진 | 비밀번호 변경 | 탈퇴
🗺️ 지도: Google 기본 POI | 카테고리 Map ID 필터 | 장소 클릭 카드
📍 장소: 등록 | 수정 | 삭제 | 사진 | 선호도(hit)
🎯 추천: 반경 검색 | 평점·리뷰·세그먼트 가중치
🍽️ 메뉴: 등록 | 수정 | 삭제 | 사진
📁 그룹: 생성 | 공유 | 복제 | 그룹에 장소 담기
⭐ 리뷰: 작성 | 사진 | 좋아요
💬 메시지: 1:1 채팅 | 미읽음 알림
```

<details>
  <summary><strong>1️⃣ JWT 인증/인가 & 소셜 로그인</strong></summary>
  <br>

- [x] 로컬 회원가입/로그인 후 JWT 발급
- [x] 요청 헤더 기반 JWT 필터
- [x] 로그아웃 시 토큰 블랙리스트
- [x] Google / Naver / LINE OAuth2
- [x] 소셜 제공자 목록 API (`/user/auth/oauth2/providers`)
</details>

<details>
  <summary><strong>2️⃣ 지도 & Google Places</strong></summary>
  <br>

- [x] Google Maps JS로 일본 리전 지도 표시
- [x] 음식점/카페/편의·의료/관광/교통 카테고리별 Map ID 전환
- [x] POI 클릭 시 Places API로 상세 조회
- [x] `AutoPlace` 캐시 및 사진 미디어 URL 프록시
</details>

<details>
  <summary><strong>3️⃣ 주변 장소 추천</strong></summary>
  <br>

- [x] Haversine 거리로 반경 내 후보 수집
- [x] 평점(베이지안 prior) + 리뷰 수 + 연령/성별 hit 가중치
- [x] 장소 클릭 시 `place_preference` hit 증가
- [x] 기본 가중치: 평점 0.2, 리뷰 0.2, hit 0.6
</details>

<details>
  <summary><strong>4️⃣ 그룹</strong></summary>
  <br>

- [x] 내 그룹 생성/조회/수정/삭제
- [x] 그룹에 장소 추가·삭제
- [x] 그룹 공유
- [x] 그룹 복제(clone)
</details>

<details>
  <summary><strong>5️⃣ 리뷰 & 메시지</strong></summary>
  <br>

- [x] 장소별 리뷰 CRUD 및 이미지 업로드
- [x] 리뷰 좋아요 토글
- [x] 사용자 간 메시지 송수신
- [x] 미읽음 개수 조회, 닉네임으로 상대 찾기
</details>

<br>

## ⭐ CI/CD
현재 저장소에는 Docker / GitHub Actions 워크플로가 없습니다. 로컬 실행 기준입니다.

<details>
  <summary><strong> 로컬 실행</strong></summary>
    <div markdown="1">
      <h3>Gradle 모듈은 루트가 아니라 <code>Chizu/</code> 입니다</h3>

      ```bash
      # 1) MySQL에 cheezemap_db 준비
      # 2) application.properties에 DB·JWT·OAuth·Google API 키 설정
      cd Chizu
      ./gradlew bootRun
      ```

      <p>✅ 앱: <code>http://localhost:8080</code></p>
      <p>✅ Swagger: <code>http://localhost:8080/swagger-ui.html</code></p>
      <p>✅ IntelliJ에서는 <code>Chizu</code> 폴더를 Gradle 프로젝트로 열어야 의존성이 잡힙니다</p>
</details>

</br>

## 🐞 Trouble Shooting

<details>
  <summary><strong>1️⃣ Gradle이 루트에서 인식되지 않음</strong></summary>
    <div markdown="1">

**문제**
- 저장소 루트 `Cheezemap`을 열면 Gradle 코끼리 아이콘이 뜨지 않음
- `build.gradle`을 열어도 자동 import가 안 됨

**원인**
- `build.gradle` / `settings.gradle` / `gradlew`가 `Chizu/` 아래에만 있음
- 루트 `.idea`는 일반 Java 모듈로만 잡혀 있음

**해결 방안**
- IntelliJ에서 `Chizu` 폴더를 Open as Project
- 또는 `Chizu/build.gradle`을 Link Gradle Project

**결과**
- ✅ Spring Boot 의존성 다운로드
- ✅ `ChizApplication` 실행 가능

</details>

<details>
  <summary><strong>2️⃣ `group` 테이블명 예약어 충돌</strong></summary>
    <div markdown="1">

**문제**
- 그룹 엔티티를 `group`으로 매핑하면 SQL 예약어와 충돌

**원인**
- MySQL에서 `GROUP`은 예약어

**해결 방안**
```java
@Table(name = "table_group")
public class Group { ... }
```

**결과**
- ✅ 그룹 CRUD 정상 동작
- ✅ 엔티티 이름 `Group`은 도메인 용어로 유지

</details>

<details>
  <summary><strong>3️⃣ Google Map ID는 지도 생성 후 변경 불가</strong></summary>
    <div markdown="1">

**문제**
- 카테고리 버튼으로 POI 필터를 바꾸려 해도 기존 지도 스타일이 안 바뀜

**원인**
- Map ID는 Google Maps 객체 생성 이후에 바꿀 수 없음

**해결 방안**
- 카테고리 클릭 시 center/zoom을 보존한 채 지도 객체를 재생성
- Cloud Console의 Map Style + Map ID 6종을 `map-style-config.js`에 설정

**결과**
- ✅ 음식점/카페/의료/관광/교통 POI만 선택 표시
- ✅ 커스텀 마커 없이 Google 기본 POI UX 유지

</details>

<details>
  <summary><strong>4️⃣ Google Place ID 만료 / 조회 실패</strong></summary>
    <div markdown="1">

**문제**
- 저장된 Place ID로 Places API를 치면 장소를 못 찾는 경우가 있음

**원인**
- Google Place ID는 변경될 수 있음
- 신버전 Places API 응답 필드가 기대와 다를 수 있음

**해결 방안**
- Place ID 조회 실패 시 장소명 기반 Text Search fallback
- 조회 결과를 `AutoPlace`에 캐시하고 `Place.googlePlaceId`와 연결

**결과**
- ✅ 지도 클릭 후 상세 정보 복구율 향상
- ✅ 사진 URL을 서버에서 프록시

</details>

<details>
  <summary><strong>5️⃣ 소셜 로그인과 JWT를 한 Security 체인에서 처리</strong></summary>
    <div markdown="1">

**문제**
- REST API는 JWT, 소셜 로그인은 세션/리다이렉트가 필요함
- 두 방식을 동시에 쓰면 필터 순서와 permitAll 범위가 꼬이기 쉬움

**원인**
- OAuth2 콜백 URL과 JWT API 경로가 한 `SecurityFilterChain`에 공존

**해결 방안**
- formLogin/httpBasic 비활성화, OAuth2 login success/failure 핸들러 연결
- JWT 필터를 `UsernamePasswordAuthenticationFilter` 앞에 배치
- 소셜 성공 후 JWT 발급·리다이렉트

**결과**
- ✅ 로컬 로그인과 소셜 로그인을 같은 유저 모델(`provider` + `provider_id`)로 수용
- ✅ 이후 API는 JWT로 통일

</details>

# 김포페이 가맹점 지도

김포시청 [가맹점 조회 게시판](https://www.gimpo.go.kr/portal/selectBbsNttList.do?bbsNo=573&key=1283)의
가맹점 정보를 수집해 지도에 표시하고, **상호명 · 주소 · 업종**으로 검색하는 웹앱입니다.

- 서버 없이 동작하는 정적 웹앱 (GitHub Pages 배포)
- 수집 · 지오코딩은 GitHub Actions가 주기적으로 수행하고 결과 JSON만 커밋
- 개발 플랜: [`docs/PLAN.md`](docs/PLAN.md)

## 빠른 시작

```bash
npm install
npm run dev            # http://localhost:5173/AI-Book/
```

저장소에는 **샘플 데이터 420건**이 들어 있어 키 발급 없이 바로 화면을 확인할 수 있습니다
(화면 하단에 "샘플 데이터" 배지가 표시됩니다).

지도를 띄우려면 [카카오 개발자센터](https://developers.kakao.com)에서 JavaScript 앱 키를 발급받아
`web/.env`에 넣고, 플랫폼 > Web에 사용할 도메인(`http://localhost:5173` 등)을 등록하세요.

```bash
cp web/.env.example web/.env   # VITE_KAKAO_JS_KEY 입력
```

키가 없어도 목록 검색·필터·상세는 그대로 동작합니다.

## 실제 데이터 수집

```bash
# 1) 게시판 수집 (첫 실행은 --full 권장)
node scraper/src/scrapeBoard.js --full

# 2) 공개데이터 병합용 수집 (경기데이터드림 무료 키)
GG_API_KEY=... node scraper/src/fetchOpenData.js

# 3) 좌표가 없는 주소만 지오코딩 (결과는 캐시에 누적)
KAKAO_REST_KEY=... node scraper/src/geocode.js

# 4) 웹앱이 읽는 merchants.json 생성
node scraper/src/buildData.js
```

`npm run all -w scraper`로 1~4를 한 번에 실행할 수 있습니다.
샘플 데이터로 되돌리려면 `node scraper/src/makeSample.js`.

### 환경변수

| 변수 | 용도 | 필수 |
|---|---|---|
| `VITE_KAKAO_JS_KEY` | 웹앱 지도 표시 (카카오 JavaScript 키) | 지도 사용 시 |
| `KAKAO_REST_KEY` | 주소 → 좌표 변환 (카카오 REST 키) | 지오코딩 시 |
| `VWORLD_KEY` | 지오코딩 2순위 (국토부 VWorld) | 선택 |
| `GG_API_KEY` | 경기데이터드림 지역화폐 가맹점 현황 API | 선택 |
| `PAGE_UNIT`, `MAX_PAGES`, `REQUEST_DELAY_MS` | 수집 속도·범위 조절 | 선택 |
| `GEOCODE_LIMIT` | 1회 실행당 신규 지오코딩 상한 | 선택 |

### 키 발급 방법

#### 1. 카카오 키 — `VITE_KAKAO_JS_KEY`, `KAKAO_REST_KEY` (필수)

앱 하나를 만들면 JavaScript 키와 REST API 키가 함께 나옵니다. 둘 다 씁니다.

1. [developers.kakao.com](https://developers.kakao.com) 접속 → 카카오 계정으로 로그인
2. 상단 **내 애플리케이션 → 애플리케이션 추가하기** → 앱 이름·사업자명 입력 후 저장
3. 생성된 앱 → **앱 키** 메뉴에 4종(네이티브 / REST API / JavaScript / Admin)이 표시됨
   - **JavaScript 키** → `VITE_KAKAO_JS_KEY` (웹앱 지도)
   - **REST API 키** → `KAKAO_REST_KEY` (주소 → 좌표 변환)
   - Admin 키는 이 프로젝트에서 쓰지 않습니다. 절대 어디에도 넣지 마세요.
4. **앱 설정 → 플랫폼 → Web 플랫폼 등록**에서 사이트 도메인을 추가합니다. 등록하지 않은
   도메인에서는 지도가 뜨지 않습니다.
   - `http://localhost:5173` (로컬 개발)
   - `https://<GitHub 사용자명>.github.io` (Pages 배포)

주소 검색(Local API)은 별도 신청 없이 REST 키로 바로 호출됩니다. 무료 호출 한도는
개발자센터 문서의 쿼터 안내에서 확인하세요.

#### 2. 경기데이터드림 키 — `GG_API_KEY` (권장)

지역화폐 가맹점 현황 데이터에 위경도가 들어 있어 지오코딩 호출을 크게 줄여 줍니다.

1. [data.gg.go.kr](https://data.gg.go.kr) 회원가입 후 로그인
2. **오픈API** 메뉴에서 「지역화폐 가맹점 현황」 검색 → 상세 페이지에서 **활용신청**
3. **마이페이지 → 인증키**에서 발급된 키를 복사 (계정당 1개, 대부분 즉시 발급)

공공데이터포털을 쓸 수도 있습니다. [data.go.kr](https://www.data.go.kr)에서
「경기도_지역화폐 가맹점 현황」 또는 「전국지역화폐가맹점표준데이터」를 활용신청한 뒤
**마이페이지 → 오픈API → 인증키**의 일반 인증키를 사용하면 됩니다. 이때는
`scraper/src/config.js`의 `OPENDATA.endpoint`와 응답 필드명을 그쪽 규격에 맞춰야 합니다.

#### 3. VWorld 키 — `VWORLD_KEY` (선택)

카카오 지오코딩이 실패한 주소를 한 번 더 시도하는 2순위 경로입니다.

1. [vworld.kr](https://www.vworld.kr) 회원가입 후 로그인
2. **오픈API → 인증키 발급**에서 지오코더 API를 선택
3. 활용 URL(도메인)을 반드시 입력해야 발급됩니다. 서버에서만 쓸 경우
   `http://localhost` 등으로 등록해도 동작합니다.

### 키 넣는 위치

로컬 개발:

```bash
cp web/.env.example web/.env      # VITE_KAKAO_JS_KEY 입력
export KAKAO_REST_KEY=...         # 스크래퍼용 (셸 환경변수)
export GG_API_KEY=...
```

GitHub Actions: 저장소 **Settings → Secrets and variables → Actions → New repository secret**
에서 아래 이름으로 등록합니다. 워크플로가 이 이름을 그대로 참조합니다.

| Secret 이름 | 값 |
|---|---|
| `KAKAO_JS_KEY` | 카카오 JavaScript 키 |
| `KAKAO_REST_KEY` | 카카오 REST API 키 |
| `GG_API_KEY` | 경기데이터드림 인증키 |
| `VWORLD_KEY` | VWorld 인증키 (선택) |

배포는 **Settings → Pages → Source**를 `GitHub Actions`로 바꿔 두어야 동작합니다.

> JavaScript 키는 브라우저에 그대로 노출되는 것이 정상입니다. 도메인 등록으로 보호되므로
> `.env`에 넣고 빌드해도 됩니다. 반면 **REST 키와 인증키는 서버·CI에서만** 쓰고 프론트엔드
> 코드나 커밋에 넣지 마세요.

## 구조

```
scraper/
  src/scrapeBoard.js     게시판 목록 수집 (증분 / --full 풀 스캔 / --debug HTML 덤프)
  src/fetchOpenData.js   경기데이터드림 지역화폐 가맹점 현황 수집
  src/geocode.js         주소 → 좌표 (카카오 → VWorld → 동 단위 근사)
  src/buildData.js       두 출처 병합 + 캐시 적용 → merchants.json
  src/makeSample.js      데모용 샘플 데이터 생성
  data/raw/              수집 원본 (board.json, opendata.json)
  data/cache/            지오코딩 캐시 — 커밋해서 재사용
web/
  src/lib/search.ts      상호명·주소·업종 통합 검색 (초성 검색 포함)
  src/components/        지도 · 검색바 · 결과목록 · 상세
  public/data/           merchants.json (파이프라인 산출물)
.github/workflows/
  refresh-data.yml       주 1회 데이터 갱신 후 변경분만 커밋
  deploy.yml             main 푸시 시 GitHub Pages 배포
```

## 검색 동작

- 검색창 하나로 **상호명 · 주소 · 업종**을 동시에 매칭합니다.
- 여러 단어를 넣으면 모두 걸리는 곳만 남습니다. (`구래동 카페`)
- 초성만 입력해도 찾습니다. (`ㅎㅂ` → 행복마트)
- `상호명` / `주소` 버튼으로 검색 범위를 좁힐 수 있습니다.
- 검색어·필터·선택 항목은 URL에 반영되어 링크로 공유할 수 있습니다.

## 알려진 제약

- **게시판 파서는 실제 응답으로 아직 검증하지 못했습니다.** 개발 환경에서 `gimpo.go.kr`
  접근이 차단되어 있어 표 구조를 눈으로 확인할 수 없었습니다. 첫 실행 시
  `node scraper/src/scrapeBoard.js --debug`로 `scraper/data/raw/page1.html`을 남기고,
  결과가 비어 있으면 `scraper/src/lib/parseBoard.js`의 셀렉터를 맞춰 주세요.
  파서는 헤더명(상호명/주소/업종) → 주소 패턴 → 셀 위치 순으로 물러서도록 만들어 두었습니다.
- 게시판 등록 건수가 1만 건 규모로 추정되어 첫 수집과 첫 지오코딩은 시간이 걸립니다.
- 지번 좌표를 찾지 못한 주소는 동 중심 좌표로 표시하고 목록에 "위치 근사" 배지를 답니다.

## 데이터 출처

- 김포시청 가맹점 조회 게시판 (bbsNo=573)
- 경기데이터드림 「지역화폐 가맹점 현황」 / 공공데이터포털 「경기도_지역화폐 가맹점 현황」

수집 시 요청 간 지연을 두고 User-Agent를 명시합니다. 실제 운영 전에 대상 사이트의
robots.txt와 이용약관을 확인하세요.

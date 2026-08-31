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

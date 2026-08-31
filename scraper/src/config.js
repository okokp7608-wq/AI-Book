// 수집 파이프라인 설정. 대부분 환경변수로 덮어쓸 수 있다.
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(here, '..');
export const DATA_DIR = path.join(ROOT, 'data');

export const PATHS = {
  boardRaw: path.join(DATA_DIR, 'raw', 'board.json'),
  openDataRaw: path.join(DATA_DIR, 'raw', 'opendata.json'),
  geocodeCache: path.join(DATA_DIR, 'cache', 'geocode.json'),
  output: path.resolve(ROOT, '..', 'web', 'public', 'data', 'merchants.json'),
};

export const BOARD = {
  origin: process.env.GIMPO_ORIGIN ?? 'https://www.gimpo.go.kr',
  listPath: '/portal/selectBbsNttList.do',
  viewPath: '/portal/selectBbsNttView.do',
  bbsNo: '573',
  key: '1283',
  // 한 페이지에 몇 건을 요청할지. 서버가 무시하면 자동으로 실제 값에 맞춰진다.
  pageUnit: Number(process.env.PAGE_UNIT ?? 100),
  // 0이면 제한 없음(끝까지). 개발 중에는 작은 값으로 제한해 쓴다.
  maxPages: Number(process.env.MAX_PAGES ?? 0),
  requestDelayMs: Number(process.env.REQUEST_DELAY_MS ?? 400),
  maxRetries: 4,
  userAgent:
    process.env.USER_AGENT ??
    'gimpo-pay-map/0.1 (open-source merchant map; contact via GitHub issues)',
};

// 경기데이터드림 지역화폐 가맹점 현황 오픈 API.
// 서비스명이 바뀔 수 있으므로 환경변수로 교체 가능하게 둔다.
export const OPENDATA = {
  endpoint:
    process.env.GG_API_ENDPOINT ?? 'https://openapi.gg.go.kr/RegionMnyFacltStus',
  key: process.env.GG_API_KEY ?? '',
  sigun: process.env.GG_SIGUN ?? '김포시',
  pageSize: 1000,
  maxPages: Number(process.env.GG_MAX_PAGES ?? 100),
};

export const GEOCODE = {
  kakaoRestKey: process.env.KAKAO_REST_KEY ?? '',
  vworldKey: process.env.VWORLD_KEY ?? '',
  delayMs: Number(process.env.GEOCODE_DELAY_MS ?? 60),
  // 한 번의 실행에서 새로 지오코딩할 최대 건수(쿼터 보호). 0이면 제한 없음.
  limit: Number(process.env.GEOCODE_LIMIT ?? 0),
};

// 김포시 대략 경계. 지오코딩 결과가 이 밖이면 잘못된 매칭으로 본다.
export const GIMPO_BBOX = { minLat: 37.55, maxLat: 37.83, minLng: 126.4, maxLng: 126.83 };

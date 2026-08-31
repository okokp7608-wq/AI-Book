import { GEOCODE, GIMPO_BBOX } from '../config.js';
import { fetchJson } from './http.js';

const inGimpo = (lat, lng) =>
  lat >= GIMPO_BBOX.minLat &&
  lat <= GIMPO_BBOX.maxLat &&
  lng >= GIMPO_BBOX.minLng &&
  lng <= GIMPO_BBOX.maxLng;

async function kakaoAddress(query) {
  const url = `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(query)}`;
  const data = await fetchJson(url, {
    headers: { Authorization: `KakaoAK ${GEOCODE.kakaoRestKey}` },
  });
  const doc = data.documents?.[0];
  if (!doc) return undefined;
  return { lat: Number(doc.y), lng: Number(doc.x), provider: 'kakao-address' };
}

async function kakaoKeyword(query) {
  const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&size=1`;
  const data = await fetchJson(url, {
    headers: { Authorization: `KakaoAK ${GEOCODE.kakaoRestKey}` },
  });
  const doc = data.documents?.[0];
  if (!doc) return undefined;
  return { lat: Number(doc.y), lng: Number(doc.x), provider: 'kakao-keyword' };
}

async function vworld(query) {
  const base = 'https://api.vworld.kr/req/address';
  for (const type of ['ROAD', 'PARCEL']) {
    const q = new URLSearchParams({
      service: 'address',
      request: 'getcoord',
      version: '2.0',
      crs: 'EPSG:4326',
      format: 'json',
      type,
      address: query,
      key: GEOCODE.vworldKey,
    });
    const data = await fetchJson(`${base}?${q}`);
    const point = data?.response?.result?.point;
    if (point) return { lat: Number(point.y), lng: Number(point.x), provider: `vworld-${type}` };
  }
  return undefined;
}

/**
 * 주소 → 좌표. 도로명/지번 조회에 실패하면 호출자가 동 단위 근사 주소로 재시도한다.
 * 김포시 경계를 벗어난 결과는 오매칭으로 보고 버린다.
 */
export async function geocode(query, { allowKeyword = false } = {}) {
  const providers = [];
  if (GEOCODE.kakaoRestKey) providers.push(kakaoAddress);
  if (GEOCODE.vworldKey) providers.push(vworld);
  if (allowKeyword && GEOCODE.kakaoRestKey) providers.push(kakaoKeyword);

  for (const provider of providers) {
    try {
      const hit = await provider(query);
      if (hit && Number.isFinite(hit.lat) && inGimpo(hit.lat, hit.lng)) return hit;
    } catch (err) {
      console.warn(`지오코딩 실패(${provider.name}) ${query}: ${err.message}`);
    }
  }
  return undefined;
}

export const hasGeocoder = () => Boolean(GEOCODE.kakaoRestKey || GEOCODE.vworldKey);

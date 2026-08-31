import { addressKey, nameKey, toAreaAddress, extractAddress } from './address.js';

const strongKey = (m) => `${nameKey(m.name)}|${addressKey(m.address)}`;
const weakKey = (m) => `${nameKey(m.name)}|${addressKey(toAreaAddress(m.address))}`;

/**
 * 게시판 수집분과 공개데이터를 하나의 목록으로 합친다.
 * - 게시판을 기준으로 삼고(원천 요구사항), 공개데이터로 좌표·업종·정제주소를 보강한다.
 * - 게시판에 없고 공개데이터에만 있는 가맹점도 함께 싣는다.
 */
export function mergeSources(boardMerchants, openDataMerchants) {
  const byStrong = new Map();
  const byWeak = new Map();
  for (const m of openDataMerchants) {
    if (!m.name) continue;
    byStrong.set(strongKey(m), m);
    const wk = weakKey(m);
    if (!byWeak.has(wk)) byWeak.set(wk, m);
  }

  const used = new Set();
  const result = [];

  for (const b of boardMerchants) {
    if (!b.name) continue;
    const address = b.address ?? extractAddress(b.rawText);
    const candidate = { ...b, address };
    const match = byStrong.get(strongKey(candidate)) ?? byWeak.get(weakKey(candidate));
    if (match) used.add(strongKey(match));

    result.push({
      id: `b${b.id}`,
      name: b.name,
      category: b.category ?? match?.category,
      address: address ?? match?.address,
      roadAddress: match?.roadAddress,
      jibunAddress: match?.jibunAddress,
      tel: b.tel ?? match?.tel,
      lat: match?.lat,
      lng: match?.lng,
      geocodeStatus: match?.lat !== undefined ? 'ok' : 'pending',
      sourceUrl: b.sourceUrl,
      sources: match ? ['board', 'opendata'] : ['board'],
    });
  }

  const seen = new Set(result.map(strongKey));
  for (const m of openDataMerchants) {
    const sk = strongKey(m);
    if (used.has(sk) || seen.has(sk)) continue;
    seen.add(sk);
    result.push({
      id: m.id,
      name: m.name,
      category: m.category,
      address: m.address,
      roadAddress: m.roadAddress,
      jibunAddress: m.jibunAddress,
      tel: m.tel,
      lat: m.lat,
      lng: m.lng,
      geocodeStatus: m.lat !== undefined ? 'ok' : 'pending',
      sources: ['opendata'],
    });
  }

  return result;
}

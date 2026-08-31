// 좌표가 없는 가맹점 주소를 지오코딩하고 결과를 캐시에 쌓는다.
// 캐시는 저장소에 커밋되므로 다음 실행에서는 신규분만 호출한다.
//   KAKAO_REST_KEY=... node src/geocode.js
import { GEOCODE, PATHS } from './config.js';
import { addressKey, toAreaAddress } from './lib/address.js';
import { geocode, hasGeocoder } from './lib/geocoder.js';
import { loadMerged } from './lib/sources.js';
import { readJson, writeJson, sleep } from './lib/store.js';

async function main() {
  const { merchants } = await loadMerged();
  const cache = await readJson(PATHS.geocodeCache, {});

  const pending = [];
  const seen = new Set();
  for (const m of merchants) {
    if (m.lat !== undefined) continue;
    const key = addressKey(m.address);
    if (!key || cache[key] || seen.has(key)) continue;
    seen.add(key);
    pending.push({ key, address: m.address });
  }

  console.log(`전체 ${merchants.length}건 · 캐시 ${Object.keys(cache).length}건 · 조회 대상 ${pending.length}건`);
  if (pending.length === 0) return;
  if (!hasGeocoder()) {
    console.warn('KAKAO_REST_KEY 또는 VWORLD_KEY가 없어 지오코딩을 건너뛴다.');
    return;
  }

  const limit = GEOCODE.limit > 0 ? Math.min(GEOCODE.limit, pending.length) : pending.length;
  let ok = 0;
  let approx = 0;
  let failed = 0;

  for (let i = 0; i < limit; i += 1) {
    const { key, address } = pending[i];
    let hit = await geocode(address);
    let status = 'ok';

    if (!hit) {
      const area = toAreaAddress(address);
      if (area) {
        hit = await geocode(area);
        if (hit) status = 'approx';
      }
    }

    if (hit) {
      cache[key] = { lat: hit.lat, lng: hit.lng, provider: hit.provider, status, at: new Date().toISOString() };
      status === 'ok' ? (ok += 1) : (approx += 1);
    } else {
      cache[key] = { status: 'failed', at: new Date().toISOString() };
      failed += 1;
    }

    if ((i + 1) % 100 === 0 || i + 1 === limit) {
      console.log(`${i + 1}/${limit} · 성공 ${ok} 근사 ${approx} 실패 ${failed}`);
      await writeJson(PATHS.geocodeCache, cache); // 중간 저장으로 중단에 대비
    }
    await sleep(GEOCODE.delayMs);
  }

  await writeJson(PATHS.geocodeCache, cache);
  console.log(`캐시 저장 완료 → ${PATHS.geocodeCache}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

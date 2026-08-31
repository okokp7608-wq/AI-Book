// 병합 결과 + 지오코딩 캐시 → 웹앱이 읽는 merchants.json 생성.
// 1만 건 규모를 브라우저가 빠르게 받도록 컬럼 순서를 고정한 배열 형태로 내보낸다.
import { PATHS } from './config.js';
import { addressKey } from './lib/address.js';
import { loadMerged } from './lib/sources.js';
import { readJson, writeJson } from './lib/store.js';
import { FIELDS } from './lib/schema.js';

const round6 = (n) => (n === undefined ? null : Math.round(n * 1e6) / 1e6);

async function main() {
  const { merchants, boardScrapedAt, openDataFetchedAt } = await loadMerged();
  const cache = await readJson(PATHS.geocodeCache, {});

  const categories = [];
  const categoryIndex = new Map();
  const categoryId = (name) => {
    if (!name) return -1;
    if (!categoryIndex.has(name)) {
      categoryIndex.set(name, categories.length);
      categories.push(name);
    }
    return categoryIndex.get(name);
  };

  let ok = 0;
  let approx = 0;
  let missing = 0;

  const rows = merchants.map((m) => {
    let { lat, lng } = m;
    let status = m.lat !== undefined ? 'ok' : 'missing';

    if (lat === undefined) {
      const cached = cache[addressKey(m.address)];
      if (cached?.lat !== undefined) {
        lat = cached.lat;
        lng = cached.lng;
        status = cached.status === 'approx' ? 'approx' : 'ok';
      }
    }

    if (status === 'ok') ok += 1;
    else if (status === 'approx') approx += 1;
    else missing += 1;

    return [
      m.id,
      m.name,
      categoryId(m.category),
      m.roadAddress ?? m.address ?? '',
      m.tel ?? '',
      round6(lat),
      round6(lng),
      status,
      m.sourceUrl ?? '',
    ];
  });

  const payload = {
    meta: {
      generatedAt: new Date().toISOString(),
      boardScrapedAt,
      openDataFetchedAt,
      count: rows.length,
      located: ok,
      approximate: approx,
      unlocated: missing,
      attribution: '출처: 김포시청 가맹점 조회 게시판, 경기데이터드림 지역화폐 가맹점 현황',
    },
    fields: FIELDS,
    categories,
    rows,
  };

  await writeJson(PATHS.output, payload);
  console.log(
    `merchants.json 생성: 총 ${rows.length}건 (좌표 ${ok} · 근사 ${approx} · 미확인 ${missing}) → ${PATHS.output}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

// 경기데이터드림 「지역화폐 가맹점 현황」 오픈 API에서 김포시 가맹점을 받아온다.
// 이 데이터에는 정제 주소와 위경도가 들어 있어 지오코딩 부담을 크게 줄여 준다.
//   GG_API_KEY=... node src/fetchOpenData.js
import { OPENDATA, PATHS, GIMPO_BBOX } from './config.js';
import { fetchJson } from './lib/http.js';
import { extractTel } from './lib/address.js';
import { readJson, writeJson, sleep } from './lib/store.js';

/** openapi.gg.go.kr 응답에서 head/row를 꺼낸다. 서비스명이 달라도 동작한다. */
function unwrap(payload) {
  const serviceKey = Object.keys(payload).find((k) => Array.isArray(payload[k]));
  if (!serviceKey) {
    const message = JSON.stringify(payload).slice(0, 300);
    throw new Error(`예상과 다른 응답: ${message}`);
  }
  const blocks = payload[serviceKey];
  const head = blocks.find((b) => b.head)?.head ?? [];
  const rows = blocks.find((b) => b.row)?.row ?? [];
  const total = head.find((h) => h.list_total_count)?.list_total_count;
  const result = head.find((h) => h.RESULT)?.RESULT;
  return { rows, total, result };
}

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n !== 0 ? n : undefined;
};

function toMerchant(row, index) {
  const road = row.REFINE_ROADNM_ADDR?.trim() || undefined;
  const jibun = row.REFINE_LOTNO_ADDR?.trim() || undefined;
  const lat = num(row.REFINE_WGS84_LAT);
  const lng = num(row.REFINE_WGS84_LOGT);
  const inBounds =
    lat !== undefined &&
    lng !== undefined &&
    lat >= GIMPO_BBOX.minLat &&
    lat <= GIMPO_BBOX.maxLat &&
    lng >= GIMPO_BBOX.minLng &&
    lng <= GIMPO_BBOX.maxLng;

  return {
    id: `gg-${index}`,
    name: (row.CMPNM_NM ?? '').trim(),
    category: row.INDUTYPE_NM?.trim() || undefined,
    address: road ?? jibun,
    roadAddress: road,
    jibunAddress: jibun,
    tel: extractTel(row.TELNO ?? row.TELNO_INFO),
    lat: inBounds ? lat : undefined,
    lng: inBounds ? lng : undefined,
    source: 'opendata',
  };
}

async function main() {
  if (!OPENDATA.key) {
    console.warn(
      'GG_API_KEY가 없어 공개데이터 수집을 건너뛴다. (data.gg.go.kr에서 무료 발급)',
    );
    // 키가 없어도 파이프라인이 멈추지 않도록 빈 결과를 남긴다.
    const prev = await readJson(PATHS.openDataRaw, null);
    if (!prev) await writeJson(PATHS.openDataRaw, { fetchedAt: null, count: 0, merchants: [] });
    return;
  }

  const merchants = [];
  for (let page = 1; page <= OPENDATA.maxPages; page += 1) {
    const q = new URLSearchParams({
      KEY: OPENDATA.key,
      Type: 'json',
      pIndex: String(page),
      pSize: String(OPENDATA.pageSize),
      SIGUN_NM: OPENDATA.sigun,
    });
    const payload = await fetchJson(`${OPENDATA.endpoint}?${q}`);
    const { rows, total, result } = unwrap(payload);
    if (result && result.CODE && !/INFO-000/.test(result.CODE)) {
      throw new Error(`API 오류 ${result.CODE}: ${result.MESSAGE ?? ''}`);
    }
    if (rows.length === 0) break;

    rows
      .filter((r) => !r.SIGUN_NM || r.SIGUN_NM.includes('김포'))
      .forEach((r, i) => {
        const m = toMerchant(r, (page - 1) * OPENDATA.pageSize + i);
        if (m.name) merchants.push(m);
      });

    console.log(`page ${page}: ${rows.length}건 · 누적 ${merchants.length}${total ? ` / 전체 ${total}` : ''}`);
    if (total && page * OPENDATA.pageSize >= Number(total)) break;
    await sleep(200);
  }

  const withCoords = merchants.filter((m) => m.lat !== undefined).length;
  await writeJson(PATHS.openDataRaw, {
    fetchedAt: new Date().toISOString(),
    count: merchants.length,
    withCoords,
    merchants,
  });
  console.log(`저장 완료: ${merchants.length}건(좌표 ${withCoords}건) → ${PATHS.openDataRaw}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

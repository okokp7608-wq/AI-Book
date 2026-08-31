// 김포시청 "가맹점 조회" 게시판(bbsNo=573) 수집기.
//   node src/scrapeBoard.js            증분 수집(기존 데이터에 없는 건만)
//   node src/scrapeBoard.js --full     전체 페이지 풀 스캔
//   node src/scrapeBoard.js --debug    첫 페이지 HTML을 data/raw/page1.html에 저장
import fs from 'node:fs/promises';
import path from 'node:path';
import { BOARD, PATHS } from './config.js';
import { fetchHtml } from './lib/http.js';
import { parseListPage, parseTotals } from './lib/parseBoard.js';
import { readJson, writeJson, sleep } from './lib/store.js';

const args = new Set(process.argv.slice(2));
const FULL = args.has('--full');
const DEBUG = args.has('--debug');

function listUrl(pageIndex, pageUnit) {
  const q = new URLSearchParams({
    bbsNo: BOARD.bbsNo,
    key: BOARD.key,
    pageIndex: String(pageIndex),
    pageUnit: String(pageUnit),
    searchCnd: 'all',
    searchKrwd: '',
  });
  return `${BOARD.origin}${BOARD.listPath}?${q}`;
}

async function main() {
  const existing = await readJson(PATHS.boardRaw, { merchants: [], scrapedAt: null });
  const known = new Map(existing.merchants.map((m) => [m.id, m]));
  console.log(`기존 데이터 ${known.size}건 · 모드 ${FULL ? '풀 스캔' : '증분'}`);

  const collected = new Map();
  let consecutiveKnownPages = 0;
  let pageUnit = BOARD.pageUnit;
  let totalKnown;

  for (let page = 1; BOARD.maxPages === 0 || page <= BOARD.maxPages; page += 1) {
    const url = listUrl(page, pageUnit);
    let html;
    try {
      html = await fetchHtml(url, { retries: BOARD.maxRetries, userAgent: BOARD.userAgent });
    } catch (err) {
      console.error(`page ${page} 실패: ${err.message}`);
      break;
    }

    if (DEBUG && page === 1) {
      await fs.mkdir(path.dirname(PATHS.boardRaw), { recursive: true });
      await fs.writeFile(path.join(path.dirname(PATHS.boardRaw), 'page1.html'), html, 'utf8');
      console.log('첫 페이지 HTML을 data/raw/page1.html에 저장했다.');
    }

    if (page === 1) {
      const { total, lastPage } = parseTotals(html);
      totalKnown = total;
      console.log(`전체 ${total ?? '?'}건 · 마지막 페이지 링크 ${lastPage ?? '?'}`);
    }

    const rows = parseListPage(html, { pageIndex: page, sourceUrl: url });
    if (rows.length === 0) {
      console.log(`page ${page}: 행 없음 → 종료`);
      break;
    }
    // 서버가 pageUnit을 무시하면 실제 반환 건수에 맞춘다.
    if (page === 1 && rows.length !== pageUnit) {
      console.log(`pageUnit ${pageUnit} 요청 → 실제 ${rows.length}건 반환`);
      pageUnit = rows.length;
    }

    let fresh = 0;
    for (const row of rows) {
      if (!collected.has(row.id)) collected.set(row.id, row);
      if (!known.has(row.id)) fresh += 1;
    }

    if (!FULL) {
      consecutiveKnownPages = fresh === 0 ? consecutiveKnownPages + 1 : 0;
      if (consecutiveKnownPages >= 2) {
        console.log(`page ${page}: 신규 없음 2페이지 연속 → 증분 수집 종료`);
        break;
      }
    }

    if (page % 10 === 0 || fresh > 0) {
      console.log(`page ${page}: ${rows.length}건 (신규 ${fresh}) · 누적 ${collected.size}`);
    }
    if (totalKnown && collected.size >= totalKnown) {
      console.log('전체 건수에 도달 → 종료');
      break;
    }
    await sleep(BOARD.requestDelayMs);
  }

  // 증분 모드에서는 기존 데이터를 유지한 채 덮어쓴다.
  const merged = FULL ? new Map() : new Map(known);
  for (const [id, m] of collected) merged.set(id, m);

  await writeJson(PATHS.boardRaw, {
    scrapedAt: new Date().toISOString(),
    mode: FULL ? 'full' : 'incremental',
    count: merged.size,
    merchants: [...merged.values()],
  });
  console.log(`저장 완료: ${merged.size}건 → ${PATHS.boardRaw}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

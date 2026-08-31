import * as cheerio from 'cheerio';
import { extractAddress, extractTel, looksLikeAddress } from './address.js';

const HEADER_PATTERNS = {
  name: /상호|업체|가맹점|점포|제목|업소/,
  address: /주소|소재지|위치|도로명|지번/,
  category: /업종|분류|카테고리|종목/,
  tel: /전화|연락처|번호(?!.*순)/,
  date: /등록일|일자|날짜/,
};

const cellText = (el, $) =>
  $(el)
    .text()
    .replace(/ /g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

function mapHeaders($, table) {
  const headers = $(table).find('th');
  const map = {};
  headers.each((i, th) => {
    const text = cellText(th, $);
    for (const [field, re] of Object.entries(HEADER_PATTERNS)) {
      if (map[field] === undefined && re.test(text)) map[field] = i;
    }
  });
  return map;
}

// bbsNo 같은 다른 파라미터에 걸리지 않도록 파라미터 경계를 맞춰 본다.
const NTT_PARAM = /[?&](nttNo|nttSn|ntt_no|nttId|no)=(\d+)/i;

function rowLink($, row) {
  const href = $(row).find('a[href]').attr('href');
  return href && href !== '#' ? href : undefined;
}

function idFromRow($, row, fallback) {
  const href = rowLink($, row) ?? '';
  const hit = NTT_PARAM.exec(href);
  if (hit) return hit[2];
  const onclick = $(row).find('[onclick]').attr('onclick') ?? '';
  const hit2 = /(\d{4,})/.exec(onclick);
  if (hit2) return hit2[1];
  return fallback;
}

/**
 * 게시판 목록 HTML에서 가맹점 행을 뽑는다.
 * 지자체 CMS 표 구조가 바뀌어도 버티도록 헤더명 → 주소 패턴 → 위치 순으로 물러선다.
 */
export function parseListPage(html, { pageIndex = 1, sourceUrl = '' } = {}) {
  const $ = cheerio.load(html);

  // 행이 가장 많은 표를 본문 목록으로 본다.
  let table = null;
  let best = 0;
  $('table').each((_, t) => {
    const rows = $(t).find('tbody tr').length || $(t).find('tr').length;
    if (rows > best) {
      best = rows;
      table = t;
    }
  });
  if (!table || best === 0) return [];

  const headerMap = mapHeaders($, table);
  const rows = $(table).find('tbody tr').toArray();
  const target = rows.length ? rows : $(table).find('tr').toArray();

  const merchants = [];
  const seen = new Set();
  target.forEach((row, rowIndex) => {
    const cells = $(row).find('td').toArray();
    if (cells.length === 0) return; // 헤더 행
    const texts = cells.map((c) => cellText(c, $));
    const rowText = texts.join(' ');

    let address =
      (headerMap.address !== undefined ? texts[headerMap.address] : undefined) ||
      texts.find((t) => looksLikeAddress(t));
    address = extractAddress(address ?? rowText) ?? address;

    let name = headerMap.name !== undefined ? texts[headerMap.name] : undefined;
    if (!name) {
      name = texts.find(
        (t) => t && t !== address && !/^\d+$/.test(t) && !/^\d{4}[-.]\d{2}/.test(t) && !looksLikeAddress(t),
      );
    }
    if (!name) return;

    const category =
      headerMap.category !== undefined ? texts[headerMap.category] || undefined : undefined;
    const tel =
      (headerMap.tel !== undefined ? extractTel(texts[headerMap.tel]) : undefined) ??
      extractTel(rowText);

    let id = String(idFromRow($, row, `p${pageIndex}-r${rowIndex}`));
    if (seen.has(id)) id = `${id}-${rowIndex}`; // 같은 페이지 내 충돌 방지
    seen.add(id);

    const href = rowLink($, row);
    const detailUrl = href && sourceUrl ? new URL(href, sourceUrl).toString() : sourceUrl;

    merchants.push({
      id,
      name: name.trim(),
      category: category?.trim() || undefined,
      address: address?.trim() || undefined,
      tel,
      sourceUrl: detailUrl,
      source: 'board',
    });
  });
  return merchants;
}

/** "총 12,345건" 또는 마지막 페이지 링크에서 전체 규모를 읽는다. */
export function parseTotals(html) {
  const $ = cheerio.load(html);
  const bodyText = $('body').text().replace(/\s+/g, ' ');
  const totalHit = /총\s*([\d,]+)\s*(?:건|개)/.exec(bodyText);
  const total = totalHit ? Number(totalHit[1].replace(/,/g, '')) : undefined;

  let lastPage;
  $('a[href]').each((_, a) => {
    const hit = /pageIndex=(\d+)/.exec($(a).attr('href') ?? '');
    if (hit) {
      const n = Number(hit[1]);
      if (!lastPage || n > lastPage) lastPage = n;
    }
  });
  return { total, lastPage };
}

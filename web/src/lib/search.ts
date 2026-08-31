import type { Merchant } from '../types';

const CHOSEONG = [
  'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ',
  'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
];
const CHOSEONG_SET = new Set(CHOSEONG);
const HANGUL_BASE = 0xac00;
const HANGUL_LAST = 0xd7a3;

/** "김포페이" → "ㄱㅍㅍㅇ". 한글이 아닌 글자는 그대로 둔다. */
export function toChoseong(text: string): string {
  let out = '';
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    if (code >= HANGUL_BASE && code <= HANGUL_LAST) {
      out += CHOSEONG[Math.floor((code - HANGUL_BASE) / 588)];
    } else {
      out += ch;
    }
  }
  return out;
}

/** 검색어가 초성만으로 이루어졌는지. ("ㄱㅍㅍㅇ") */
export function isChoseongQuery(query: string): boolean {
  if (!query) return false;
  return [...query].every((ch) => CHOSEONG_SET.has(ch));
}

/** 공백·문장부호·대소문자 차이를 없앤다. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\s'"·・.,\-_()[\]{}!?~/\\]/g, '');
}

export type SearchMode = 'all' | 'name' | 'address';

export type IndexEntry = {
  merchant: Merchant;
  name: string;
  nameCho: string;
  address: string;
  addressCho: string;
  category: string;
  categoryCho: string;
};

export function buildIndex(merchants: Merchant[]): IndexEntry[] {
  return merchants.map((merchant) => {
    const name = normalize(merchant.name);
    const address = normalize(merchant.address);
    const category = normalize(merchant.category ?? '');
    return {
      merchant,
      name,
      nameCho: toChoseong(name),
      address,
      addressCho: toChoseong(address),
      category,
      categoryCho: toChoseong(category),
    };
  });
}

// 상호명 일치가 주소 일치보다 항상 앞서도록 점수 폭을 벌려 둔다.
function scoreField(haystack: string, cho: string, token: string, choMode: boolean): number {
  if (!haystack) return 0;
  if (!choMode) {
    if (haystack === token) return 100;
    if (haystack.startsWith(token)) return 80;
    if (haystack.includes(token)) return 60;
  }
  // 초성 검색은 순수 초성 질의일 때만 켠다 ("ㄱㅍ"가 일반 글자와 섞이지 않도록).
  if (choMode) {
    if (cho.startsWith(token)) return 55;
    if (cho.includes(token)) return 45;
  }
  return 0;
}

export type SearchResult = { merchant: Merchant; score: number };

/**
 * 상호명·주소 통합 검색.
 * 여러 단어를 입력하면 모든 단어가 걸리는 항목만 남긴다. ("구래동 카페")
 */
export function search(
  index: IndexEntry[],
  rawQuery: string,
  mode: SearchMode = 'all',
): SearchResult[] {
  const tokens = rawQuery.trim().split(/\s+/).filter(Boolean).map((t) => normalize(t));
  if (tokens.length === 0) return index.map((e) => ({ merchant: e.merchant, score: 0 }));

  const results: SearchResult[] = [];
  for (const entry of index) {
    let total = 0;
    let matchedAll = true;

    for (const token of tokens) {
      const choMode = isChoseongQuery(token);
      const nameScore =
        mode === 'address' ? 0 : scoreField(entry.name, entry.nameCho, token, choMode);
      const addressScore =
        mode === 'name' ? 0 : scoreField(entry.address, entry.addressCho, token, choMode) * 0.4;
      // 통합 검색에서는 업종도 함께 본다. ("구래동 카페")
      const categoryScore =
        mode === 'all' ? scoreField(entry.category, entry.categoryCho, token, choMode) * 0.5 : 0;
      const best = Math.max(nameScore, addressScore, categoryScore);
      if (best === 0) {
        matchedAll = false;
        break;
      }
      total += best;
    }

    if (matchedAll) results.push({ merchant: entry.merchant, score: total / tokens.length });
  }

  return results;
}

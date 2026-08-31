// 주소 문자열 정규화 / 추출 유틸.
// 게시판 표기와 공개데이터 표기를 같은 키로 맞추는 것이 목적이다.

const ADDRESS_START = /(?:경기(?:도)?\s*)?김포시/;
// 주소가 끝났다고 볼 수 있는 지점: 구분자, 전화번호, 다른 항목 라벨.
const ADDRESS_END =
  /\s{2,}|[,\t\n|·]|\s*0\d{1,2}[-.\s]\d{3,4}[-.\s]\d{4}|\s*(?:전화|연락처|업종|분류|TEL|Tel)/;

/** 임의의 텍스트 덩어리에서 김포시 주소로 보이는 부분을 뽑는다. */
export function extractAddress(text) {
  if (!text) return undefined;
  const flat = String(text).replace(/[\r\n\t]+/g, '\n').trim();
  const start = ADDRESS_START.exec(flat);
  if (!start) return undefined;
  let rest = flat.slice(start.index);
  const end = ADDRESS_END.exec(rest);
  if (end && end.index > 0) rest = rest.slice(0, end.index);
  const address = rest.replace(/\s+/g, ' ').replace(/[\s.]+$/, '').trim();
  // 최소한 번지/건물번호나 행정동 이름은 있어야 주소로 인정한다.
  if (!/\d/.test(address) && !/(동|읍|면|리)$/.test(address)) return undefined;
  return address;
}

/** 주소처럼 보이는지 판정. 표 컬럼 자동 인식에 쓴다. */
export function looksLikeAddress(text) {
  if (!text) return false;
  return /김포시|경기도/.test(text) && /(동|읍|면|리|로|길)\s*\d*/.test(text);
}

/** 병합·캐시 키. 공백/괄호/우편번호/층호 표기 차이를 흡수한다. */
export function addressKey(address) {
  if (!address) return '';
  return String(address)
    .replace(/\(.*?\)/g, ' ')
    .replace(/경기도?/g, ' ')
    .replace(/(지하|B)?\s*\d+\s*(층|호)/g, ' ')
    .replace(/번지/g, ' ')
    .replace(/[,.]/g, ' ')
    .replace(/\s+/g, '')
    .trim();
}

/** 상호명 정규화. 병합 시 동일 업소 판정에 쓴다. */
export function nameKey(name) {
  if (!name) return '';
  return String(name)
    .replace(/\(.*?\)/g, '')
    .replace(/[\s'"·・.,\-_()[\]]/g, '')
    .toLowerCase()
    .trim();
}

/** 지오코딩 실패 시 동/읍/면 단위로 잘라 근사 좌표를 얻기 위한 축약 주소. */
export function toAreaAddress(address) {
  if (!address) return undefined;
  const hits = String(address).match(/[가-힣]{2,8}(?:동|읍|면)(?![가-힣])/g);
  if (!hits || hits.length === 0) return undefined;
  // 도로명주소는 법정동이 괄호 안 끝에 붙으므로 마지막 매치를 쓴다.
  return `경기도 김포시 ${hits[hits.length - 1]}`;
}

/** 전화번호 추출. */
export function extractTel(text) {
  if (!text) return undefined;
  const hit = /(0\d{1,2})[-.\s]?(\d{3,4})[-.\s]?(\d{4})/.exec(String(text));
  return hit ? `${hit[1]}-${hit[2]}-${hit[3]}` : undefined;
}

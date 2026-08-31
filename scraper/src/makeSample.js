// 개발/데모용 샘플 데이터 생성기.
// 실제 수집 환경(외부 네트워크)에 접근하지 않고도 웹앱을 띄워 볼 수 있게 한다.
// 실제 파이프라인(scrape → opendata → geocode → build:data)을 돌리면 덮어써진다.
import { PATHS } from './config.js';
import { writeJson } from './lib/store.js';
import { FIELDS } from './lib/schema.js';

const AREAS = [
  ['사우동', 37.6155, 126.7157], ['풍무동', 37.6103, 126.7355], ['장기동', 37.6402, 126.6702],
  ['구래동', 37.6437, 126.6296], ['마산동', 37.636, 126.647], ['운양동', 37.6494, 126.6867],
  ['걸포동', 37.63, 126.705], ['북변동', 37.6215, 126.7135], ['통진읍', 37.7095, 126.562],
  ['양촌읍', 37.669, 126.59], ['대곶면', 37.662, 126.51], ['고촌읍', 37.6035, 126.766],
  ['하성면', 37.748, 126.59], ['월곶면', 37.736, 126.5],
];
const CATEGORIES = [
  '일반음식점', '휴게음식점', '편의점', '슈퍼마켓', '미용업', '학원', '약국', '카페',
  '정육점', '세탁소', '안경점', '문구점', '의원', '자동차정비', '꽃집', '서점', '제과점',
];
const HEADS = ['행복', '한강', '금빛', '푸른', '으뜸', '참', '가온', '해든', '새싹', '풍년', '솔찬', '너울', '한아름', '온누리'];
const TAILS = {
  일반음식점: ['식당', '국밥', '칼국수', '한식당'], 휴게음식점: ['분식', '떡볶이', '토스트'],
  편의점: ['마트24', '편의점'], 슈퍼마켓: ['마트', '슈퍼'], 미용업: ['헤어', '미용실'],
  학원: ['학원', '교습소'], 약국: ['약국'], 카페: ['커피', '카페'], 정육점: ['정육점'],
  세탁소: ['세탁소'], 안경점: ['안경원'], 문구점: ['문구'], 의원: ['의원'],
  자동차정비: ['카센터', '정비'], 꽃집: ['플라워', '꽃집'], 서점: ['서점'], 제과점: ['베이커리', '제과점'],
};

// 결정적 난수(재실행 시 결과가 흔들리지 않게).
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

function main() {
  const random = rng(20260831);
  const count = Number(process.argv[2] ?? 420);
  const categories = [...CATEGORIES];
  const rows = [];

  for (let i = 0; i < count; i += 1) {
    const [area, baseLat, baseLng] = AREAS[Math.floor(random() * AREAS.length)];
    const category = CATEGORIES[Math.floor(random() * CATEGORIES.length)];
    const tails = TAILS[category];
    const name = `${HEADS[Math.floor(random() * HEADS.length)]}${tails[Math.floor(random() * tails.length)]}`;
    const roadNo = 1 + Math.floor(random() * 320);
    const isRoad = random() > 0.35;
    const address = isRoad
      ? `경기도 김포시 ${area.replace(/(동|읍|면)$/, '')}로 ${roadNo} (${area})`
      : `경기도 김포시 ${area} ${100 + Math.floor(random() * 900)}-${1 + Math.floor(random() * 30)}`;
    // 동 중심에서 ±1.5km 정도 흩뿌린다.
    const lat = baseLat + (random() - 0.5) * 0.022;
    const lng = baseLng + (random() - 0.5) * 0.028;
    const status = random() > 0.06 ? 'ok' : 'approx';
    const tel = random() > 0.4 ? `031-${900 + Math.floor(random() * 99)}-${1000 + Math.floor(random() * 8999)}` : '';

    rows.push([
      `s${i}`,
      `${name}${random() > 0.75 ? ` ${area.slice(0, 2)}점` : ''}`,
      categories.indexOf(category),
      address,
      tel,
      Math.round(lat * 1e6) / 1e6,
      Math.round(lng * 1e6) / 1e6,
      status,
      'https://www.gimpo.go.kr/portal/selectBbsNttList.do?bbsNo=573&key=1283',
    ]);
  }

  const payload = {
    meta: {
      sample: true,
      generatedAt: new Date().toISOString(),
      count: rows.length,
      located: rows.filter((r) => r[7] === 'ok').length,
      approximate: rows.filter((r) => r[7] === 'approx').length,
      unlocated: 0,
      attribution: '샘플 데이터 · 실제 가맹점 정보가 아닙니다',
    },
    fields: FIELDS,
    categories,
    rows,
  };
  return writeJson(PATHS.output, payload).then(() =>
    console.log(`샘플 ${rows.length}건 생성 → ${PATHS.output}`),
  );
}

main();

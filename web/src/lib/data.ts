import type { Dataset, GeocodeStatus, Merchant } from '../types';

type RawPayload = {
  meta: Dataset['meta'];
  fields: string[];
  categories: string[];
  rows: (string | number | null)[][];
};

/**
 * merchants.json은 용량을 줄이려고 값 배열 + 필드 순서 형태로 저장돼 있다.
 * 필드 순서는 payload.fields로 함께 오므로 스크래퍼가 컬럼을 늘려도 깨지지 않는다.
 */
export function decode(payload: RawPayload): Dataset {
  const at = (field: string) => payload.fields.indexOf(field);
  const idx = {
    id: at('id'),
    name: at('name'),
    category: at('category'),
    address: at('address'),
    tel: at('tel'),
    lat: at('lat'),
    lng: at('lng'),
    status: at('status'),
    url: at('url'),
  };

  const merchants: Merchant[] = payload.rows.map((row) => {
    const categoryId = Number(row[idx.category]);
    const lat = row[idx.lat];
    const lng = row[idx.lng];
    return {
      id: String(row[idx.id]),
      name: String(row[idx.name] ?? ''),
      category: categoryId >= 0 ? payload.categories[categoryId] : undefined,
      address: String(row[idx.address] ?? ''),
      tel: (row[idx.tel] as string) || undefined,
      lat: typeof lat === 'number' ? lat : undefined,
      lng: typeof lng === 'number' ? lng : undefined,
      status: (row[idx.status] as GeocodeStatus) ?? 'missing',
      url: (row[idx.url] as string) || undefined,
    };
  });

  return { meta: payload.meta, categories: payload.categories, merchants };
}

export async function loadDataset(signal?: AbortSignal): Promise<Dataset> {
  const res = await fetch(`${import.meta.env.BASE_URL}data/merchants.json`, { signal });
  if (!res.ok) throw new Error(`데이터를 불러오지 못했습니다 (HTTP ${res.status})`);
  return decode(await res.json());
}

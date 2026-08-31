export type GeocodeStatus = 'ok' | 'approx' | 'missing';

export type Merchant = {
  id: string;
  name: string;
  category?: string;
  address: string;
  tel?: string;
  lat?: number;
  lng?: number;
  status: GeocodeStatus;
  url?: string;
};

export type DatasetMeta = {
  sample?: boolean;
  generatedAt: string;
  boardScrapedAt?: string | null;
  openDataFetchedAt?: string | null;
  count: number;
  located: number;
  approximate: number;
  unlocated: number;
  attribution: string;
};

export type Dataset = {
  meta: DatasetMeta;
  categories: string[];
  merchants: Merchant[];
};

import { PATHS } from '../config.js';
import { readJson } from './store.js';
import { mergeSources } from './merge.js';

/** board.json + opendata.json을 읽어 병합한 목록을 돌려준다. */
export async function loadMerged() {
  const board = await readJson(PATHS.boardRaw, { merchants: [] });
  const open = await readJson(PATHS.openDataRaw, { merchants: [] });
  return {
    merchants: mergeSources(board.merchants ?? [], open.merchants ?? []),
    boardScrapedAt: board.scrapedAt ?? null,
    openDataFetchedAt: open.fetchedAt ?? null,
  };
}

import iconv from 'iconv-lite';
import { sleep } from './store.js';

// 지자체 CMS는 EUC-KR로 응답하는 경우가 있어 charset을 보고 디코딩한다.
function decode(buffer, contentType) {
  const declared = /charset=([\w-]+)/i.exec(contentType ?? '')?.[1]?.toLowerCase();
  const head = buffer.subarray(0, 2048).toString('latin1');
  const metaCharset = /charset=["']?([\w-]+)/i.exec(head)?.[1]?.toLowerCase();
  const charset = declared ?? metaCharset ?? 'utf-8';
  if (charset === 'utf-8' || charset === 'utf8') return buffer.toString('utf8');
  return iconv.decode(buffer, charset);
}

/** 지수 백오프 재시도가 붙은 HTML GET. */
export async function fetchHtml(url, { retries = 4, userAgent, timeoutMs = 30000 } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    if (attempt > 0) await sleep(2 ** attempt * 1000);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': userAgent, Accept: 'text/html,application/xhtml+xml' },
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      const buffer = Buffer.from(await res.arrayBuffer());
      return decode(buffer, res.headers.get('content-type'));
    } catch (err) {
      lastError = err;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
}

export async function fetchJson(url, { retries = 3, headers = {}, timeoutMs = 30000 } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    if (attempt > 0) await sleep(2 ** attempt * 1000);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { headers, signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      return await res.json();
    } catch (err) {
      lastError = err;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
}

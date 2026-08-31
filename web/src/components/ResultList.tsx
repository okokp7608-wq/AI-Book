import type { Merchant } from '../types';
import { formatDistance } from '../lib/geo';

export type ResultItem = { merchant: Merchant; distanceKm?: number };

type Props = {
  items: ResultItem[];
  selectedId: string | null;
  onSelect: (merchant: Merchant) => void;
  visibleCount: number;
  onShowMore: () => void;
};

export function ResultList({ items, selectedId, onSelect, visibleCount, onShowMore }: Props) {
  if (items.length === 0) {
    return (
      <p className="empty">
        조건에 맞는 가맹점이 없습니다.
        <br />
        검색어를 줄이거나 업종 필터를 해제해 보세요.
      </p>
    );
  }

  const shown = items.slice(0, visibleCount);
  return (
    <>
      <ul className="results">
        {shown.map(({ merchant, distanceKm }) => (
          <li key={merchant.id}>
            <button
              type="button"
              className={merchant.id === selectedId ? 'result result--active' : 'result'}
              onClick={() => onSelect(merchant)}
            >
              <span className="result-name">{merchant.name}</span>
              <span className="result-meta">
                {merchant.category && <span className="tag">{merchant.category}</span>}
                {distanceKm !== undefined && <span className="distance">{formatDistance(distanceKm)}</span>}
                {merchant.status === 'approx' && <span className="tag tag--warn">위치 근사</span>}
                {merchant.status === 'missing' && <span className="tag tag--warn">위치 미확인</span>}
              </span>
              <span className="result-address">{merchant.address || '주소 정보 없음'}</span>
            </button>
          </li>
        ))}
      </ul>
      {items.length > shown.length && (
        <button type="button" className="more" onClick={onShowMore}>
          {(items.length - shown.length).toLocaleString('ko-KR')}곳 더 보기
        </button>
      )}
    </>
  );
}

import type { SearchMode } from '../lib/search';

type Props = {
  value: string;
  onChange: (value: string) => void;
  mode: SearchMode;
  onModeChange: (mode: SearchMode) => void;
  resultCount: number;
};

const MODES: { id: SearchMode; label: string }[] = [
  { id: 'all', label: '통합' },
  { id: 'name', label: '상호명' },
  { id: 'address', label: '주소' },
];

export function SearchBar({ value, onChange, mode, onModeChange, resultCount }: Props) {
  return (
    <div className="searchbar">
      <div className="searchbar-input">
        <span aria-hidden="true">🔎</span>
        <input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="상호명 또는 주소로 검색 (예: 구래동 카페, ㄱㅍ)"
          aria-label="가맹점 검색"
          autoComplete="off"
        />
        {value && (
          <button type="button" className="icon-button" onClick={() => onChange('')} aria-label="검색어 지우기">
            ✕
          </button>
        )}
      </div>
      <div className="searchbar-modes" role="group" aria-label="검색 범위">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            className={mode === m.id ? 'chip chip--active' : 'chip'}
            aria-pressed={mode === m.id}
            onClick={() => onModeChange(m.id)}
          >
            {m.label}
          </button>
        ))}
        <span className="searchbar-count">{resultCount.toLocaleString('ko-KR')}곳</span>
      </div>
    </div>
  );
}

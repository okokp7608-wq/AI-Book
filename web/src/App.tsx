import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapView } from './components/MapView';
import { SearchBar } from './components/SearchBar';
import { CategoryFilter } from './components/CategoryFilter';
import { ResultList, type ResultItem } from './components/ResultList';
import { DetailPanel } from './components/DetailPanel';
import { loadDataset } from './lib/data';
import { buildIndex, search, type SearchMode } from './lib/search';
import { distanceKm, inBounds, type Bounds, type LatLng } from './lib/geo';
import type { Dataset, Merchant } from './types';

const PAGE_SIZE = 50;

function readParams() {
  const p = new URLSearchParams(window.location.search);
  const mode = p.get('mode');
  return {
    query: p.get('q') ?? '',
    mode: (mode === 'name' || mode === 'address' ? mode : 'all') as SearchMode,
    categories: new Set((p.get('cat') ?? '').split(',').filter(Boolean)),
    id: p.get('id'),
  };
}

export function App() {
  const initial = useRef(readParams()).current;

  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState(initial.query);
  const [debouncedQuery, setDebouncedQuery] = useState(initial.query);
  const [mode, setMode] = useState<SearchMode>(initial.mode);
  const [categories, setCategories] = useState<Set<string>>(initial.categories);
  const [restrictToView, setRestrictToView] = useState(false);
  const [bounds, setBounds] = useState<Bounds | null>(null);
  const [userLocation, setUserLocation] = useState<LatLng | null>(null);
  const [locating, setLocating] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(initial.id);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [sheetOpen, setSheetOpen] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    loadDataset(controller.signal)
      .then(setDataset)
      .catch((err: Error) => {
        if (err.name !== 'AbortError') setLoadError(err.message);
      });
    return () => controller.abort();
  }, []);

  // 입력할 때마다 1만 건을 훑지 않도록 짧게 지연시킨다.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 150);
    return () => clearTimeout(timer);
  }, [query]);

  const index = useMemo(() => (dataset ? buildIndex(dataset.merchants) : []), [dataset]);

  const matched = useMemo(() => {
    if (index.length === 0) return [];
    const hits = search(index, debouncedQuery, mode);
    if (categories.size === 0) return hits;
    return hits.filter((h) => h.merchant.category && categories.has(h.merchant.category));
  }, [index, debouncedQuery, mode, categories]);

  const mapMerchants = useMemo(() => matched.map((m) => m.merchant), [matched]);

  const listItems: ResultItem[] = useMemo(() => {
    const scoped =
      restrictToView && bounds ? matched.filter((m) => inBounds(m.merchant, bounds)) : matched;

    const withDistance = scoped.map(({ merchant, score }) => ({
      merchant,
      score,
      distanceKm:
        userLocation && merchant.lat !== undefined && merchant.lng !== undefined
          ? distanceKm(userLocation, { lat: merchant.lat, lng: merchant.lng })
          : undefined,
    }));

    withDistance.sort((a, b) => {
      if (debouncedQuery.trim() && b.score !== a.score) return b.score - a.score;
      if (a.distanceKm !== undefined && b.distanceKm !== undefined) return a.distanceKm - b.distanceKm;
      return a.merchant.name.localeCompare(b.merchant.name, 'ko');
    });

    return withDistance.map(({ merchant, distanceKm: d }) => ({ merchant, distanceKm: d }));
  }, [matched, restrictToView, bounds, userLocation, debouncedQuery]);

  useEffect(() => setVisibleCount(PAGE_SIZE), [debouncedQuery, mode, categories, restrictToView]);

  // 공유 가능한 링크가 되도록 검색 상태를 URL에 반영한다.
  useEffect(() => {
    const p = new URLSearchParams();
    if (debouncedQuery.trim()) p.set('q', debouncedQuery.trim());
    if (mode !== 'all') p.set('mode', mode);
    if (categories.size > 0) p.set('cat', [...categories].join(','));
    if (selectedId) p.set('id', selectedId);
    const search = p.toString();
    window.history.replaceState(null, '', search ? `?${search}` : window.location.pathname);
  }, [debouncedQuery, mode, categories, selectedId]);

  const selected = useMemo(
    () => dataset?.merchants.find((m) => m.id === selectedId) ?? null,
    [dataset, selectedId],
  );

  const selectedDistance =
    userLocation && selected?.lat !== undefined && selected?.lng !== undefined
      ? distanceKm(userLocation, { lat: selected.lat, lng: selected.lng })
      : undefined;

  const handleSelect = useCallback((merchant: Merchant | null) => {
    setSelectedId(merchant?.id ?? null);
    if (merchant) setSheetOpen(true);
  }, []);

  const toggleCategory = useCallback((category: string) => {
    setCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }, []);

  const locate = useCallback(() => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, []);

  if (loadError) {
    return (
      <div className="fullscreen-message">
        <h1>데이터를 불러오지 못했습니다</h1>
        <p>{loadError}</p>
      </div>
    );
  }

  if (!dataset) {
    return (
      <div className="fullscreen-message">
        <h1>가맹점 정보를 불러오는 중…</h1>
      </div>
    );
  }

  return (
    <div className="app">
      <aside className={sheetOpen ? 'panel panel--open' : 'panel'}>
        <header className="panel-head">
          <h1>김포페이 가맹점 지도</h1>
          <button
            type="button"
            className="icon-button panel-toggle"
            onClick={() => setSheetOpen((v) => !v)}
            aria-label={sheetOpen ? '목록 접기' : '목록 펼치기'}
          >
            {sheetOpen ? '▾' : '▴'}
          </button>
        </header>

        <SearchBar
          value={query}
          onChange={setQuery}
          mode={mode}
          onModeChange={setMode}
          resultCount={listItems.length}
        />
        <CategoryFilter
          categories={dataset.categories}
          selected={categories}
          onToggle={toggleCategory}
          onClear={() => setCategories(new Set())}
        />

        <div className="panel-tools">
          <label className="switch">
            <input
              type="checkbox"
              checked={restrictToView}
              onChange={(e) => setRestrictToView(e.target.checked)}
            />
            지도에 보이는 곳만
          </label>
          <button type="button" className="button button--ghost" onClick={locate} disabled={locating}>
            {locating ? '위치 확인 중…' : userLocation ? '내 위치 갱신' : '내 위치'}
          </button>
        </div>

        {selected && (
          <DetailPanel merchant={selected} distanceKm={selectedDistance} onClose={() => setSelectedId(null)} />
        )}

        <div className="panel-body">
          <ResultList
            items={listItems}
            selectedId={selectedId}
            onSelect={handleSelect}
            visibleCount={visibleCount}
            onShowMore={() => setVisibleCount((v) => v + PAGE_SIZE)}
          />
        </div>

        <footer className="panel-foot">
          {dataset.meta.sample && (
            <p className="notice">샘플 데이터입니다. 실제 가맹점 정보가 아닙니다.</p>
          )}
          <p className="muted">
            {!dataset.meta.sample && `${dataset.meta.attribution} · `}
            총 {dataset.meta.count.toLocaleString('ko-KR')}곳 · 기준{' '}
            {new Date(dataset.meta.generatedAt).toLocaleDateString('ko-KR')}
          </p>
        </footer>
      </aside>

      <main className="map-area">
        <MapView
          merchants={mapMerchants}
          selected={selected}
          onSelect={handleSelect}
          onBoundsChange={setBounds}
          userLocation={userLocation}
        />
      </main>
    </div>
  );
}

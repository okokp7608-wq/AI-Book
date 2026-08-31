import { useEffect, useRef, useState } from 'react';
import type { Merchant } from '../types';
import type { Bounds, LatLng } from '../lib/geo';
import { GIMPO_CENTER } from '../lib/geo';
import { KAKAO_JS_KEY, loadKakaoMaps } from '../lib/kakao';

type Props = {
  merchants: Merchant[];
  selected: Merchant | null;
  onSelect: (merchant: Merchant | null) => void;
  onBoundsChange: (bounds: Bounds) => void;
  userLocation: LatLng | null;
};

// 마커가 지나치게 많으면 클러스터러도 버거워지므로 상한을 둔다.
const MAX_MARKERS = 4000;

export function MapView({ merchants, selected, onSelect, onBoundsChange, userLocation }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const clustererRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const selectedMarkerRef = useRef<any>(null);
  const mapsRef = useRef<any>(null);
  const boundsCallback = useRef(onBoundsChange);
  const selectCallback = useRef(onSelect);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  boundsCallback.current = onBoundsChange;
  selectCallback.current = onSelect;

  // 지도 생성은 최초 1회만.
  useEffect(() => {
    if (!KAKAO_JS_KEY) {
      setError('VITE_KAKAO_JS_KEY가 설정되지 않아 지도를 표시할 수 없습니다.');
      return;
    }
    let cancelled = false;

    loadKakaoMaps(KAKAO_JS_KEY)
      .then((maps) => {
        if (cancelled || !containerRef.current) return;
        mapsRef.current = maps;
        const map = new maps.Map(containerRef.current, {
          center: new maps.LatLng(GIMPO_CENTER.lat, GIMPO_CENTER.lng),
          level: 6,
        });
        mapRef.current = map;
        clustererRef.current = new maps.MarkerClusterer({
          map,
          averageCenter: true,
          minLevel: 5,
          gridSize: 70,
        });

        const publishBounds = () => {
          const b = map.getBounds();
          boundsCallback.current({
            south: b.getSouthWest().getLat(),
            west: b.getSouthWest().getLng(),
            north: b.getNorthEast().getLat(),
            east: b.getNorthEast().getLng(),
          });
        };
        maps.event.addListener(map, 'idle', publishBounds);
        publishBounds();
        setReady(true);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // 목록이 바뀌면 마커를 다시 그린다.
  useEffect(() => {
    const maps = mapsRef.current;
    const clusterer = clustererRef.current;
    if (!ready || !maps || !clusterer) return;

    const located = merchants.filter((m) => m.lat !== undefined && m.lng !== undefined);
    const shown = located.slice(0, MAX_MARKERS);
    const markers = shown.map((merchant) => {
      const marker = new maps.Marker({
        position: new maps.LatLng(merchant.lat, merchant.lng),
        title: merchant.name,
      });
      maps.event.addListener(marker, 'click', () => selectCallback.current(merchant));
      return marker;
    });

    clusterer.clear();
    clusterer.addMarkers(markers);
    return () => clusterer.clear();
  }, [merchants, ready]);

  // 선택된 가맹점으로 이동하고 강조 오버레이를 띄운다.
  useEffect(() => {
    const maps = mapsRef.current;
    const map = mapRef.current;
    if (!ready || !maps || !map) return;

    selectedMarkerRef.current?.setMap(null);
    selectedMarkerRef.current = null;
    if (!selected || selected.lat === undefined || selected.lng === undefined) return;

    const position = new maps.LatLng(selected.lat, selected.lng);
    const overlay = new maps.CustomOverlay({
      position,
      yAnchor: 1.35,
      zIndex: 10,
      content: `<div class="map-pin">${escapeHtml(selected.name)}</div>`,
    });
    overlay.setMap(map);
    selectedMarkerRef.current = overlay;
    map.panTo(position);
  }, [selected, ready]);

  // 내 위치 표시.
  useEffect(() => {
    const maps = mapsRef.current;
    const map = mapRef.current;
    if (!ready || !maps || !map) return;

    userMarkerRef.current?.setMap(null);
    userMarkerRef.current = null;
    if (!userLocation) return;

    const overlay = new maps.CustomOverlay({
      position: new maps.LatLng(userLocation.lat, userLocation.lng),
      content: '<div class="map-me" aria-label="내 위치"></div>',
      zIndex: 5,
    });
    overlay.setMap(map);
    userMarkerRef.current = overlay;
  }, [userLocation, ready]);

  if (error) {
    return (
      <div className="map map--error">
        <div className="map-error-card">
          <h2>지도를 표시할 수 없습니다</h2>
          <p>{error}</p>
          <p className="muted">
            카카오 개발자센터에서 JavaScript 키를 발급받아 <code>web/.env</code>에
            <code>VITE_KAKAO_JS_KEY</code>로 넣고, 플랫폼 &gt; Web에 배포 도메인을 등록하세요.
            지도가 없어도 왼쪽 목록 검색은 그대로 동작합니다.
          </p>
        </div>
      </div>
    );
  }

  return <div className="map" ref={containerRef} role="application" aria-label="가맹점 지도" />;
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (ch) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch] as string,
  );
}

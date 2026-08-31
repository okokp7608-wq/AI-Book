import type { Merchant } from '../types';

export type LatLng = { lat: number; lng: number };
export type Bounds = { south: number; west: number; north: number; east: number };

const R = 6371; // km

/** 두 좌표 사이 거리(km). */
export function distanceKm(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function formatDistance(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`;
}

export function inBounds(merchant: Merchant, bounds: Bounds): boolean {
  if (merchant.lat === undefined || merchant.lng === undefined) return false;
  return (
    merchant.lat >= bounds.south &&
    merchant.lat <= bounds.north &&
    merchant.lng >= bounds.west &&
    merchant.lng <= bounds.east
  );
}

/** 김포시청. 위치 권한이 없을 때의 지도 초기 중심. */
export const GIMPO_CENTER: LatLng = { lat: 37.6152, lng: 126.7156 };

import { useState } from 'react';
import type { Merchant } from '../types';
import { formatDistance } from '../lib/geo';

type Props = {
  merchant: Merchant;
  distanceKm?: number;
  onClose: () => void;
};

export function DetailPanel({ merchant, distanceKm, onClose }: Props) {
  const [copied, setCopied] = useState(false);
  const hasCoords = merchant.lat !== undefined && merchant.lng !== undefined;

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(merchant.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  // 카카오맵 길찾기는 좌표와 이름만으로 목적지를 지정할 수 있다.
  const routeUrl = hasCoords
    ? `https://map.kakao.com/link/to/${encodeURIComponent(merchant.name)},${merchant.lat},${merchant.lng}`
    : `https://map.kakao.com/link/search/${encodeURIComponent(merchant.address || merchant.name)}`;

  return (
    <section className="detail" aria-label={`${merchant.name} 상세`}>
      <header className="detail-head">
        <div>
          <h2>{merchant.name}</h2>
          <p className="detail-sub">
            {merchant.category ?? '업종 미상'}
            {distanceKm !== undefined && ` · ${formatDistance(distanceKm)}`}
          </p>
        </div>
        <button type="button" className="icon-button" onClick={onClose} aria-label="닫기">
          ✕
        </button>
      </header>

      <p className="detail-address">{merchant.address || '주소 정보 없음'}</p>
      {merchant.status === 'approx' && (
        <p className="notice">지번 좌표를 찾지 못해 동 중심 좌표로 표시하고 있습니다.</p>
      )}

      <div className="detail-actions">
        <a className="button" href={routeUrl} target="_blank" rel="noreferrer noopener">
          길찾기
        </a>
        {merchant.tel && (
          <a className="button button--ghost" href={`tel:${merchant.tel}`}>
            {merchant.tel}
          </a>
        )}
        <button type="button" className="button button--ghost" onClick={copyAddress}>
          {copied ? '복사됨' : '주소 복사'}
        </button>
        {merchant.url && (
          <a className="button button--ghost" href={merchant.url} target="_blank" rel="noreferrer noopener">
            원문
          </a>
        )}
      </div>
    </section>
  );
}

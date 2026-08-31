declare global {
  interface Window {
    // 카카오 지도 SDK는 타입 패키지를 따로 두지 않아 any로 다룬다.
    kakao?: any;
  }
}

let loader: Promise<any> | null = null;

/** 카카오 지도 SDK를 한 번만 주입하고 maps 네임스페이스를 돌려준다. */
export function loadKakaoMaps(appKey: string, timeoutMs = 15000): Promise<any> {
  if (window.kakao?.maps?.Map) return Promise.resolve(window.kakao.maps);
  if (loader) return loader;

  loader = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.async = true;
    script.src =
      `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(appKey)}` +
      '&autoload=false&libraries=clusterer';

    const timer = setTimeout(() => {
      reject(new Error('카카오 지도 SDK 응답이 없습니다. 네트워크를 확인해 주세요.'));
    }, timeoutMs);

    script.onload = () => {
      window.kakao.maps.load(() => {
        clearTimeout(timer);
        resolve(window.kakao.maps);
      });
    };
    script.onerror = () => {
      clearTimeout(timer);
      loader = null;
      reject(
        new Error(
          '카카오 지도 SDK를 불러오지 못했습니다. 앱 키와 등록된 사이트 도메인을 확인해 주세요.',
        ),
      );
    };
    document.head.appendChild(script);
  });

  return loader;
}

export const KAKAO_JS_KEY = import.meta.env.VITE_KAKAO_JS_KEY ?? '';

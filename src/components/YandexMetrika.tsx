'use client';

import { useEffect } from 'react';
import Script from 'next/script';
import { usePathname } from 'next/navigation';

declare global {
  interface Window {
    ym?: (...args: unknown[]) => void;
  }
}

const YM_ID = 106990085;

export function YandexMetrika() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (typeof window.ym !== 'function') return;
    window.ym(YM_ID, 'hit', window.location.href, { referer: document.referrer });
  }, [pathname]);

  return (
    <>
      {/* Yandex.Metrika */}
      <Script
        id="ym-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
(function(m,e,t,r,i,k,a){
  try {
    m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
    m[i].l=1*new Date();
    for (var j = 0; j < document.scripts.length; j++) { if (document.scripts[j].src === r) { return; } }
    k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
    m[i](${YM_ID}, 'init', {ssr:true, webvisor:true, clickmap:true, ecommerce:"dataLayer", referrer: document.referrer, url: location.href, accurateTrackBounce:true, trackLinks:true});
  } catch (e) {}
})(window, document,'script','https://mc.yandex.ru/metrika/tag.js?id=${YM_ID}', 'ym');`,
        }}
      />
      <noscript>
        <div>
          <img src={`https://mc.yandex.ru/watch/${YM_ID}`} style={{ position: 'absolute', left: '-9999px' }} alt="" />
        </div>
      </noscript>
    </>
  );
}


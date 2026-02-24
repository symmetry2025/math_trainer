'use client';

import { useEffect } from 'react';
import Script from 'next/script';
import { usePathname } from 'next/navigation';

declare global {
  interface Window {
    _tmr?: Array<Record<string, unknown>>;
  }
}

const VK_PIXEL_ID = '3744947';

function pushPageView() {
  if (typeof window === 'undefined') return;
  const arr = (window._tmr = window._tmr || []);
  arr.push({ id: VK_PIXEL_ID, type: 'pageView', start: new Date().getTime() });
}

export function VkPixel() {
  const pathname = usePathname();

  useEffect(() => {
    pushPageView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <>
      {/* Top.Mail.Ru / VK Pixel */}
      <Script id="tmr-code" src="https://top-fwz1.mail.ru/js/code.js" strategy="afterInteractive" />
      <noscript>
        <div>
          <img
            src={`https://top-fwz1.mail.ru/counter?id=${VK_PIXEL_ID};js=na`}
            style={{ position: 'absolute', left: '-9999px' }}
            alt="Top.Mail.Ru"
          />
        </div>
      </noscript>
    </>
  );
}


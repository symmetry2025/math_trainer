'use client';

import { useEffect, useMemo, useState } from 'react';
import { AuthWebAppLoginResponseDtoSchema } from '@smmtry/shared';

type TelegramWebApp = {
  initData: string;
  initDataUnsafe?: { start_param?: unknown };
  ready: () => void;
};

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

function loadTelegramBridge(): Promise<void> {
  return new Promise((resolve, reject) => {
    const id = 'telegram-web-app';
    if (document.getElementById(id)) return resolve();
    const s = document.createElement('script');
    s.id = id;
    s.async = true;
    s.src = 'https://telegram.org/js/telegram-web-app.js';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('bridge_load_failed'));
    document.head.appendChild(s);
  });
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object';
}

export default function TelegramStartPage() {
  const [status, setStatus] = useState<'loading' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  const webAppStartParam = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const sp = new URLSearchParams(window.location.search);
    return (sp.get('startapp') || '').trim();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadTelegramBridge();
        if (cancelled) return;
        if (!window.Telegram?.WebApp?.initData) throw new Error('missing_init_data');
        window.Telegram.WebApp.ready();

        const initData = window.Telegram.WebApp.initData;
        const startParamFromBridge = String(window.Telegram.WebApp.initDataUnsafe?.start_param ?? '').trim();
        const startParam = startParamFromBridge || webAppStartParam || '';

        const res = await fetch('/api/auth/telegram', {
          method: 'POST',
          credentials: 'include',
          headers: { 'content-type': 'application/json', accept: 'application/json' },
          body: JSON.stringify({ initData, startParam: startParam || undefined }),
        });
        const body: unknown = await res.json().catch(() => null);
        if (cancelled) return;
        if (!res.ok) {
          const msg = isRecord(body) && typeof body.error === 'string' ? body.error : null;
          throw new Error(msg || 'auth_failed');
        }
        const parsed = AuthWebAppLoginResponseDtoSchema.safeParse(body);
        const redirectTo = parsed.success ? parsed.data.redirectTo : isRecord(body) && typeof body.redirectTo === 'string' ? body.redirectTo : '/';
        window.location.replace(redirectTo);
      } catch (e: unknown) {
        if (cancelled) return;
        setStatus('error');
        setError(e instanceof Error ? e.message : 'unknown_error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [webAppStartParam]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 md:p-10">
      <div className="card-elevated p-6 md:p-8 max-w-md w-full text-center space-y-2">
        {status === 'loading' ? (
          <>
            <div className="text-lg font-bold">Подключаем Telegram…</div>
            <div className="text-sm text-muted-foreground">Подождите несколько секунд</div>
          </>
        ) : (
          <>
            <div className="text-lg font-bold">Не удалось войти</div>
            <div className="text-sm text-muted-foreground">Ошибка: {error || 'unknown'}</div>
            <div className="text-xs text-muted-foreground">
              Если вы открыли страницу не из Telegram — это нормально. Для теста откройте приложение через кнопку mini‑app в Telegram.
            </div>
          </>
        )}
      </div>
    </div>
  );
}


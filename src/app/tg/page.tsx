'use client';

import { useEffect, useMemo, useState } from 'react';
import { AuthProviderLinkRequestStartResponseDtoSchema, AuthWebAppLoginResponseDtoSchema } from '@smmtry/shared';

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
  const [status, setStatus] = useState<'select' | 'loading' | 'error'>('select');
  const [error, setError] = useState<string | null>(null);
  const [initData, setInitData] = useState<string>('');

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
        setInitData(window.Telegram.WebApp.initData);
      } catch (e: unknown) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'unknown_error');
        setStatus('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [webAppStartParam]);

  const continueInMiniApp = async () => {
    setError(null);
    setStatus('loading');
    try {
      const startParamFromBridge = String(window.Telegram?.WebApp?.initDataUnsafe?.start_param ?? '').trim();
      const startParam = startParamFromBridge || webAppStartParam || '';

      const res = await fetch('/api/auth/telegram', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ initData, startParam: startParam || undefined }),
      });
      const body: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = isRecord(body) && typeof body.error === 'string' ? body.error : null;
        throw new Error(msg || 'auth_failed');
      }
      const parsed = AuthWebAppLoginResponseDtoSchema.safeParse(body);
      const redirectTo = parsed.success ? parsed.data.redirectTo : isRecord(body) && typeof body.redirectTo === 'string' ? body.redirectTo : '/';
      window.location.replace(redirectTo);
    } catch (e: unknown) {
      setStatus('error');
      setError(e instanceof Error ? e.message : 'unknown_error');
    }
  };

  const openSiteToLink = async () => {
    setError(null);
    setStatus('loading');
    try {
      const res = await fetch('/api/auth/provider-link-request', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ provider: 'telegram', initData }),
      });
      const body: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = isRecord(body) && typeof body.error === 'string' ? body.error : null;
        throw new Error(msg || 'link_request_failed');
      }
      const parsed = AuthProviderLinkRequestStartResponseDtoSchema.safeParse(body);
      const req = parsed.success ? parsed.data.requestToken : isRecord(body) && typeof body.requestToken === 'string' ? body.requestToken : '';
      if (!req) throw new Error('invalid_response');
      const href = `${window.location.origin}/link/provider?req=${encodeURIComponent(req)}`;
      window.location.assign(href);
    } catch (e: unknown) {
      setStatus('error');
      setError(e instanceof Error ? e.message : 'unknown_error');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 md:p-10">
      <div className="card-elevated p-6 md:p-8 max-w-md w-full text-center space-y-2">
        {status === 'select' ? (
          <>
            <div className="text-lg font-bold">Вход через Telegram</div>
            <div className="text-sm text-muted-foreground">
              Если у вас уже есть аккаунт на сайте — сначала привяжите Telegram к нему. Иначе будет создан новый аккаунт.
            </div>
            <div className="pt-2 space-y-2">
              <button type="button" className="btn-primary w-full" onClick={openSiteToLink} disabled={!initData}>
                У меня есть аккаунт (привязать)
              </button>
              <button type="button" className="btn-secondary w-full" onClick={continueInMiniApp} disabled={!initData}>
                У меня нет аккаунта (продолжить)
              </button>
            </div>
            {error ? <div className="text-sm text-destructive pt-2">Ошибка: {error}</div> : null}
          </>
        ) : status === 'loading' ? (
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


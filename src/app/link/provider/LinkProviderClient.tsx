'use client';

import { useEffect, useMemo, useState } from 'react';

type Status = 'idle' | 'working' | 'linked' | 'already_linked' | 'expired' | 'conflict' | 'error';

function friendlyError(code: unknown): string {
  const c = typeof code === 'string' ? code : '';
  if (c === 'unauthorized') return 'Нужно войти в аккаунт на сайте.';
  if (c === 'invalid_request_token') return 'Ссылка недействительна.';
  if (c === 'request_expired') return 'Ссылка устарела. Вернись в мини‑приложение и создай новую.';
  if (c === 'request_used') return 'Ссылка уже использована.';
  if (c === 'identity_already_linked') return 'Этот аккаунт уже привязан к другому пользователю.';
  if (!c) return 'Ошибка';
  return 'Ошибка: ' + c;
}

export default function LinkProviderClient(props: { requestToken: string }) {
  const requestToken = useMemo(() => String(props.requestToken || '').trim(), [props.requestToken]);
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [provider, setProvider] = useState<'telegram' | 'max' | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setStatus('working');
      setMessage(null);
      try {
        const res = await fetch('/api/auth/provider-link-confirm', {
          method: 'POST',
          credentials: 'include',
          headers: { 'content-type': 'application/json', accept: 'application/json' },
          body: JSON.stringify({ requestToken }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          const code = body?.error || body?.code || body?.message;
          if (code === 'request_expired') setStatus('expired');
          else if (code === 'identity_already_linked') setStatus('conflict');
          else setStatus('error');
          setMessage(friendlyError(code));
          return;
        }
        const p = body?.provider === 'telegram' || body?.provider === 'max' ? body.provider : null;
        const s = body?.status === 'already_linked' ? 'already_linked' : 'linked';
        setProvider(p);
        setStatus(s);
        setMessage(s === 'linked' ? 'Готово. Аккаунт привязан.' : 'Аккаунт уже был привязан.');
      } catch {
        if (cancelled) return;
        setStatus('error');
        setMessage('Ошибка сети');
      }
    };
    if (requestToken) run();
    return () => {
      cancelled = true;
    };
  }, [requestToken]);

  const nextHref = '/settings';
  const title = provider === 'telegram' ? 'Привязка Telegram' : provider === 'max' ? 'Привязка MAX' : 'Привязка аккаунта';

  return (
    <div className="min-h-screen flex items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-md">
        <div className="card-elevated p-6 md:p-8 space-y-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-extrabold">{title}</h1>
            <p className="text-sm text-muted-foreground">
              {status === 'working' ? 'Подтверждаем привязку…' : ' '}
            </p>
          </div>

          {message ? <div className="text-sm">{message}</div> : null}

          <div className="pt-2 space-y-2">
            <a className="btn-primary w-full text-center" href={nextHref}>
              Перейти в настройки
            </a>

            {status === 'expired' || status === 'conflict' ? (
              <a className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors" href="/tg-link">
                Открыть страницу привязки
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}


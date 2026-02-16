'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function SignupConfirmPage() {
  const sp = useSearchParams();
  const token = useMemo(() => (sp.get('token') ?? '').trim(), [sp]);
  const [status, setStatus] = useState<'idle' | 'ok' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token) {
        setStatus('error');
        setMessage('Нет токена подтверждения.');
        return;
      }
      try {
        const res = await fetch('/api/auth/confirm-email', {
          method: 'POST',
          headers: { 'content-type': 'application/json', accept: 'application/json' },
          body: JSON.stringify({ token }),
        });
        const body: any = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setStatus('error');
          setMessage(body?.error === 'invalid_or_expired_token' ? 'Ссылка недействительна или устарела.' : 'Не удалось подтвердить почту.');
          return;
        }
        setStatus('ok');
        setMessage('Почта подтверждена. Теперь можно войти.');
      } catch {
        if (cancelled) return;
        setStatus('error');
        setMessage('Ошибка сети.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-md">
        <div className="card-elevated p-6 md:p-8 space-y-4">
          <h1 className="text-2xl font-extrabold">Подтверждение почты</h1>
          <p className="text-sm text-muted-foreground">{status === 'idle' ? 'Проверяем ссылку…' : message}</p>

          <div className="pt-2">
            <Link href="/login" className="btn-primary w-full inline-flex items-center justify-center">
              Войти
            </Link>
          </div>

          {status === 'error' ? (
            <p className="text-xs text-muted-foreground">
              Если ссылка устарела, запроси повторную отправку на странице входа.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}


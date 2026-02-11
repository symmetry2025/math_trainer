'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const DEMO_STUDENT_EMAIL = 'demo.student@trainer.local';

export default function LoginClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = useMemo(() => {
    const raw = sp.get('next');
    // Basic open-redirect protection: allow only local paths.
    if (raw && raw.startsWith('/')) return raw;
    return '/addition';
  }, [sp]);

  const goNext = () => {
    // Ensure middleware sees the fresh session cookie (hard navigation).
    window.location.assign(next);
  };

  const [email, setEmail] = useState(() => (process.env.NODE_ENV === 'production' ? '' : DEMO_STUDENT_EMAIL));
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const quickLoginStudent = async () => {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch('/api/dev/login/student', { method: 'POST', credentials: 'include' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body?.error || body?.message || 'Dev login недоступен');
        return;
      }
      goNext();
    } catch {
      setError('Ошибка сети');
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(mode === 'login' ? '/api/auth/login' : '/api/auth/register', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body?.error || body?.message || 'Ошибка входа');
        return;
      }
      goNext();
    } catch {
      setError('Ошибка сети');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-md">
        <div className="card-elevated p-6 md:p-8 space-y-5">
          <div>
            <h1 className="text-2xl font-extrabold">{mode === 'login' ? 'Войти' : 'Регистрация'}</h1>
            <p className="text-sm text-muted-foreground mt-1">Standalone МатТренер</p>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-medium">
              Email
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 h-10 w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm"
                placeholder="you@example.com"
                autoComplete="email"
              />
            </label>

            <label className="block text-sm font-medium">
              Пароль
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 h-10 w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm"
                type="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </label>
          </div>

          {error ? <div className="text-sm text-destructive">{error}</div> : null}

          <button type="button" className="btn-primary w-full" onClick={submit} disabled={busy || !email || !password}>
            {busy ? '...' : mode === 'login' ? 'Войти' : 'Создать аккаунт'}
          </button>

          {process.env.NODE_ENV === 'production' ? null : (
            <button type="button" className="btn-accent w-full" onClick={quickLoginStudent} disabled={busy}>
              Быстрый вход как ученик (dev)
            </button>
          )}

          <button
            type="button"
            className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setMode((m) => (m === 'login' ? 'register' : 'login'))}
          >
            {mode === 'login' ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'}
          </button>
        </div>
      </div>
    </div>
  );
}


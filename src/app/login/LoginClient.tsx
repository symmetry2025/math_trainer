'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';

const DEMO_STUDENT_EMAIL = 'demo.student@trainer.local';

function friendlyAuthError(code: unknown): string {
  const c = typeof code === 'string' ? code : '';
  if (c === 'invalid_credentials') return 'Неверная почта или пароль';
  if (c === 'email_not_verified') return 'Почта не подтверждена. Проверь письмо и перейди по ссылке.';
  if (c === 'invalid_input') return 'Проверь, что почта и пароль заполнены корректно';
  if (c === 'db_unavailable') return 'Сервер базы данных перезапускается. Попробуй ещё раз через 30–60 секунд.';
  if (c === 'email_taken') return 'Этот email уже занят';
  if (c === 'email_send_failed') return 'Не удалось отправить письмо. Проверь настройки почты и повтори.';
  if (c === 'invalid_or_expired_token') return 'Ссылка недействительна или устарела';
  if (!c) return 'Ошибка';
  return 'Ошибка: ' + c;
}

export default function LoginClient() {
  const searchParams = useSearchParams();
  const next = (() => {
    const raw = (searchParams?.get('next') || '').trim();
    if (!raw) return null;
    if (!raw.startsWith('/')) return null;
    if (raw.startsWith('//')) return null;
    if (raw.startsWith('/login')) return null;
    return raw;
  })();

  const goNextByRole = (roleRaw: unknown) => {
    const role = typeof roleRaw === 'string' ? roleRaw : '';
    const fallback =
      role === 'admin'
        ? '/admin/users'
        : role === 'promoter'
          ? '/promoter'
          : role === 'parent'
            ? '/progress/stats'
            : '/class-2/addition';
    const href = next ?? fallback;
    // Ensure middleware sees the fresh session cookie (hard navigation).
    window.location.assign(href);
  };

  const [email, setEmail] = useState(() => (process.env.NODE_ENV === 'production' ? '' : DEMO_STUDENT_EMAIL));
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [needResendConfirm, setNeedResendConfirm] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');

  const quickLoginStudent = async () => {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch('/api/dev/login/student', { method: 'POST', credentials: 'include' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(friendlyAuthError(body?.error || body?.message || 'Dev login недоступен'));
        return;
      }
      goNextByRole('student');
    } catch {
      setError('Ошибка сети');
    } finally {
      setBusy(false);
    }
  };

  const quickLoginAdmin = async () => {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch('/api/dev/login/admin', { method: 'POST', credentials: 'include' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(friendlyAuthError(body?.error || body?.message || 'Dev login недоступен'));
        return;
      }
      goNextByRole('admin');
    } catch {
      setError('Ошибка сети');
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    setError(null);
    setInfo(null);
    setNeedResendConfirm(false);
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
        if (body?.error === 'email_not_verified') {
            setError(friendlyAuthError(body?.error));
          setNeedResendConfirm(true);
        } else {
            setError(friendlyAuthError(body?.error || body?.message));
        }
        return;
      }
      if (mode === 'login') {
        goNextByRole(body?.user?.role);
        return;
      }
      setInfo('Аккаунт создан. Мы отправили письма с паролем и ссылкой подтверждения. Сначала подтверди почту, затем войди.');
      setMode('login');
      setPassword('');
    } catch {
      setError('Ошибка сети');
    } finally {
      setBusy(false);
    }
  };

  const resendConfirm = async () => {
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      const res = await fetch('/api/auth/resend-confirm-email', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ email }),
      });
      await res.json().catch(() => ({}));
      setInfo('Если почта существует и не подтверждена — мы отправили письмо ещё раз.');
    } catch {
      setError('Ошибка сети');
    } finally {
      setBusy(false);
    }
  };

  const forgotPassword = async (targetEmail: string) => {
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ email: targetEmail }),
      });
      await res.json().catch(() => ({}));
      setInfo('Если почта существует — мы отправили письмо с инструкциями.');
      setPassword('');
      setForgotOpen(false);
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

          {info ? <div className="text-sm text-foreground">{info}</div> : null}
          {error ? <div className="text-sm text-destructive">{error}</div> : null}

          <button type="button" className="btn-primary w-full" onClick={submit} disabled={busy || !email || !password}>
            {busy ? '...' : mode === 'login' ? 'Войти' : 'Создать аккаунт'}
          </button>

          {mode === 'login' ? (
            <div className="flex flex-col gap-2">
              <button
                type="button"
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => {
                  setForgotEmail((email || '').trim());
                  setForgotOpen(true);
                }}
                disabled={busy}
              >
                Забыл пароль?
              </button>

              {needResendConfirm ? (
                <button
                  type="button"
                  className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
                  onClick={resendConfirm}
                  disabled={busy || !email}
                >
                  Отправить письмо подтверждения ещё раз
                </button>
              ) : null}
            </div>
          ) : null}

          {process.env.NODE_ENV === 'production' ? null : (
            <div className="space-y-2">
              <button type="button" className="btn-accent w-full" onClick={quickLoginStudent} disabled={busy}>
                Быстрый вход как ученик (dev)
              </button>
              <button type="button" className="btn-accent w-full" onClick={quickLoginAdmin} disabled={busy}>
                Быстрый вход как админ (dev)
              </button>
            </div>
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

      {/* Forgot password modal */}
      {forgotOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Восстановление пароля"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setForgotOpen(false);
          }}
        >
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          <div className="relative w-full max-w-md card-elevated p-6 md:p-8 space-y-4">
            <div>
              <h2 className="text-xl font-extrabold">Восстановление пароля</h2>
              <p className="text-sm text-muted-foreground mt-1">Введи почту — мы отправим новый пароль.</p>
            </div>

            <label className="block text-sm font-medium">
              Email
              <input
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                className="mt-1 h-10 w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm"
                placeholder="you@example.com"
                autoComplete="email"
                inputMode="email"
              />
            </label>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                className="w-full rounded-2xl border border-border/60 bg-card px-4 py-2 text-sm font-semibold hover:bg-muted transition-colors"
                onClick={() => setForgotOpen(false)}
                disabled={busy}
              >
                Отмена
              </button>
              <button
                type="button"
                className="btn-primary w-full"
                onClick={() => forgotPassword(forgotEmail.trim().toLowerCase())}
                disabled={busy || !forgotEmail.trim()}
              >
                {busy ? '...' : 'Отправить'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}


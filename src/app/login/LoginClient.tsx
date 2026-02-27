'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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

  type View = 'login' | 'registerRole' | 'registerParent' | 'registerStudent' | 'forgot';
  const [view, setView] = useState<View>('login');
  const [anim, setAnim] = useState<'enter' | 'exit'>('enter');
  const pendingView = useRef<View | null>(null);

  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<'parent' | 'student'>('student');
  const [email, setEmail] = useState(() => (process.env.NODE_ENV === 'production' ? '' : DEMO_STUDENT_EMAIL));
  const [password, setPassword] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [needResendConfirm, setNeedResendConfirm] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');

  const switchView = (nextView: View, opts?: { force?: boolean; keepInfo?: boolean }) => {
    if (busy && !opts?.force) return;
    setError(null);
    if (!opts?.keepInfo) setInfo(null);
    setNeedResendConfirm(false);
    pendingView.current = nextView;
    setAnim('exit');
  };

  useEffect(() => {
    if (anim !== 'exit') return;
    const t = window.setTimeout(() => {
      const nextView = pendingView.current;
      if (nextView) setView(nextView);
      pendingView.current = null;
      setAnim('enter');
    }, 220);
    return () => window.clearTimeout(t);
  }, [anim]);

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

  const submitLoginOrRegister = async () => {
    setError(null);
    setInfo(null);
    setNeedResendConfirm(false);
    setBusy(true);
    try {
      const isRegister = view === 'registerParent' || view === 'registerStudent';
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
      const registerRole = view === 'registerParent' ? 'parent' : view === 'registerStudent' ? 'student' : role;
      const payload = isRegister
        ? {
            displayName: displayName.trim(),
            role: registerRole,
            email: registerRole === 'parent' ? email : '',
            password,
          }
        : { email, password };

      const res = await fetch(endpoint, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(payload),
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
      if (!isRegister) {
        goNextByRole(body?.user?.role);
        return;
      }
      if (body?.autoLoggedIn) {
        goNextByRole(body?.user?.role);
        return;
      }
      setInfo('Аккаунт создан. Мы отправили письма с паролем и ссылкой подтверждения. Сначала подтверди почту, затем войди.');
      switchView('login', { force: true, keepInfo: true });
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
        credentials: 'include',
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
        credentials: 'include',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ email: targetEmail }),
      });
      await res.json().catch(() => ({}));
      setInfo('Если почта существует — мы отправили письмо с инструкциями.');
      setPassword('');
      switchView('login', { force: true, keepInfo: true });
    } catch {
      setError('Ошибка сети');
    } finally {
      setBusy(false);
    }
  };

  const cardClass = useMemo(
    () => `card-elevated p-6 md:p-8 space-y-5 ${anim === 'enter' ? 'animate-auth-enter' : 'animate-auth-exit'}`,
    [anim],
  );

  const title =
    view === 'login' ? 'Войти' : view === 'forgot' ? 'Восстановление пароля' : view === 'registerRole' ? 'Регистрация' : 'Регистрация';

  const canSubmit = (() => {
    if (view === 'forgot') return !!forgotEmail.trim();
    if (view === 'registerParent') return !!password && password.length >= 6 && !!displayName.trim() && !!email.trim();
    if (view === 'registerStudent') return !!password && password.length >= 6 && !!displayName.trim();
    return !!email.trim() && !!password;
  })();

  const onPrimary = async () => {
    if (view === 'forgot') return forgotPassword(forgotEmail.trim().toLowerCase());
    return submitLoginOrRegister();
  };

  const outlineBtn =
    'w-full rounded-2xl border border-border/60 bg-transparent px-4 py-2 text-sm font-semibold hover:bg-muted transition-colors';

  return (
    <div className="min-h-screen flex items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-md">
        <div className={cardClass}>
          <div>
            <h1 className="text-2xl font-extrabold">{title}</h1>
          </div>

          {view === 'registerRole' ? (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">Выберите роль</div>
              <div className="grid grid-cols-1 gap-3">
                <button
                  type="button"
                  className="btn-primary w-full"
                  onClick={() => {
                    setRole('parent');
                    switchView('registerParent');
                  }}
                  disabled={busy}
                >
                  Я родитель
                </button>
                <button
                  type="button"
                  className="btn-accent w-full"
                  onClick={() => {
                    setRole('student');
                    switchView('registerStudent');
                  }}
                  disabled={busy}
                >
                  Я ученик
                </button>
              </div>
              <button type="button" className={outlineBtn} onClick={() => switchView('login')} disabled={busy}>
                Назад
              </button>
            </div>
          ) : view === 'registerParent' || view === 'registerStudent' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm text-muted-foreground">{view === 'registerParent' ? 'Роль: Родитель' : 'Роль: Ученик'}</div>
                <button type="button" className={outlineBtn} onClick={() => switchView('registerRole')} disabled={busy}>
                  Назад
                </button>
              </div>

              <label className="block text-sm font-medium">
                Ваше имя
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="mt-1 h-10 w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Например: Антон"
                  autoComplete="name"
                />
              </label>

              {view === 'registerParent' ? (
                <label className="block text-sm font-medium">
                  Email
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 h-10 w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm"
                    placeholder="you@example.com"
                    autoComplete="email"
                    inputMode="email"
                  />
                </label>
              ) : (
                <div className="text-xs text-muted-foreground">Для ученика почта не нужна — аккаунт создаётся сразу.</div>
              )}

              <label className="block text-sm font-medium">
                Пароль
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 h-10 w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm"
                  type="password"
                  autoComplete="new-password"
                />
              </label>
            </div>
          ) : view === 'forgot' ? (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">Введи почту — мы отправим новый пароль.</div>
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
            </div>
          ) : (
            <div className="space-y-3">
              <label className="block text-sm font-medium">
                Email
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 h-10 w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm"
                  placeholder="you@example.com"
                  autoComplete="email"
                  inputMode="email"
                />
              </label>

              <label className="block text-sm font-medium">
                Пароль
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 h-10 w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm"
                  type="password"
                  autoComplete="current-password"
                />
              </label>
            </div>
          )}

          {info ? <div className="text-sm text-foreground">{info}</div> : null}
          {error ? <div className="text-sm text-destructive">{error}</div> : null}

          {view === 'registerRole' ? null : (
            <button type="button" className="btn-primary w-full" onClick={onPrimary} disabled={busy || !canSubmit}>
              {busy ? '...' : view === 'login' ? 'Войти' : view === 'forgot' ? 'Отправить' : 'Создать аккаунт'}
            </button>
          )}

          {view === 'login' ? (
            <div className="flex flex-col gap-2">
              <button
                type="button"
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => {
                  setForgotEmail((email || '').trim());
                  switchView('forgot');
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

          {process.env.NODE_ENV === 'production' || view !== 'login' ? null : (
            <div className="space-y-2">
              <button type="button" className="btn-accent w-full" onClick={quickLoginStudent} disabled={busy}>
                Быстрый вход как ученик (dev)
              </button>
              <button type="button" className="btn-accent w-full" onClick={quickLoginAdmin} disabled={busy}>
                Быстрый вход как админ (dev)
              </button>
            </div>
          )}

          <div className="space-y-2">
            {view !== 'login' ? (
              <button
                type="button"
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => switchView('login')}
              >
                Уже есть аккаунт? Войти
              </button>
            ) : (
              <button
                type="button"
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => switchView('registerRole')}
              >
                Нет аккаунта? Зарегистрироваться
              </button>
            )}

            {view !== 'forgot' ? null : (
              <button
                type="button"
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => switchView('login')}
              >
                ← назад ко входу
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


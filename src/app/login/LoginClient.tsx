'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';

function friendlyAuthError(code: unknown): string {
  const c = typeof code === 'string' ? code : '';
  if (c === 'invalid_credentials') return 'Неверная почта или пароль';
  if (c === 'email_not_verified') return 'Почта не подтверждена. Нажми “Подтвердить почту” и введи код из письма.';
  if (c === 'invalid_input') return 'Проверь, что почта и пароль заполнены корректно';
  if (c === 'db_unavailable') return 'Сервер базы данных перезапускается. Попробуй ещё раз через 30–60 секунд.';
  if (c === 'email_taken') return 'Этот email уже занят';
  if (c === 'email_send_failed') return 'Не удалось отправить письмо. Проверь настройки почты и повтори.';
  if (c === 'invalid_or_expired_token') return 'Неверный код или он устарел';
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

  type View =
    | 'login'
    | 'registerRole'
    | 'registerParentDetails'
    | 'registerParentCode'
    | 'registerParentPassword'
    | 'registerStudent'
    | 'forgot';
  const [view, setView] = useState<View>('login');
  const [anim, setAnim] = useState<'enter' | 'exit'>('enter');
  const pendingView = useRef<View | null>(null);

  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<'parent' | 'student'>('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [emailCode, setEmailCode] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [needResendConfirm, setNeedResendConfirm] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const showDevTools = process.env.NODE_ENV !== 'production';
  const [devMenuOpen, setDevMenuOpen] = useState(false);
  const devMenuRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    if (!devMenuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDevMenuOpen(false);
    };
    const onMouseDown = (e: MouseEvent) => {
      const el = devMenuRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) setDevMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('mousedown', onMouseDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('mousedown', onMouseDown);
    };
  }, [devMenuOpen]);

  useEffect(() => {
    if (view !== 'login' && devMenuOpen) setDevMenuOpen(false);
  }, [view, devMenuOpen]);

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
      const isRegister = view === 'registerParentPassword' || view === 'registerStudent';
      if (isRegister) {
        if (!passwordOk) {
          setError('Пароль не соответствует требованиям');
          return;
        }
        const p1 = password;
        const p2 = passwordConfirm;
        if (!p2 || p1 !== p2) {
          setError('Пароли не совпадают');
          return;
        }
      }
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
      const registerRole = view === 'registerStudent' ? 'student' : role;
      const payload = isRegister
        ? {
            displayName: displayName.trim(),
            role: registerRole,
            email: registerRole === 'parent' ? email : '',
            emailCode: registerRole === 'parent' ? emailCode.trim() : '',
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
      if (body?.needsLogin) {
        setInfo('Аккаунт создан. Теперь войди с почтой и паролем.');
      } else if (body?.needsEmailConfirm) {
        setInfo('Аккаунт создан. Подтверди почту, затем войди.');
      } else {
        setInfo('Аккаунт создан. Теперь войди.');
      }
      switchView('login', { force: true, keepInfo: true });
      setPassword('');
    } catch {
      setError('Ошибка сети');
    } finally {
      setBusy(false);
    }
  };

  const requestParentEmailCode = async () => {
    setError(null);
    setInfo(null);
    setNeedResendConfirm(false);
    setBusy(true);
    try {
      const res = await fetch('/api/auth/register/request-code', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ displayName: displayName.trim(), email: email.trim().toLowerCase() }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(friendlyAuthError(body?.error || body?.message));
        return;
      }
      setInfo('Мы отправили код на почту. Введи его ниже.');
      const devCode = typeof body?.devCode === 'string' ? body.devCode : '';
      setEmailCode(devCode ? String(devCode).trim().toUpperCase() : '');
      switchView('registerParentCode', { force: true, keepInfo: true });
    } catch {
      setError('Ошибка сети');
    } finally {
      setBusy(false);
    }
  };

  const verifyParentEmailCode = async () => {
    setError(null);
    setInfo(null);
    setNeedResendConfirm(false);
    setBusy(true);
    try {
      const res = await fetch('/api/auth/register/verify-code', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), code: emailCode.trim() }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(friendlyAuthError(body?.error || body?.message));
        return;
      }
      setInfo('Почта подтверждена. Теперь придумай пароль.');
      setPassword('');
      setPasswordConfirm('');
      switchView('registerParentPassword', { force: true, keepInfo: true });
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

  const subtitle =
    view === 'registerParentPassword'
      ? 'Почта подтверждена. Теперь придумай пароль.'
      : null;

  const authBtnBase =
    'w-full h-12 rounded-2xl px-6 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  const authBtnPrimary = `${authBtnBase} btn-primary`;
  const authBtnAccent = `${authBtnBase} btn-accent`;
  const authBtnGhost = `${authBtnBase} btn-ghost`;

  const passwordReq = useMemo(() => {
    const pw = password || '';
    return {
      len: pw.length >= 6,
      digit: /\d/.test(pw),
      upper: /[A-Z]/.test(pw),
      lower: /[a-z]/.test(pw),
    };
  }, [password]);

  const passwordOk = passwordReq.len && passwordReq.digit && passwordReq.upper && passwordReq.lower;

  const passwordsMismatch =
    (view === 'registerParentPassword' || view === 'registerStudent') && passwordConfirm.trim().length > 0 && passwordConfirm !== password;

  const canSubmit = (() => {
    if (view === 'forgot') return !!forgotEmail.trim();
    if (view === 'registerParentDetails') return !!displayName.trim() && !!email.trim();
    if (view === 'registerParentCode') return !!emailCode.trim();
    if (view === 'registerParentPassword')
      return (
        !!password &&
        passwordOk &&
        !!passwordConfirm &&
        passwordConfirm === password &&
        !!displayName.trim() &&
        !!email.trim()
      );
    if (view === 'registerStudent')
      return !!password && passwordOk && !!passwordConfirm && passwordConfirm === password && !!displayName.trim();
    return !!email.trim() && !!password;
  })();

  const onPrimary = async () => {
    if (view === 'forgot') return forgotPassword(forgotEmail.trim().toLowerCase());
    if (view === 'registerParentDetails') return requestParentEmailCode();
    if (view === 'registerParentCode') return verifyParentEmailCode();
    return submitLoginOrRegister();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-md">
        <div className={cardClass}>
          <div>
            <h1 className="text-2xl font-extrabold">{title}</h1>
            {subtitle ? <div className="mt-1 text-sm text-muted-foreground">{subtitle}</div> : null}
          </div>

          {view === 'registerRole' ? (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">Выберите роль</div>
              <div className="grid grid-cols-1 gap-3">
                <button
                  type="button"
                  className={authBtnPrimary}
                  onClick={() => {
                    setRole('parent');
                    setDisplayName('');
                    setEmail('');
                    setPassword('');
                    setPasswordConfirm('');
                    setEmailCode('');
                    switchView('registerParentDetails');
                  }}
                  disabled={busy}
                >
                  Я родитель
                </button>
                <button
                  type="button"
                  className={authBtnAccent}
                  onClick={() => {
                    setRole('student');
                    setDisplayName('');
                    setEmail('');
                    setPassword('');
                    setPasswordConfirm('');
                    setEmailCode('');
                    switchView('registerStudent');
                  }}
                  disabled={busy}
                >
                  Я ученик
                </button>
              </div>
              <button type="button" className={authBtnGhost} onClick={() => switchView('login')} disabled={busy}>
                Назад
              </button>
            </div>
          ) : view === 'registerParentDetails' ? (
            <div className="space-y-3">
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
            </div>
          ) : view === 'registerParentCode' ? (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">Введи код из письма</div>
              <label className="block text-sm font-medium">
                Код
                <input
                  value={emailCode}
                  onChange={(e) => setEmailCode(e.target.value.toUpperCase())}
                  className="mt-1 h-10 w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm tracking-widest"
                  placeholder="например: A1B2C3D4"
                  autoComplete="one-time-code"
                  inputMode="text"
                />
              </label>
              <button type="button" className={authBtnGhost} onClick={requestParentEmailCode} disabled={busy || !email.trim()}>
                Отправить код ещё раз
              </button>
            </div>
          ) : view === 'registerParentPassword' ? (
            <div className="space-y-3">
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

              <label className="block text-sm font-medium">
                Подтвердить пароль
                <input
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  className="mt-1 h-10 w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm"
                  type="password"
                  autoComplete="new-password"
                />
              </label>

              <div className="text-xs">
                <div className="text-muted-foreground">Требования к паролю:</div>
                <ul className="mt-1 list-disc pl-5 space-y-1">
                  <li className={passwordReq.len ? 'text-success' : 'text-muted-foreground'}>Минимум 6 символов</li>
                  <li className={passwordReq.digit ? 'text-success' : 'text-muted-foreground'}>Имеет хотя бы 1 цифру</li>
                  <li className={passwordReq.upper ? 'text-success' : 'text-muted-foreground'}>Имеет хотя бы 1 большую букву</li>
                  <li className={passwordReq.lower ? 'text-success' : 'text-muted-foreground'}>Имеет хотя бы 1 маленькую букву</li>
                </ul>
              </div>

              {passwordsMismatch ? <div className="text-xs text-destructive">Пароли не совпадают</div> : null}
            </div>
          ) : view === 'registerStudent' ? (
            <div className="space-y-3">
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

              <label className="block text-sm font-medium">
                Подтвердить пароль
                <input
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  className="mt-1 h-10 w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm"
                  type="password"
                  autoComplete="new-password"
                />
              </label>

              <div className="text-xs">
                <div className="text-muted-foreground">Требования к паролю:</div>
                <ul className="mt-1 list-disc pl-5 space-y-1">
                  <li className={passwordReq.len ? 'text-success' : 'text-muted-foreground'}>Минимум 6 символов</li>
                  <li className={passwordReq.digit ? 'text-success' : 'text-muted-foreground'}>Имеет хотя бы 1 цифру</li>
                  <li className={passwordReq.upper ? 'text-success' : 'text-muted-foreground'}>Имеет хотя бы 1 большую букву</li>
                  <li className={passwordReq.lower ? 'text-success' : 'text-muted-foreground'}>Имеет хотя бы 1 маленькую букву</li>
                </ul>
              </div>

              {passwordsMismatch ? <div className="text-xs text-destructive">Пароли не совпадают</div> : null}
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
            <button type="button" className={authBtnPrimary} onClick={onPrimary} disabled={busy || !canSubmit}>
              {busy
                ? '...'
                : view === 'login'
                  ? 'Войти'
                  : view === 'forgot'
                    ? 'Отправить'
                    : view === 'registerParentDetails'
                      ? 'Подтвердить почту'
                      : view === 'registerParentCode'
                        ? 'Подтвердить код'
                        : 'Создать аккаунт'}
            </button>
          )}

          {view === 'registerParentDetails' ? (
            <button type="button" className={authBtnGhost} onClick={() => switchView('registerRole')} disabled={busy}>
              Назад
            </button>
          ) : view === 'registerParentCode' ? (
            <button type="button" className={authBtnGhost} onClick={() => switchView('registerParentDetails')} disabled={busy}>
              Назад
            </button>
          ) : view === 'registerParentPassword' || view === 'registerStudent' ? (
            <button type="button" className={authBtnGhost} onClick={() => switchView('registerRole')} disabled={busy}>
              Назад
            </button>
          ) : null}

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
          </div>
        </div>
      </div>

      {showDevTools && view === 'login' ? (
        <div className="fixed bottom-4 right-4 z-50" ref={devMenuRef}>
          {devMenuOpen ? (
            <div className="mb-2 w-72 rounded-2xl border border-border/60 bg-card/95 shadow-xl backdrop-blur p-3 space-y-2">
              <div className="text-xs font-semibold text-muted-foreground">Dev вход</div>
              <button type="button" className={authBtnAccent} onClick={quickLoginStudent} disabled={busy}>
                Быстрый вход как ученик
              </button>
              <button type="button" className={authBtnAccent} onClick={quickLoginAdmin} disabled={busy}>
                Быстрый вход как админ
              </button>
            </div>
          ) : null}

          <button
            type="button"
            className="h-12 w-12 rounded-2xl border border-border/60 bg-card shadow-xl hover:bg-muted transition-colors grid place-items-center"
            aria-label={devMenuOpen ? 'Закрыть dev-меню' : 'Открыть dev-меню'}
            aria-expanded={devMenuOpen}
            onClick={() => setDevMenuOpen((v) => !v)}
            disabled={busy}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      ) : null}
    </div>
  );
}


'use client';

import { useEffect, useState } from 'react';

type Me = {
  id: string;
  email: string;
  displayName?: string | null;
};

export default function SettingsPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/auth/me', { method: 'GET', credentials: 'include', cache: 'no-store' });
        const body: any = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setError('Не удалось загрузить профиль');
          return;
        }
        const u = body?.user ?? null;
        setMe(u);
        setDisplayName(String(u?.displayName ?? '').trim());
        setNewEmail(String(u?.email ?? '').trim());
      } catch {
        if (cancelled) return;
        setError('Ошибка сети');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const call = async (url: string, payload: any) => {
    setInfo(null);
    setError(null);
    const res = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(payload),
    });
    const body: any = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body?.error || body?.message || 'request_failed');
    return body;
  };

  const saveName = async () => {
    try {
      await call('/api/auth/update-profile', { displayName });
      setInfo('Имя сохранено');
    } catch (e: any) {
      setError(e?.message || 'Не удалось сохранить имя');
    }
  };

  const saveEmail = async () => {
    try {
      await call('/api/auth/change-email', { email: newEmail, password: emailPassword });
      setInfo('Письмо для подтверждения нового email отправлено. Пожалуйста, подтвердите почту и войдите заново.');
      setEmailPassword('');
    } catch (e: any) {
      setError(e?.message === 'email_taken' ? 'Этот email уже занят' : e?.message || 'Не удалось изменить email');
    }
  };

  const savePassword = async () => {
    try {
      await call('/api/auth/change-password', { oldPassword, newPassword });
      setInfo('Пароль изменён');
      setOldPassword('');
      setNewPassword('');
    } catch (e: any) {
      setError(e?.message === 'invalid_old_password' ? 'Старый пароль неверный' : e?.message || 'Не удалось изменить пароль');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen py-6 px-4 md:py-10 md:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="card-elevated p-6">Загрузка…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-6 px-4 md:py-10 md:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Настройки</h1>
          <p className="text-muted-foreground">Профиль и безопасность</p>
        </div>

        {info ? <div className="card-elevated p-4 text-sm text-foreground">{info}</div> : null}
        {error ? <div className="card-elevated p-4 text-sm text-destructive">{error}</div> : null}

        <div className="card-elevated p-6 space-y-4">
          <h2 className="text-lg font-bold">Имя</h2>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="h-10 w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm"
            placeholder="Как к тебе обращаться"
          />
          <button type="button" className="btn-primary" onClick={saveName} disabled={!displayName.trim()}>
            Сохранить
          </button>
        </div>

        <div className="card-elevated p-6 space-y-4">
          <h2 className="text-lg font-bold">Почта</h2>
          <div className="text-sm text-muted-foreground">
            Текущая: <span className="font-semibold text-foreground">{me?.email ?? '—'}</span>
          </div>
          <input
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="h-10 w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm"
            placeholder="new@example.com"
            autoComplete="email"
          />
          <input
            value={emailPassword}
            onChange={(e) => setEmailPassword(e.target.value)}
            className="h-10 w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm"
            placeholder="Пароль (для подтверждения)"
            type="password"
            autoComplete="current-password"
          />
          <button type="button" className="btn-primary" onClick={saveEmail} disabled={!newEmail.trim() || !emailPassword}>
            Изменить почту
          </button>
        </div>

        <div className="card-elevated p-6 space-y-4">
          <h2 className="text-lg font-bold">Пароль</h2>
          <input
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            className="h-10 w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm"
            placeholder="Старый пароль"
            type="password"
            autoComplete="current-password"
          />
          <input
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="h-10 w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm"
            placeholder="Новый пароль (минимум 6 символов)"
            type="password"
            autoComplete="new-password"
          />
          <button type="button" className="btn-primary" onClick={savePassword} disabled={!oldPassword || newPassword.length < 6}>
            Изменить пароль
          </button>
        </div>
      </div>
    </div>
  );
}


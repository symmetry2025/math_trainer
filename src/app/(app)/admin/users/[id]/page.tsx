'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

type UserDto = {
  id: string;
  email: string;
  displayName: string | null;
  role: 'student' | 'parent' | 'admin';
  emailVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export default function AdminUserPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = useMemo(() => String(params?.id || '').trim(), [params]);

  const [u, setU] = useState<UserDto | null>(null);
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<'student' | 'parent' | 'admin'>('student');
  const [emailVerified, setEmailVerified] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setBusy(true);
      setError(null);
      try {
        const res = await fetch(`/api/admin/users/${encodeURIComponent(id)}`, { method: 'GET', credentials: 'include', cache: 'no-store' });
        const body: any = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setError(body?.error || 'Не удалось загрузить пользователя');
          return;
        }
        const user: UserDto | null = body?.user ?? null;
        setU(user);
        setEmail(String(user?.email ?? ''));
        setDisplayName(String(user?.displayName ?? ''));
        setRole((user?.role as any) || 'student');
        setEmailVerified(!!user?.emailVerifiedAt);
      } catch {
        if (cancelled) return;
        setError('Ошибка сети');
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const save = async () => {
    setSaving(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(id)}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          displayName: displayName.trim(),
          role,
          emailVerified,
          ...(newPassword.trim() ? { newPassword } : {}),
        }),
      });
      const body: any = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          body?.error === 'email_taken'
            ? 'Email уже занят'
            : body?.error === 'invalid_password'
              ? 'Пароль должен быть минимум 6 символов'
              : body?.error || 'Не удалось сохранить',
        );
        return;
      }
      const user: UserDto | null = body?.user ?? null;
      setU(user);
      setInfo('Сохранено');
      setNewPassword('');
    } catch {
      setError('Ошибка сети');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen py-6 px-4 md:py-10 md:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Пользователь</h1>
            <p className="text-muted-foreground">
              <Link href="/admin/users" className="text-primary hover:underline">
                ← назад к списку
              </Link>
            </p>
          </div>
          <button
            type="button"
            className="rounded-2xl border border-border/60 bg-card px-4 py-2 text-sm font-semibold hover:bg-muted transition-colors"
            onClick={() => router.refresh()}
            disabled={busy || saving}
          >
            Обновить
          </button>
        </div>

        {error ? <div className="card-elevated p-4 text-sm text-destructive">{error}</div> : null}
        {info ? <div className="card-elevated p-4 text-sm">{info}</div> : null}
        {busy ? <div className="card-elevated p-4 text-sm">Загрузка…</div> : null}

        {!busy && u ? (
          <div className="card-elevated p-6 space-y-5">
            <div className="grid gap-4">
              <label className="block text-sm font-medium">
                Email
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 h-10 w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm"
                  autoComplete="off"
                />
              </label>

              <label className="block text-sm font-medium">
                Имя
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="mt-1 h-10 w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm"
                  placeholder="—"
                />
              </label>

              <label className="block text-sm font-medium">
                Роль
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="mt-1 h-10 w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="student">student</option>
                  <option value="parent">parent</option>
                  <option value="admin">admin</option>
                </select>
              </label>

              <label className="flex items-center gap-3 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={emailVerified}
                  onChange={(e) => setEmailVerified(e.target.checked)}
                  className="h-4 w-4"
                />
                Почта подтверждена
              </label>

              <div className="pt-2 border-t border-border/40">
                <label className="block text-sm font-medium">
                  Установить новый пароль
                  <input
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="mt-1 h-10 w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm"
                    placeholder="Минимум 6 символов"
                    type="password"
                    autoComplete="new-password"
                  />
                </label>
                <p className="text-xs text-muted-foreground mt-1">После смены пароля все активные сессии пользователя будут сброшены.</p>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between gap-3">
              <div className="text-xs text-muted-foreground">
                Создан: {new Date(u.createdAt).toLocaleString()} • Обновлён: {new Date(u.updatedAt).toLocaleString()}
              </div>
              <button type="button" className="btn-primary" onClick={save} disabled={saving}>
                {saving ? '...' : 'Сохранить'}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}


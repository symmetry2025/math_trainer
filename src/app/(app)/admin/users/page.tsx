'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type UserRow = {
  id: string;
  email: string;
  displayName: string | null;
  role: 'student' | 'parent' | 'admin';
  emailVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export default function AdminUsersPage() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setBusy(true);
      setError(null);
      try {
        const res = await fetch('/api/admin/users', { method: 'GET', credentials: 'include', cache: 'no-store' });
        const body: any = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setError(body?.error || 'Не удалось загрузить пользователей');
          return;
        }
        setRows(Array.isArray(body?.users) ? body.users : []);
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
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((u) => (u.email || '').toLowerCase().includes(s) || (u.displayName || '').toLowerCase().includes(s) || u.id.includes(s));
  }, [rows, q]);

  return (
    <div className="min-h-screen py-6 px-4 md:py-10 md:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Пользователи</h1>
            <p className="text-muted-foreground">Мини‑админка</p>
          </div>

          <div className="w-full max-w-sm">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="h-10 w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm"
              placeholder="Поиск по email / имени / id"
            />
          </div>
        </div>

        {error ? <div className="card-elevated p-4 text-sm text-destructive">{error}</div> : null}
        {busy ? <div className="card-elevated p-4 text-sm">Загрузка…</div> : null}

        {!busy ? (
          <div className="card-elevated overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-[860px] w-full text-sm">
                <thead className="bg-muted/40">
                  <tr className="text-left">
                    <th className="px-4 py-3 font-semibold">Email</th>
                    <th className="px-4 py-3 font-semibold">Имя</th>
                    <th className="px-4 py-3 font-semibold">Роль</th>
                    <th className="px-4 py-3 font-semibold">Почта</th>
                    <th className="px-4 py-3 font-semibold">Создан</th>
                    <th className="px-4 py-3 font-semibold">ID</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => (
                    <tr key={u.id} className="border-t border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <Link className="text-primary hover:underline" href={`/admin/users/${u.id}`}>
                          {u.email}
                        </Link>
                      </td>
                      <td className="px-4 py-3">{u.displayName || <span className="text-muted-foreground">—</span>}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full bg-muted px-2 py-0.5 font-semibold">{u.role}</span>
                      </td>
                      <td className="px-4 py-3">
                        {u.emailVerifiedAt ? (
                          <span className="inline-flex rounded-full bg-primary/10 text-primary px-2 py-0.5 font-semibold">подтверждена</span>
                        ) : (
                          <span className="inline-flex rounded-full bg-destructive/10 text-destructive px-2 py-0.5 font-semibold">не подтверждена</span>
                        )}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-muted-foreground">{new Date(u.createdAt).toLocaleString()}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{u.id}</td>
                    </tr>
                  ))}
                  {!filtered.length ? (
                    <tr>
                      <td className="px-4 py-6 text-muted-foreground" colSpan={6}>
                        Ничего не найдено
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}


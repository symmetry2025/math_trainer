'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type Row = {
  promoter: {
    id: string;
    userId: string;
    code: string;
    displayName?: string;
    userEmail?: string;
  };
  counts: { registrations: number; paid: number };
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object';
}

export default function AdminPromotersPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');

  const [createEmail, setCreateEmail] = useState('');
  const [createUserId, setCreateUserId] = useState('');
  const [createCode, setCreateCode] = useState('');
  const [createName, setCreateName] = useState('');
  const [createBusy, setCreateBusy] = useState(false);
  const [createInfo, setCreateInfo] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  const refresh = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/promoters', { method: 'GET', credentials: 'include', cache: 'no-store' });
      const body: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = isRecord(body) && typeof body.error === 'string' ? body.error : null;
        setError(msg || 'Не удалось загрузить промоутеров');
        return;
      }
      const items = isRecord(body) && Array.isArray(body.items) ? (body.items as Row[]) : [];
      setRows(items);
    } catch {
      setError('Ошибка сети');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await refresh();
    })().catch(() => undefined);
    return () => {
      cancelled = true;
      void cancelled;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => {
      const p = r.promoter;
      return (
        (p.code || '').toLowerCase().includes(s) ||
        (p.displayName || '').toLowerCase().includes(s) ||
        (p.userEmail || '').toLowerCase().includes(s) ||
        (p.userId || '').includes(s) ||
        (p.id || '').includes(s)
      );
    });
  }, [rows, q]);

  const createPromoter = async (): Promise<void> => {
    setCreateBusy(true);
    setCreateInfo(null);
    setCreateError(null);
    try {
      const payload: Record<string, unknown> = { code: createCode.trim(), displayName: createName.trim() || undefined };
      if (createUserId.trim()) payload.userId = createUserId.trim();
      if (createEmail.trim()) payload.email = createEmail.trim().toLowerCase();
      const res = await fetch('/api/admin/promoters', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = isRecord(body) && typeof body.error === 'string' ? body.error : null;
        setCreateError(
          msg === 'code_taken'
            ? 'Код уже занят'
            : msg === 'user_not_found'
              ? 'Пользователь не найден (укажи корректный User ID или email)'
              : msg === 'email_send_failed'
                ? 'Не удалось отправить письмо с доступом (проверь SMTP)'
              : msg || 'Не удалось создать промоутера',
        );
        return;
      }
      setCreateInfo('Промоутер создан');
      setCreateEmail('');
      setCreateUserId('');
      setCreateCode('');
      setCreateName('');
      await refresh();
    } catch {
      setCreateError('Ошибка сети');
    } finally {
      setCreateBusy(false);
    }
  };

  return (
    <div className="min-h-screen py-6 px-4 md:py-10 md:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Промоутеры</h1>
            <p className="text-muted-foreground">Реферальные ссылки</p>
          </div>

          <div className="w-full max-w-sm">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="h-10 w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm"
              placeholder="Поиск по коду / email / имени / id"
            />
          </div>
        </div>

        <div className="card-elevated p-4 md:p-6 space-y-3">
          <div className="font-semibold">Создать промоутера</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              value={createCode}
              onChange={(e) => setCreateCode(e.target.value)}
              className="h-10 w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm"
              placeholder="Код (например: blogger_ivan)"
            />
            <input
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              className="h-10 w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm"
              placeholder="Имя (опционально)"
            />
            <input
              value={createEmail}
              onChange={(e) => setCreateEmail(e.target.value)}
              className="h-10 w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm"
              placeholder="Email пользователя (если нет — создадим и отправим письмо)"
            />
            <input
              value={createUserId}
              onChange={(e) => setCreateUserId(e.target.value)}
              className="h-10 w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm"
              placeholder="User ID (реальный id из админки, опционально)"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              disabled={createBusy}
              onClick={createPromoter}
              className="h-10 px-4 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60"
            >
              {createBusy ? 'Создание…' : 'Создать'}
            </button>
            {createInfo ? <div className="text-sm text-success">{createInfo}</div> : null}
            {createError ? <div className="text-sm text-destructive">{createError}</div> : null}
          </div>
          <div className="text-xs text-muted-foreground">
            Если email уже зарегистрирован — промоутер привяжется к этому пользователю.
            Если email ещё нет — создадим пользователя‑промоутера и отправим письмо с доступом.
          </div>
        </div>

        {error ? <div className="card-elevated p-4 text-sm text-destructive">{error}</div> : null}
        {busy ? <div className="card-elevated p-4 text-sm">Загрузка…</div> : null}

        {!busy ? (
          <div className="card-elevated overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-[980px] w-full text-sm">
                <thead className="bg-muted/40">
                  <tr className="text-left">
                    <th className="px-4 py-3 font-semibold">Код</th>
                    <th className="px-4 py-3 font-semibold">Имя</th>
                    <th className="px-4 py-3 font-semibold">Email</th>
                    <th className="px-4 py-3 font-semibold">Зарегистр.</th>
                    <th className="px-4 py-3 font-semibold">Оплатили</th>
                    <th className="px-4 py-3 font-semibold">Конверсия</th>
                    <th className="px-4 py-3 font-semibold">User ID</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => {
                    const conv = r.counts.registrations ? Math.round((r.counts.paid / r.counts.registrations) * 100) : 0;
                    return (
                      <tr key={r.promoter.id} className="border-t border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <Link className="text-primary hover:underline font-mono" href={`/admin/promoters/${r.promoter.id}`}>
                            {r.promoter.code}
                          </Link>
                        </td>
                        <td className="px-4 py-3">{r.promoter.displayName || <span className="text-muted-foreground">—</span>}</td>
                        <td className="px-4 py-3 font-mono text-xs">{r.promoter.userEmail || <span className="text-muted-foreground">—</span>}</td>
                        <td className="px-4 py-3 tabular-nums">{r.counts.registrations}</td>
                        <td className="px-4 py-3 tabular-nums">{r.counts.paid}</td>
                        <td className="px-4 py-3 tabular-nums">{conv}%</td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.promoter.userId}</td>
                      </tr>
                    );
                  })}
                  {!filtered.length ? (
                    <tr>
                      <td className="px-4 py-6 text-muted-foreground" colSpan={7}>
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


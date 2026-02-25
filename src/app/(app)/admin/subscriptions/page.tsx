'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type SeatRow = {
  seatId: string;
  status: 'none' | 'active' | 'past_due' | 'cancelled';
  paidUntil: string | null;
  cpSubscriptionId: string | null;
  cpCardMask: string | null;
  billingUpdatedAt: string | null;
  createdAt: string;
  parent: { userId: string; email: string; displayName: string | null };
  assignedStudent: { userId: string; email: string; displayName: string | null } | null;
  assignedAt: string | null;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object';
}

function fmt(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function short(s: string, left = 6, right = 6): string {
  const v = String(s || '').trim();
  if (!v) return '—';
  if (v.length <= left + right + 3) return v;
  return `${v.slice(0, left)}…${v.slice(-right)}`;
}

export default function AdminSubscriptionsPage() {
  const [rows, setRows] = useState<SeatRow[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');

  const refresh = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/subscriptions', { method: 'GET', credentials: 'include', cache: 'no-store' });
      const body: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = isRecord(body) && typeof body.error === 'string' ? body.error : null;
        setError(msg || 'Не удалось загрузить подписки');
        return;
      }
      const seats = isRecord(body) && Array.isArray(body.seats) ? (body.seats as SeatRow[]) : [];
      setRows(seats);
    } catch {
      setError('Ошибка сети');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => {
      const parts = [
        r.seatId,
        r.status,
        r.cpSubscriptionId || '',
        r.cpCardMask || '',
        r.parent.userId,
        r.parent.email,
        r.parent.displayName || '',
        r.assignedStudent?.userId || '',
        r.assignedStudent?.email || '',
        r.assignedStudent?.displayName || '',
      ]
        .join(' ')
        .toLowerCase();
      return parts.includes(s);
    });
  }, [rows, q]);

  return (
    <div className="min-h-screen py-6 px-4 md:py-10 md:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Подписки</h1>
            <p className="text-muted-foreground">Все seat‑подписки (оплаты и назначения детям)</p>
          </div>

          <div className="w-full max-w-sm">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="h-10 w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm"
              placeholder="Поиск по email/id/seat/карте/статусу"
            />
          </div>
        </div>

        {error ? <div className="card-elevated p-4 text-sm text-destructive">{error}</div> : null}
        {busy ? <div className="card-elevated p-4 text-sm">Загрузка…</div> : null}

        {!busy ? (
          <div className="card-elevated overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-[1200px] w-full text-sm">
                <thead className="bg-muted/40">
                  <tr className="text-left">
                    <th className="px-4 py-3 font-semibold">Seat</th>
                    <th className="px-4 py-3 font-semibold">Статус</th>
                    <th className="px-4 py-3 font-semibold">Оплачено до</th>
                    <th className="px-4 py-3 font-semibold">Карта</th>
                    <th className="px-4 py-3 font-semibold">CP sub id</th>
                    <th className="px-4 py-3 font-semibold">Обновлено</th>
                    <th className="px-4 py-3 font-semibold">Родитель</th>
                    <th className="px-4 py-3 font-semibold">Ребёнок</th>
                    <th className="px-4 py-3 font-semibold">Назначено</th>
                    <th className="px-4 py-3 font-semibold">Создано</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => {
                    return (
                      <tr key={r.seatId} className="border-t border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground" title={r.seatId}>
                          {short(r.seatId, 8, 8)}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex rounded-full bg-muted px-2 py-0.5 font-semibold">{r.status}</span>
                        </td>
                        <td className="px-4 py-3 tabular-nums">{fmt(r.paidUntil)}</td>
                        <td className="px-4 py-3 font-mono text-xs">{r.cpCardMask || <span className="text-muted-foreground">—</span>}</td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground" title={r.cpSubscriptionId ?? ''}>
                          {r.cpSubscriptionId ? short(r.cpSubscriptionId, 8, 8) : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="px-4 py-3 tabular-nums">{fmt(r.billingUpdatedAt)}</td>
                        <td className="px-4 py-3">
                          <div className="space-y-0.5">
                            <Link className="text-primary hover:underline font-mono text-xs" href={`/admin/users/${encodeURIComponent(r.parent.userId)}`}>
                              {short(r.parent.userId, 8, 8)}
                            </Link>
                            <div className="text-xs text-muted-foreground">{r.parent.displayName || r.parent.email}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {r.assignedStudent ? (
                            <div className="space-y-0.5">
                              <Link
                                className="text-primary hover:underline font-mono text-xs"
                                href={`/admin/users/${encodeURIComponent(r.assignedStudent.userId)}`}
                              >
                                {short(r.assignedStudent.userId, 8, 8)}
                              </Link>
                              <div className="text-xs text-muted-foreground">{r.assignedStudent.displayName || r.assignedStudent.email}</div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 tabular-nums">{fmt(r.assignedAt)}</td>
                        <td className="px-4 py-3 tabular-nums">{fmt(r.createdAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {!filtered.length ? <div className="p-4 text-sm text-muted-foreground">Нет данных</div> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}


'use client';

import { useEffect, useMemo, useState } from 'react';

type Details = {
  promoter: {
    id: string;
    userId: string;
    code: string;
    displayName?: string;
    userEmail?: string;
    createdAt: string;
  };
  counts: { registrations: number; paid: number };
  referrals: Array<{
    userId: string;
    userEmail: string | null;
    userCreatedAt: string | null;
    attributedAt: string;
    firstPaidAt: string | null;
  }>;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object';
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function AdminPromoterDetailsPage(props: { params: { id: string } }) {
  const id = String(props?.params?.id || '').trim();
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Details | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setBusy(true);
      setError(null);
      try {
        const res = await fetch(`/api/admin/promoters/${encodeURIComponent(id)}`, { method: 'GET', credentials: 'include', cache: 'no-store' });
        const body: unknown = await res.json().catch(() => null);
        if (cancelled) return;
        if (!res.ok) {
          const msg = isRecord(body) && typeof body.error === 'string' ? body.error : null;
          setError(msg || 'Не удалось загрузить данные');
          return;
        }
        setData(body as Details);
      } catch {
        if (!cancelled) setError('Ошибка сети');
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const promoLink = useMemo(() => {
    const code = data?.promoter?.code;
    if (!code) return '';
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return origin ? `${origin}/?ref=${encodeURIComponent(code)}` : `/?ref=${encodeURIComponent(code)}`;
  }, [data?.promoter?.code]);

  const conv = useMemo(() => {
    const r = data?.counts?.registrations ?? 0;
    const p = data?.counts?.paid ?? 0;
    if (!r) return 0;
    return Math.round((p / r) * 100);
  }, [data?.counts?.registrations, data?.counts?.paid]);

  return (
    <div className="min-h-screen py-6 px-4 md:py-10 md:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Промоутер</h1>
          <p className="text-muted-foreground">{data?.promoter?.displayName || data?.promoter?.code || '—'}</p>
        </div>

        {error ? <div className="card-elevated p-4 text-sm text-destructive">{error}</div> : null}
        {busy ? <div className="card-elevated p-4 text-sm">Загрузка…</div> : null}

        {!busy && data ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="card-elevated p-4">
                <div className="text-2xl font-bold tabular-nums">{data.counts.registrations}</div>
                <div className="text-sm text-muted-foreground">Зарегистрировались</div>
              </div>
              <div className="card-elevated p-4">
                <div className="text-2xl font-bold tabular-nums">{data.counts.paid}</div>
                <div className="text-sm text-muted-foreground">Оплатили</div>
              </div>
              <div className="card-elevated p-4">
                <div className="text-2xl font-bold tabular-nums">{conv}%</div>
                <div className="text-sm text-muted-foreground">Конверсия</div>
              </div>
            </div>

            <div className="card-elevated p-4 md:p-6 space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-muted-foreground">Код</div>
                  <div className="font-mono">{data.promoter.code}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Email</div>
                  <div className="font-mono">{data.promoter.userEmail || '—'}</div>
                </div>
                <div className="md:col-span-2">
                  <div className="text-muted-foreground">Ссылка</div>
                  <div className="font-mono break-all text-xs">{promoLink}</div>
                </div>
              </div>
            </div>

            <div className="card-elevated overflow-hidden">
              <div className="px-4 py-3 border-b border-border/50">
                <div className="font-semibold">Рефералы</div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-[980px] w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr className="text-left">
                      <th className="px-4 py-3 font-semibold">Email</th>
                      <th className="px-4 py-3 font-semibold">Создан</th>
                      <th className="px-4 py-3 font-semibold">Атрибуция</th>
                      <th className="px-4 py-3 font-semibold">Первая оплата</th>
                      <th className="px-4 py-3 font-semibold">User ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.referrals.map((r) => (
                      <tr key={r.userId} className="border-t border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs">{r.userEmail || '—'}</td>
                        <td className="px-4 py-3 tabular-nums text-muted-foreground">{fmtDate(r.userCreatedAt)}</td>
                        <td className="px-4 py-3 tabular-nums text-muted-foreground">{fmtDate(r.attributedAt)}</td>
                        <td className="px-4 py-3 tabular-nums">
                          {r.firstPaidAt ? (
                            <span className="inline-flex rounded-full bg-success/20 text-success px-2 py-0.5 font-semibold">
                              {fmtDate(r.firstPaidAt)}
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full bg-muted px-2 py-0.5 font-semibold">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.userId}</td>
                      </tr>
                    ))}
                    {!data.referrals.length ? (
                      <tr>
                        <td className="px-4 py-6 text-muted-foreground" colSpan={5}>
                          Пока нет рефералов
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}


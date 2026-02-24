'use client';

import { useEffect, useMemo, useState } from 'react';

import { SubscriptionActivatedModal } from '../../../components/SubscriptionActivatedModal';

type SeatDto = {
  seatId: string;
  status: 'none' | 'active' | 'past_due' | 'cancelled';
  paidUntil: string | null;
  cpSubscriptionId: string | null;
  cpCardMask: string | null;
  billingUpdatedAt: string | null;
  assignedAt: string | null;
  assignedStudent: { userId: string; displayName: string | null; email: string | null } | null;
  createdAt: string;
};

type ChildDto = {
  userId: string;
  displayName: string | null;
  email: string | null;
};

type CpWidget = {
  pay: (
    action: 'charge',
    options: Record<string, unknown>,
    onSuccess: () => void | Promise<void>,
    onFail: () => void | Promise<void>,
  ) => void;
};

type CpGlobal = {
  CloudPayments: new () => CpWidget;
};

declare global {
  interface Window {
    cp?: CpGlobal;
  }
}

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

function isCloudPaymentsWidgetOpen(): boolean {
  if (typeof document === 'undefined') return false;
  // CloudPayments widget injects an overlay/iframe; we keep checks broad to avoid coupling to internals.
  const hasIframe = !!document.querySelector('iframe[src*="cloudpayments" i]');
  const hasKnownIdsOrClasses = !!document.querySelector(
    [
      '[id*="cloudpayments" i]',
      '[class*="cloudpayments" i]',
      '[class*="cp-widget" i]',
    ].join(','),
  );
  return hasIframe || hasKnownIdsOrClasses;
}

export function BillingClient(props: {
  me: { id: string; email: string; emailVerifiedAt: string | null | Date | undefined };
  cpPublicId: string;
  returnUrl: string;
  priceRub: number;
}) {
  const [seats, setSeats] = useState<SeatDto[]>([]);
  const [children, setChildren] = useState<ChildDto[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [showActivated, setShowActivated] = useState(false);
  const [pendingActivationNotice, setPendingActivationNotice] = useState(false);
  const [showActivatedWhenWidgetClosed, setShowActivatedWhenWidgetClosed] = useState(false);
  const [activatedPaidUntil, setActivatedPaidUntil] = useState<string | null>(null);
  const [pendingSeatId, setPendingSeatId] = useState<string | null>(null);

  const emailVerified = useMemo(() => {
    const v = props.me.emailVerifiedAt as any;
    if (!v) return false;
    if (v instanceof Date) return true;
    const s = typeof v === 'string' ? v.trim() : '';
    return !!s;
  }, [props.me.emailVerifiedAt]);

  const seatStatusLabel = useMemo(() => {
    const now = Date.now();
    const active = seats.filter((s) => {
      const paidUntilMs = s.paidUntil ? new Date(s.paidUntil).getTime() : 0;
      const hasPaid = Number.isFinite(paidUntilMs) && paidUntilMs > now;
      return hasPaid || (s.status === 'active' && !s.paidUntil);
    });
    return active.length ? `Активных подписок: ${active.length}` : 'Нет активных подписок';
  }, [seats]);

  const refreshSeats = async (): Promise<SeatDto[] | null> => {
    const res = await fetch('/api/billing/seats', { method: 'GET', credentials: 'include', cache: 'no-store' });
    const body: unknown = await res.json().catch(() => null);
    const list = isRecord(body) && Array.isArray((body as any).seats) ? ((body as any).seats as SeatDto[]) : null;
    if (res.ok && list) {
      setSeats(list);
      return list;
    }
    const code = isRecord(body) ? (body as any).error : null;
    if (code === 'email_not_verified') setError('Подтверди email, чтобы управлять подписками.');
    return null;
  };

  const ensureChildrenLoaded = async (): Promise<ChildDto[] | null> => {
    if (children) return children;
    const res = await fetch('/api/parent/children', { method: 'GET', credentials: 'include', cache: 'no-store' });
    const body: unknown = await res.json().catch(() => null);
    const raw = isRecord(body) && Array.isArray((body as any).children) ? ((body as any).children as any[]) : null;
    if (!res.ok || !raw) return null;
    const mapped: ChildDto[] = raw
      .map((c) => (isRecord(c) ? { userId: String((c as any).userId || ''), displayName: (c as any).displayName ?? null, email: (c as any).email ?? null } : null))
      .filter(Boolean) as ChildDto[];
    setChildren(mapped);
    return mapped;
  };

  useEffect(() => {
    refreshSeats().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!pendingActivationNotice) return;
    let cancelled = false;
    const startedAt = Date.now();

    // If widget callbacks don't fire (close/3DS flows), still poll webhooks result.
    (async () => {
      let last: SeatDto[] | null = null;
      while (!cancelled && Date.now() - startedAt < 120_000) {
        await new Promise((r) => setTimeout(r, 1500));
        last = await refreshSeats();
        const seat = pendingSeatId ? last?.find((s) => s.seatId === pendingSeatId) : null;
        if (seat?.status === 'active') {
          setInfo(null);
          setActivatedPaidUntil(seat.paidUntil ?? null);
          setShowActivatedWhenWidgetClosed(true);
          setPendingActivationNotice(false);
          return;
        }
      }
      if (!cancelled) {
        setInfo('Если статус не обновился — подожди минуту и обнови страницу.');
        setPendingActivationNotice(false);
      }
    })();

    // Don't keep UI in "busy" if form is closed without callbacks.
    const watchdog = window.setTimeout(() => {
      if (!cancelled) setBusy(false);
    }, 60_000);

    return () => {
      cancelled = true;
      window.clearTimeout(watchdog);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingActivationNotice, pendingSeatId]);

  useEffect(() => {
    if (!showActivatedWhenWidgetClosed) return;
    let cancelled = false;

    const tryShow = () => {
      if (cancelled) return;
      if (!isCloudPaymentsWidgetOpen()) {
        setShowActivated(true);
        setShowActivatedWhenWidgetClosed(false);
      }
    };

    tryShow();
    const interval = window.setInterval(tryShow, 300);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [showActivatedWhenWidgetClosed]);

  useEffect(() => {
    // Lazy-load CloudPayments widget script.
    const id = 'cp-widget';
    if (document.getElementById(id)) return;
    const s = document.createElement('script');
    s.id = id;
    s.async = true;
    s.src = 'https://widget.cloudpayments.ru/bundles/cloudpayments.js';
    document.head.appendChild(s);
  }, []);

  const startPayment = async () => {
    setError(null);
    setInfo(null);

    if (!props.cpPublicId) {
      setError('Не настроен Public ID платежного провайдера');
      return;
    }
    if (!window.cp?.CloudPayments) {
      setError('Платёжная форма ещё загружается. Попробуй снова через пару секунд.');
      return;
    }
    if (!emailVerified) {
      setError('Сначала подтверди email, затем можно покупать и назначать подписки.');
      return;
    }

    try {
      const createRes = await fetch('/api/billing/seats', { method: 'POST', credentials: 'include', headers: { accept: 'application/json' } });
      const createBody: unknown = await createRes.json().catch(() => null);
      if (!createRes.ok) {
        const code = isRecord(createBody) ? (createBody as any).error : null;
        if (code === 'email_not_verified') {
          setError('Сначала подтверди email, затем можно покупать и назначать подписки.');
          return;
        }
        setError(typeof code === 'string' ? `Ошибка: ${code}` : 'Не удалось создать подписку');
        return;
      }
      const seatId = isRecord(createBody) ? String((createBody as any).seatId || '') : '';
      if (!seatId) {
        setError('Не удалось создать подписку');
        return;
      }

      const invoiceId = `seat-${seatId}-${Date.now()}`;
      const widget = new window.cp.CloudPayments();
      setBusy(true);
      setPendingSeatId(seatId);
      setPendingActivationNotice(true);
      setShowActivatedWhenWidgetClosed(false);

      widget.pay(
        'charge',
        {
          publicId: props.cpPublicId,
          description: `Подписка МатТренер — ${props.priceRub} ₽/мес`,
          amount: props.priceRub,
          currency: 'RUB',
          accountId: seatId,
          email: props.me.email,
          invoiceId,
          skin: 'modern',
          saveCard: true,
          successRedirectUrl: props.returnUrl,
          failRedirectUrl: props.returnUrl,
          data: { purpose: 'subscription_seat', seatId, parentId: props.me.id },
        },
        async () => {
          setInfo('Платёж принят. Обновляем статус подписки…');
          // Webhooks are async — poll a bit.
          let last: SeatDto[] | null = null;
          for (let i = 0; i < 10; i++) {
            await new Promise((r) => setTimeout(r, 1500));
            last = await refreshSeats();
            const seat = last?.find((s) => s.seatId === seatId) ?? null;
            if (seat?.status === 'active') break;
          }
          const seat = last?.find((s) => s.seatId === seatId) ?? null;
          if (seat?.status === 'active') {
            setInfo(null);
            setActivatedPaidUntil(seat.paidUntil ?? null);
            setShowActivatedWhenWidgetClosed(true);
          } else {
            setInfo('Готово. Если статус не обновился — подожди минуту и обнови страницу.');
          }
          setBusy(false);
          setPendingActivationNotice(false);
        },
        async () => {
          setError('Платёж не завершён.');
          setBusy(false);
          setPendingActivationNotice(false);
        },
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Не удалось открыть платежную форму');
    } finally {
      setBusy(false);
      setPendingActivationNotice(false);
    }
  };

  const cancelSeat = async (seatId: string) => {
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/billing/seats/${encodeURIComponent(seatId)}/cancel`, { method: 'POST', credentials: 'include' });
      const body: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = isRecord(body) && typeof body.error === 'string' ? body.error : null;
        if (msg === 'email_not_verified') setError('Сначала подтверди email, затем можно управлять подписками.');
        else setError(msg || 'Не удалось отменить подписку');
        return;
      }
      setInfo('Подписка отменена.');
      await refreshSeats();
    } catch {
      setError('Ошибка сети');
    } finally {
      setBusy(false);
    }
  };

  const unassignSeat = async (seatId: string) => {
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/billing/seats/${encodeURIComponent(seatId)}/unassign`, { method: 'POST', credentials: 'include' });
      const body: unknown = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = isRecord(body) && typeof (body as any).error === 'string' ? (body as any).error : null;
        if (msg === 'email_not_verified') setError('Сначала подтверди email, затем можно управлять подписками.');
        else setError(msg || 'Не удалось снять назначение');
        return;
      }
      await refreshSeats();
    } catch {
      setError('Ошибка сети');
    } finally {
      setBusy(false);
    }
  };

  const assignSeat = async (seatId: string, studentId: string) => {
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/billing/seats/${encodeURIComponent(seatId)}/assign`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ studentId }),
      });
      const body: unknown = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = isRecord(body) && typeof (body as any).error === 'string' ? (body as any).error : null;
        if (msg === 'email_not_verified') setError('Сначала подтверди email, затем можно покупать и назначать подписки.');
        else if (msg === 'seat_not_active') setError('Сначала оплати подписку, затем назначай ребёнка.');
        else if (msg === 'student_already_assigned') setError('Этот ребёнок уже назначен на другую подписку.');
        else setError(msg || 'Не удалось назначить подписку');
        return;
      }
      await refreshSeats();
    } catch {
      setError('Ошибка сети');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen py-6 px-4 md:py-10 md:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Подписка</h1>
        </div>

        {info ? <div className="card-elevated p-4 text-sm text-foreground">{info}</div> : null}
        {error ? <div className="card-elevated p-4 text-sm text-destructive">{error}</div> : null}

        <div className="card-elevated p-6 space-y-3">
          <div className="text-sm">
            Статус:{' '}
            <span className="inline-flex rounded-full bg-muted px-2 py-0.5 font-semibold text-foreground">{seatStatusLabel}</span>
          </div>
          {!emailVerified ? (
            <div className="text-sm text-muted-foreground">
              Чтобы покупать и назначать подписки, нужно подтвердить email. Это защита от ошибок привязки и потери доступа.
            </div>
          ) : null}
        </div>

        <div className="card-elevated p-6 space-y-3">
          <div className="text-sm text-muted-foreground">Тариф</div>
          <div className="text-lg font-bold">{props.priceRub} ₽ / месяц</div>
          <button type="button" className="btn-primary" onClick={startPayment} disabled={busy}>
            {busy ? '...' : 'Купить подписку (место)'}
          </button>
          <div className="text-xs text-muted-foreground">После оплаты подписка активируется автоматически (через вебхуки CloudPayments).</div>
        </div>

        <div className="space-y-3">
          {seats.map((s) => (
            <div key={s.seatId} className="card-elevated p-6 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="font-bold">Подписка (место)</div>
                  <div className="text-xs text-muted-foreground">ID: {s.seatId}</div>
                </div>
                <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-foreground">{s.status}</span>
              </div>

              <div className="grid gap-2 text-sm">
                <div>
                  Оплачено до: <span className="font-semibold">{fmtDate(s.paidUntil)}</span>
                </div>
                <div>
                  Карта: <span className="font-semibold">{s.cpCardMask ?? '—'}</span>
                </div>
                <div className="text-xs text-muted-foreground">Обновлено: {fmtDate(s.billingUpdatedAt)}</div>
              </div>

              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Назначение</div>
                {s.assignedStudent ? (
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm">
                      {s.assignedStudent.displayName || s.assignedStudent.email || s.assignedStudent.userId}
                    </div>
                    <button type="button" className="btn-secondary" onClick={() => unassignSeat(s.seatId)} disabled={busy}>
                      Снять
                    </button>
                  </div>
                ) : (
                  <AssignSeatRow
                    seatId={s.seatId}
                    disabled={busy}
                    loadChildren={ensureChildrenLoaded}
                    onAssign={assignSeat}
                  />
                )}
              </div>

              <div className="pt-2">
                <button type="button" className="btn-primary" onClick={() => cancelSeat(s.seatId)} disabled={busy || s.status !== 'active'}>
                  Отменить автосписание
                </button>
                {!s.cpSubscriptionId ? <div className="text-xs text-muted-foreground mt-2">ID подписки у провайдера пока не найден.</div> : null}
              </div>
            </div>
          ))}
          {!seats.length ? <div className="text-sm text-muted-foreground">Пока нет купленных подписок.</div> : null}
        </div>
      </div>

      <SubscriptionActivatedModal
        open={showActivated}
        paidUntil={activatedPaidUntil}
        onClose={async () => {
          setShowActivated(false);
          // Best-effort refresh after user closes the success notice.
          await refreshSeats();
        }}
      />
    </div>
  );
}

function AssignSeatRow(props: {
  seatId: string;
  disabled: boolean;
  loadChildren: () => Promise<ChildDto[] | null>;
  onAssign: (seatId: string, studentId: string) => Promise<void>;
}) {
  const [children, setChildren] = useState<ChildDto[] | null>(null);
  const [selected, setSelected] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const list = await props.loadChildren();
      if (!cancelled) setChildren(list);
    })();
    return () => {
      cancelled = true;
    };
  }, [props]);

  return (
    <div className="flex flex-col md:flex-row gap-2 md:items-center">
      <select
        className="h-10 w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm"
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        disabled={props.disabled || !children}
      >
        <option value="">{children ? 'Выбери ребёнка…' : 'Загрузка…'}</option>
        {(children || []).map((c) => (
          <option key={c.userId} value={c.userId}>
            {c.displayName || c.email || c.userId}
          </option>
        ))}
      </select>
      <button type="button" className="btn-primary shrink-0" onClick={() => props.onAssign(props.seatId, selected)} disabled={props.disabled || !selected}>
        Назначить
      </button>
    </div>
  );
}


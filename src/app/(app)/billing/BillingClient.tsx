'use client';

import { useEffect, useMemo, useState } from 'react';

type BillingDto = {
  trialEndsAt: string | null;
  billingStatus: 'none' | 'active' | 'past_due' | 'cancelled';
  paidUntil: string | null;
  cpSubscriptionId: string | null;
  cpCardMask: string | null;
  billingUpdatedAt: string | null;
  access: { ok: boolean; reason: 'admin' | 'trial' | 'paid' | 'none' };
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

export function BillingClient(props: {
  me: { id: string; email: string };
  cpPublicId: string;
  returnUrl: string;
  initialBilling: BillingDto;
  priceRub: number;
}) {
  const [billing, setBilling] = useState<BillingDto>(props.initialBilling);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const statusLabel = useMemo(() => {
    if (billing.access.ok && billing.access.reason === 'trial') return 'Пробный период активен';
    if (billing.billingStatus === 'active') return 'Подписка активна';
    if (billing.billingStatus === 'past_due') return 'Оплата не прошла (PastDue)';
    if (billing.billingStatus === 'cancelled') return 'Подписка отменена';
    return 'Подписка не активна';
  }, [billing]);

  const refresh = async (): Promise<BillingDto | null> => {
    const res = await fetch('/api/billing/status', { method: 'GET', credentials: 'include', cache: 'no-store' });
    const body: unknown = await res.json().catch(() => null);
    const b = isRecord(body) && isRecord(body.billing) ? (body.billing as BillingDto) : null;
    if (res.ok && b) {
      setBilling(b);
      return b;
    }
    return null;
  };

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

    const invoiceId = `sub-${props.me.id}-${Date.now()}`;
    const widget = new window.cp.CloudPayments();
    setBusy(true);
    try {
      widget.pay(
        'charge',
        {
          publicId: props.cpPublicId,
          description: `Подписка МатТренер — ${props.priceRub} ₽/мес`,
          amount: props.priceRub,
          currency: 'RUB',
          accountId: props.me.id,
          email: props.me.email,
          invoiceId,
          skin: 'modern',
          saveCard: true,
          successRedirectUrl: props.returnUrl,
          failRedirectUrl: props.returnUrl,
          data: { purpose: 'subscription', userId: props.me.id },
        },
        async () => {
          setInfo('Платёж принят. Обновляем статус подписки…');
          // Webhooks are async — poll a bit.
          for (let i = 0; i < 10; i++) {
            await new Promise((r) => setTimeout(r, 1500));
            const latest = await refresh();
            if (latest?.billingStatus === 'active') break;
          }
          setInfo('Готово. Если статус не обновился — подожди минуту и обнови страницу.');
          setBusy(false);
        },
        async () => {
          setError('Платёж не завершён.');
          setBusy(false);
        },
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Не удалось открыть платежную форму');
      setBusy(false);
    }
  };

  const cancelSubscription = async () => {
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      const res = await fetch('/api/billing/cancel', { method: 'POST', credentials: 'include' });
      const body: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = isRecord(body) && typeof body.error === 'string' ? body.error : null;
        setError(msg || 'Не удалось отменить подписку');
        return;
      }
      setInfo('Подписка отменена.');
      await refresh();
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
          <p className="text-muted-foreground">Доступ к тренажёрам по пробному периоду или подписке</p>
        </div>

        {info ? <div className="card-elevated p-4 text-sm text-foreground">{info}</div> : null}
        {error ? <div className="card-elevated p-4 text-sm text-destructive">{error}</div> : null}

        <div className="card-elevated p-6 space-y-3">
          <div className="text-sm text-muted-foreground">Статус</div>
          <div className="text-lg font-bold">{statusLabel}</div>

          <div className="grid gap-2 text-sm">
            <div>
              Пробный период до: <span className="font-semibold">{fmtDate(billing.trialEndsAt)}</span>
            </div>
            <div>
              Оплачено до: <span className="font-semibold">{fmtDate(billing.paidUntil)}</span>
            </div>
            <div>
              Карта: <span className="font-semibold">{billing.cpCardMask ?? '—'}</span>
            </div>
            <div className="text-xs text-muted-foreground">Обновлено: {fmtDate(billing.billingUpdatedAt)}</div>
          </div>
        </div>

        {billing.billingStatus === 'active' ? (
          <div className="card-elevated p-6 space-y-3">
            <div className="text-sm text-muted-foreground">Управление</div>
            <button type="button" className="btn-primary" onClick={cancelSubscription} disabled={busy}>
              Отменить подписку
            </button>
            {!billing.cpSubscriptionId ? (
              <div className="text-xs text-muted-foreground">
                Внимание: не найден ID подписки у провайдера. Скорее всего автосписания не настроены.
              </div>
            ) : null}
          </div>
        ) : (
          <div className="card-elevated p-6 space-y-3">
            <div className="text-sm text-muted-foreground">Тариф</div>
            <div className="text-lg font-bold">{props.priceRub} ₽ / месяц</div>
            <button type="button" className="btn-primary" onClick={startPayment} disabled={busy}>
              {busy ? '...' : 'Оформить подписку'}
            </button>
            <div className="text-xs text-muted-foreground">
              После оплаты подписка активируется автоматически (мы используем вебхуки CloudPayments).
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


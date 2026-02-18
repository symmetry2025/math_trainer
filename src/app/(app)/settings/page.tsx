'use client';

import { useEffect, useState } from 'react';

import { SubscriptionActivatedModal } from '../../components/SubscriptionActivatedModal';

type Me = {
  id: string;
  email: string;
  displayName?: string | null;
};

type BillingDto = {
  cpPublicId: string | null;
  cpMode?: 'live' | 'test';
  priceRub?: number;
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

function daysLeftUntil(iso: string | null): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  const ms = t - Date.now();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60_000)));
}

function billingStatusRu(billing: BillingDto | null): string {
  if (!billing) return '—';
  if (billing.access?.ok && billing.access.reason === 'admin') return 'Администратор';
  const now = Date.now();
  const paidUntilMs = billing.paidUntil ? new Date(billing.paidUntil).getTime() : 0;
  const trialEndsAtMs = billing.trialEndsAt ? new Date(billing.trialEndsAt).getTime() : 0;
  const hasPaid = Number.isFinite(paidUntilMs) && paidUntilMs > now;
  const hasTrial = Number.isFinite(trialEndsAtMs) && trialEndsAtMs > now;
  if (billing.billingStatus === 'active' && !billing.cpSubscriptionId && !billing.paidUntil) return 'Бессрочная подписка';
  if (billing.billingStatus === 'active' && hasPaid && !billing.cpSubscriptionId) return 'Бесплатная подписка';
  if (hasPaid) return 'Активная подписка';
  if (hasTrial) return 'Пробный период';
  if (billing.billingStatus === 'active') return 'Активная подписка';
  if (billing.billingStatus === 'past_due') return 'Оплата не прошла';
  if (billing.billingStatus === 'cancelled') return 'Подписка отменена';
  return 'Подписка не активна';
}

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

  const [billing, setBilling] = useState<BillingDto | null>(null);
  const [billingBusy, setBillingBusy] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [billingInfo, setBillingInfo] = useState<string | null>(null);
  const [billingActionId, setBillingActionId] = useState<null | 'pay' | 'cancel'>(null);
  const [billingActivatedOpen, setBillingActivatedOpen] = useState(false);

  const refreshBilling = async (): Promise<BillingDto | null> => {
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
        // Best-effort load billing info for the banner.
        await refreshBilling();
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

  useEffect(() => {
    // Lazy-load CloudPayments widget script (only for logged-in users).
    if (!me?.id) return;
    const id = 'cp-widget';
    if (document.getElementById(id)) return;
    const s = document.createElement('script');
    s.id = id;
    s.async = true;
    s.src = 'https://widget.cloudpayments.ru/bundles/cloudpayments.js';
    document.head.appendChild(s);
  }, [me?.id]);

  const startPayment = async () => {
    if (!me) return;
    setBillingError(null);
    setBillingInfo(null);

    const cpPublicId = (billing?.cpPublicId || '').trim();
    const priceRub = Math.max(1, Math.floor(Number(billing?.priceRub ?? 399)));
    if (!cpPublicId) {
      setBillingError('Не настроен Public ID платежного провайдера');
      return;
    }
    if (!window.cp?.CloudPayments) {
      setBillingError('Платёжная форма ещё загружается. Попробуй снова через пару секунд.');
      return;
    }

    const invoiceId = `sub-${me.id}-${Date.now()}`;
    const widget = new window.cp.CloudPayments();
    let watchdog: number | null = null;
    setBillingBusy(true);
    setBillingActionId('pay');
    try {
      const returnUrl = `${window.location.origin}/settings`;
      // If the widget is closed without firing callbacks, don't leave UI stuck in "busy".
      watchdog = window.setTimeout(() => {
        setBillingBusy(false);
        setBillingActionId(null);
      }, 60_000);

      widget.pay(
        'charge',
        {
          publicId: cpPublicId,
          description: `Подписка МатТренер — ${priceRub} ₽/мес`,
          amount: priceRub,
          currency: 'RUB',
          accountId: me.id,
          email: me.email,
          invoiceId,
          skin: 'modern',
          saveCard: true,
          successRedirectUrl: returnUrl,
          failRedirectUrl: returnUrl,
          data: { purpose: 'subscription', userId: me.id },
        },
        async () => {
          setBillingInfo('Платёж принят. Обновляем статус подписки…');
          let last: BillingDto | null = null;
          for (let i = 0; i < 10; i++) {
            await new Promise((r) => setTimeout(r, 1500));
            last = await refreshBilling();
            if (last?.billingStatus === 'active') break;
          }
          if (last?.billingStatus === 'active') {
            setBillingInfo(null);
            setBillingActivatedOpen(true);
          } else {
            setBillingInfo('Готово.');
          }
          if (watchdog) window.clearTimeout(watchdog);
          setBillingBusy(false);
          setBillingActionId(null);
        },
        async () => {
          setBillingError('Платёж не завершён.');
          if (watchdog) window.clearTimeout(watchdog);
          setBillingBusy(false);
          setBillingActionId(null);
        },
      );
    } catch (e: unknown) {
      setBillingError(e instanceof Error ? e.message : 'Не удалось открыть платежную форму');
      if (watchdog) window.clearTimeout(watchdog);
      setBillingBusy(false);
      setBillingActionId(null);
    }
  };

  const cancelSubscription = async () => {
    setBillingError(null);
    setBillingInfo(null);
    setBillingBusy(true);
    setBillingActionId('cancel');
    try {
      const res = await fetch('/api/billing/cancel', { method: 'POST', credentials: 'include' });
      const body: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = isRecord(body) && typeof (body as any).error === 'string' ? (body as any).error : null;
        setBillingError(msg || 'Не удалось отменить подписку');
        return;
      }
      setBillingInfo('Подписка отменена.');
      await refreshBilling();
    } catch {
      setBillingError('Ошибка сети');
    } finally {
      setBillingBusy(false);
      setBillingActionId(null);
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

        {/* Billing / Trial banner (requested as first section) */}
        {me ? (
          <div className="card-elevated p-6 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">Подписка</h2>
              </div>
              <button type="button" className="btn-primary" onClick={refreshBilling} disabled={billingBusy}>
                Обновить
              </button>
            </div>

            {billingInfo ? <div className="text-sm text-foreground">{billingInfo}</div> : null}
            {billingError ? <div className="text-sm text-destructive">{billingError}</div> : null}

            {!billing ? <div className="text-sm text-muted-foreground">Загрузка статуса подписки…</div> : null}

            <div className="grid gap-2 text-sm">
              <div>
                Пробный период до: <span className="font-semibold">{fmtDate(billing?.trialEndsAt ?? null)}</span>
                {billing?.trialEndsAt ? (
                  <span className="text-muted-foreground">
                    {' '}
                    (осталось {daysLeftUntil(billing.trialEndsAt) ?? '—'} дн.)
                  </span>
                ) : null}
              </div>
              <div>
                Оплачено до: <span className="font-semibold">{fmtDate(billing?.paidUntil ?? null)}</span>
              </div>
              <div>
                Статус:{' '}
                <span className="inline-flex rounded-full bg-muted px-2 py-0.5 font-semibold">
                  {billingStatusRu(billing)}
                </span>
              </div>
              <div>
                Карта: <span className="font-semibold">{billing?.cpCardMask ?? '—'}</span>
              </div>
            </div>

            {billing?.billingStatus === 'active' ? (
              <div className="flex items-center gap-3">
                <button type="button" className="btn-primary" onClick={cancelSubscription} disabled={billingBusy}>
                  {billingBusy && billingActionId === 'cancel' ? 'Отмена…' : 'Отменить подписку'}
                </button>
                {!billing.cpSubscriptionId ? (
                  <div className="text-xs text-muted-foreground">
                    Внимание: не найден ID подписки у провайдера. Скорее всего автосписания не настроены.
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">
                  Тариф:{' '}
                  <span className="font-semibold text-foreground">
                    {Math.max(1, Math.floor(Number(billing?.priceRub ?? 399)))} ₽ / месяц
                  </span>
                </div>
                <button type="button" className="btn-primary" onClick={startPayment} disabled={billingBusy}>
                  {billingBusy && billingActionId === 'pay' ? 'Открываю форму…' : 'Оформить подписку'}
                </button>
              </div>
            )}
          </div>
        ) : null}

        <SubscriptionActivatedModal
          open={billingActivatedOpen}
          paidUntil={billing?.paidUntil ?? null}
          onClose={() => setBillingActivatedOpen(false)}
        />

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


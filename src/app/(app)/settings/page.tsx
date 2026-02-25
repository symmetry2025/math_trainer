'use client';

import { useEffect, useState } from 'react';
import { Copy, RotateCw } from 'lucide-react';

import { SubscriptionActivatedModal } from '../../../components/SubscriptionActivatedModal';

type Me = {
  id: string;
  email: string;
  displayName?: string | null;
  role?: 'student' | 'parent' | 'admin' | 'promoter' | string | null;
};

type StudentFamilyStatusDto = {
  linkedParent: { userId: string; displayName: string | null; email: string | null } | null;
  trialEndsAt: string | null;
};

type ParentInviteDto = { code: string; updatedAt: string };

type ParentChildListItemDto = {
  userId: string;
  displayName: string | null;
  email: string | null;
  linkedAt: string;
  trialEndsAt: string | null;
  stats: { totalProblems: number; totalCorrect: number; totalMistakes: number; totalTimeSec: number; sessionsCount: number } | null;
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

type IdentityProvider = 'max' | 'telegram';
type LinkedIdentityDto = { provider: IdentityProvider; providerUserId?: string; linkedAt: string; lastLoginAt: string | null };
type LinkTokenDto = { provider: IdentityProvider; token: string; startParam: string; expiresAt: string };

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

function providerLabel(provider: IdentityProvider): string {
  return provider === 'max' ? 'MAX' : 'Telegram';
}

function providerShortId(providerUserId?: string): string {
  const s = String(providerUserId || '').trim();
  if (!s) return '—';
  return s.length > 16 ? `${s.slice(0, 6)}…${s.slice(-6)}` : s;
}

function isCloudPaymentsWidgetOpen(): boolean {
  if (typeof document === 'undefined') return false;
  // CloudPayments widget injects an overlay/iframe; keep checks broad to avoid coupling to internals.
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
  const [billingPendingActivationNotice, setBillingPendingActivationNotice] = useState(false);
  const [billingShowActivatedWhenWidgetClosed, setBillingShowActivatedWhenWidgetClosed] = useState(false);
  const isPromoter = me?.role === 'promoter';
  const isStudent = me?.role === 'student';
  const isParent = me?.role === 'parent';

  const [studentFamily, setStudentFamily] = useState<StudentFamilyStatusDto | null>(null);
  const [studentParentCode, setStudentParentCode] = useState('');
  const [studentFamilyBusy, setStudentFamilyBusy] = useState(false);
  const [studentFamilyError, setStudentFamilyError] = useState<string | null>(null);
  const [studentFamilyInfo, setStudentFamilyInfo] = useState<string | null>(null);

  const [parentInvite, setParentInvite] = useState<ParentInviteDto | null>(null);
  const [parentChildren, setParentChildren] = useState<ParentChildListItemDto[]>([]);
  const [parentFamilyBusy, setParentFamilyBusy] = useState(false);
  const [parentFamilyError, setParentFamilyError] = useState<string | null>(null);

  const [identities, setIdentities] = useState<LinkedIdentityDto[]>([]);
  const [identitiesBusy, setIdentitiesBusy] = useState(false);
  const [identitiesError, setIdentitiesError] = useState<string | null>(null);
  const [linkToken, setLinkToken] = useState<LinkTokenDto | null>(null);
  const [linkBusy, setLinkBusy] = useState(false);

  const refreshIdentities = async () => {
    setIdentitiesError(null);
    setIdentitiesBusy(true);
    try {
      const res = await fetch('/api/auth/identities', { method: 'GET', credentials: 'include', cache: 'no-store' });
      const body: unknown = await res.json().catch(() => null);
      if (!res.ok) throw new Error((isRecord(body) && typeof (body as any).error === 'string' ? (body as any).error : null) || 'request_failed');
      const list = isRecord(body) && Array.isArray((body as any).identities) ? ((body as any).identities as LinkedIdentityDto[]) : [];
      setIdentities(list);
    } catch (e: unknown) {
      setIdentitiesError(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setIdentitiesBusy(false);
    }
  };

  const startLink = async (provider: IdentityProvider) => {
    setIdentitiesError(null);
    setLinkToken(null);
    setLinkBusy(true);
    try {
      const res = await fetch('/api/auth/link-token', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ provider }),
      });
      const body: unknown = await res.json().catch(() => null);
      if (!res.ok) throw new Error((isRecord(body) && typeof (body as any).error === 'string' ? (body as any).error : null) || 'request_failed');
      if (!isRecord(body) || typeof (body as any).startParam !== 'string') throw new Error('invalid_response');
      setLinkToken(body as any as LinkTokenDto);
    } catch (e: unknown) {
      setIdentitiesError(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setLinkBusy(false);
    }
  };

  const unlinkIdentity = async (provider: IdentityProvider) => {
    setIdentitiesError(null);
    setIdentitiesBusy(true);
    try {
      const ok = window.confirm(`Отвязать ${providerLabel(provider)}? Если это последний способ входа, вы можете потерять доступ.`);
      if (!ok) return;

      const res = await fetch('/api/auth/identities', {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ provider }),
      });
      const body: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const err = isRecord(body) && typeof (body as any).error === 'string' ? (body as any).error : null;
        if (err === 'would_lock_out') {
          throw new Error('Нельзя отвязать последний аккаунт. Сначала привяжите другой способ входа (MAX/Telegram).');
        }
        throw new Error(err || 'request_failed');
      }

      await refreshIdentities();
    } catch (e: unknown) {
      setIdentitiesError(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setIdentitiesBusy(false);
    }
  };

  const copyLinkCode = async () => {
    const code = String(linkToken?.startParam || '').trim();
    if (!code) return;
    try {
      await window.navigator.clipboard?.writeText(code);
    } catch {
      // ignore
    }
  };

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

  const refreshStudentFamily = async (): Promise<StudentFamilyStatusDto | null> => {
    const res = await fetch('/api/student/family', { method: 'GET', credentials: 'include', cache: 'no-store' });
    const body: unknown = await res.json().catch(() => null);
    if (!res.ok) return null;
    const dto = isRecord(body) ? (body as any) : null;
    const parsed: StudentFamilyStatusDto | null =
      dto && (dto.linkedParent === null || isRecord(dto.linkedParent))
        ? { linkedParent: dto.linkedParent ?? null, trialEndsAt: typeof dto.trialEndsAt === 'string' ? dto.trialEndsAt : null }
        : null;
    if (parsed) setStudentFamily(parsed);
    return parsed;
  };

  const refreshParentFamily = async (): Promise<void> => {
    setParentFamilyError(null);
    const [invRes, childrenRes] = await Promise.all([
      fetch('/api/parent/invite', { method: 'GET', credentials: 'include', cache: 'no-store' }),
      fetch('/api/parent/children', { method: 'GET', credentials: 'include', cache: 'no-store' }),
    ]);
    const invBody: unknown = await invRes.json().catch(() => null);
    const childrenBody: unknown = await childrenRes.json().catch(() => null);
    if (invRes.ok && isRecord(invBody) && isRecord((invBody as any).invite)) {
      const inv = (invBody as any).invite;
      setParentInvite({ code: String(inv.code || ''), updatedAt: String(inv.updatedAt || '') });
    }
    if (childrenRes.ok && isRecord(childrenBody) && Array.isArray((childrenBody as any).children)) {
      setParentChildren((childrenBody as any).children as ParentChildListItemDto[]);
    }
    if (!invRes.ok || !childrenRes.ok) setParentFamilyError('Не удалось загрузить данные семьи');
  };

  const regenerateParentInvite = async () => {
    setParentFamilyError(null);
    setParentFamilyBusy(true);
    try {
      const res = await fetch('/api/parent/invite', { method: 'POST', credentials: 'include' });
      const body: unknown = await res.json().catch(() => null);
      if (!res.ok) throw new Error((isRecord(body) && typeof (body as any).error === 'string' ? (body as any).error : null) || 'request_failed');
      if (isRecord(body) && isRecord((body as any).invite)) {
        const inv = (body as any).invite;
        setParentInvite({ code: String(inv.code || ''), updatedAt: String(inv.updatedAt || '') });
      }
    } catch (e: unknown) {
      setParentFamilyError(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setParentFamilyBusy(false);
    }
  };

  const copyParentInvite = async () => {
    setParentFamilyError(null);
    const code = String(parentInvite?.code || '').trim();
    if (!code) return;
    try {
      await window.navigator.clipboard?.writeText(code);
    } catch {
      // ignore
    }
  };

  const linkToParent = async () => {
    setStudentFamilyError(null);
    setStudentFamilyInfo(null);
    const code = studentParentCode.trim();
    if (!code) return;
    setStudentFamilyBusy(true);
    try {
      const res = await fetch('/api/student/link-parent', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ code }),
      });
      const body: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const err = isRecord(body) && typeof (body as any).error === 'string' ? (body as any).error : null;
        throw new Error(err || 'request_failed');
      }
      setStudentParentCode('');
      setStudentFamilyInfo('Готово. Вы привязаны к родителю.');
      await refreshStudentFamily();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Ошибка';
      setStudentFamilyError(msg === 'invalid_code' ? 'Код не найден. Проверь и попробуй снова.' : msg);
    } finally {
      setStudentFamilyBusy(false);
    }
  };

  useEffect(() => {
    if (!billingPendingActivationNotice) return;
    let cancelled = false;
    const startedAt = Date.now();

    // If the widget is closed without firing callbacks, still poll webhooks result.
    (async () => {
      let last: BillingDto | null = null;
      while (!cancelled && Date.now() - startedAt < 120_000) {
        await new Promise((r) => setTimeout(r, 1500));
        last = await refreshBilling();
        if (last?.billingStatus === 'active') {
          setBillingInfo(null);
          setBillingShowActivatedWhenWidgetClosed(true);
          setBillingPendingActivationNotice(false);
          return;
        }
      }
      if (!cancelled) {
        setBillingInfo('Если статус не обновился — подожди минуту и обнови страницу.');
        setBillingPendingActivationNotice(false);
      }
    })();

    // Don't keep UI in "busy" if form is closed without callbacks.
    const watchdog = window.setTimeout(() => {
      if (!cancelled) {
        setBillingBusy(false);
        setBillingActionId(null);
      }
    }, 60_000);

    return () => {
      cancelled = true;
      window.clearTimeout(watchdog);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [billingPendingActivationNotice]);

  useEffect(() => {
    if (!billingShowActivatedWhenWidgetClosed) return;
    let cancelled = false;

    const tryShow = () => {
      if (cancelled) return;
      if (!isCloudPaymentsWidgetOpen()) {
        setBillingActivatedOpen(true);
        setBillingShowActivatedWhenWidgetClosed(false);
      }
    };

    tryShow();
    const interval = window.setInterval(tryShow, 300);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [billingShowActivatedWhenWidgetClosed]);

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
        await refreshIdentities();
        // Best-effort load billing info for the banner (not needed for promoters).
        if (u?.role !== 'promoter' && u?.role !== 'student') await refreshBilling();
        if (u?.role === 'student') await refreshStudentFamily();
        if (u?.role === 'parent') await refreshParentFamily();
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
    if (me?.role === 'promoter') return;
    if (me?.role === 'student') return;
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
    setBillingPendingActivationNotice(true);
    setBillingShowActivatedWhenWidgetClosed(false);
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
            setBillingShowActivatedWhenWidgetClosed(true);
          } else {
            setBillingInfo('Готово.');
          }
          if (watchdog) window.clearTimeout(watchdog);
          setBillingBusy(false);
          setBillingActionId(null);
          setBillingPendingActivationNotice(false);
        },
        async () => {
          setBillingError('Платёж не завершён.');
          if (watchdog) window.clearTimeout(watchdog);
          setBillingBusy(false);
          setBillingActionId(null);
          setBillingPendingActivationNotice(false);
        },
      );
    } catch (e: unknown) {
      setBillingError(e instanceof Error ? e.message : 'Не удалось открыть платежную форму');
      if (watchdog) window.clearTimeout(watchdog);
      setBillingBusy(false);
      setBillingActionId(null);
      setBillingPendingActivationNotice(false);
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

        {/* Linked identities (unified provider linking flow) */}
        {me ? (
          <div className="card-elevated p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">Связанные аккаунты</h2>
                <div className="text-sm text-muted-foreground">Подключайте разные способы входа к одному аккаунту</div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">Чтобы обновить статус — обнови страницу.</div>

            {identitiesError ? <div className="text-sm text-destructive">{identitiesError}</div> : null}

            <div className="grid gap-3">
              <div className="rounded-2xl border border-border/60 bg-background/40 p-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-bold">MAX</div>
                  <div className="text-xs text-muted-foreground">Вход через mini‑app MAX</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Статус:{' '}
                    <span className="font-semibold text-foreground">
                      {identities.some((i) => i.provider === 'max') ? 'подключен' : 'не подключен'}
                    </span>
                  </div>
                  {identities.find((i) => i.provider === 'max') ? (
                    <div className="mt-1 text-xs text-muted-foreground">
                      ID: <span className="font-mono">{providerShortId(identities.find((i) => i.provider === 'max')?.providerUserId)}</span>
                      {' · '}Привязан: <span className="font-semibold text-foreground">{fmtDate(identities.find((i) => i.provider === 'max')?.linkedAt ?? null)}</span>
                    </div>
                  ) : null}
                </div>
                {identities.some((i) => i.provider === 'max') ? (
                  <button type="button" className="btn-secondary shrink-0" onClick={() => unlinkIdentity('max')} disabled={identitiesBusy}>
                    Отвязать
                  </button>
                ) : (
                  <button type="button" className="btn-primary shrink-0" onClick={() => startLink('max')} disabled={linkBusy}>
                    {linkBusy ? 'Генерирую…' : 'Подключить'}
                  </button>
                )}
              </div>

              <div className="rounded-2xl border border-border/60 bg-background/40 p-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-bold">Telegram</div>
                  <div className="text-xs text-muted-foreground">Вход через Telegram mini‑app</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Статус:{' '}
                    <span className="font-semibold text-foreground">
                      {identities.some((i) => i.provider === 'telegram') ? 'подключен' : 'не подключен'}
                    </span>
                  </div>
                  {identities.find((i) => i.provider === 'telegram') ? (
                    <div className="mt-1 text-xs text-muted-foreground">
                      ID: <span className="font-mono">{providerShortId(identities.find((i) => i.provider === 'telegram')?.providerUserId)}</span>
                      {' · '}Привязан: <span className="font-semibold text-foreground">{fmtDate(identities.find((i) => i.provider === 'telegram')?.linkedAt ?? null)}</span>
                    </div>
                  ) : null}
                </div>
                {identities.some((i) => i.provider === 'telegram') ? (
                  <button type="button" className="btn-secondary shrink-0" onClick={() => unlinkIdentity('telegram')} disabled={identitiesBusy}>
                    Отвязать
                  </button>
                ) : (
                  <a className="btn-primary shrink-0" href="/tg-link">
                    Подключить
                  </a>
                )}
              </div>
            </div>

            {linkToken ? (
              <div className="rounded-2xl border border-border/60 bg-background/40 p-4 space-y-3">
                <div className="text-sm font-semibold">Привязка</div>
                <div className="text-xs text-muted-foreground">Срок действия до: {fmtDate(linkToken.expiresAt)}</div>

                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Шаг 1. Скопируй код</div>
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={linkToken.startParam}
                      className="h-10 flex-1 rounded-2xl border border-input bg-background px-3 py-2 text-sm font-mono"
                    />
                    <button type="button" className="btn-secondary" onClick={copyLinkCode}>
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground space-y-1">
                  <div>Шаг 2. Открой mini‑app у провайдера и передай этот код как старт‑параметр.</div>
                  <div className="text-muted-foreground/80">
                    Для MAX можно использовать параметры <span className="font-mono">startapp</span>/<span className="font-mono">start_param</span>.
                  </div>
                </div>

                {linkToken.provider === 'max' ? (
                  <a
                    className="btn-secondary inline-flex items-center justify-center"
                    href={`/max?startapp=${encodeURIComponent(linkToken.startParam)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Открыть /max (тест)
                  </a>
                ) : null}

                <div className="text-xs text-muted-foreground">Шаг 3. Вернись сюда и обнови страницу «Настройки».</div>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Family (student) */}
        {me && isStudent ? (
          <div className="card-elevated p-6 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">Семья</h2>
                <div className="text-sm text-muted-foreground">Привяжись к родителю по коду, чтобы продолжить после пробного периода</div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">Чтобы обновить данные — обнови страницу.</div>

            {studentFamilyInfo ? <div className="text-sm text-foreground">{studentFamilyInfo}</div> : null}
            {studentFamilyError ? <div className="text-sm text-destructive">{studentFamilyError}</div> : null}

            <div className="grid gap-2 text-sm">
              <div>
                Пробный период до: <span className="font-semibold">{fmtDate(studentFamily?.trialEndsAt ?? null)}</span>
                {studentFamily?.trialEndsAt ? (
                  <span className="text-muted-foreground">
                    {' '}
                    (осталось {daysLeftUntil(studentFamily.trialEndsAt) ?? '—'} дн.)
                  </span>
                ) : null}
              </div>
              <div>
                Родитель: <span className="font-semibold">{studentFamily?.linkedParent?.displayName || studentFamily?.linkedParent?.email || 'не привязан'}</span>
              </div>
            </div>

            {studentFamily?.linkedParent ? null : (
              <div className="space-y-2">
                <input
                  value={studentParentCode}
                  onChange={(e) => setStudentParentCode(e.target.value)}
                  className="h-10 w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Код от родителя (например: A2B3C4D5)"
                />
                <button type="button" className="btn-primary" onClick={linkToParent} disabled={studentFamilyBusy || !studentParentCode.trim()}>
                  {studentFamilyBusy ? 'Привязываю…' : 'Привязаться к родителю'}
                </button>
              </div>
            )}
          </div>
        ) : null}

        {/* Family (parent) */}
        {me && isParent ? (
          <div className="card-elevated p-6 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">Дети</h2>
                <div className="text-sm text-muted-foreground">Подписка оформляется здесь (у родителя) и даёт доступ привязанным детям</div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">Чтобы обновить данные — обнови страницу.</div>

            {parentFamilyError ? <div className="text-sm text-destructive">{parentFamilyError}</div> : null}

            <div className="space-y-2">
              <div className="text-sm font-semibold">Код приглашения</div>
              <div className="text-xs text-muted-foreground">Используйте код, чтобы привязать ребёнка к вашему кабинету</div>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={parentInvite?.code ? parentInvite.code : '—'}
                  className="h-10 flex-1 rounded-2xl border border-input bg-background px-3 py-2 text-sm font-mono tracking-wider"
                />
                <button
                  type="button"
                  className="h-10 w-10 rounded-2xl border border-input bg-background hover:bg-muted transition-colors flex items-center justify-center disabled:opacity-60"
                  onClick={copyParentInvite}
                  disabled={!parentInvite?.code}
                  title="Копировать"
                >
                  <Copy className="w-5 h-5 text-muted-foreground" />
                </button>
                <button
                  type="button"
                  className="h-10 w-10 rounded-2xl border border-input bg-background hover:bg-muted transition-colors flex items-center justify-center disabled:opacity-60"
                  onClick={regenerateParentInvite}
                  disabled={parentFamilyBusy}
                  title="Сгенерировать новый код"
                >
                  <RotateCw className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
              <div className="text-xs text-muted-foreground">
                Обновлён: <span className="font-semibold">{fmtDate(parentInvite?.updatedAt ?? null)}</span>
              </div>
            </div>

            {parentChildren.length ? (
              <div className="space-y-3">
                {parentChildren.map((c) => {
                  const s = c.stats;
                  const acc = s && s.totalProblems > 0 ? Math.round((s.totalCorrect / s.totalProblems) * 100) : null;
                  return (
                    <div key={c.userId} className="rounded-2xl border border-input p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold">{c.displayName || c.email || c.userId}</div>
                          <div className="text-xs text-muted-foreground">Привязан: {fmtDate(c.linkedAt)}</div>
                        </div>
                        <div className="text-xs text-muted-foreground">Триал до: {fmtDate(c.trialEndsAt)}</div>
                      </div>
                      <div className="mt-2 grid gap-1 text-sm text-muted-foreground">
                        <div>
                          Сессий: <span className="font-semibold text-foreground">{s?.sessionsCount ?? '—'}</span>
                        </div>
                        <div>
                          Примеров: <span className="font-semibold text-foreground">{s?.totalProblems ?? '—'}</span>, точность:{' '}
                          <span className="font-semibold text-foreground">{acc === null ? '—' : `${acc}%`}</span>
                        </div>
                        <div>
                          Ошибок: <span className="font-semibold text-foreground">{s?.totalMistakes ?? '—'}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">Пока нет привязанных детей. Отправьте ребёнку код приглашения.</div>
            )}
          </div>
        ) : null}

        {/* Billing / Trial banner (requested as first section) */}
        {me && !isPromoter && !isStudent ? (
          <div className="card-elevated p-6 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">Подписка</h2>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">Чтобы обновить статус — обнови страницу.</div>

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

        {!isPromoter && !isStudent ? (
          <SubscriptionActivatedModal
            open={billingActivatedOpen}
            paidUntil={billing?.paidUntil ?? null}
            onClose={async () => {
              setBillingActivatedOpen(false);
              await refreshBilling();
            }}
          />
        ) : null}

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


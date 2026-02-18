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
  trialEndsAt: string | null;
  billingStatus: 'none' | 'active' | 'past_due' | 'cancelled';
  paidUntil: string | null;
  cpSubscriptionId: string | null;
  cpCardMask: string | null;
  billingUpdatedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function toLocalInputValue(iso: string | null): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mi = pad(d.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
  } catch {
    return '';
  }
}

function fromLocalInputValue(v: string): string | null {
  const s = String(v || '').trim();
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object';
}

function pickRole(v: unknown): 'student' | 'parent' | 'admin' {
  if (v === 'student' || v === 'parent' || v === 'admin') return v;
  return 'student';
}

function pickBillingStatus(v: unknown): 'none' | 'active' | 'past_due' | 'cancelled' {
  if (v === 'none' || v === 'active' || v === 'past_due' || v === 'cancelled') return v;
  return 'none';
}

type BillingPlanKind = 'none' | 'trial' | 'paid' | 'free' | 'lifetime' | 'cancelled';

function derivePlanKind(u: UserDto | null): BillingPlanKind {
  if (!u) return 'none';
  const now = Date.now();
  const trialMs = u.trialEndsAt ? new Date(u.trialEndsAt).getTime() : 0;
  const paidMs = u.paidUntil ? new Date(u.paidUntil).getTime() : 0;
  const hasTrial = Number.isFinite(trialMs) && trialMs > now;
  const hasPaid = Number.isFinite(paidMs) && paidMs > now;

  if (u.billingStatus === 'cancelled') return 'cancelled';
  if (u.billingStatus === 'active') {
    if (u.cpSubscriptionId) return 'paid';
    if (hasPaid || u.paidUntil) return 'free';
    return 'lifetime';
  }
  if (hasTrial) return 'trial';
  return 'none';
}

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
  const [trialEndsAt, setTrialEndsAt] = useState('');
  const [paidUntil, setPaidUntil] = useState('');
  const [billingStatus, setBillingStatus] = useState<'none' | 'active' | 'past_due' | 'cancelled'>('none');
  const [planKind, setPlanKind] = useState<BillingPlanKind>('none');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setBusy(true);
      setError(null);
      try {
        const res = await fetch(`/api/admin/users/${encodeURIComponent(id)}`, { method: 'GET', credentials: 'include', cache: 'no-store' });
        const body: unknown = await res.json().catch(() => null);
        if (cancelled) return;
        if (!res.ok) {
          const msg = isRecord(body) && typeof body.error === 'string' ? body.error : null;
          setError(msg || 'Не удалось загрузить пользователя');
          return;
        }
        const user = isRecord(body) && isRecord(body.user) ? (body.user as UserDto) : null;
        setU(user);
        setEmail(String(user?.email ?? ''));
        setDisplayName(String(user?.displayName ?? ''));
        setRole(pickRole(user?.role));
        setEmailVerified(!!user?.emailVerifiedAt);
        setTrialEndsAt(toLocalInputValue(user?.trialEndsAt ?? null));
        setPaidUntil(toLocalInputValue(user?.paidUntil ?? null));
        setBillingStatus(pickBillingStatus(user?.billingStatus));
        setPlanKind(derivePlanKind(user));
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
          billingStatus,
          trialEndsAt: fromLocalInputValue(trialEndsAt),
          paidUntil: fromLocalInputValue(paidUntil),
        }),
      });
      const body: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        setError(
          isRecord(body) && body.error === 'email_taken'
            ? 'Email уже занят'
            : isRecord(body) && body.error === 'invalid_password'
              ? 'Пароль должен быть минимум 6 символов'
              : (isRecord(body) && typeof body.error === 'string' ? body.error : null) || 'Не удалось сохранить',
        );
        return;
      }
      const user = isRecord(body) && isRecord(body.user) ? (body.user as UserDto) : null;
      setU(user);
      setInfo('Сохранено');
      setNewPassword('');
      setTrialEndsAt(toLocalInputValue(user?.trialEndsAt ?? null));
      setPaidUntil(toLocalInputValue(user?.paidUntil ?? null));
      setBillingStatus(pickBillingStatus(user?.billingStatus));
      setPlanKind(derivePlanKind(user));
    } catch {
      setError('Ошибка сети');
    } finally {
      setSaving(false);
    }
  };

  const cancelProviderSub = async () => {
    setSaving(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(id)}/cancel-subscription`, {
        method: 'POST',
        credentials: 'include',
        headers: { accept: 'application/json' },
      });
      const body: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = isRecord(body) && typeof body.error === 'string' ? body.error : null;
        setError(msg || 'Не удалось отменить подписку');
        return;
      }
      setInfo('Подписка отменена у провайдера');
      window.location.reload();
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
                  onChange={(e) => setRole(pickRole(e.target.value))}
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

              <div className="pt-4 border-t border-border/40 space-y-3">
                <div className="text-sm font-semibold">Подписка / доступ</div>

                <label className="block text-sm font-medium">
                  Статус
                  <select
                    value={planKind}
                    onChange={(e) => {
                      const next = String(e.target.value || '').trim() as BillingPlanKind;
                      setPlanKind(next);
                      if (next === 'none') {
                        setBillingStatus('none');
                        setTrialEndsAt('');
                        setPaidUntil('');
                        return;
                      }
                      if (next === 'trial') {
                        setBillingStatus('none');
                        setPaidUntil('');
                        return;
                      }
                      if (next === 'paid') {
                        setBillingStatus('active');
                        setTrialEndsAt('');
                        return;
                      }
                      if (next === 'free') {
                        setBillingStatus('active');
                        setTrialEndsAt('');
                        return;
                      }
                      if (next === 'lifetime') {
                        setBillingStatus('active');
                        setTrialEndsAt('');
                        setPaidUntil('');
                        return;
                      }
                      if (next === 'cancelled') {
                        setBillingStatus('cancelled');
                        setTrialEndsAt('');
                        return;
                      }
                    }}
                    className="mt-1 h-10 w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="none">Нет подписки</option>
                    <option value="trial">Пробный период</option>
                    <option value="paid">Платная подписка</option>
                    <option value="free">Бесплатная подписка (до даты)</option>
                    <option value="lifetime">Бессрочная подписка</option>
                    <option value="cancelled">Подписка отменена</option>
                  </select>
                </label>

                {planKind === 'trial' ? (
                  <label className="block text-sm font-medium">
                    Пробный период до
                    <input
                      value={trialEndsAt}
                      onChange={(e) => setTrialEndsAt(e.target.value)}
                      className="mt-1 h-10 w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm"
                      type="datetime-local"
                    />
                  </label>
                ) : null}

                {planKind === 'paid' ? (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">
                      Доступ до (оплачено)
                      <input
                        value={paidUntil}
                        onChange={(e) => setPaidUntil(e.target.value)}
                        className="mt-1 h-10 w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm"
                        type="datetime-local"
                      />
                    </label>
                    <div className="text-xs text-muted-foreground">
                      Следующее списание: {(() => {
                        const iso = fromLocalInputValue(paidUntil);
                        return iso ? new Date(iso).toLocaleString() : '—';
                      })()}{' '}
                      (ориентируемся на срок доступа)
                    </div>
                  </div>
                ) : null}

                {planKind === 'free' ? (
                  <label className="block text-sm font-medium">
                    Бесплатная подписка до
                    <input
                      value={paidUntil}
                      onChange={(e) => setPaidUntil(e.target.value)}
                      className="mt-1 h-10 w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm"
                      type="datetime-local"
                    />
                  </label>
                ) : null}

                {planKind === 'cancelled' ? (
                  <label className="block text-sm font-medium">
                    Доступ до (если уже оплачено)
                    <input
                      value={paidUntil}
                      onChange={(e) => setPaidUntil(e.target.value)}
                      className="mt-1 h-10 w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm"
                      type="datetime-local"
                    />
                  </label>
                ) : null}

                <div className="grid gap-1 text-xs text-muted-foreground">
                  <div>
                    CloudPayments subscriptionId: <span className="font-mono">{u.cpSubscriptionId || '—'}</span>
                  </div>
                  <div>
                    Карта: <span className="font-mono">{u.cpCardMask || '—'}</span>
                  </div>
                  <div>Billing updated: {u.billingUpdatedAt ? new Date(u.billingUpdatedAt).toLocaleString() : '—'}</div>
                </div>

                {u.cpSubscriptionId ? (
                  <button
                    type="button"
                    className="rounded-2xl border border-border/60 bg-card px-4 py-2 text-sm font-semibold hover:bg-muted transition-colors"
                    onClick={cancelProviderSub}
                    disabled={saving}
                  >
                    Отменить подписку у провайдера
                  </button>
                ) : null}

                {u.cpSubscriptionId && (planKind === 'free' || planKind === 'lifetime') ? (
                  <div className="text-xs text-muted-foreground">
                    Внимание: у пользователя есть активная подписка у провайдера. Чтобы не было автосписаний, сначала нажмите «Отменить подписку у провайдера».
                  </div>
                ) : null}
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


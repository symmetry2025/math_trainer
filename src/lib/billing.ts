import { prisma } from './db';
import { BILLING_CURRENCY, BILLING_PRICE_RUB, TRIAL_DAYS } from './billingConstants';

export { BILLING_CURRENCY, BILLING_PRICE_RUB, TRIAL_DAYS };

export function trialEndsAtFromNow(now = new Date()): Date {
  return new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60_000);
}

export async function getBillingInfoByUserId(userId: string) {
  const select = {
    id: true,
    role: true,
    email: true,
    trialEndsAt: true,
    billingStatus: true,
    paidUntil: true,
    cpSubscriptionId: true,
    cpCardMask: true,
    billingUpdatedAt: true,
  } as const;

  const u = await prisma.user.findUnique({
    where: { id: userId },
    select,
  });
  if (!u) return u;

  // Auto-grant a 7-day trial once for existing users with no billing state.
  if (u.role !== 'admin' && !u.trialEndsAt && u.billingStatus === 'none' && !u.paidUntil) {
    const now = new Date();
    const trialEndsAt = trialEndsAtFromNow(now);
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { trialEndsAt, billingUpdatedAt: now },
      select,
    });
    return updated;
  }

  return u;
}

export function hasBillingAccess(u: {
  role: string;
  trialEndsAt: Date | null;
  billingStatus: string;
  paidUntil: Date | null;
}): { ok: boolean; reason: 'admin' | 'trial' | 'paid' | 'none' } {
  if (u.role === 'admin') return { ok: true, reason: 'admin' };
  const now = Date.now();
  if (u.trialEndsAt && u.trialEndsAt.getTime() > now) return { ok: true, reason: 'trial' };
  if (u.billingStatus === 'active' && (!u.paidUntil || u.paidUntil.getTime() > now)) return { ok: true, reason: 'paid' };
  return { ok: false, reason: 'none' };
}


import { prisma } from './db';
import { BILLING_CURRENCY, TRIAL_DAYS, getBillingPriceRub } from './billingConfig';

export { BILLING_CURRENCY, TRIAL_DAYS, getBillingPriceRub };

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
  // If user has paid/free access until a date — allow regardless of status (e.g. cancelled but still paid until).
  if (u.paidUntil && u.paidUntil.getTime() > now) return { ok: true, reason: 'paid' };
  // Lifetime access: billingStatus active and no expiry.
  if (u.billingStatus === 'active' && !u.paidUntil) return { ok: true, reason: 'paid' };
  return { ok: false, reason: 'none' };
}

export async function getEffectiveBillingAccessByUserId(userId: string): Promise<{
  role: string;
  access: { ok: boolean; reason: 'admin' | 'trial' | 'paid' | 'none' };
  viaParent: boolean;
  parentUserId: string | null;
}> {
  const u = await getBillingInfoByUserId(userId);
  if (!u) return { role: 'student', access: { ok: false, reason: 'none' }, viaParent: false, parentUserId: null };

  const direct = hasBillingAccess({
    role: u.role,
    trialEndsAt: u.trialEndsAt,
    billingStatus: u.billingStatus,
    paidUntil: u.paidUntil,
  });
  if (direct.ok) return { role: u.role, access: direct, viaParent: false, parentUserId: null };

  if (u.role !== 'student') return { role: u.role, access: direct, viaParent: false, parentUserId: null };

  const link = await prisma.parentStudentLink.findUnique({
    where: { studentId: userId },
    select: {
      parentId: true,
      parent: { select: { role: true, trialEndsAt: true, billingStatus: true, paidUntil: true } },
    },
  });
  if (!link?.parent) return { role: u.role, access: direct, viaParent: false, parentUserId: null };

  const parentAccess = hasBillingAccess({
    role: link.parent.role,
    trialEndsAt: link.parent.trialEndsAt,
    billingStatus: link.parent.billingStatus,
    paidUntil: link.parent.paidUntil,
  });
  if (parentAccess.ok) return { role: u.role, access: { ok: true, reason: 'paid' }, viaParent: true, parentUserId: link.parentId };

  return { role: u.role, access: direct, viaParent: false, parentUserId: link.parentId };
}


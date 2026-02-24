import { NextResponse } from 'next/server';

import { prisma } from '../../../../lib/db';
import { getCurrentUserOrNull } from '../../../../lib/auth';
import { getBillingPriceRub } from '../../../../lib/billingConfig';
import { getCpMode, getCpWidgetPublicId } from '../../../../lib/cloudpaymentsConfig';

export async function GET() {
  const me = await getCurrentUserOrNull();
  if (!me) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (me.role === 'student') return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  if (me.role !== 'admin' && !me.emailVerifiedAt) return NextResponse.json({ error: 'email_not_verified' }, { status: 403 });

  const cpPublicId = getCpWidgetPublicId();
  const priceRub = getBillingPriceRub();
  const cpMode = getCpMode();

  // Legacy endpoint: keep for backward compatibility (settings banner, etc).
  // New source of truth is SubscriptionSeat(s).
  const seats = await prisma.subscriptionSeat.findMany({
    where: { parentId: me.id },
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: { status: true, paidUntil: true, cpSubscriptionId: true, cpCardMask: true, billingUpdatedAt: true },
  });

  const now = Date.now();
  const activeSeat = seats.find((s) => {
    const paidMs = s.paidUntil ? s.paidUntil.getTime() : 0;
    const hasPaid = Number.isFinite(paidMs) && paidMs > now;
    return hasPaid || (s.status === 'active' && !s.paidUntil);
  }) || null;

  const access = activeSeat ? { ok: true, reason: 'paid' as const } : { ok: false, reason: 'none' as const };

  return NextResponse.json({
    billing: {
      cpPublicId: cpPublicId || null,
      cpMode,
      priceRub,
      trialEndsAt: null,
      billingStatus: activeSeat?.status ?? 'none',
      paidUntil: activeSeat?.paidUntil ? activeSeat.paidUntil.toISOString() : null,
      cpSubscriptionId: activeSeat?.cpSubscriptionId ?? null,
      cpCardMask: activeSeat?.cpCardMask ?? null,
      access,
      billingUpdatedAt: activeSeat?.billingUpdatedAt ? activeSeat.billingUpdatedAt.toISOString() : null,
    },
  });
}


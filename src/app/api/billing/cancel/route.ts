import { NextResponse } from 'next/server';

import { prisma } from '../../../../lib/db';
import { getCurrentUserOrNull } from '../../../../lib/auth';
import { cloudPaymentsCancelSubscription } from '../../../../lib/cloudpayments';

export async function POST() {
  const me = await getCurrentUserOrNull();
  if (!me) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (me.role === 'student') return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  if (me.role !== 'admin' && !me.emailVerifiedAt) return NextResponse.json({ error: 'email_not_verified' }, { status: 403 });

  // Legacy endpoint: keep for backward compatibility.
  // Cancels the first active seat (preferred: /api/billing/seats/[seatId]/cancel).
  const seats = await prisma.subscriptionSeat.findMany({
    where: { parentId: me.id },
    orderBy: { createdAt: 'asc' },
    take: 200,
    select: { id: true, status: true, paidUntil: true, cpSubscriptionId: true },
  });
  const nowMs = Date.now();
  const seat =
    seats.find((s) => {
      const paidMs = s.paidUntil ? s.paidUntil.getTime() : 0;
      const hasPaid = Number.isFinite(paidMs) && paidMs > nowMs;
      return hasPaid || (s.status === 'active' && !s.paidUntil);
    }) ?? null;
  if (!seat) return NextResponse.json({ ok: true, already: true });
  if (!seat.cpSubscriptionId) return NextResponse.json({ error: 'use_seat_cancel' }, { status: 409 });

  await cloudPaymentsCancelSubscription({ id: seat.cpSubscriptionId });

  const now = new Date();
  await prisma.subscriptionSeat.update({
    where: { id: seat.id },
    data: { status: 'cancelled', billingUpdatedAt: now, cpSubscriptionId: null, cpToken: null },
    select: { id: true },
  });

  return NextResponse.json({ ok: true });
}


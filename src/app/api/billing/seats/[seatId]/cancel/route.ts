import { NextResponse } from 'next/server';

import { prisma } from '../../../../../../lib/db';
import { getCurrentUserOrNull } from '../../../../../../lib/auth';
import { cloudPaymentsCancelSubscription } from '../../../../../../lib/cloudpayments';

function normalizeId(v: unknown): string {
  const s = typeof v === 'string' ? v.trim() : '';
  if (!s) return '';
  if (s.length > 64) return '';
  return s;
}

export async function POST(_req: Request, ctx: { params: { seatId: string } }) {
  const me = await getCurrentUserOrNull();
  if (!me) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (me.role !== 'parent' && me.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  if (me.role !== 'admin' && !me.emailVerifiedAt) return NextResponse.json({ error: 'email_not_verified' }, { status: 403 });

  const seatId = normalizeId(ctx?.params?.seatId);
  if (!seatId) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });

  const seat = await prisma.subscriptionSeat.findUnique({
    where: { id: seatId },
    select: { id: true, parentId: true, cpSubscriptionId: true },
  });
  if (!seat) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (me.role !== 'admin' && seat.parentId !== me.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  if (!seat.cpSubscriptionId) return NextResponse.json({ ok: true, already: true });

  await cloudPaymentsCancelSubscription({ id: seat.cpSubscriptionId });

  const now = new Date();
  await prisma.subscriptionSeat.update({
    where: { id: seat.id },
    data: { status: 'cancelled', billingUpdatedAt: now, cpSubscriptionId: null, cpToken: null },
    select: { id: true },
  });

  return NextResponse.json({ ok: true });
}


import { NextResponse } from 'next/server';

import { prisma } from '../../../../../../lib/db';
import { getCurrentUserOrNull } from '../../../../../../lib/auth';
import { cloudPaymentsCancelSubscription } from '../../../../../../lib/cloudpayments';

export async function POST(_req: Request, ctx: { params: { id: string } }) {
  const me = await getCurrentUserOrNull();
  if (!me) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (me.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const id = String(ctx?.params?.id || '').trim();
  if (!id) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });

  const u = await prisma.user.findUnique({
    where: { id },
    select: { id: true, cpSubscriptionId: true },
  });
  if (!u) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (!u.cpSubscriptionId) return NextResponse.json({ ok: true, already: true });

  await cloudPaymentsCancelSubscription({ id: u.cpSubscriptionId });
  const now = new Date();
  await prisma.user.update({
    where: { id: u.id },
    data: { billingStatus: 'cancelled', billingUpdatedAt: now },
  });

  return NextResponse.json({ ok: true });
}


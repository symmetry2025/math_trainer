import { NextResponse } from 'next/server';

import { prisma } from '../../../../lib/db';
import { getCurrentUserOrNull } from '../../../../lib/auth';
import { cloudPaymentsCancelSubscription } from '../../../../lib/cloudpayments';

export async function POST() {
  const me = await getCurrentUserOrNull();
  if (!me) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const u = await prisma.user.findUnique({
    where: { id: me.id },
    select: { id: true, role: true, cpSubscriptionId: true },
  });
  if (!u) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!u.cpSubscriptionId) return NextResponse.json({ ok: true, already: true });

  await cloudPaymentsCancelSubscription({ id: u.cpSubscriptionId });

  const now = new Date();
  await prisma.user.update({
    where: { id: u.id },
    data: { billingStatus: 'cancelled', billingUpdatedAt: now, cpSubscriptionId: null, cpToken: null },
  });

  return NextResponse.json({ ok: true });
}


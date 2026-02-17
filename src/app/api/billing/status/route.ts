import { NextResponse } from 'next/server';

import { getCurrentUserOrNull } from '../../../../lib/auth';
import { getBillingInfoByUserId, hasBillingAccess } from '../../../../lib/billing';
import { cleanEnvValue } from '../../../../lib/env';

export async function GET() {
  const me = await getCurrentUserOrNull();
  if (!me) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const info = await getBillingInfoByUserId(me.id);
  if (!info) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const cpPublicId = cleanEnvValue(process.env.NEXT_PUBLIC_CP_PUBLIC_ID);

  const access = hasBillingAccess({
    role: info.role,
    trialEndsAt: info.trialEndsAt,
    billingStatus: info.billingStatus,
    paidUntil: info.paidUntil,
  });

  return NextResponse.json({
    billing: {
      cpPublicId: cpPublicId || null,
      trialEndsAt: info.trialEndsAt ? info.trialEndsAt.toISOString() : null,
      billingStatus: info.billingStatus,
      paidUntil: info.paidUntil ? info.paidUntil.toISOString() : null,
      cpSubscriptionId: info.cpSubscriptionId,
      cpCardMask: info.cpCardMask,
      access,
      billingUpdatedAt: info.billingUpdatedAt ? info.billingUpdatedAt.toISOString() : null,
    },
  });
}


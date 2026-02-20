import { NextResponse } from 'next/server';

import { getCurrentUserOrNull } from '../../../../lib/auth';
import { getBillingInfoByUserId, hasBillingAccess } from '../../../../lib/billing';
import { getBillingPriceRub } from '../../../../lib/billingConfig';
import { getCpMode, getCpWidgetPublicId } from '../../../../lib/cloudpaymentsConfig';

export async function GET() {
  const me = await getCurrentUserOrNull();
  if (!me) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (me.role === 'student') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const info = await getBillingInfoByUserId(me.id);
  if (!info) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const cpPublicId = getCpWidgetPublicId();
  const priceRub = getBillingPriceRub();
  const cpMode = getCpMode();

  const access = hasBillingAccess({
    role: info.role,
    trialEndsAt: info.trialEndsAt,
    billingStatus: info.billingStatus,
    paidUntil: info.paidUntil,
  });

  return NextResponse.json({
    billing: {
      cpPublicId: cpPublicId || null,
      cpMode,
      priceRub,
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


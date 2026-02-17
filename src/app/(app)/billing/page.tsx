import { redirect } from 'next/navigation';

import { getCurrentUserOrNull } from '../../../lib/auth';
import { getBillingInfoByUserId, hasBillingAccess, BILLING_PRICE_RUB } from '../../../lib/billing';
import { BillingClient } from './BillingClient';
import { cleanEnvValue } from '../../../lib/env';

export default async function BillingPage() {
  const me = await getCurrentUserOrNull();
  if (!me) redirect('/login');

  const info = await getBillingInfoByUserId(me.id);
  if (!info) redirect('/login');

  const cpPublicId = cleanEnvValue(process.env.NEXT_PUBLIC_CP_PUBLIC_ID);
  const baseUrl = String(process.env.WEB_BASE_URL ?? '').trim().replace(/\/+$/, '');
  const returnUrl = baseUrl ? `${baseUrl}/class-2/addition` : '/class-2/addition';

  const access = hasBillingAccess({
    role: info.role,
    trialEndsAt: info.trialEndsAt,
    billingStatus: info.billingStatus,
    paidUntil: info.paidUntil,
  });

  return (
    <BillingClient
      me={{ id: info.id, email: info.email }}
      cpPublicId={cpPublicId}
      returnUrl={returnUrl}
      priceRub={BILLING_PRICE_RUB}
      initialBilling={{
        trialEndsAt: info.trialEndsAt ? info.trialEndsAt.toISOString() : null,
        billingStatus: info.billingStatus,
        paidUntil: info.paidUntil ? info.paidUntil.toISOString() : null,
        cpSubscriptionId: info.cpSubscriptionId,
        cpCardMask: info.cpCardMask,
        billingUpdatedAt: info.billingUpdatedAt ? info.billingUpdatedAt.toISOString() : null,
        access,
      }}
    />
  );
}


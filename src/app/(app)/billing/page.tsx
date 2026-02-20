import { redirect } from 'next/navigation';

import { getCurrentUserOrNull } from '../../../lib/auth';
import { getBillingInfoByUserId, getBillingPriceRub, hasBillingAccess } from '../../../lib/billing';
import { getCpWidgetPublicId } from '../../../lib/cloudpaymentsConfig';
import { BillingClient } from './BillingClient';

export default async function BillingPage() {
  const me = await getCurrentUserOrNull();
  if (!me) redirect('/login');
  if (me.role === 'student') redirect('/settings');

  const info = await getBillingInfoByUserId(me.id);
  if (!info) redirect('/login');

  const cpPublicId = getCpWidgetPublicId();
  const baseUrl = String(process.env.WEB_BASE_URL ?? '').trim().replace(/\/+$/, '');
  const returnUrl = baseUrl ? `${baseUrl}/class-2/addition` : '/class-2/addition';
  const priceRub = getBillingPriceRub();

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
      priceRub={priceRub}
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


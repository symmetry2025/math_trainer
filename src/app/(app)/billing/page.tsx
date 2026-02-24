import { redirect } from 'next/navigation';

import { getCurrentUserOrNull } from '../../../lib/auth';
import { getBillingPriceRub } from '../../../lib/billing';
import { getCpWidgetPublicId } from '../../../lib/cloudpaymentsConfig';
import { BillingClient } from './BillingClient';

export default async function BillingPage() {
  const me = await getCurrentUserOrNull();
  if (!me) redirect('/login');
  if (me.role === 'student') redirect('/settings');

  const cpPublicId = getCpWidgetPublicId();
  const baseUrl = String(process.env.WEB_BASE_URL ?? '').trim().replace(/\/+$/, '');
  const returnUrl = baseUrl ? `${baseUrl}/class-2/addition` : '/class-2/addition';
  const priceRub = getBillingPriceRub();

  return (
    <BillingClient
      me={{ id: me.id, email: me.email, emailVerifiedAt: me.emailVerifiedAt }}
      cpPublicId={cpPublicId}
      returnUrl={returnUrl}
      priceRub={priceRub}
    />
  );
}


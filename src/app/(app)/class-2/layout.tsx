import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';

import { getCurrentUserOrNull } from '../../../lib/auth';
import { getBillingInfoByUserId, hasBillingAccess } from '../../../lib/billing';

export default async function Class2Layout(props: { children: ReactNode }) {
  const me = await getCurrentUserOrNull();
  if (!me) redirect('/login');

  const info = await getBillingInfoByUserId(me.id);
  if (!info) redirect('/login');

  const access = hasBillingAccess({
    role: info.role,
    trialEndsAt: info.trialEndsAt,
    billingStatus: info.billingStatus,
    paidUntil: info.paidUntil,
  });

  if (!access.ok) redirect('/billing');
  return props.children;
}


import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';

import { getCurrentUserOrNull } from '../../../lib/auth';
import { getEffectiveBillingAccessByUserId } from '../../../lib/billing';

export default async function Class2Layout(props: { children: ReactNode }) {
  const me = await getCurrentUserOrNull();
  if (!me) redirect('/login');

  const eff = await getEffectiveBillingAccessByUserId(me.id);
  if (!eff.access.ok) redirect(me.role === 'student' ? '/settings' : '/billing');
  return props.children;
}


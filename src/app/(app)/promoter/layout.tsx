import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';

import { getCurrentUserOrNull } from '../../../lib/auth';

export default async function PromoterLayout(props: { children: ReactNode }) {
  const user = await getCurrentUserOrNull();
  if (!user) redirect('/login');
  if (user.role !== 'promoter' && user.role !== 'admin') redirect('/class-2/addition');
  return props.children;
}


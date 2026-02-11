import type { ReactNode } from 'react';

import { redirect } from 'next/navigation';

import { TrainerShell } from '../TrainerShell';
import { getCurrentUserOrNull } from '../../lib/auth';

export default async function AppLayout(props: { children: ReactNode }) {
  // Server-side gate: even if cookie is present but invalid/expired, we must protect app pages.
  const user = await getCurrentUserOrNull();
  if (!user) redirect('/login?next=/');
  return <TrainerShell>{props.children}</TrainerShell>;
}


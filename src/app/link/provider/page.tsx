import { redirect } from 'next/navigation';

import { getCurrentUserOrNull } from '../../../lib/auth';
import LinkProviderClient from './LinkProviderClient';

function safeNextPath(v: unknown): string | null {
  const s = typeof v === 'string' ? v.trim() : '';
  if (!s) return null;
  if (!s.startsWith('/')) return null;
  if (s.startsWith('//')) return null;
  if (s.startsWith('/login')) return null;
  return s;
}

export default async function LinkProviderPage(props: { searchParams?: Record<string, string | string[] | undefined> }) {
  const reqRaw = props.searchParams?.req;
  const requestToken = Array.isArray(reqRaw) ? reqRaw[0] : reqRaw;
  const req = typeof requestToken === 'string' ? requestToken.trim() : '';
  if (!req) redirect('/settings');

  const me = await getCurrentUserOrNull();
  if (!me) {
    const next = safeNextPath(`/link/provider?req=${encodeURIComponent(req)}`) ?? '/settings';
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  return <LinkProviderClient requestToken={req} />;
}


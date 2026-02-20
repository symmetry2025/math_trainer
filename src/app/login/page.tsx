import { Suspense } from 'react';
import { redirect } from 'next/navigation';

import LoginClient from './LoginClient';
import { getCurrentUserOrNull } from '../../lib/auth';

function safeNextPath(v: unknown): string | null {
  const s = typeof v === 'string' ? v.trim() : '';
  if (!s) return null;
  if (!s.startsWith('/')) return null;
  if (s.startsWith('//')) return null;
  if (s.startsWith('/login')) return null;
  return s;
}

export default async function LoginPage(props: { searchParams?: Record<string, string | string[] | undefined> }) {
  const user = await getCurrentUserOrNull();
  if (user) {
    const nextRaw = props.searchParams?.next;
    const next = Array.isArray(nextRaw) ? nextRaw[0] : nextRaw;
    const fallback = user.role === 'promoter' ? '/promoter' : '/settings';
    redirect(safeNextPath(next) ?? fallback);
  }
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-6 md:p-10">
          <div className="card-elevated p-6 md:p-8">Загрузка…</div>
        </div>
      }
    >
      <LoginClient />
    </Suspense>
  );
}


import { NextResponse } from 'next/server';

import { prisma } from '../../../../lib/db';
import { getCurrentUserOrNull } from '../../../../lib/auth';

function cleanPath(raw: unknown): string | null {
  const s = typeof raw === 'string' ? raw.trim() : '';
  if (!s) return null;
  if (!s.startsWith('/')) return null;
  if (s.length > 256) return s.slice(0, 256);
  return s;
}

export async function POST(req: Request) {
  const me = await getCurrentUserOrNull();
  if (!me) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const path = cleanPath((body as any)?.path);
  const now = new Date();

  await prisma.user.update({
    where: { id: me.id },
    data: {
      lastSeenAt: now,
      ...(path ? { lastSeenPath: path } : {}),
    },
  });

  return NextResponse.json({ ok: true, now: now.toISOString() });
}


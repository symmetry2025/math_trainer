import { NextResponse } from 'next/server';

import { prisma } from '../../../../lib/db';
import { getCurrentUserOrNull } from '../../../../lib/auth';

export async function POST(req: Request) {
  const me = await getCurrentUserOrNull();
  if (!me) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const displayName = typeof body?.displayName === 'string' ? body.displayName.trim() : '';
  if (!displayName) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });

  await prisma.user.update({ where: { id: me.id }, data: { displayName } });
  return NextResponse.json({ ok: true });
}


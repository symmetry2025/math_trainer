import { NextResponse } from 'next/server';

import { prisma } from '../../../../lib/db';
import { getCurrentUserOrNull } from '../../../../lib/auth';

function normalizeCode(v: unknown): string {
  const s = typeof v === 'string' ? v.trim().toUpperCase() : '';
  if (!s) return '';
  if (!/^[A-Z0-9_-]{4,32}$/.test(s)) return '';
  return s;
}

export async function POST(req: Request) {
  const me = await getCurrentUserOrNull();
  if (!me) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (me.role !== 'student' && me.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const body = await req.json().catch(() => null);
  const code = normalizeCode(body?.code);
  if (!code) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });

  const inv = await prisma.parentInvite.findUnique({
    where: { code },
    select: { parentId: true },
  });
  if (!inv) return NextResponse.json({ error: 'invalid_code' }, { status: 404 });
  if (inv.parentId === me.id) return NextResponse.json({ error: 'invalid_code' }, { status: 400 });

  await prisma.parentStudentLink
    .create({
      data: { parentId: inv.parentId, studentId: me.id },
      select: { id: true },
    })
    .catch(() => undefined);

  return NextResponse.json({ ok: true });
}


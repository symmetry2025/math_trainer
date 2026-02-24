import { NextResponse } from 'next/server';

import { prisma } from '../../../../lib/db';
import { getCurrentUserOrNull } from '../../../../lib/auth';

function makeInviteCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 8; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

export async function GET() {
  const me = await getCurrentUserOrNull();
  if (!me) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (me.role !== 'parent' && me.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  if (me.role !== 'admin' && !me.emailVerifiedAt) return NextResponse.json({ error: 'email_not_verified' }, { status: 403 });

  const now = new Date();
  const inv = await prisma.parentInvite.upsert({
    where: { parentId: me.id },
    update: { updatedAt: now },
    create: { parentId: me.id, code: makeInviteCode() },
    select: { code: true, updatedAt: true },
  });

  return NextResponse.json({ invite: { code: inv.code, updatedAt: inv.updatedAt.toISOString() } });
}

export async function POST() {
  const me = await getCurrentUserOrNull();
  if (!me) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (me.role !== 'parent' && me.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  if (me.role !== 'admin' && !me.emailVerifiedAt) return NextResponse.json({ error: 'email_not_verified' }, { status: 403 });

  const now = new Date();
  // Regenerate code.
  let updated = null as null | { code: string; updatedAt: Date };
  for (let i = 0; i < 5; i++) {
    const code = makeInviteCode();
    try {
      updated = await prisma.parentInvite.upsert({
        where: { parentId: me.id },
        update: { code, updatedAt: now },
        create: { parentId: me.id, code },
        select: { code: true, updatedAt: true },
      });
      break;
    } catch {
      // retry on rare code collision
    }
  }
  if (!updated) return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  return NextResponse.json({ invite: { code: updated.code, updatedAt: updated.updatedAt.toISOString() } });
}


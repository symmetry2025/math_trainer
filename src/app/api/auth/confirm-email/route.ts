import { NextResponse } from 'next/server';

import { prisma } from '../../../../lib/db';
import { hashToken } from '../../../../lib/auth';

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const token = typeof body?.token === 'string' ? body.token.trim() : '';
  if (!token) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });

  const tokenHash = hashToken(token);
  const now = new Date();

  const row = await prisma.emailConfirmationToken.findUnique({
    where: { tokenHash },
    select: { id: true, userId: true, expiresAt: true, usedAt: true },
  });

  if (!row || row.usedAt || row.expiresAt.getTime() <= now.getTime()) {
    return NextResponse.json({ error: 'invalid_or_expired_token' }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.emailConfirmationToken.update({ where: { id: row.id }, data: { usedAt: now } });
    await tx.user.update({ where: { id: row.userId }, data: { emailVerifiedAt: now } });
  });

  return NextResponse.json({ ok: true });
}


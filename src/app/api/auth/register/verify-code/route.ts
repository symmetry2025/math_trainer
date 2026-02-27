import { NextResponse } from 'next/server';

import { prisma } from '../../../../../lib/db';
import { hashToken } from '../../../../../lib/auth';

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const codeRaw = typeof body?.code === 'string' ? body.code.trim() : '';
  const code = codeRaw.replace(/\s+/g, '').toUpperCase();

  if (!email || !code) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, emailVerifiedAt: true },
  });
  if (!user) return NextResponse.json({ error: 'invalid_or_expired_token' }, { status: 400 });
  if (user.emailVerifiedAt) return NextResponse.json({ error: 'email_taken' }, { status: 409 });

  const now = new Date();
  const tokenHash = hashToken(code);
  const token = await prisma.emailConfirmationToken.findUnique({
    where: { tokenHash },
    select: { id: true, userId: true, usedAt: true, expiresAt: true },
  });

  if (!token || token.userId !== user.id || token.usedAt || token.expiresAt.getTime() < now.getTime()) {
    return NextResponse.json({ error: 'invalid_or_expired_token' }, { status: 400 });
  }

  return NextResponse.json({ ok: true, verified: true });
}


import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

import { prisma } from '../../../../lib/db';
import { AUTH_COOKIE_NAME, expiresAtFromNow, hashToken, newToken } from '../../../../lib/auth';

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  if (!email || !password) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 });

  const token = newToken();
  await prisma.session.create({
    data: { userId: user.id, tokenHash: hashToken(token), expiresAt: expiresAtFromNow() },
  });

  const res = NextResponse.json({ user: { id: user.id, email: user.email, role: user.role } });
  res.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
  return res;
}


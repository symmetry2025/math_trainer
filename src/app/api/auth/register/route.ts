import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

import { prisma } from '../../../../lib/db';
import { AUTH_COOKIE_NAME, expiresAtFromNow, hashToken, newToken } from '../../../../lib/auth';

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  if (!email || !password || password.length < 6) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  }

  const exists = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (exists) return NextResponse.json({ error: 'email_taken' }, { status: 409 });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { email, passwordHash, role: 'student' }, select: { id: true, email: true, role: true } });

  const token = newToken();
  await prisma.session.create({
    data: { userId: user.id, tokenHash: hashToken(token), expiresAt: expiresAtFromNow() },
  });

  const res = NextResponse.json({ user });
  res.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
  return res;
}


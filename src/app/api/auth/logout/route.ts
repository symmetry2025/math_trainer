import { NextResponse } from 'next/server';

import { prisma } from '../../../../lib/db';
import { AUTH_COOKIE_NAME, getSessionCookieValue, hashToken } from '../../../../lib/auth';

export async function POST() {
  const token = getSessionCookieValue();
  if (token) {
    await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE_NAME, '', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 0 });
  return res;
}


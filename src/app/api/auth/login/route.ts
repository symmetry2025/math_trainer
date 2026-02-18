import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

import { prisma } from '../../../../lib/db';
import { AUTH_COOKIE_NAME, expiresAtFromNow, hashToken, newToken } from '../../../../lib/auth';
import { trialEndsAtFromNow } from '../../../../lib/billing';

function isDbUnavailableError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e ?? '');
  return (
    msg.includes('the database system is not yet accepting connections') ||
    msg.includes('the database system is in recovery mode') ||
    msg.includes('Consistent recovery state has not been yet reached')
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body?.password === 'string' ? body.password : '';
    if (!email || !password) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        role: true,
        emailVerifiedAt: true,
        trialEndsAt: true,
        billingStatus: true,
        paidUntil: true,
      },
    });
    if (!user) return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 });

    if (!user.emailVerifiedAt) return NextResponse.json({ error: 'email_not_verified' }, { status: 403 });

    // Honest trial: start on the first successful login.
    if (user.role !== 'admin' && !user.trialEndsAt && user.billingStatus === 'none' && !user.paidUntil) {
      const now = new Date();
      await prisma.user.update({
        where: { id: user.id },
        data: { trialEndsAt: trialEndsAtFromNow(now), billingUpdatedAt: now },
      });
    }

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
  } catch (e) {
    if (isDbUnavailableError(e)) return NextResponse.json({ error: 'db_unavailable' }, { status: 503 });
    // eslint-disable-next-line no-console
    console.error('[auth/login] unexpected error', e);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}


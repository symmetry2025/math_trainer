import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';

import { prisma } from '../../../../lib/db';
import { AUTH_COOKIE_NAME, expiresAtFromNow, hashToken, newToken } from '../../../../lib/auth';

const REF_COOKIE = process.env.REF_COOKIE_NAME || 'smmtry_ref';

function normalizeRefCode(v: unknown): string {
  const s = typeof v === 'string' ? v.trim() : '';
  if (!s) return '';
  if (!/^[a-zA-Z0-9_-]{2,64}$/.test(s)) return '';
  return s;
}

function passwordMeetsRequirements(pw: string): boolean {
  if (!pw || pw.length < 6) return false;
  if (!/\d/.test(pw)) return false;
  if (!/[A-Z]/.test(pw)) return false;
  if (!/[a-z]/.test(pw)) return false;
  return true;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const roleRaw = typeof body?.role === 'string' ? body.role.trim() : '';
  const role = roleRaw === 'parent' || roleRaw === 'student' ? roleRaw : 'student';
  const displayName = typeof body?.displayName === 'string' ? body.displayName.trim() : '';
  const emailInput = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const emailCodeRaw = typeof body?.emailCode === 'string' ? body.emailCode.trim() : '';
  const emailCode = emailCodeRaw.replace(/\s+/g, '').toUpperCase();
  const password = typeof body?.password === 'string' ? body.password : '';

  const needsEmail = role === 'parent';
  const email = needsEmail
    ? emailInput
    : emailInput
      ? emailInput
      : `student+${randomBytes(9).toString('base64url')}@math-trainer.local`;

  if (!displayName || (needsEmail && !emailInput) || !passwordMeetsRequirements(password)) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const now = new Date();
  const refCode = normalizeRefCode(cookies().get(REF_COOKIE)?.value);
  const user = await (async () => {
    if (needsEmail) {
      if (!emailCode) return { error: 'invalid_input' as const };
      const existing = await prisma.user.findUnique({
        where: { email },
        select: { id: true, emailVerifiedAt: true },
      });
      if (!existing) return null;
      if (existing.emailVerifiedAt) return { error: 'email_taken' as const };

      const tokenHash = hashToken(emailCode);
      const token = await prisma.emailConfirmationToken.findUnique({
        where: { tokenHash },
        select: { id: true, userId: true, usedAt: true, expiresAt: true },
      });
      if (!token || token.userId !== existing.id || token.usedAt || token.expiresAt.getTime() < now.getTime()) {
        return { error: 'invalid_or_expired_token' as const };
      }

      const updated = await prisma.$transaction(async (tx) => {
        await tx.emailConfirmationToken.updateMany({
          where: { userId: existing.id, usedAt: null, NOT: { id: token.id } },
          data: { usedAt: now },
        });

        const u = await tx.user.update({
          where: { id: existing.id },
          data: { passwordHash, role: 'parent', displayName: displayName || null, emailVerifiedAt: now },
          select: { id: true, email: true, role: true },
        });

        await tx.emailConfirmationToken.update({ where: { id: token.id }, data: { usedAt: now } });
        return u;
      });
      return { user: updated } as const;
    }

    const exists = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (exists) return { error: 'email_taken' as const };

    const created = await prisma.user.create({
      // Trial should start from the first successful login, not from registration.
      data: {
        email,
        passwordHash,
        role: 'student',
        displayName: displayName || null,
        emailVerifiedAt: now,
        lastLoginAt: now,
        lastSeenAt: now,
      },
      select: { id: true, email: true, role: true },
    });
    return { user: created } as const;
  })();

  if (!user) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  if ('error' in user) return NextResponse.json({ error: user.error }, { status: 400 });

  if (refCode) {
    const promoter = await prisma.promoter.findUnique({ where: { code: refCode }, select: { id: true } });
    if (promoter) {
      await prisma.referralAttribution
        .create({
          data: { promoterId: promoter.id, userId: user.user.id },
        })
        .catch(() => undefined);
    }
  }

  if (needsEmail) {
    // Parent flow: email already verified by code; require explicit login.
    return NextResponse.json({ ok: true, needsLogin: true });
  }

  // Student flow: auto-login (no email required) to avoid dead accounts.
  const sessionToken = newToken();
  await prisma.session.create({
    data: { userId: user.user.id, tokenHash: hashToken(sessionToken), expiresAt: expiresAtFromNow() },
  });
  const res = NextResponse.json({ ok: true, autoLoggedIn: true, user: { id: user.user.id, role: user.user.role } });
  res.cookies.set(AUTH_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
  return res;
}


import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';

import { prisma } from '../../../../lib/db';
import { AUTH_COOKIE_NAME, expiresAtFromNow, hashToken, newToken } from '../../../../lib/auth';
import { renderBasicEmail } from '../../../../lib/mailTemplates';
import { sendMail } from '../../../../lib/mail';

const REF_COOKIE = process.env.REF_COOKIE_NAME || 'smmtry_ref';

function normalizeRefCode(v: unknown): string {
  const s = typeof v === 'string' ? v.trim() : '';
  if (!s) return '';
  if (!/^[a-zA-Z0-9_-]{2,64}$/.test(s)) return '';
  return s;
}

function webBaseUrl(req: Request): string {
  const env = (process.env.WEB_BASE_URL ?? '').trim();
  if (env) return env.replace(/\/+$/, '');
  const proto = (req.headers.get('x-forwarded-proto') ?? 'http').split(',')[0]?.trim() || 'http';
  const host = (req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? '').split(',')[0]?.trim();
  if (!host) throw new Error('Missing host header (set WEB_BASE_URL)');
  return `${proto}://${host}`;
}

function emailConfirmTtlHours(): number {
  const raw = (process.env.EMAIL_CONFIRM_TTL_HOURS ?? '').trim();
  const n = raw ? Number(raw) : 72;
  return Number.isFinite(n) ? Math.max(1, Math.trunc(n)) : 72;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const roleRaw = typeof body?.role === 'string' ? body.role.trim() : '';
  const role = roleRaw === 'parent' || roleRaw === 'student' ? roleRaw : 'student';
  const displayName = typeof body?.displayName === 'string' ? body.displayName.trim() : '';
  const emailInput = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body?.password === 'string' ? body.password : '';

  const needsEmail = role === 'parent';
  const email =
    needsEmail
      ? emailInput
      : emailInput
        ? emailInput
        : `student+${randomBytes(9).toString('base64url')}@math-trainer.local`;

  if ((needsEmail && !emailInput) || !password || password.length < 6) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  }

  const exists = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (exists) return NextResponse.json({ error: 'email_taken' }, { status: 409 });

  const passwordHash = await bcrypt.hash(password, 10);
  const now = new Date();
  const refCode = normalizeRefCode(cookies().get(REF_COOKIE)?.value);
  const user = await prisma.user.create({
    // Trial should start from the first successful login, not from registration.
    data: {
      email,
      passwordHash,
      role,
      displayName: displayName || null,
      emailVerifiedAt: needsEmail ? null : now,
      lastLoginAt: needsEmail ? null : now,
      lastSeenAt: needsEmail ? null : now,
    },
    select: { id: true, email: true, role: true },
  });

  if (refCode) {
    const promoter = await prisma.promoter.findUnique({ where: { code: refCode }, select: { id: true } });
    if (promoter) {
      await prisma.referralAttribution
        .create({
          data: { promoterId: promoter.id, userId: user.id },
        })
        .catch(() => undefined);
    }
  }

  // Create a one-time email confirmation token.
  const token = randomBytes(32).toString('base64url');
  const tokenHash = hashToken(token);
  const expiresAt = new Date(now.getTime() + emailConfirmTtlHours() * 60 * 60_000);
  if (needsEmail) {
    await prisma.emailConfirmationToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });
  }

  try {
    if (needsEmail) {
      // 1) Welcome email (with credentials)
      // NOTE: Sending passwords by email is not recommended, but required by the product spec.
      const welcome = renderBasicEmail({
        title: 'Добро пожаловать в МатТренер',
        previewText: 'Ваши данные для входа',
        paragraphs: [
          `Логин: ${email}`,
          `Пароль: ${password}`,
          '',
          'Если это были не вы — проигнорируйте письмо.',
        ],
      });
      await sendMail({ to: email, ...welcome });

      // 2) Email confirmation link
      const link = `${webBaseUrl(req)}/signup/confirm?token=${encodeURIComponent(token)}`;
      const confirm = renderBasicEmail({
        title: 'Подтверждение почты — МатТренер',
        previewText: 'Подтверди регистрацию по ссылке',
        paragraphs: [
          'Чтобы подтвердить регистрацию, откройте ссылку:',
          link,
          '',
          'Если вы не регистрировались — просто проигнорируйте письмо.',
        ],
      });
      await sendMail({ to: email, ...confirm });
    }
  } catch (err) {
    // Cleanup: do not create an account if we cannot deliver confirmation email.
    await prisma.user.delete({ where: { id: user.id } }).catch(() => undefined);
    // eslint-disable-next-line no-console
    console.error('[auth/register] email send failed:', err);
    return NextResponse.json({ error: 'email_send_failed' }, { status: 502 });
  }

  if (needsEmail) {
    // Do not auto-login until email is verified.
    return NextResponse.json({ ok: true, needsEmailConfirm: true });
  }

  // Student flow: auto-login (no email required) to avoid dead accounts.
  const sessionToken = newToken();
  await prisma.session.create({
    data: { userId: user.id, tokenHash: hashToken(sessionToken), expiresAt: expiresAtFromNow() },
  });
  const res = NextResponse.json({ ok: true, autoLoggedIn: true, user: { id: user.id, role: user.role } });
  res.cookies.set(AUTH_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
  return res;
}


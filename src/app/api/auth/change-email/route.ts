import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';

import { prisma } from '../../../../lib/db';
import { AUTH_COOKIE_NAME, getCurrentUserOrNull, hashToken } from '../../../../lib/auth';
import { renderBasicEmail } from '../../../../lib/mailTemplates';
import { sendMail } from '../../../../lib/mail';

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
  const me = await getCurrentUserOrNull();
  if (!me) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const newEmail = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  if (!newEmail || !password) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });

  const exists = await prisma.user.findUnique({ where: { email: newEmail }, select: { id: true } });
  if (exists && exists.id !== me.id) return NextResponse.json({ error: 'email_taken' }, { status: 409 });

  const user = await prisma.user.findUnique({ where: { id: me.id }, select: { id: true, email: true, passwordHash: true } });
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return NextResponse.json({ error: 'invalid_password' }, { status: 400 });

  const token = randomBytes(32).toString('base64url');
  const tokenHash = hashToken(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + emailConfirmTtlHours() * 60 * 60_000);

  const link = `${webBaseUrl(req)}/signup/confirm?token=${encodeURIComponent(token)}`;
  const emailTpl = renderBasicEmail({
    title: 'Подтверждение почты — МатТренер',
    previewText: 'Подтверди новый email по ссылке',
    paragraphs: ['Вы изменили email. Чтобы подтвердить новый адрес, откройте ссылку:', link],
  });
  // Create token first, but do NOT change the email until we successfully deliver the message.
  await prisma.$transaction(async (tx) => {
    await tx.emailConfirmationToken.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: now } });
    await tx.emailConfirmationToken.create({ data: { userId: user.id, tokenHash, expiresAt } });
  });

  try {
    await sendMail({ to: newEmail, ...emailTpl });
  } catch (err) {
    // Cleanup token, keep user email intact.
    await prisma.emailConfirmationToken.updateMany({ where: { userId: user.id, tokenHash, usedAt: null }, data: { usedAt: now } }).catch(() => undefined);
    // eslint-disable-next-line no-console
    console.error('[auth/change-email] send failed:', err);
    return NextResponse.json({ error: 'email_send_failed' }, { status: 502 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: user.id }, data: { email: newEmail, emailVerifiedAt: null } });
    await tx.session.deleteMany({ where: { userId: user.id } });
  });

  const res = NextResponse.json({ ok: true, needsEmailConfirm: true });
  // Force re-login after email change.
  res.cookies.set(AUTH_COOKIE_NAME, '', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 0 });
  return res;
}


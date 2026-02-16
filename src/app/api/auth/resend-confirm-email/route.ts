import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';

import { prisma } from '../../../../lib/db';
import { hashToken } from '../../../../lib/auth';
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
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';

  // Always return OK (do not reveal whether the email exists).
  if (!email) return NextResponse.json({ ok: true });

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, emailVerifiedAt: true },
  });
  if (!user || user.emailVerifiedAt) return NextResponse.json({ ok: true });

  const token = randomBytes(32).toString('base64url');
  const tokenHash = hashToken(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + emailConfirmTtlHours() * 60 * 60_000);

  await prisma.$transaction(async (tx) => {
    await tx.emailConfirmationToken.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: now } });
    await tx.emailConfirmationToken.create({ data: { userId: user.id, tokenHash, expiresAt } });
  });

  const link = `${webBaseUrl(req)}/signup/confirm?token=${encodeURIComponent(token)}`;
  const emailTpl = renderBasicEmail({
    title: 'Подтверждение почты — МатТренер',
    previewText: 'Подтверди регистрацию по ссылке',
    paragraphs: [
      'Чтобы подтвердить регистрацию, откройте ссылку:',
      link,
      '',
      'Если вы не регистрировались — просто проигнорируйте письмо.',
    ],
  });

  try {
    await sendMail({ to: user.email, ...emailTpl });
  } catch (err) {
    // Do not reveal SMTP status to the client.
    // eslint-disable-next-line no-console
    console.error('[auth/resend-confirm-email] send failed:', err);
  }
  return NextResponse.json({ ok: true });
}


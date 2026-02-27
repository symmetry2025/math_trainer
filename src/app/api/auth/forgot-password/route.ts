import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';

import { prisma } from '../../../../lib/db';
import { hashToken } from '../../../../lib/auth';
import { renderBasicEmail } from '../../../../lib/mailTemplates';
import { sendMail } from '../../../../lib/mail';

function generatePassword(): string {
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const digit = '0123456789';
  const all = lower + upper + digit;

  const bytes = randomBytes(64);
  let p = 0;
  const pick = (chars: string) => chars[bytes[p++ % bytes.length] % chars.length]!;

  const out: string[] = [pick(lower), pick(upper), pick(digit)];
  while (out.length < 12) out.push(pick(all));

  for (let i = out.length - 1; i > 0; i--) {
    const j = bytes[p++ % bytes.length] % (i + 1);
    const tmp = out[i];
    out[i] = out[j]!;
    out[j] = tmp!;
  }

  return out.join('');
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
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';

  // Always return OK (do not reveal whether the email exists).
  if (!email) return NextResponse.json({ ok: true });

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, emailVerifiedAt: true },
  });
  if (!user) return NextResponse.json({ ok: true });

  const newPassword = generatePassword();

  try {
    if (!user.emailVerifiedAt) {
      const token = randomBytes(32).toString('base64url');
      const tokenHash = hashToken(token);
      const now = new Date();
      const expiresAt = new Date(now.getTime() + emailConfirmTtlHours() * 60 * 60_000);
      const link = `${webBaseUrl(req)}/signup/confirm?token=${encodeURIComponent(token)}`;

      const emailTpl = renderBasicEmail({
        title: 'Подтверждение почты и новый пароль — МатТренер',
        previewText: 'Подтверди почту и войди с новым паролем',
        paragraphs: [
          'Чтобы завершить регистрацию, подтвердите почту по ссылке:',
          link,
          '',
          `Логин: ${user.email}`,
          `Новый пароль: ${newPassword}`,
          '',
          'Рекомендуем после входа поменять пароль в настройках.',
        ],
      });

      await sendMail({ to: user.email, ...emailTpl });

      const passwordHash = await bcrypt.hash(newPassword, 10);
      await prisma.$transaction(async (tx) => {
        await tx.emailConfirmationToken.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: now } });
        await tx.emailConfirmationToken.create({ data: { userId: user.id, tokenHash, expiresAt } });
        await tx.user.update({ where: { id: user.id }, data: { passwordHash } });
        await tx.session.deleteMany({ where: { userId: user.id } });
      });

      return NextResponse.json({ ok: true });
    }

    const msg = renderBasicEmail({
      title: 'Новый пароль — МатТренер',
      previewText: 'Мы сгенерировали новый пароль',
      paragraphs: [
        `Логин: ${user.email}`,
        `Новый пароль: ${newPassword}`,
        '',
        'Рекомендуем после входа поменять пароль в настройках.',
      ],
    });
    await sendMail({ to: user.email, ...msg });
  } catch (err) {
    // IMPORTANT: do not change password if email delivery failed (avoid locking user out).
    // eslint-disable-next-line no-console
    console.error('[auth/forgot-password] send failed:', err);
    return NextResponse.json({ ok: true });
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: user.id }, data: { passwordHash } });
    await tx.session.deleteMany({ where: { userId: user.id } });
  });

  return NextResponse.json({ ok: true });
}


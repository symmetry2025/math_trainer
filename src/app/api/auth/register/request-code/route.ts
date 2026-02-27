import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';

import { prisma } from '../../../../../lib/db';
import { hashToken } from '../../../../../lib/auth';
import { renderBasicEmail } from '../../../../../lib/mailTemplates';
import { sendMail } from '../../../../../lib/mail';

function emailCodeTtlMinutes(): number {
  const raw = (process.env.EMAIL_CODE_TTL_MINUTES ?? '').trim();
  const n = raw ? Number(raw) : 15;
  return Number.isFinite(n) ? Math.max(3, Math.min(60, Math.trunc(n))) : 15;
}

function newEmailCode(): string {
  // Avoid ambiguous chars (I,O,0,1). 8 chars is easy to copy and effectively unique.
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(32);
  let out = '';
  for (let i = 0; i < 8; i++) out += alphabet[bytes[i] % alphabet.length]!;
  return out;
}

function newPlaceholderPassword(): string {
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const digit = '0123456789';
  const all = lower + upper + digit;
  const bytes = randomBytes(32);
  let p = 0;
  const pick = (chars: string) => chars[bytes[p++ % bytes.length] % chars.length]!;
  const out: string[] = [pick(lower), pick(upper), pick(digit)];
  while (out.length < 12) out.push(pick(all));
  return out.join('');
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const displayName = typeof body?.displayName === 'string' ? body.displayName.trim() : '';
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';

  if (!displayName || !email) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });

  const now = new Date();
  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true, emailVerifiedAt: true },
  });

  if (existing?.emailVerifiedAt) {
    return NextResponse.json({ error: 'email_taken' }, { status: 409 });
  }

  const created = !existing;
  const user = existing
    ? await prisma.user.update({
        where: { id: existing.id },
        data: { displayName: displayName || null, role: 'parent' },
        select: { id: true, email: true },
      })
    : await prisma.user.create({
        data: {
          email,
          role: 'parent',
          displayName: displayName || null,
          passwordHash: await bcrypt.hash(newPlaceholderPassword(), 10),
          emailVerifiedAt: null,
        },
        select: { id: true, email: true },
      });

  const ttlMs = emailCodeTtlMinutes() * 60_000;
  const expiresAt = new Date(now.getTime() + ttlMs);

  // Invalidate previous codes (unused).
  await prisma.emailConfirmationToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: now },
  });

  let code = '';
  for (let i = 0; i < 5; i++) {
    code = newEmailCode();
    const tokenHash = hashToken(code);
    try {
      await prisma.emailConfirmationToken.create({
        data: { userId: user.id, tokenHash, expiresAt },
      });
      break;
    } catch (err) {
      // tokenHash has a unique constraint; retry on very rare collisions.
      if (i === 4) throw err;
    }
  }

  try {
    const msg = renderBasicEmail({
      title: 'Код подтверждения — МатТренер',
      previewText: 'Подтверди почту для завершения регистрации',
      paragraphs: [
        'Код для подтверждения почты:',
        code,
        '',
        `Код действует ${emailCodeTtlMinutes()} минут.`,
        'Если это были не вы — проигнорируйте письмо.',
      ],
    });
    if (!process.env.SMTP_HOST && process.env.NODE_ENV !== 'production') {
      // Local/dev convenience: allow completing flow without SMTP configured.
      return NextResponse.json({ ok: true, devCode: code });
    }
    await sendMail({ to: email, ...msg });
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.error('[auth/register/request-code] email send failed (dev fallback):', err);
      return NextResponse.json({ ok: true, devCode: code });
    }
    if (created) await prisma.user.delete({ where: { id: user.id } }).catch(() => undefined);
    // eslint-disable-next-line no-console
    console.error('[auth/register/request-code] email send failed:', err);
    return NextResponse.json({ error: 'email_send_failed' }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}


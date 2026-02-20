import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';

import { prisma } from '../../../../lib/db';
import { getCurrentUserOrNull } from '../../../../lib/auth';
import { renderBasicEmail } from '../../../../lib/mailTemplates';
import { sendMail } from '../../../../lib/mail';

function normalizeCode(raw: unknown): string {
  const s = typeof raw === 'string' ? raw.trim() : '';
  if (!s) return '';
  if (!/^[a-zA-Z0-9_-]{2,64}$/.test(s)) return '';
  return s;
}

function normalizeEmail(raw: unknown): string {
  return typeof raw === 'string' ? raw.trim().toLowerCase() : '';
}

function isPlausibleEmail(email: string): boolean {
  const s = String(email || '').trim();
  if (!s) return false;
  if (s.includes(' ')) return false;
  const at = s.indexOf('@');
  return at > 0 && at < s.length - 1;
}

function webBaseUrl(req: Request): string {
  const env = (process.env.WEB_BASE_URL ?? '').trim();
  if (env) return env.replace(/\/+$/, '');
  const proto = (req.headers.get('x-forwarded-proto') ?? 'http').split(',')[0]?.trim() || 'http';
  const host = (req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? '').split(',')[0]?.trim();
  if (!host) return '';
  return `${proto}://${host}`;
}

function makeTempPassword(): string {
  // Human-friendly enough, still random. Not returned in API response.
  return randomBytes(9).toString('base64url');
}

export async function GET() {
  const me = await getCurrentUserOrNull();
  if (!me) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (me.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const promoters = await prisma.promoter.findMany({
    orderBy: { createdAt: 'desc' },
    take: 500,
    select: {
      id: true,
      userId: true,
      code: true,
      displayName: true,
      user: { select: { email: true } },
    },
  });

  const [regs, paid] = await Promise.all([
    prisma.referralAttribution.groupBy({
      by: ['promoterId'],
      _count: { _all: true },
    }),
    prisma.referralAttribution.groupBy({
      by: ['promoterId'],
      where: { firstPaidAt: { not: null } },
      _count: { _all: true },
    }),
  ]);

  const regsBy: Record<string, number> = Object.create(null);
  for (const r of regs) regsBy[r.promoterId] = r._count._all;
  const paidBy: Record<string, number> = Object.create(null);
  for (const r of paid) paidBy[r.promoterId] = r._count._all;

  return NextResponse.json({
    items: promoters.map((p) => ({
      promoter: {
        id: p.id,
        userId: p.userId,
        code: p.code,
        displayName: p.displayName || undefined,
        userEmail: p.user?.email || undefined,
      },
      counts: {
        registrations: regsBy[p.id] ?? 0,
        paid: paidBy[p.id] ?? 0,
      },
    })),
  });
}

export async function POST(req: Request) {
  const me = await getCurrentUserOrNull();
  if (!me) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (me.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const body = await req.json().catch(() => null);
  const code = normalizeCode(body?.code);
  const displayName = typeof body?.displayName === 'string' ? body.displayName.trim() : '';
  const userId = typeof body?.userId === 'string' ? body.userId.trim() : '';
  const email = normalizeEmail(body?.email);

  if (!code) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  if (!userId && !email) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  if (email && !isPlausibleEmail(email)) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });

  const now = new Date();
  let user: { id: string; email: string } | null = null;
  let createdPassword: string | null = null;
  let createdUserId: string | null = null;

  if (userId) {
    user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true } });
  }
  if (!user && email) {
    user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true } });
    if (!user) {
      createdPassword = makeTempPassword();
      const passwordHash = await bcrypt.hash(createdPassword, 10);
      const created = await prisma.user.create({
        data: {
          email,
          passwordHash,
          role: 'promoter',
          displayName: displayName || null,
          emailVerifiedAt: now,
        },
        select: { id: true, email: true },
      });
      user = created;
      createdUserId = created.id;
    }
  }

  if (!user) return NextResponse.json({ error: 'user_not_found' }, { status: 404 });

  try {
    const promoter = await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: user.id }, data: { role: 'promoter' } });
      return await tx.promoter.upsert({
        where: { userId: user.id },
        update: { code, ...(displayName ? { displayName } : {}) },
        create: { userId: user.id, code, ...(displayName ? { displayName } : {}) },
        select: { id: true, userId: true, code: true, displayName: true },
      });
    });

    if (createdPassword && user.email) {
      try {
        const base = webBaseUrl(req);
        const loginUrl = base ? `${base}/login` : '/login';
        const mail = renderBasicEmail({
          title: 'Доступ промоутера — МатТренер',
          previewText: 'Ваши данные для входа',
          paragraphs: [
            'Для вас создан кабинет промоутера.',
            `Логин: ${user.email}`,
            `Пароль: ${createdPassword}`,
            '',
            `Войти: ${loginUrl}`,
            'После входа рекомендуем сразу поменять пароль в Настройках.',
          ],
        });
        await sendMail({ to: user.email, ...mail });
      } catch (e) {
        // Rollback best-effort: if we created a new user but cannot deliver credentials, remove the account.
        if (createdUserId) {
          await prisma.user.delete({ where: { id: createdUserId } }).catch(() => undefined);
        }
        // eslint-disable-next-line no-console
        console.error('[admin/promoters] email send failed:', e);
        return NextResponse.json({ error: 'email_send_failed' }, { status: 502 });
      }
    }

    return NextResponse.json({
      promoter: {
        id: promoter.id,
        userId: promoter.userId,
        code: promoter.code,
        displayName: promoter.displayName || undefined,
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '';
    if (msg.includes('Unique constraint') || msg.includes('unique constraint')) {
      return NextResponse.json({ error: 'code_taken' }, { status: 409 });
    }
    // eslint-disable-next-line no-console
    console.error('[admin/promoters] create failed:', e);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}


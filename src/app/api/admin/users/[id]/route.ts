import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

import { prisma } from '../../../../../lib/db';
import { getCurrentUserOrNull } from '../../../../../lib/auth';

function normalizeEmail(raw: unknown): string {
  const v = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  return v;
}

export async function GET(_req: Request, ctx: { params: { id: string } }) {
  const me = await getCurrentUserOrNull();
  if (!me) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (me.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const id = String(ctx?.params?.id || '').trim();
  if (!id) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, displayName: true, role: true, emailVerifiedAt: true, createdAt: true, updatedAt: true },
  });
  if (!user) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  return NextResponse.json({
    user: {
      ...user,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      emailVerifiedAt: user.emailVerifiedAt ? user.emailVerifiedAt.toISOString() : null,
    },
  });
}

export async function POST(req: Request, ctx: { params: { id: string } }) {
  const me = await getCurrentUserOrNull();
  if (!me) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (me.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const id = String(ctx?.params?.id || '').trim();
  if (!id) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });

  const body = await req.json().catch(() => null);
  const email = normalizeEmail(body?.email);
  const displayName = typeof body?.displayName === 'string' ? body.displayName.trim() : null;
  const roleRaw = typeof body?.role === 'string' ? body.role.trim() : '';
  const role = roleRaw === 'student' || roleRaw === 'parent' || roleRaw === 'admin' ? roleRaw : null;
  const emailVerified = typeof body?.emailVerified === 'boolean' ? body.emailVerified : null;
  const newPassword = typeof body?.newPassword === 'string' ? body.newPassword : '';

  if (!email && displayName === null && !role && emailVerified === null && !newPassword) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  }

  if (email) {
    const exists = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (exists && exists.id !== id) return NextResponse.json({ error: 'email_taken' }, { status: 409 });
  }

  const now = new Date();
  if (newPassword && newPassword.length < 6) return NextResponse.json({ error: 'invalid_password' }, { status: 400 });

  const passwordHash = newPassword ? await bcrypt.hash(newPassword, 10) : null;
  const updated = await prisma.$transaction(async (tx) => {
    const u = await tx.user.update({
      where: { id },
      data: {
        ...(email ? { email } : {}),
        ...(displayName !== null ? { displayName: displayName || null } : {}),
        ...(role ? { role } : {}),
        ...(emailVerified === null ? {} : { emailVerifiedAt: emailVerified ? now : null }),
        ...(passwordHash ? { passwordHash } : {}),
      },
      select: { id: true, email: true, displayName: true, role: true, emailVerifiedAt: true, createdAt: true, updatedAt: true },
    });
    if (passwordHash) {
      await tx.session.deleteMany({ where: { userId: id } });
    }
    return u;
  });

  return NextResponse.json({
    user: {
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      emailVerifiedAt: updated.emailVerifiedAt ? updated.emailVerifiedAt.toISOString() : null,
    },
  });
}


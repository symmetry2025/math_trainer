import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import type { Role } from '@prisma/client';

import { prisma } from '../../../../../lib/db';
import { AUTH_COOKIE_NAME, expiresAtFromNow, hashToken, newToken } from '../../../../../lib/auth';

const DEMO_EMAIL_BY_ROLE: Record<Role, string> = {
  student: 'demo.student@trainer.local',
  parent: 'demo.parent@trainer.local',
  admin: 'demo.admin@trainer.local',
  promoter: 'demo.promoter@trainer.local',
};

function devOnly() {
  // Defense-in-depth: never allow this endpoint in prod.
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return null;
}

export async function POST(_req: Request, ctx: { params: { role: string } }) {
  const blocked = devOnly();
  if (blocked) return blocked;

  const role = ctx?.params?.role;
  const isRole = role === 'student' || role === 'parent' || role === 'admin' || role === 'promoter';
  if (!isRole) return NextResponse.json({ error: 'invalid_role' }, { status: 400 });

  const email = DEMO_EMAIL_BY_ROLE[role];
  const now = new Date();

  // We don't expose passwords for demo users. They exist only to satisfy schema invariants.
  const passwordHash = await bcrypt.hash(newToken(), 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: { role, emailVerifiedAt: now },
    create: {
      email,
      role,
      passwordHash,
      emailVerifiedAt: now,
      displayName: role === 'admin' ? 'Админ' : role === 'parent' ? 'Родитель' : role === 'promoter' ? 'Промоутер' : 'Ученик',
    },
    select: { id: true, email: true, role: true },
  });

  if (role === 'promoter') {
    await prisma.promoter.upsert({
      where: { userId: user.id },
      update: { code: 'demo_promoter', displayName: 'Демо промоутер' },
      create: { userId: user.id, code: 'demo_promoter', displayName: 'Демо промоутер' },
      select: { id: true },
    });
  }

  const token = newToken();
  await prisma.session.create({
    data: { userId: user.id, tokenHash: hashToken(token), expiresAt: expiresAtFromNow() },
  });

  const res = NextResponse.json({ user });
  res.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
  return res;
}


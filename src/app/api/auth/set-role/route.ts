import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';

import { prisma } from '../../../../lib/db';
import { getCurrentUserOrNull } from '../../../../lib/auth';
import { trialEndsAtFromNow } from '../../../../lib/billing';

function isProviderLocalEmail(email: string): boolean {
  const e = String(email || '').trim().toLowerCase();
  return e.endsWith('@max.local') || e.endsWith('@telegram.local');
}

function normalizeRole(v: unknown): 'parent' | 'student' | null {
  const s = typeof v === 'string' ? v.trim() : '';
  if (s === 'parent' || s === 'student') return s;
  return null;
}

function makeInviteCode(): string {
  // Simple, URL-safe, human typable.
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 8; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

export async function POST(req: Request) {
  const me = await getCurrentUserOrNull();
  if (!me) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const role = normalizeRole(body?.role);
  if (!role) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });

  const user = await prisma.user.findUnique({
    where: { id: me.id },
    select: { id: true, email: true, role: true, authProvider: true, onboardingCompletedAt: true, trialEndsAt: true, billingStatus: true, paidUntil: true },
  });
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  // Provider-first onboarding only (MAX / Telegram local accounts).
  if (user.authProvider !== 'max' && !isProviderLocalEmail(user.email)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  if (user.onboardingCompletedAt) return NextResponse.json({ ok: true, redirectTo: role === 'parent' ? '/settings' : '/settings' });

  const now = new Date();
  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.user.update({
      where: { id: user.id },
      data: {
        role,
        onboardingCompletedAt: now,
        // Ensure child gets a trial as soon as they pick student role.
        ...(role === 'student' && !user.trialEndsAt && user.billingStatus === 'none' && !user.paidUntil
          ? { trialEndsAt: trialEndsAtFromNow(now), billingUpdatedAt: now }
          : {}),
      },
    });

    if (role === 'parent') {
      // Ensure parent has an invite code ready.
      await tx.parentInvite.upsert({
        where: { parentId: user.id },
        update: {},
        create: { parentId: user.id, code: makeInviteCode() },
        select: { id: true },
      });
    }
  });

  return NextResponse.json({ ok: true, redirectTo: '/settings' });
}


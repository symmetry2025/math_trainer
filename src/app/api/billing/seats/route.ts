import { NextResponse } from 'next/server';

import { prisma } from '../../../../lib/db';
import { getCurrentUserOrNull } from '../../../../lib/auth';

function mustBeParentOrAdmin(me: { role: string } | null): me is { id: string; role: 'parent' | 'admin'; emailVerifiedAt: Date | null } {
  return !!me && (me.role === 'parent' || me.role === 'admin');
}

function asIsoOrNull(d: Date | null): string | null {
  return d ? d.toISOString() : null;
}

export async function GET() {
  const me = await getCurrentUserOrNull();
  if (!mustBeParentOrAdmin(me)) return NextResponse.json({ error: me ? 'forbidden' : 'unauthorized' }, { status: me ? 403 : 401 });

  const seats = await prisma.subscriptionSeat.findMany({
    where: { parentId: me.id },
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: {
      id: true,
      status: true,
      paidUntil: true,
      cpSubscriptionId: true,
      cpCardMask: true,
      billingUpdatedAt: true,
      assignedAt: true,
      assignedStudent: { select: { id: true, displayName: true, email: true } },
      createdAt: true,
    },
  });

  return NextResponse.json({
    ok: true,
    seats: seats.map((s) => ({
      seatId: s.id,
      status: s.status,
      paidUntil: asIsoOrNull(s.paidUntil),
      cpSubscriptionId: s.cpSubscriptionId,
      cpCardMask: s.cpCardMask,
      billingUpdatedAt: asIsoOrNull(s.billingUpdatedAt),
      assignedAt: asIsoOrNull(s.assignedAt),
      assignedStudent: s.assignedStudent ? { userId: s.assignedStudent.id, displayName: s.assignedStudent.displayName ?? null, email: s.assignedStudent.email ?? null } : null,
      createdAt: s.createdAt.toISOString(),
    })),
  });
}

export async function POST() {
  const me = await getCurrentUserOrNull();
  if (!mustBeParentOrAdmin(me)) return NextResponse.json({ error: me ? 'forbidden' : 'unauthorized' }, { status: me ? 403 : 401 });
  if (me.role !== 'admin' && !me.emailVerifiedAt) return NextResponse.json({ error: 'email_not_verified' }, { status: 403 });

  const created = await prisma.subscriptionSeat.create({
    data: { parentId: me.id, status: 'none' },
    select: { id: true, createdAt: true },
  });

  return NextResponse.json({ ok: true, seatId: created.id, createdAt: created.createdAt.toISOString() });
}


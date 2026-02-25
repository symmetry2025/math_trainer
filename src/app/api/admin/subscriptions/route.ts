import { NextResponse } from 'next/server';

import { prisma } from '../../../../lib/db';
import { getCurrentUserOrNull } from '../../../../lib/auth';

function asIsoOrNull(d: Date | null): string | null {
  return d ? d.toISOString() : null;
}

export async function GET() {
  const me = await getCurrentUserOrNull();
  if (!me) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (me.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const seats = await prisma.subscriptionSeat.findMany({
    orderBy: { createdAt: 'desc' },
    take: 2000,
    select: {
      id: true,
      status: true,
      paidUntil: true,
      cpSubscriptionId: true,
      cpCardMask: true,
      billingUpdatedAt: true,
      createdAt: true,
      parent: { select: { id: true, email: true, displayName: true } },
      assignedStudent: { select: { id: true, email: true, displayName: true } },
      assignedAt: true,
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
      createdAt: s.createdAt.toISOString(),
      parent: { userId: s.parent.id, email: s.parent.email, displayName: s.parent.displayName ?? null },
      assignedStudent: s.assignedStudent ? { userId: s.assignedStudent.id, email: s.assignedStudent.email, displayName: s.assignedStudent.displayName ?? null } : null,
      assignedAt: asIsoOrNull(s.assignedAt),
    })),
  });
}


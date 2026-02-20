import { NextResponse } from 'next/server';

import { prisma } from '../../../../lib/db';
import { getCurrentUserOrNull } from '../../../../lib/auth';
import { getBillingInfoByUserId } from '../../../../lib/billing';

export async function GET() {
  const me = await getCurrentUserOrNull();
  if (!me) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (me.role !== 'student' && me.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const info = await getBillingInfoByUserId(me.id);
  if (!info) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const link = await prisma.parentStudentLink.findUnique({
    where: { studentId: me.id },
    select: { parent: { select: { id: true, displayName: true, email: true } } },
  });

  return NextResponse.json({
    linkedParent: link?.parent
      ? { userId: link.parent.id, displayName: link.parent.displayName ?? null, email: link.parent.email ?? null }
      : null,
    trialEndsAt: info.trialEndsAt ? info.trialEndsAt.toISOString() : null,
  });
}


import { NextResponse } from 'next/server';

import { prisma } from '../../../../../lib/db';
import { getCurrentUserOrNull } from '../../../../../lib/auth';

export async function GET(_req: Request, ctx: { params: { id: string } }) {
  const me = await getCurrentUserOrNull();
  if (!me) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (me.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const id = String(ctx?.params?.id || '').trim();
  if (!id) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });

  const promoter = await prisma.promoter.findUnique({
    where: { id },
    select: { id: true, userId: true, code: true, displayName: true, createdAt: true, user: { select: { email: true } } },
  });
  if (!promoter) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const [registrations, paid] = await Promise.all([
    prisma.referralAttribution.count({ where: { promoterId: promoter.id } }),
    prisma.referralAttribution.count({ where: { promoterId: promoter.id, firstPaidAt: { not: null } } }),
  ]);

  const referrals = await prisma.referralAttribution.findMany({
    where: { promoterId: promoter.id },
    orderBy: { attributedAt: 'desc' },
    take: 500,
    select: {
      userId: true,
      attributedAt: true,
      firstPaidAt: true,
      user: { select: { email: true, createdAt: true } },
    },
  });

  return NextResponse.json({
    promoter: {
      id: promoter.id,
      userId: promoter.userId,
      code: promoter.code,
      displayName: promoter.displayName || undefined,
      userEmail: promoter.user?.email || undefined,
      createdAt: promoter.createdAt.toISOString(),
    },
    counts: { registrations, paid },
    referrals: referrals.map((r) => ({
      userId: r.userId,
      userEmail: r.user?.email || null,
      userCreatedAt: r.user?.createdAt ? r.user.createdAt.toISOString() : null,
      attributedAt: r.attributedAt.toISOString(),
      firstPaidAt: r.firstPaidAt ? r.firstPaidAt.toISOString() : null,
    })),
  });
}


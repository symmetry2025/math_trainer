import { NextResponse } from 'next/server';

import { prisma } from '../../../../lib/db';
import { getCurrentUserOrNull } from '../../../../lib/auth';

function maskEmail(email: string): string {
  const s = String(email || '').trim();
  const at = s.indexOf('@');
  if (at <= 0) return '';
  const local = s.slice(0, at);
  const domain = s.slice(at + 1);

  const maskPart = (p: string) => {
    if (!p) return '';
    if (p.length <= 2) return `${p[0] ?? ''}*`;
    return `${p[0]}***${p[p.length - 1]}`;
  };

  const domainParts = domain.split('.');
  const d0 = domainParts[0] || domain;
  const tld = domainParts.length >= 2 ? domainParts[domainParts.length - 1] : '';
  const domainMasked = tld ? `${maskPart(d0)}.${tld}` : maskPart(d0);

  return `${maskPart(local)}@${domainMasked}`;
}

export async function GET() {
  const me = await getCurrentUserOrNull();
  if (!me) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (me.role !== 'promoter' && me.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const promoter = await prisma.promoter.findUnique({
    where: { userId: me.id },
    select: { id: true, userId: true, code: true, displayName: true },
  });
  if (!promoter) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const [registrations, paid] = await Promise.all([
    prisma.referralAttribution.count({ where: { promoterId: promoter.id } }),
    prisma.referralAttribution.count({ where: { promoterId: promoter.id, firstPaidAt: { not: null } } }),
  ]);

  const refs = await prisma.referralAttribution.findMany({
    where: { promoterId: promoter.id },
    orderBy: { attributedAt: 'desc' },
    take: 50,
    select: {
      userId: true,
      attributedAt: true,
      firstPaidAt: true,
      user: { select: { email: true } },
    },
  });

  return NextResponse.json({
    promoter: {
      id: promoter.id,
      userId: promoter.userId,
      code: promoter.code,
      displayName: promoter.displayName || undefined,
    },
    counts: { registrations, paid },
    referrals: refs.map((r) => ({
      userId: r.userId,
      emailMasked: r.user?.email ? maskEmail(r.user.email) : undefined,
      attributedAt: r.attributedAt.toISOString(),
      firstPaidAt: r.firstPaidAt ? r.firstPaidAt.toISOString() : null,
    })),
  });
}


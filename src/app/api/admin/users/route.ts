import { NextResponse } from 'next/server';

import { prisma } from '../../../../lib/db';
import { getCurrentUserOrNull } from '../../../../lib/auth';

export async function GET() {
  const me = await getCurrentUserOrNull();
  if (!me) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (me.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    take: 500,
    select: {
      id: true,
      email: true,
      displayName: true,
      role: true,
      emailVerifiedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({
    users: users.map((u) => ({
      ...u,
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
      emailVerifiedAt: u.emailVerifiedAt ? u.emailVerifiedAt.toISOString() : null,
    })),
  });
}


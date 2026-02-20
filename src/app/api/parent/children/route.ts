import { NextResponse } from 'next/server';

import { prisma } from '../../../../lib/db';
import { getCurrentUserOrNull } from '../../../../lib/auth';

export async function GET() {
  const me = await getCurrentUserOrNull();
  if (!me) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (me.role !== 'parent' && me.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const links = await prisma.parentStudentLink.findMany({
    where: { parentId: me.id },
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: {
      createdAt: true,
      student: {
        select: {
          id: true,
          email: true,
          displayName: true,
          trialEndsAt: true,
          stats: {
            select: { totalProblems: true, totalCorrect: true, totalMistakes: true, totalTimeSec: true, sessionsCount: true },
          },
        },
      },
    },
  });

  return NextResponse.json({
    children: links.map((l) => ({
      userId: l.student.id,
      displayName: l.student.displayName ?? null,
      email: l.student.email ?? null,
      linkedAt: l.createdAt.toISOString(),
      trialEndsAt: l.student.trialEndsAt ? l.student.trialEndsAt.toISOString() : null,
      stats: l.student.stats
        ? {
            totalProblems: l.student.stats.totalProblems,
            totalCorrect: l.student.stats.totalCorrect,
            totalMistakes: l.student.stats.totalMistakes,
            totalTimeSec: l.student.stats.totalTimeSec,
            sessionsCount: l.student.stats.sessionsCount,
          }
        : null,
    })),
  });
}


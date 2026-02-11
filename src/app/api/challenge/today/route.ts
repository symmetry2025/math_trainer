import { NextResponse } from 'next/server';
import { ChallengeTodayResponseDtoSchema } from '@smmtry/shared';

import { getCurrentUserOrNull } from '../../../../lib/auth';
import { prisma } from '../../../../lib/db';
import { isSuccessAttempt } from '../../../../lib/attemptSuccess';

function dayKeyUtc(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function utcMidnight(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

export async function GET() {
  const user = await getCurrentUserOrNull();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const now = new Date();
  const todayStart = utcMidnight(now);
  const tomorrowStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0));

  // Today's progress: successful sessions count (we treat 1 as completion).
  const todayAttempts = await prisma.trainerAttempt.findMany({
    where: { userId: user.id, createdAt: { gte: todayStart, lt: tomorrowStart } },
    select: { kind: true, level: true, result: true },
  });
  const successToday = todayAttempts.reduce((acc, a) => acc + (isSuccessAttempt(a as any) ? 1 : 0), 0);

  // Streak: consecutive days (ending today) with >=1 successful session.
  // We look back 30 days max for performance.
  const lookbackStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 29, 0, 0, 0, 0));
  const recentAttempts = await prisma.trainerAttempt.findMany({
    where: { userId: user.id, createdAt: { gte: lookbackStart, lt: tomorrowStart } },
    select: { createdAt: true, kind: true, level: true, result: true },
    orderBy: { createdAt: 'asc' },
  });

  const byDay: Record<string, number> = {};
  for (const a of recentAttempts) {
    if (!isSuccessAttempt(a as any)) continue;
    const key = dayKeyUtc(a.createdAt);
    byDay[key] = (byDay[key] ?? 0) + 1;
  }

  let streakDays = 0;
  for (let i = 0; i < 30; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i, 0, 0, 0, 0));
    const key = dayKeyUtc(d);
    if ((byDay[key] ?? 0) > 0) streakDays += 1;
    else break;
  }

  const nextMilestoneDays = 7;
  const milestoneRewardCrystals = nextMilestoneDays * 10;

  const payload = {
    today: {
      title: 'Ежедневная тренировка',
      description: 'Пройди одну успешную сессию в любом тренажёре',
      rewardCrystals: 50,
      progress: Math.min(1, successToday),
      total: 1,
      timeLimitLabel: '—',
      difficultyLabel: 'Любая',
      startHref: '/addition/add-10',
    },
    streak: {
      streakDays,
      nextMilestoneDays,
      milestoneRewardCrystals,
    },
  };

  const parsed = ChallengeTodayResponseDtoSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: 'invalid_state' }, { status: 500 });
  return NextResponse.json(parsed.data);
}


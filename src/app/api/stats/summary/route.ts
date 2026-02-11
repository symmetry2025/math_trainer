import { NextResponse } from 'next/server';
import { StatsSummaryDtoSchema } from '@smmtry/shared';

import { getCurrentUserOrNull } from '../../../../lib/auth';
import { prisma } from '../../../../lib/db';
import { isSuccessAttempt } from '../../../../lib/attemptSuccess';

function asInt(x: unknown, def = 0) {
  const n = typeof x === 'number' ? x : typeof x === 'string' ? Number(x) : NaN;
  return Number.isFinite(n) ? Math.floor(n) : def;
}

function dayKeyUtc(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function weekdayLabelRuUtc(isoDay: string): string {
  const d = new Date(`${isoDay}T00:00:00.000Z`);
  const map = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'] as const;
  return map[d.getUTCDay()] ?? '—';
}

async function maybeBackfillUserStats(args: { userId: string; existing: any | null }) {
  const existing = args.existing;
  // If missing or clearly empty but we have attempts, do a one-time backfill.
  const shouldBackfill = !existing || (Number(existing.sessionsCount || 0) === 0 && Number(existing.totalProblems || 0) === 0);
  if (!shouldBackfill) return existing;

  const attemptsCount = await prisma.trainerAttempt.count({ where: { userId: args.userId } });
  if (attemptsCount <= 0) return existing;

  const attempts = await prisma.trainerAttempt.findMany({
    where: { userId: args.userId },
    select: { kind: true, level: true, result: true },
    orderBy: { createdAt: 'asc' },
  });

  let totalProblems = 0;
  let totalCorrect = 0;
  let totalMistakes = 0;
  let totalTimeSec = 0;
  let sessionsCount = 0;
  let perfectSessionsCount = 0;
  let raceWinsCount = 0;

  for (const a of attempts) {
    sessionsCount += 1;
    const kind = String(a.kind || '');
    const level = String(a.level || '');
    const r: any = a.result as any;

    if (kind === 'column') {
      const total = Math.max(0, asInt(r?.total, 0));
      const solved = Math.max(0, asInt(r?.solved, 0));
      const mistakes = Math.max(0, asInt(r?.mistakes, 0));
      const time = Math.max(0, asInt(r?.time, 0));
      totalProblems += total;
      totalCorrect += Math.max(0, Math.min(total, solved - mistakes));
      totalMistakes += mistakes;
      totalTimeSec += time;
      if (total > 0 && mistakes === 0) perfectSessionsCount += 1;
      if (level === 'race' && !!r?.won) raceWinsCount += 1;
      continue;
    }

    const total = Math.max(0, asInt(r?.total, 0));
    const correct = Math.max(0, asInt(r?.correct, 0));
    const time = Math.max(0, asInt(r?.time, 0));
    const mistakesKnown = r?.mistakes !== undefined && r?.mistakes !== null;
    const mistakes = mistakesKnown ? Math.max(0, asInt(r?.mistakes, 0)) : 0;
    totalProblems += total;
    totalCorrect += Math.min(total, correct);
    totalMistakes += mistakes;
    totalTimeSec += time;
    if (mistakesKnown && total > 0 && mistakes === 0) perfectSessionsCount += 1;
    if (level === 'race' && !!r?.won) raceWinsCount += 1;
  }

  const next = await prisma.userStats.upsert({
    where: { userId: args.userId },
    create: {
      userId: args.userId,
      totalProblems,
      totalCorrect,
      totalMistakes,
      totalTimeSec,
      sessionsCount,
      perfectSessionsCount,
      raceWinsCount,
    },
    update: {
      totalProblems,
      totalCorrect,
      totalMistakes,
      totalTimeSec,
      sessionsCount,
      perfectSessionsCount,
      raceWinsCount,
    },
    select: {
      totalProblems: true,
      totalCorrect: true,
      totalMistakes: true,
      totalTimeSec: true,
      sessionsCount: true,
      perfectSessionsCount: true,
      raceWinsCount: true,
    },
  });

  return next;
}

export async function GET() {
  const user = await getCurrentUserOrNull();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const row0 = await prisma.userStats.findUnique({
    where: { userId: user.id },
    select: {
      totalProblems: true,
      totalCorrect: true,
      totalMistakes: true,
      totalTimeSec: true,
      sessionsCount: true,
      perfectSessionsCount: true,
      raceWinsCount: true,
    },
  });
  const row = await maybeBackfillUserStats({ userId: user.id, existing: row0 as any });

  const totalProblems = row?.totalProblems ?? 0;
  const totalCorrect = row?.totalCorrect ?? 0;
  const totalMistakes = row?.totalMistakes ?? 0;
  const totalTimeSec = row?.totalTimeSec ?? 0;
  const sessionsCount = row?.sessionsCount ?? 0;
  const perfectSessionsCount = row?.perfectSessionsCount ?? 0;
  const raceWinsCount = row?.raceWinsCount ?? 0;

  const accuracyPct = totalProblems > 0 ? (totalCorrect / totalProblems) * 100 : 0;

  // Week stats: last 7 days (UTC), include today.
  const now = new Date();
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0)); // next midnight UTC
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 6, 0, 0, 0, 0)); // 6 days ago midnight UTC

  const attempts = await prisma.trainerAttempt.findMany({
    where: {
      userId: user.id,
      createdAt: { gte: start, lt: end },
    },
    select: { createdAt: true, result: true, kind: true, level: true },
    orderBy: { createdAt: 'asc' },
  });

  const agg: Record<string, { successSessions: number }> = {};
  for (const a of attempts) {
    const key = dayKeyUtc(a.createdAt);
    const slot = (agg[key] ??= { successSessions: 0 });
    if (isSuccessAttempt({ kind: a.kind, level: a.level, result: a.result })) slot.successSessions += 1;
  }

  const week: Array<{ date: string; label: string; successSessions: number }> = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + i, 0, 0, 0, 0));
    const date = dayKeyUtc(d);
    const slot = agg[date] ?? { successSessions: 0 };
    week.push({ date, label: weekdayLabelRuUtc(date), successSessions: slot.successSessions });
  }

  const payload = {
    totalProblems,
    totalCorrect,
    totalMistakes,
    totalTimeSec,
    sessionsCount,
    perfectSessionsCount,
    raceWinsCount,
    accuracyPct,
    week,
  };
  const parsed = StatsSummaryDtoSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: 'invalid_state' }, { status: 500 });

  return NextResponse.json(parsed.data);
}


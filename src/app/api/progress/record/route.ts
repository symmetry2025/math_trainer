import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

import { getCurrentUserOrNull } from '../../../../lib/auth';
import { prisma } from '../../../../lib/db';
import {
  defaultColumnProgress,
  defaultDrillProgress,
  defaultMentalProgress,
  type AnyProgress,
  type ColumnProgress,
  type DrillProgress,
  type MentalProgress,
} from '../../../../lib/trainerProgress';
import { TrainerRecordProgressRequestDtoSchema } from '@smmtry/shared';
import { ACHIEVEMENT_CATALOG, applyStatsDelta, computeStatsDeltaFromAttempt, evaluateAchievements } from '../../../../lib/achievements';

function asInt(x: unknown, def = 0) {
  const n = typeof x === 'number' ? x : typeof x === 'string' ? Number(x) : NaN;
  return Number.isFinite(n) ? Math.floor(n) : def;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function isColumnProgress(p: AnyProgress | null): p is ColumnProgress {
  return !!p && typeof (p as any).accuracy === 'boolean' && typeof (p as any).speed === 'boolean' && typeof (p as any).raceStars === 'number';
}

function isMentalProgress(p: AnyProgress | null): p is MentalProgress {
  return (
    !!p &&
    typeof (p as any)['accuracy-choice'] === 'boolean' &&
    typeof (p as any)['accuracy-input'] === 'boolean' &&
    typeof (p as any).speed === 'boolean' &&
    typeof (p as any).raceStars === 'number'
  );
}

function isDrillProgress(p: AnyProgress | null): p is DrillProgress {
  return (
    !!p &&
    typeof (p as any).lvl1 === 'boolean' &&
    typeof (p as any).lvl2 === 'boolean' &&
    typeof (p as any).lvl3 === 'boolean' &&
    typeof (p as any).raceStars === 'number'
  );
}

export async function POST(req: Request) {
  const user = await getCurrentUserOrNull();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const raw = await req.json().catch(() => null);
  const parsed = TrainerRecordProgressRequestDtoSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  }
  const body = parsed.data;
  const trainerId = body.trainerId.trim();
  const kind = body.kind;
  const level = body.level;
  const attemptId = typeof (body as any).attemptId === 'string' && String((body as any).attemptId).trim() ? String((body as any).attemptId).trim() : null;

  // Validate drill trainer ids early (avoid polluting attempts table)
  if (kind === 'drill') {
    const mulTable = trainerId.match(/^arithmetic:mul-table-(\d+)$/);
    if (!mulTable) return NextResponse.json({ error: 'invalid_trainer' }, { status: 400 });
    const mult = Number(mulTable[1]);
    if (!Number.isFinite(mult) || mult < 1 || mult > 10) return NextResponse.json({ error: 'invalid_trainer' }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1) Record immutable attempt (idempotent by attemptId)
      try {
        await tx.trainerAttempt.create({
          data: {
            userId: user.id,
            trainerId,
            attemptId,
            kind,
            level,
            result: body as any,
          },
        });
      } catch (e: any) {
        // TRN-014: dedupe attempts by (userId, trainerId, attemptId)
        if (attemptId && e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
          const existingProgressRow = await tx.trainerProgress.findUnique({
            where: { userId_trainerId: { userId: user.id, trainerId } },
            select: { progress: true },
          });
          return {
            trainerId,
            progress: (existingProgressRow?.progress as any) ?? null,
            duplicate: true as const,
            newlyUnlockedAchievements: [] as const,
          };
        }
        throw e;
      }

      // 2) Update per-trainer progress (unlocks/stars)
      const existingProgressRow = await tx.trainerProgress.findUnique({
        where: { userId_trainerId: { userId: user.id, trainerId } },
        select: { progress: true },
      });
      const existing = (existingProgressRow?.progress as any) ?? null;

      let savedProgress: AnyProgress | null = null;

      if (kind === 'column') {
        const prev: ColumnProgress = isColumnProgress(existing) ? existing : defaultColumnProgress();
        const mistakes = asInt((body as any).mistakes, 0);
        const stars = clamp(asInt((body as any).stars, 0), 0, 3);
        const success = !!(body as any).success;

        let next: ColumnProgress = { ...prev };
        if (level === 'accuracy') {
          if (mistakes === 0) next = { ...next, accuracy: true };
        } else if (level === 'speed') {
          if (success) next = { ...next, speed: true };
        } else if (level === 'race') {
          if (stars > next.raceStars) next = { ...next, raceStars: stars };
        }

        const row = await tx.trainerProgress.upsert({
          where: { userId_trainerId: { userId: user.id, trainerId } },
          update: { progress: next as any },
          create: { userId: user.id, trainerId, progress: next as any },
          select: { progress: true },
        });
        savedProgress = row.progress as any;
      } else if (kind === 'mental') {
        const prev: MentalProgress = isMentalProgress(existing) ? existing : defaultMentalProgress();
        const correct = asInt((body as any).correct, 0);
        const total = Math.max(0, asInt((body as any).total, 0));
        const won = !!(body as any).won;
        const starLevel = clamp(asInt((body as any).starLevel, 1), 1, 3) as 1 | 2 | 3;

        let next: MentalProgress = { ...prev };
        if (level === 'accuracy-choice') {
          if (total > 0 && correct >= total * 0.8) next['accuracy-choice'] = true;
        } else if (level === 'accuracy-input') {
          if (total > 0 && correct >= total * 0.8) next['accuracy-input'] = true;
        } else if (level === 'speed') {
          if (won) next.speed = true;
        } else if (level === 'race') {
          if (won) next.raceStars = Math.max(next.raceStars, starLevel);
        }

        const row = await tx.trainerProgress.upsert({
          where: { userId_trainerId: { userId: user.id, trainerId } },
          update: { progress: next as any },
          create: { userId: user.id, trainerId, progress: next as any },
          select: { progress: true },
        });
        savedProgress = row.progress as any;
      } else {
        // drill (currently: multiplication table levels)
        const prev: DrillProgress = isDrillProgress(existing) ? existing : defaultDrillProgress();
        const correct = asInt((body as any).correct, 0);
        const total = Math.max(0, asInt((body as any).total, 0));
        const mistakes = asInt((body as any).mistakes, 0);
        const won = !!(body as any).won;
        const starLevel = clamp(asInt((body as any).starLevel, 1), 1, 3);

        let next: DrillProgress = { ...prev };
        if (level === 'lvl1') {
          if (total > 0 && correct >= total * 0.8) next.lvl1 = true;
        } else if (level === 'lvl2') {
          if (total > 0 && correct >= total * 0.8) next.lvl2 = true;
        } else if (level === 'lvl3') {
          if (mistakes <= 4) next.lvl3 = true;
        } else if (level === 'race') {
          if (won) next.raceStars = Math.max(next.raceStars, clamp(starLevel, 0, 3));
        }

        const row = await tx.trainerProgress.upsert({
          where: { userId_trainerId: { userId: user.id, trainerId } },
          update: { progress: next as any },
          create: { userId: user.id, trainerId, progress: next as any },
          select: { progress: true },
        });
        savedProgress = row.progress as any;
      }

      // 3) Stats + achievements (incremental)
      const attemptFacts =
        kind === 'column'
          ? {
              trainerId,
              kind,
              level: String(level),
              total: asInt((body as any).total, 0),
              correct: asInt((body as any).solved, 0),
              mistakes: (body as any).mistakes,
              timeSec: asInt((body as any).time, 0),
              won: (body as any).won,
            }
          : kind === 'mental'
            ? {
                trainerId,
                kind,
                level: String(level),
                total: asInt((body as any).total, 0),
                correct: asInt((body as any).correct, 0),
                mistakes: (body as any).mistakes,
                timeSec: asInt((body as any).time, 0),
                won: (body as any).won,
                starLevel: (body as any).starLevel,
              }
            : {
                trainerId,
                kind,
                level: String(level),
                total: asInt((body as any).total, 0),
                correct: asInt((body as any).correct, 0),
                mistakes: (body as any).mistakes,
                timeSec: asInt((body as any).time, 0),
                won: (body as any).won,
                starLevel: (body as any).starLevel,
              };

      const statsDelta = computeStatsDeltaFromAttempt(attemptFacts as any);

      const prevStatsRow = await tx.userStats.findUnique({
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
      const prevStats = {
        totalProblems: prevStatsRow?.totalProblems ?? 0,
        totalCorrect: prevStatsRow?.totalCorrect ?? 0,
        totalMistakes: prevStatsRow?.totalMistakes ?? 0,
        totalTimeSec: prevStatsRow?.totalTimeSec ?? 0,
        sessionsCount: prevStatsRow?.sessionsCount ?? 0,
        perfectSessionsCount: prevStatsRow?.perfectSessionsCount ?? 0,
        raceWinsCount: prevStatsRow?.raceWinsCount ?? 0,
      };

      const nextStatsRow = await tx.userStats.upsert({
        where: { userId: user.id },
        create: { userId: user.id, ...(applyStatsDelta(prevStats as any, statsDelta as any) as any) },
        update: {
          totalProblems: { increment: asInt((statsDelta as any).totalProblems, 0) },
          totalCorrect: { increment: asInt((statsDelta as any).totalCorrect, 0) },
          totalMistakes: { increment: asInt((statsDelta as any).totalMistakes, 0) },
          totalTimeSec: { increment: asInt((statsDelta as any).totalTimeSec, 0) },
          sessionsCount: { increment: asInt((statsDelta as any).sessionsCount, 0) },
          perfectSessionsCount: { increment: asInt((statsDelta as any).perfectSessionsCount, 0) },
          raceWinsCount: { increment: asInt((statsDelta as any).raceWinsCount, 0) },
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
      const nextStats = {
        totalProblems: nextStatsRow.totalProblems,
        totalCorrect: nextStatsRow.totalCorrect,
        totalMistakes: nextStatsRow.totalMistakes,
        totalTimeSec: nextStatsRow.totalTimeSec,
        sessionsCount: nextStatsRow.sessionsCount,
        perfectSessionsCount: nextStatsRow.perfectSessionsCount,
        raceWinsCount: nextStatsRow.raceWinsCount,
      };

      const existingAchievements = await tx.userAchievement.findMany({
        where: { userId: user.id },
        select: { achievementId: true, progress: true, unlockedAt: true },
      });

      const prevStates = existingAchievements.map((row) => {
        const p: any = row.progress;
        const progressNum =
          typeof p?.current === 'number'
            ? Math.floor(p.current)
            : typeof p?.unlocked === 'boolean'
              ? p.unlocked
                ? 1
                : 0
              : 0;
        return { id: row.achievementId, progress: progressNum, unlockedAt: row.unlockedAt ? row.unlockedAt.toISOString() : null };
      });

      const { nextStates, newlyUnlocked } = evaluateAchievements({
        catalog: ACHIEVEMENT_CATALOG,
        prevStates,
        prevStats: prevStats as any,
        nextStats: nextStats as any,
      });

      // persist diffs only
      const prevById: Record<string, { progress: number; unlockedAt: string | null }> = {};
      for (const s of prevStates) prevById[s.id] = { progress: s.progress, unlockedAt: s.unlockedAt };

      for (const def of ACHIEVEMENT_CATALOG) {
        const nextState = nextStates[def.id];
        if (!nextState) continue;
        const prevState = prevById[def.id] ?? { progress: 0, unlockedAt: null };
        if (prevState.progress === nextState.progress && prevState.unlockedAt === nextState.unlockedAt) continue;

        const progressJson =
          def.kind === 'counter'
            ? { current: nextState.progress }
            : { unlocked: !!nextState.unlockedAt };
        await tx.userAchievement.upsert({
          where: { userId_achievementId: { userId: user.id, achievementId: def.id } },
          create: {
            userId: user.id,
            achievementId: def.id,
            progress: progressJson as any,
            unlockedAt: nextState.unlockedAt ? new Date(nextState.unlockedAt) : null,
          },
          update: {
            progress: progressJson as any,
            unlockedAt: nextState.unlockedAt ? new Date(nextState.unlockedAt) : null,
          },
        });
      }

      return {
        trainerId,
        progress: savedProgress,
        newlyUnlockedAchievements: newlyUnlocked,
      };
    });

    if ((result as any)?.error) {
      return NextResponse.json({ error: (result as any).error }, { status: (result as any).status ?? 400 });
    }
    return NextResponse.json(result);
  } catch (e) {
    throw e;
  }
}


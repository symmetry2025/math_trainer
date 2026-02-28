import { prisma } from './db';

export type ColumnProgress = { accuracy: boolean; raceStars: number };
export type MentalProgress = { 'accuracy-choice': boolean; 'accuracy-input': boolean; raceStars: number };
export type DrillProgress = { lvl1: boolean; lvl2: boolean; raceStars: number };

export type AnyProgress = ColumnProgress | MentalProgress | DrillProgress;

export function defaultColumnProgress(): ColumnProgress {
  return { accuracy: false, raceStars: 0 };
}

export function defaultMentalProgress(): MentalProgress {
  return { 'accuracy-choice': false, 'accuracy-input': false, raceStars: 0 };
}

export function defaultDrillProgress(): DrillProgress {
  return { lvl1: false, lvl2: false, raceStars: 0 };
}

export async function getTrainerProgress(userId: string, trainerId: string): Promise<AnyProgress | null> {
  const row = await prisma.trainerProgress.findUnique({
    where: { userId_trainerId: { userId, trainerId } },
    select: { progress: true },
  });
  return (row?.progress as any) ?? null;
}

export async function getTrainerProgressMany(
  userId: string,
  trainerIds: string[],
): Promise<Record<string, AnyProgress | null>> {
  const ids = Array.from(new Set(trainerIds.map((s) => String(s || '').trim()).filter(Boolean)));
  if (!ids.length) return {};

  const rows = await prisma.trainerProgress.findMany({
    where: { userId, trainerId: { in: ids } },
    select: { trainerId: true, progress: true },
  });

  const map: Record<string, AnyProgress | null> = Object.create(null);
  for (const id of ids) map[id] = null;
  for (const r of rows) map[r.trainerId] = (r.progress as any) ?? null;
  return map;
}

export async function upsertTrainerProgress(userId: string, trainerId: string, progress: AnyProgress): Promise<AnyProgress> {
  const row = await prisma.trainerProgress.upsert({
    where: { userId_trainerId: { userId, trainerId } },
    update: { progress: progress as any },
    create: { userId, trainerId, progress: progress as any },
    select: { progress: true },
  });
  return row.progress as any;
}


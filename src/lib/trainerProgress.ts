import { prisma } from './db';

export type ColumnProgress = { accuracy: boolean; speed: boolean; raceStars: number };
export type MentalProgress = { 'accuracy-choice': boolean; 'accuracy-input': boolean; speed: boolean; raceStars: number };
export type DrillProgress = { lvl1: boolean; lvl2: boolean; lvl3: boolean; raceStars: number };

export type AnyProgress = ColumnProgress | MentalProgress | DrillProgress;

export function defaultColumnProgress(): ColumnProgress {
  return { accuracy: false, speed: false, raceStars: 0 };
}

export function defaultMentalProgress(): MentalProgress {
  return { 'accuracy-choice': false, 'accuracy-input': false, speed: false, raceStars: 0 };
}

export function defaultDrillProgress(): DrillProgress {
  return { lvl1: false, lvl2: false, lvl3: false, raceStars: 0 };
}

export async function getTrainerProgress(userId: string, trainerId: string): Promise<AnyProgress | null> {
  const row = await prisma.trainerProgress.findUnique({
    where: { userId_trainerId: { userId, trainerId } },
    select: { progress: true },
  });
  return (row?.progress as any) ?? null;
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


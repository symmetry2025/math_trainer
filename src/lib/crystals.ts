import { MENTAL_MATH_CONFIGS } from '../data/mentalMathConfig';
import { ARITHMETIC_EQUATION_CONFIGS } from '../data/arithmeticEquationConfig';
import { NUMBER_COMPOSITION_CONFIGS } from '../data/numberCompositionConfig';
import { TABLE_FILL_CONFIGS } from '../data/tableFillConfig';

export const PROGRESS_UPDATED_EVENT = 'smmtry:progress-updated';

type ColumnProgress = {
  accuracy?: boolean;
  speed?: boolean;
  raceStars?: number;
};

type MentalMathProgress = {
  'accuracy-choice'?: boolean;
  'accuracy-input'?: boolean;
  speed?: boolean;
  raceStars?: number;
};

type MulTableProgress = {
  lvl1?: boolean;
  lvl2?: boolean;
  lvl3?: boolean;
  raceStars?: number;
};

export type ExerciseProgressStatus =
  | {
      kind: 'column';
      preRaceDone: boolean;
      raceStars: 0 | 1 | 2 | 3;
    }
  | {
      kind: 'mental';
      preRaceDone: boolean;
      raceStars: 0 | 1 | 2 | 3;
    }
  | {
      kind: 'drill';
      preRaceDone: boolean;
      raceStars: 0 | 1 | 2 | 3;
    };

function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function sumRaceCrystals(stars: number): number {
  const s = Math.max(0, Math.min(3, Math.floor(stars || 0)));
  // 1* => 5, 2* => 5+10, 3* => 5+10+15
  const per = [5, 10, 15];
  let total = 0;
  for (let i = 0; i < s; i++) total += per[i]!;
  return total;
}

function crystalsFromColumnProgress(p: ColumnProgress): number {
  const accuracy = !!p?.accuracy;
  const speed = !!p?.speed;
  const raceStars = Number(p?.raceStars || 0);
  return (accuracy ? 10 : 0) + (speed ? 10 : 0) + sumRaceCrystals(raceStars);
}

function crystalsFromMentalMathProgress(p: MentalMathProgress): number {
  const accChoice = !!p?.['accuracy-choice'];
  const accInput = !!p?.['accuracy-input'];
  const speed = !!p?.speed;
  const raceStars = Number(p?.raceStars || 0);
  // "accuracy-choice" is treated as "Тренировка" => no reward.
  return (accChoice ? 0 : 0) + (accInput ? 10 : 0) + (speed ? 10 : 0) + sumRaceCrystals(raceStars);
}

function crystalsFromMulTableProgress(p: MulTableProgress): number {
  const lvl1 = !!p?.lvl1;
  const lvl2 = !!p?.lvl2;
  const lvl3 = !!p?.lvl3;
  const raceStars = Number(p?.raceStars || 0);
  return (lvl1 ? 10 : 0) + (lvl2 ? 10 : 0) + (lvl3 ? 10 : 0) + sumRaceCrystals(raceStars);
}

function normalizeExerciseIdToColumnTrainerId(exerciseId: string): string | null {
  if (exerciseId.startsWith('column-')) return exerciseId;
  return null;
}

function normalizeExerciseIdToMulTableTrainerId(exerciseId: string): string | null {
  const m = String(exerciseId || '').trim().match(/^mul-table-(\d+)$/);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n)) return null;
  const multiplier = Math.max(1, Math.min(10, Math.floor(n)));
  return `arithmetic:mul-table-${multiplier}`;
}

function normalizeExerciseIdToArithmeticTrainerId(exerciseId: string): string | null {
  if (
    !Object.prototype.hasOwnProperty.call(MENTAL_MATH_CONFIGS, exerciseId) &&
    !Object.prototype.hasOwnProperty.call(ARITHMETIC_EQUATION_CONFIGS, exerciseId) &&
    !Object.prototype.hasOwnProperty.call(NUMBER_COMPOSITION_CONFIGS, exerciseId) &&
    !Object.prototype.hasOwnProperty.call(TABLE_FILL_CONFIGS, exerciseId)
  )
    return null;
  return `arithmetic:${exerciseId}`;
}

function clampStars(v: unknown): 0 | 1 | 2 | 3 {
  const n = Math.floor(Number(v || 0));
  if (n <= 0) return 0;
  if (n === 1) return 1;
  if (n === 2) return 2;
  return 3;
}

export function getExerciseProgressStatus(exerciseId: string): ExerciseProgressStatus | null {
  if (typeof window === 'undefined') return null;

  const columnId = normalizeExerciseIdToColumnTrainerId(exerciseId);
  if (columnId) {
    const raw = window.localStorage.getItem(`smmtry.trainer.progress:${columnId}`);
    const p = safeJsonParse<ColumnProgress>(raw) || {};
    const raceStars = clampStars(p.raceStars);
    const preRaceDone = !!p.accuracy && !!p.speed;
    return { kind: 'column', preRaceDone, raceStars };
  }

  const mulTableId = normalizeExerciseIdToMulTableTrainerId(exerciseId);
  if (mulTableId) {
    const raw = window.localStorage.getItem(`smmtry.trainer.progress:${mulTableId}`);
    const p = safeJsonParse<MulTableProgress>(raw) || {};
    const raceStars = clampStars(p.raceStars);
    const preRaceDone = !!p.lvl1 && !!p.lvl2 && !!p.lvl3;
    return { kind: 'drill', preRaceDone, raceStars };
  }

  const arithmeticId = normalizeExerciseIdToArithmeticTrainerId(exerciseId);
  if (arithmeticId) {
    const raw = window.localStorage.getItem(`smmtry.trainer.progress:${arithmeticId}`);
    const p = safeJsonParse<MentalMathProgress>(raw) || {};
    const raceStars = clampStars(p.raceStars);
    const isVisual = Object.prototype.hasOwnProperty.call(NUMBER_COMPOSITION_CONFIGS, exerciseId) || Object.prototype.hasOwnProperty.call(TABLE_FILL_CONFIGS, exerciseId);
    const preRaceDone = !!p['accuracy-input'] && !!p.speed;
    return { kind: 'mental', preRaceDone, raceStars };
  }

  return null;
}

export function getCrystalsForExercise(exerciseId: string): number {
  if (typeof window === 'undefined') return 0;

  const columnId = normalizeExerciseIdToColumnTrainerId(exerciseId);
  if (columnId) {
    const raw = window.localStorage.getItem(`smmtry.trainer.progress:${columnId}`);
    const p = safeJsonParse<ColumnProgress>(raw);
    return p ? crystalsFromColumnProgress(p) : 0;
  }

  const mulTableId = normalizeExerciseIdToMulTableTrainerId(exerciseId);
  if (mulTableId) {
    const raw = window.localStorage.getItem(`smmtry.trainer.progress:${mulTableId}`);
    const p = safeJsonParse<MulTableProgress>(raw);
    return p ? crystalsFromMulTableProgress(p) : 0;
  }

  const arithmeticId = normalizeExerciseIdToArithmeticTrainerId(exerciseId);
  const mentalRaw = arithmeticId ? window.localStorage.getItem(`smmtry.trainer.progress:${arithmeticId}`) : null;
  const mp = safeJsonParse<MentalMathProgress>(mentalRaw);
  return mp ? crystalsFromMentalMathProgress(mp) : 0;
}

export function getCrystalsCapForExercise(exerciseId: string): number {
  // Column trainers: accuracy(10) + speed(10) + race(5/10/15) => max 50
  const columnId = normalizeExerciseIdToColumnTrainerId(exerciseId);
  if (columnId) return 10 + 10 + sumRaceCrystals(3);

  // Multiplication table (drill): lvl1(10) + lvl2(10) + lvl3(10) + race(5/10/15) => max 60
  const mulTableId = normalizeExerciseIdToMulTableTrainerId(exerciseId);
  if (mulTableId) return 10 + 10 + 10 + sumRaceCrystals(3);

  // Mental math trainers: training(0) + accuracy(10) + speed(10) + race(5/10/15) => max 50
  // Exercise ids are config ids like "add-10"
  if (
    Object.prototype.hasOwnProperty.call(MENTAL_MATH_CONFIGS, exerciseId) ||
    Object.prototype.hasOwnProperty.call(ARITHMETIC_EQUATION_CONFIGS, exerciseId)
  ) {
    return 10 + 10 + sumRaceCrystals(3);
  }

  // Visual arithmetic drills: training(0) + accuracy(10) + speed(10) + race(5/10/15) => max 50
  if (
    Object.prototype.hasOwnProperty.call(NUMBER_COMPOSITION_CONFIGS, exerciseId) ||
    Object.prototype.hasOwnProperty.call(TABLE_FILL_CONFIGS, exerciseId)
  ) {
    return 10 + 10 + sumRaceCrystals(3);
  }

  // Not wired yet (no reliable cap).
  return 0;
}

export function getTotalCrystals(): number {
  if (typeof window === 'undefined') return 0;

  let total = 0;
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (!k) continue;
      if (k.startsWith('smmtry.trainer.progress:')) {
        const p = safeJsonParse<any>(window.localStorage.getItem(k));
        if (!p) continue;
        if (typeof p.lvl1 === 'boolean' || typeof p.lvl2 === 'boolean' || typeof p.lvl3 === 'boolean') total += crystalsFromMulTableProgress(p);
        else if (typeof p['accuracy-choice'] === 'boolean' || typeof p['accuracy-input'] === 'boolean')
          total += crystalsFromMentalMathProgress(p);
        else total += crystalsFromColumnProgress(p);
      }
    }
  } catch {
    // ignore
  }
  return total;
}

export function emitProgressUpdated() {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new Event(PROGRESS_UPDATED_EVENT));
  } catch {
    // ignore
  }
}


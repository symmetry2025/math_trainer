import { MENTAL_MATH_CONFIGS } from '../data/mentalMathConfig';
import { ARITHMETIC_EQUATION_CONFIGS } from '../data/arithmeticEquationConfig';
import { NUMBER_COMPOSITION_CONFIGS } from '../data/numberCompositionConfig';
import { TABLE_FILL_CONFIGS } from '../data/tableFillConfig';
import { SUM_TABLE_CONFIGS } from '../data/sumTableConfig';
import { SUB_TABLE_CONFIGS } from '../data/subTableConfig';

export const PROGRESS_UPDATED_EVENT = 'smmtry:progress-updated';

type ColumnProgress = {
  accuracy?: boolean;
  raceStars?: number; // 0..3, but only 2..3 are used in new scheme
};

type MentalVisualProgress = {
  'accuracy-choice'?: boolean; // training
  'accuracy-input'?: boolean; // accuracy
  raceStars?: number; // 0..3, but only 2..3 are used in new scheme
};

type MulTableProgress = {
  lvl1?: boolean; // training
  lvl2?: boolean; // accuracy
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

function clampStars(v: unknown): 0 | 1 | 2 | 3 {
  const n = Math.floor(Number(v || 0));
  if (n <= 0) return 0;
  if (n === 1) return 1;
  if (n === 2) return 2;
  return 3;
}

function starsFromRaceProgress(stars: number): number {
  const s = clampStars(stars);
  // New rewards: ⭐2 for 'Знаток' and ⭐3 for 'Мастер'. If you have 3, you also have 2.
  return (s >= 2 ? 2 : 0) + (s >= 3 ? 3 : 0);
}

function starsFromColumnProgress(p: ColumnProgress): number {
  const accuracy = !!p?.accuracy;
  const raceStars = Number(p?.raceStars || 0);
  return (accuracy ? 1 : 0) + starsFromRaceProgress(raceStars);
}

function starsFromMentalVisualProgress(p: MentalVisualProgress): number {
  const acc = !!p?.['accuracy-input'];
  const raceStars = Number(p?.raceStars || 0);
  // "accuracy-choice" is training => no reward.
  return (acc ? 1 : 0) + starsFromRaceProgress(raceStars);
}

function starsFromMulTableProgress(p: MulTableProgress): number {
  const accuracy = !!p?.lvl2;
  const raceStars = Number(p?.raceStars || 0);
  return (accuracy ? 1 : 0) + starsFromRaceProgress(raceStars);
}

function normalizeExerciseIdToColumnTrainerId(exerciseId: string): string | null {
  if (exerciseId.startsWith('column-')) return exerciseId;
  return null;
}

function normalizeExerciseIdToMulTableTrainerId(exerciseId: string): string | null {
  const id = String(exerciseId || '').trim();
  if (/^mul-table-(\d+)$/.test(id)) return `arithmetic:${id}`;
  if (id === 'mul-table-full') return `arithmetic:${id}`;
  if (id === 'mul-table-2-5') return `arithmetic:${id}`;
  return null;
}

function normalizeExerciseIdToArithmeticTrainerId(exerciseId: string): string | null {
  const id = String(exerciseId || '').trim();
  if (
    !Object.prototype.hasOwnProperty.call(MENTAL_MATH_CONFIGS, id) &&
    !Object.prototype.hasOwnProperty.call(ARITHMETIC_EQUATION_CONFIGS, id) &&
    !Object.prototype.hasOwnProperty.call(NUMBER_COMPOSITION_CONFIGS, id) &&
    !Object.prototype.hasOwnProperty.call(TABLE_FILL_CONFIGS, id) &&
    !Object.prototype.hasOwnProperty.call(SUM_TABLE_CONFIGS, id) &&
    !Object.prototype.hasOwnProperty.call(SUB_TABLE_CONFIGS, id)
  )
    return null;
  return `arithmetic:${id}`;
}

export function getExerciseProgressStatus(exerciseId: string): ExerciseProgressStatus | null {
  if (typeof window === 'undefined') return null;

  const columnId = normalizeExerciseIdToColumnTrainerId(exerciseId);
  if (columnId) {
    const raw = window.localStorage.getItem(`smmtry.trainer.progress:${columnId}`);
    const p = safeJsonParse<ColumnProgress>(raw) || {};
    const raceStars = clampStars(p.raceStars);
    const preRaceDone = !!p.accuracy;
    return { kind: 'column', preRaceDone, raceStars };
  }

  const mulTableId = normalizeExerciseIdToMulTableTrainerId(exerciseId);
  if (mulTableId) {
    const raw = window.localStorage.getItem(`smmtry.trainer.progress:${mulTableId}`);
    const p = safeJsonParse<MulTableProgress>(raw) || {};
    const raceStars = clampStars(p.raceStars);
    const preRaceDone = !!p.lvl2;
    return { kind: 'drill', preRaceDone, raceStars };
  }

  const arithmeticId = normalizeExerciseIdToArithmeticTrainerId(exerciseId);
  if (arithmeticId) {
    const raw = window.localStorage.getItem(`smmtry.trainer.progress:${arithmeticId}`);
    const p = safeJsonParse<MentalVisualProgress>(raw) || {};
    const raceStars = clampStars(p.raceStars);
    const preRaceDone = !!p['accuracy-input'];
    return { kind: 'mental', preRaceDone, raceStars };
  }

  return null;
}

export function getStarsForExercise(exerciseId: string): number {
  if (typeof window === 'undefined') return 0;

  const columnId = normalizeExerciseIdToColumnTrainerId(exerciseId);
  if (columnId) {
    const raw = window.localStorage.getItem(`smmtry.trainer.progress:${columnId}`);
    const p = safeJsonParse<ColumnProgress>(raw);
    return p ? starsFromColumnProgress(p) : 0;
  }

  const mulTableId = normalizeExerciseIdToMulTableTrainerId(exerciseId);
  if (mulTableId) {
    const raw = window.localStorage.getItem(`smmtry.trainer.progress:${mulTableId}`);
    const p = safeJsonParse<MulTableProgress>(raw);
    return p ? starsFromMulTableProgress(p) : 0;
  }

  const arithmeticId = normalizeExerciseIdToArithmeticTrainerId(exerciseId);
  const raw = arithmeticId ? window.localStorage.getItem(`smmtry.trainer.progress:${arithmeticId}`) : null;
  const p = safeJsonParse<MentalVisualProgress>(raw);
  return p ? starsFromMentalVisualProgress(p) : 0;
}

export function getStarsCapForExercise(exerciseId: string): number {
  // Max: accuracy(1) + race⭐2 + race⭐3 => 6
  const columnId = normalizeExerciseIdToColumnTrainerId(exerciseId);
  if (columnId) return 6;

  const mulTableId = normalizeExerciseIdToMulTableTrainerId(exerciseId);
  if (mulTableId) return 6;

  if (
    Object.prototype.hasOwnProperty.call(MENTAL_MATH_CONFIGS, exerciseId) ||
    Object.prototype.hasOwnProperty.call(ARITHMETIC_EQUATION_CONFIGS, exerciseId) ||
    Object.prototype.hasOwnProperty.call(NUMBER_COMPOSITION_CONFIGS, exerciseId) ||
    Object.prototype.hasOwnProperty.call(TABLE_FILL_CONFIGS, exerciseId) ||
    Object.prototype.hasOwnProperty.call(SUM_TABLE_CONFIGS, exerciseId) ||
    Object.prototype.hasOwnProperty.call(SUB_TABLE_CONFIGS, exerciseId)
  ) {
    return 6;
  }

  return 0;
}

export function getTotalStars(): number {
  if (typeof window === 'undefined') return 0;
  let total = 0;
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (!k) continue;
      if (!k.startsWith('smmtry.trainer.progress:')) continue;
      const p = safeJsonParse<any>(window.localStorage.getItem(k));
      if (!p) continue;
      if (typeof p.lvl1 === 'boolean' || typeof p.lvl2 === 'boolean') total += starsFromMulTableProgress(p);
      else if (typeof p['accuracy-choice'] === 'boolean' || typeof p['accuracy-input'] === 'boolean') total += starsFromMentalVisualProgress(p);
      else total += starsFromColumnProgress(p);
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


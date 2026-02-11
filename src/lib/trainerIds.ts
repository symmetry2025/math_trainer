/**
 * Helper functions for canonical trainer ids and localStorage keys.
 *
 * Rules:
 * - Arithmetic families store progress under `smmtry.trainer.progress:arithmetic:<exerciseId>`
 *   and use DB trainerId `arithmetic:<exerciseId>`.
 * - Column families store progress under `smmtry.trainer.progress:<trainerId>`
 *   and use DB trainerId equal to that trainerId (e.g. `column-addition`).
 */

export function arithmeticDbTrainerId(exerciseId: string) {
  return `arithmetic:${String(exerciseId || '').trim()}`;
}

/** Canonical localStorage key for any trainer progress blob. */
export function progressStorageKey(trainerId: string) {
  return `smmtry.trainer.progress:${String(trainerId || '').trim()}`;
}

export function arithmeticStorageKey(exerciseId: string) {
  return progressStorageKey(arithmeticDbTrainerId(exerciseId));
}

export function columnStorageKey(trainerId: string) {
  return progressStorageKey(trainerId);
}


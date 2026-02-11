import { MENTAL_MATH_CONFIGS } from '../data/mentalMathConfig';
import { ARITHMETIC_EQUATION_CONFIGS } from '../data/arithmeticEquationConfig';
import { NUMBER_COMPOSITION_CONFIGS } from '../data/numberCompositionConfig';
import { TABLE_FILL_CONFIGS } from '../data/tableFillConfig';

const HYDRATED_AT_PREFIX = 'smmtry.trainer.hydratedAt:';

function markHydrated(trainerDbId: string) {
  try {
    window.localStorage.setItem(`${HYDRATED_AT_PREFIX}${trainerDbId}`, String(Date.now()));
  } catch {
    // ignore
  }
}

export function wasHydratedRecently(trainerDbId: string, maxAgeMs: number) {
  try {
    const raw = window.localStorage.getItem(`${HYDRATED_AT_PREFIX}${trainerDbId}`);
    const ts = Number(raw || 0);
    return Number.isFinite(ts) && ts > 0 && Date.now() - ts < maxAgeMs;
  } catch {
    return false;
  }
}

export async function hydrateProgressFromDb(trainerDbId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/progress/trainer/${encodeURIComponent(trainerDbId)}`, {
      credentials: 'include',
      cache: 'no-store',
    });
    if (!res.ok) return false;
    const body: any = await res.json();
    const p = body?.progress;
    if (!p) return false;

    if (trainerDbId.startsWith('arithmetic:')) {
      const id = trainerDbId.replace(/^arithmetic:/, '');

      // multiplication table per multiplier: arithmetic:mul-table-<n>
      if (/^mul-table-(\d+)$/.test(id)) {
        const clampStars = (v: unknown) => {
          const n = Math.floor(Number(v || 0));
          if (n <= 0) return 0;
          if (n === 1) return 1;
          if (n === 2) return 2;
          return 3;
        };
        const storageKey = `smmtry.trainer.progress:${trainerDbId}`;
        const next = {
          lvl1: !!p.lvl1,
          lvl2: !!p.lvl2,
          lvl3: !!p.lvl3,
          raceStars: clampStars(p.raceStars),
        };
        window.localStorage.setItem(storageKey, JSON.stringify(next));
        markHydrated(trainerDbId);
        return true;
      }

      // mental arithmetic: arithmetic:<id> where id is a mental config id (add-10, sub-20, ...)
      if (
        !Object.prototype.hasOwnProperty.call(MENTAL_MATH_CONFIGS, id) &&
        !Object.prototype.hasOwnProperty.call(ARITHMETIC_EQUATION_CONFIGS, id) &&
        !Object.prototype.hasOwnProperty.call(NUMBER_COMPOSITION_CONFIGS, id) &&
        !Object.prototype.hasOwnProperty.call(TABLE_FILL_CONFIGS, id)
      )
        return false;
      const storageKey = `smmtry.trainer.progress:${trainerDbId}`;
      const next = {
        'accuracy-choice': !!p['accuracy-choice'],
        'accuracy-input': !!p['accuracy-input'],
        speed: !!p.speed,
        raceStars: Number(p.raceStars || 0),
      };
      window.localStorage.setItem(storageKey, JSON.stringify(next));
      markHydrated(trainerDbId);
      return true;
    }

    // Column trainers store under `smmtry.trainer.progress:*`
    if (trainerDbId.startsWith('column-')) {
      const storageKey = `smmtry.trainer.progress:${trainerDbId}`;
      const next = { accuracy: !!p.accuracy, speed: !!p.speed, raceStars: Number(p.raceStars || 0) };
      window.localStorage.setItem(storageKey, JSON.stringify(next));
      markHydrated(trainerDbId);
      return true;
    }

    return false;
  } catch {
    return false;
  }
}


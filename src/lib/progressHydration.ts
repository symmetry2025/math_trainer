import { MENTAL_MATH_CONFIGS } from '../data/mentalMathConfig';
import { ARITHMETIC_EQUATION_CONFIGS } from '../data/arithmeticEquationConfig';
import { NUMBER_COMPOSITION_CONFIGS } from '../data/numberCompositionConfig';
import { TABLE_FILL_CONFIGS } from '../data/tableFillConfig';
import { SUM_TABLE_CONFIGS } from '../data/sumTableConfig';
import { SUB_TABLE_CONFIGS } from '../data/subTableConfig';

const HYDRATED_AT_PREFIX = 'smmtry.trainer.hydratedAt:';

function markHydrated(trainerDbId: string) {
  try {
    window.localStorage.setItem(`${HYDRATED_AT_PREFIX}${trainerDbId}`, String(Date.now()));
  } catch {
    // ignore
  }
}

export function exerciseIdToTrainerDbId(exerciseId: string): string | null {
  const id = String(exerciseId || '').trim();
  if (!id) return null;
  if (id.startsWith('column-')) return id;
  // multiplication table per multiplier: `mul-table-<n>` -> arithmetic:mul-table-<n>
  if (/^mul-table-(\d+)$/.test(id)) return `arithmetic:${id}`;
  if (id === 'mul-table-full') return `arithmetic:${id}`;
  if (id === 'mul-table-2-5') return `arithmetic:${id}`;
  // mental arithmetic: arithmetic:<id>
  if (Object.prototype.hasOwnProperty.call(MENTAL_MATH_CONFIGS, id)) return `arithmetic:${id}`;
  // arithmetic equations: arithmetic:<id>
  if (Object.prototype.hasOwnProperty.call(ARITHMETIC_EQUATION_CONFIGS, id)) return `arithmetic:${id}`;
  // visual arithmetic (number composition): arithmetic:<id>
  if (Object.prototype.hasOwnProperty.call(NUMBER_COMPOSITION_CONFIGS, id)) return `arithmetic:${id}`;
  // visual arithmetic (table fill): arithmetic:<id>
  if (Object.prototype.hasOwnProperty.call(TABLE_FILL_CONFIGS, id)) return `arithmetic:${id}`;
  // visual arithmetic (sum table): arithmetic:<id>
  if (Object.prototype.hasOwnProperty.call(SUM_TABLE_CONFIGS, id)) return `arithmetic:${id}`;
  // visual arithmetic (subtraction table): arithmetic:<id>
  if (Object.prototype.hasOwnProperty.call(SUB_TABLE_CONFIGS, id)) return `arithmetic:${id}`;
  return null;
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

function clampStars(v: unknown) {
  const n = Math.floor(Number(v || 0));
  if (n <= 0) return 0;
  if (n === 1) return 1;
  if (n === 2) return 2;
  return 3;
}

function applyProgressToStorage(trainerDbId: string, p: any): boolean {
  if (!p) return false;
  if (trainerDbId.startsWith('arithmetic:')) {
    const id = trainerDbId.replace(/^arithmetic:/, '');

    // multiplication table: arithmetic:mul-table-<n> OR arithmetic:mul-table-full OR arithmetic:mul-table-2-5
    if (/^mul-table-(\d+)$/.test(id) || id === 'mul-table-full' || id === 'mul-table-2-5') {
      const storageKey = `smmtry.trainer.progress:${trainerDbId}`;
      const next = {
        lvl1: !!p.lvl1,
        lvl2: !!p.lvl2,
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
      !Object.prototype.hasOwnProperty.call(TABLE_FILL_CONFIGS, id) &&
      !Object.prototype.hasOwnProperty.call(SUM_TABLE_CONFIGS, id) &&
      !Object.prototype.hasOwnProperty.call(SUB_TABLE_CONFIGS, id)
    )
      return false;
    const storageKey = `smmtry.trainer.progress:${trainerDbId}`;
    const next = {
      'accuracy-choice': !!p['accuracy-choice'],
      'accuracy-input': !!p['accuracy-input'],
      raceStars: Number(p.raceStars || 0),
    };
    window.localStorage.setItem(storageKey, JSON.stringify(next));
    markHydrated(trainerDbId);
    return true;
  }

  // Column trainers store under `smmtry.trainer.progress:*`
  if (trainerDbId.startsWith('column-')) {
    const storageKey = `smmtry.trainer.progress:${trainerDbId}`;
    const next = { accuracy: !!p.accuracy, raceStars: Number(p.raceStars || 0) };
    window.localStorage.setItem(storageKey, JSON.stringify(next));
    markHydrated(trainerDbId);
    return true;
  }

  return false;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object';
}

export async function hydrateProgressBatchFromDb(trainerDbIds: string[]): Promise<boolean> {
  const ids = Array.from(new Set(trainerDbIds.map((s) => String(s || '').trim()).filter(Boolean)));
  if (!ids.length) return false;
  try {
    const res = await fetch('/api/progress/trainers', {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ trainerIds: ids }),
    });
    if (!res.ok) return false;
    const body: unknown = await res.json().catch(() => null);
    const map = isRecord(body) && isRecord(body.progressByTrainerId) ? (body.progressByTrainerId as Record<string, any>) : null;
    if (!map) return false;
    let any = false;
    for (const id of ids) {
      if (applyProgressToStorage(id, map[id])) any = true;
    }
    return any;
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
    return applyProgressToStorage(trainerDbId, body?.progress);
  } catch {
    return false;
  }
}

// NOTE: keep backwards-compatible exports; list pages should prefer hydrateProgressBatchFromDb.

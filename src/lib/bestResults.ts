export type BestResult = {
  total: number;
  solved?: number;
  correct?: number;
  mistakes?: number;
  timeSec?: number;
  won?: boolean;
  starsEarned?: 0 | 1 | 2 | 3;
  updatedAtMs: number;
};

type Store = Record<string, BestResult>;

const LS_KEY = 'smmtry.trainer.bestResults:v1';

function keyOf(args: { trainerId: string; presetId: string }) {
  return `${String(args.trainerId || '').trim()}::${String(args.presetId || '').trim()}`;
}

function safeParse(raw: string | null): Store {
  if (!raw) return {};
  try {
    const v = JSON.parse(raw);
    if (!v || typeof v !== 'object') return {};
    return v as Store;
  } catch {
    return {};
  }
}

function accuracyOf(r: BestResult): number {
  const total = Math.max(1, Math.floor(Number(r.total || 0)));
  const good = Number.isFinite(Number(r.correct)) ? Number(r.correct) : Number.isFinite(Number(r.solved)) ? Number(r.solved) : 0;
  return good / total;
}

function shouldReplace(prev: BestResult | undefined, next: BestResult): boolean {
  if (!prev) return true;
  const aPrev = accuracyOf(prev);
  const aNext = accuracyOf(next);
  if (aNext > aPrev) return true;
  if (aNext < aPrev) return false;
  const tPrev = Number.isFinite(Number(prev.timeSec)) ? Number(prev.timeSec) : Number.POSITIVE_INFINITY;
  const tNext = Number.isFinite(Number(next.timeSec)) ? Number(next.timeSec) : Number.POSITIVE_INFINITY;
  if (tNext < tPrev) return true;
  if (tNext > tPrev) return false;
  return next.updatedAtMs > prev.updatedAtMs;
}

export function getBestResult(args: { trainerId: string; presetId: string }): BestResult | null {
  try {
    const store = safeParse(window.localStorage.getItem(LS_KEY));
    return store[keyOf(args)] ?? null;
  } catch {
    return null;
  }
}

export function recordBestResult(args: {
  trainerId: string;
  presetId: string;
  result: Omit<BestResult, 'updatedAtMs'>;
}) {
  try {
    const store = safeParse(window.localStorage.getItem(LS_KEY));
    const k = keyOf(args);
    const next: BestResult = { ...args.result, updatedAtMs: Date.now() };
    const prev = store[k];
    if (!shouldReplace(prev, next)) return;
    store[k] = next;
    window.localStorage.setItem(LS_KEY, JSON.stringify(store));
  } catch {
    // ignore
  }
}


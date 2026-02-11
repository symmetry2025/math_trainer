type ListReturnState = {
  y: number;
  exerciseId: string;
  ts: number;
};

type RestoreOpts = {
  ttlMs?: number;
  behavior?: ScrollBehavior; // 'auto' | 'smooth'
};

const PREFIX = 'smmtry.listReturn:';

function keyOf(pathname: string) {
  return `${PREFIX}${pathname}`;
}

export function saveListReturn(pathname: string, exerciseId: string) {
  if (typeof window === 'undefined') return;
  try {
    const y = Math.max(0, Math.floor(window.scrollY || 0));
    const state: ListReturnState = { y, exerciseId: String(exerciseId || ''), ts: Date.now() };
    window.sessionStorage.setItem(keyOf(pathname), JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function restoreListReturn(pathname: string, opts?: RestoreOpts) {
  if (typeof window === 'undefined') return;
  const ttlMs = opts?.ttlMs ?? 5 * 60_000;
  const behavior: ScrollBehavior = opts?.behavior ?? 'auto';

  let state: ListReturnState | null = null;
  try {
    const raw = window.sessionStorage.getItem(keyOf(pathname));
    if (!raw) return;
    state = JSON.parse(raw) as ListReturnState;
  } catch {
    state = null;
  }
  if (!state) return;
  if (!state.ts || Date.now() - state.ts > ttlMs) {
    try {
      window.sessionStorage.removeItem(keyOf(pathname));
    } catch {
      // ignore
    }
    return;
  }

  // Scroll to the exact card by data attribute (works even if layout shifted).
  const targetSelector = state.exerciseId ? `[data-exercise-id="${CSS.escape(state.exerciseId)}"]` : null;
  if (targetSelector) {
    const el = document.querySelector(targetSelector) as HTMLElement | null;
    if (el) {
      try {
        // Prefer smooth to avoid sharp jump after navigation.
        el.scrollIntoView({ block: 'center', inline: 'nearest', behavior });
      } catch {
        // ignore
      }
      try {
        window.sessionStorage.removeItem(keyOf(pathname));
      } catch {
        // ignore
      }
      return;
    }
  }

  // Fallback: restore raw scrollY (best effort).
  try {
    if (Number.isFinite(state.y)) window.scrollTo({ top: state.y, left: 0, behavior });
  } catch {
    // ignore
  }
  try {
    window.sessionStorage.removeItem(keyOf(pathname));
  } catch {
    // ignore
  }
}


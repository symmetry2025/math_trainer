function asInt(x: unknown, def = 0) {
  const n = typeof x === 'number' ? x : typeof x === 'string' ? Number(x) : NaN;
  return Number.isFinite(n) ? Math.floor(n) : def;
}

/**
 * Determine whether a TrainerAttempt represents a successful session.
 * This must remain consistent with TrainerFlow preset success policies.
 */
export function isSuccessAttempt(a: { kind: string; level: string; result: unknown }): boolean {
  const r: any = a.result ?? {};
  const kind = String(a.kind || '');
  const level = String(a.level || '');

  if (kind === 'column') {
    if (typeof r?.success === 'boolean') return r.success;
    if (level === 'accuracy') return asInt(r?.mistakes, 0) === 0;
    if (level === 'race') return !!r?.won;
    return false;
  }

  if (kind === 'mental') {
    const total = Math.max(0, asInt(r?.total, 0));
    const correct = Math.max(0, asInt(r?.correct, 0));
    const won = !!r?.won;
    if (level === 'accuracy-choice' || level === 'accuracy-input') return total > 0 ? correct >= total * 0.8 : false;
    if (level === 'race') return won;
    return false;
  }

  // drill
  if (kind === 'drill') {
    const total = Math.max(0, asInt(r?.total, 0));
    const correct = Math.max(0, asInt(r?.correct, 0));
    const mistakesKnown = r?.mistakes !== undefined && r?.mistakes !== null;
    const mistakes = mistakesKnown ? Math.max(0, asInt(r?.mistakes, 0)) : Number.POSITIVE_INFINITY;
    const won = !!r?.won;
    if (level === 'lvl1' || level === 'lvl2') return total > 0 ? correct >= total * 0.8 : false;
    if (level === 'race') return won;
    return false;
  }

  return false;
}


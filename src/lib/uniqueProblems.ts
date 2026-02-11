export function prepareUniqueList<T>(params: {
  count: number;
  make: () => T;
  keyOf: (item: T) => string;
  maxAttempts?: number;
}): T[] {
  const { count, make, keyOf, maxAttempts = Math.max(200, count * 50) } = params;
  const seen = new Set<string>();
  const out: T[] = [];
  const unique: T[] = [];

  let attempts = 0;
  while (unique.length < count && attempts < maxAttempts) {
    attempts++;
    const item = make();
    const key = keyOf(item);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
  }

  // Best effort: fill with unique items first.
  out.push(...unique);

  // If the space is too small for strict uniqueness, we still must return exactly `count`
  // so sessions don't break (many engines assume problems.length >= total).
  // We repeat from the unique pool (round-robin) to minimize repetitions concentration.
  if (out.length < count) {
    const pool = unique.length ? unique : [make()];
    let i = 0;
    while (out.length < count) {
      out.push(pool[i % pool.length]!);
      i++;
    }
  }

  return out;
}


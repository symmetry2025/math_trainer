export function safeUuid(): string {
  // Prefer crypto.randomUUID when available (modern browsers).
  try {
    const c = (globalThis as any)?.crypto;
    if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  } catch {
    // ignore
  }
  // Fallback: not cryptographically strong, but good enough for client-side attempt ids.
  const rand = () => Math.floor(Math.random() * 1e9).toString(16);
  return `att_${Date.now().toString(16)}_${rand()}_${rand()}`;
}


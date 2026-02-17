export function cleanEnvValue(raw: unknown): string {
  let v = String(raw ?? '').trim();
  // Avoid broken values when env got serialized with newlines.
  v = v.replaceAll('\r', ' ').replaceAll('\n', ' ').trim();
  // Strip wrapping quotes if present (common when .env includes quotes).
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1).trim();
  }
  return v;
}


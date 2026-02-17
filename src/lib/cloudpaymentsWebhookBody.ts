function parseUrlEncoded(rawBody: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const sp = new URLSearchParams(rawBody);
  for (const [k, v] of sp.entries()) out[k] = v;
  return out;
}

export function parseCpWebhookBody(rawBody: string, contentType: string | null): any {
  const ct = (contentType ?? '').toLowerCase();
  if (ct.includes('application/x-www-form-urlencoded')) return parseUrlEncoded(rawBody);
  // Default to JSON (CloudPayments typically sends JSON for classic notifications).
  return JSON.parse(rawBody || '{}');
}


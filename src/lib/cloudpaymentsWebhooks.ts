import { createHmac, timingSafeEqual } from 'node:crypto';

import { getCpApiSecret } from './cloudpaymentsConfig';

export function computeCpHmacBase64(body: string, apiSecret: string): string {
  return createHmac('sha256', apiSecret).update(body, 'utf8').digest('base64');
}

export function computeCpHmacHex(body: string, apiSecret: string): string {
  return createHmac('sha256', apiSecret).update(body, 'utf8').digest('hex');
}

export function getCpApiSecretOrThrow(): string {
  const apiSecret = getCpApiSecret();
  if (!apiSecret) throw new Error('CP_API_SECRET is required');
  return apiSecret;
}

function extractSignatureCandidates(raw: string): string[] {
  const s = String(raw || '').trim();
  if (!s) return [];
  // Some providers prefix signatures, e.g. "sha256=<sig>".
  const parts = s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
    .flatMap((p) => {
      const eq = p.indexOf('=');
      if (eq > 0 && eq < p.length - 1) return [p, p.slice(eq + 1).trim()];
      return [p];
    });
  return Array.from(new Set(parts));
}

export function verifyCpWebhookSignature(params: { rawBody: string; signature: string | null }): boolean {
  if (!params.signature) return false;
  const secret = getCpApiSecretOrThrow();
  const expectedBase64 = computeCpHmacBase64(params.rawBody, secret);
  const expectedHex = computeCpHmacHex(params.rawBody, secret);
  const expectedBase64Norm = normalizeBase64ish(expectedBase64);
  const candidates = extractSignatureCandidates(params.signature);
  for (const c of candidates) {
    if (safeEqualUtf8(c, expectedBase64)) return true;
    // Accept base64 without padding and url-safe base64 variants.
    if (safeEqualUtf8(normalizeBase64ish(c), expectedBase64Norm)) return true;
    if (safeEqualUtf8(c.toLowerCase(), expectedHex)) return true;
  }
  return false;
}

function normalizeBase64ish(raw: string): string {
  // CloudPayments/clients may send base64 without "=" padding, or url-safe base64.
  // We normalize for comparison (NOT decoding).
  return String(raw || '')
    .trim()
    .replaceAll('-', '+')
    .replaceAll('_', '/')
    .replace(/=+$/g, '');
}

function safeEqualUtf8(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export function getCpSignatureHeader(req: Request): string | null {
  // CloudPayments may send X-Content-HMAC / Content-HMAC
  return req.headers.get('x-content-hmac') ?? req.headers.get('content-hmac');
}


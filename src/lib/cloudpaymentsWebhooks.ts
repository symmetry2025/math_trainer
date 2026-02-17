import { createHmac, timingSafeEqual } from 'node:crypto';

import { getCpWebhookSecret } from './cloudpaymentsConfig';

export function computeCpHmacBase64(body: string, apiSecret: string | Buffer): string {
  return createHmac('sha256', apiSecret).update(body, 'utf8').digest('base64');
}

export function computeCpHmacHex(body: string, apiSecret: string | Buffer): string {
  return createHmac('sha256', apiSecret).update(body, 'utf8').digest('hex');
}

export function getCpApiSecretOrThrow(): string {
  const secret = getCpWebhookSecret();
  if (!secret) throw new Error('CP_WEBHOOK_SECRET (or CP_API_SECRET fallback) is required');
  return secret;
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
  const keys = deriveHmacKeys(secret);
  const candidates = extractSignatureCandidates(params.signature);
  for (const key of keys) {
    const expectedBase64 = computeCpHmacBase64(params.rawBody, key);
    const expectedHex = computeCpHmacHex(params.rawBody, key);
    const expectedBase64Norm = normalizeBase64ish(expectedBase64);
    for (const c of candidates) {
      if (safeEqualUtf8(c, expectedBase64)) return true;
      // Accept base64 without padding and url-safe base64 variants.
      if (safeEqualUtf8(normalizeBase64ish(c), expectedBase64Norm)) return true;
      if (safeEqualUtf8(c.toLowerCase(), expectedHex)) return true;
    }
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

function deriveHmacKeys(secret: string): Array<string | Buffer> {
  const keys: Array<string | Buffer> = [secret];

  // Some providers store webhook secret encoded; try decoded variants.
  const trimmed = secret.trim();

  // base64-ish secret → try decoding
  if (/^[A-Za-z0-9+/=_-]+$/.test(trimmed) && trimmed.length >= 16) {
    try {
      const norm = trimmed.replaceAll('-', '+').replaceAll('_', '/');
      const buf = Buffer.from(norm, 'base64');
      // Avoid adding empty/too-short keys (would be a no-op and risk false positives).
      if (buf.length >= 16) keys.push(buf);
    } catch {
      // ignore
    }
  }

  // hex secret → try decoding
  if (/^[0-9a-fA-F]+$/.test(trimmed) && trimmed.length % 2 === 0 && trimmed.length >= 32) {
    try {
      const buf = Buffer.from(trimmed, 'hex');
      if (buf.length >= 16) keys.push(buf);
    } catch {
      // ignore
    }
  }

  // De-duplicate (by string value or buffer hex).
  const seen = new Set<string>();
  const uniq: Array<string | Buffer> = [];
  for (const k of keys) {
    const keyId = typeof k === 'string' ? `s:${k}` : `b:${k.toString('hex')}`;
    if (seen.has(keyId)) continue;
    seen.add(keyId);
    uniq.push(k);
  }
  return uniq;
}

function safeEqualUtf8(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export function getCpSignatureHeader(req: Request): string | null {
  // Backwards-compatible helper: prefer X-Content-HMAC if present.
  const { xContentHmac, contentHmac } = getCpSignatureHeaders(req);
  return xContentHmac ?? contentHmac;
}

export function getCpSignatureHeaders(req: Request): { xContentHmac: string | null; contentHmac: string | null } {
  // CloudPayments sends two headers:
  // - X-Content-HMAC: computed from URL decoded (or not encoded) parameters
  // - Content-HMAC: computed from URL encoded parameters
  // (see docs "Проверка уведомлений")
  return {
    xContentHmac: req.headers.get('x-content-hmac'),
    contentHmac: req.headers.get('content-hmac'),
  };
}

function buildFormDecodedBody(rawBody: string): string {
  // Reconstruct a deterministic decoded "key=value&..." string.
  // URLSearchParams uses application/x-www-form-urlencoded decoding (including '+' -> space).
  const sp = new URLSearchParams(rawBody);
  const parts: string[] = [];
  for (const [k, v] of sp.entries()) parts.push(`${k}=${v}`);
  return parts.join('&');
}

function decodeWholeFormBody(rawBody: string): string {
  // Best-effort decode of a full form body string.
  // Useful because some systems compute HMAC over a URL-decoded string.
  try {
    return decodeURIComponent(rawBody.replaceAll('+', ' '));
  } catch {
    return rawBody;
  }
}

export function verifyCpWebhookRequest(req: Request, rawBody: string): boolean {
  const { xContentHmac, contentHmac } = getCpSignatureHeaders(req);
  const ct = (req.headers.get('content-type') ?? '').toLowerCase();

  const rawCandidates = [rawBody, rawBody.trimEnd()];

  const checks: Array<{ sig: string | null; bodies: string[] }> = [];

  // For URL-encoded body, Content-HMAC should match the raw (encoded) body.
  checks.push({ sig: contentHmac, bodies: rawCandidates });

  // For URL-encoded body, X-Content-HMAC is commonly computed from the decoded parameters.
  if (ct.includes('application/x-www-form-urlencoded')) {
    const decoded = buildFormDecodedBody(rawBody);
    const decodedWhole = decodeWholeFormBody(rawBody);
    checks.push({ sig: xContentHmac, bodies: [decoded, decoded.trimEnd(), decodedWhole, decodedWhole.trimEnd(), ...rawCandidates] });
  } else {
    // For JSON bodies, both headers (if present) should match the raw body.
    checks.push({ sig: xContentHmac, bodies: rawCandidates });
  }

  for (const c of checks) {
    if (!c.sig) continue;
    for (const b of c.bodies) {
      if (verifyCpWebhookSignature({ rawBody: b, signature: c.sig })) return true;
    }
  }
  return false;
}


import { createHmac, timingSafeEqual } from 'node:crypto';

export function computeCpHmacBase64(body: string, apiSecret: string): string {
  return createHmac('sha256', apiSecret).update(body, 'utf8').digest('base64');
}

export function getCpApiSecretOrThrow(): string {
  const apiSecret = String(process.env.CP_API_SECRET ?? '').trim();
  if (!apiSecret) throw new Error('CP_API_SECRET is required');
  return apiSecret;
}

export function verifyCpWebhookSignature(params: { rawBody: string; signature: string | null }): boolean {
  if (!params.signature) return false;
  const secret = getCpApiSecretOrThrow();
  const expected = computeCpHmacBase64(params.rawBody, secret);
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(params.signature.trim(), 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function getCpSignatureHeader(req: Request): string | null {
  // CloudPayments may send X-Content-HMAC / Content-HMAC
  return req.headers.get('x-content-hmac') ?? req.headers.get('content-hmac');
}


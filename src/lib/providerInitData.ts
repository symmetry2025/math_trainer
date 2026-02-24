import { createHmac, timingSafeEqual } from 'node:crypto';

function cleanEnvValue(raw: unknown): string {
  let v = String(raw ?? '').trim();
  v = v.replaceAll('\r', ' ').replaceAll('\n', ' ').trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1).trim();
  return v;
}

function authDateToEpochSec(authDate: number): number {
  const n = Number(authDate);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return n > 1e12 ? Math.floor(n / 1000) : Math.floor(n);
}

function parseInitData(initData: string): {
  params: Array<[string, string]>;
  hash: string;
  authDate: number;
  userJson: string;
  startParam: string;
} | null {
  let raw = String(initData || '').trim();
  if (!raw) return null;
  if (!raw.includes('&') && (raw.includes('%3D') || raw.includes('%26') || raw.includes('%0A'))) {
    try {
      raw = decodeURIComponent(raw);
    } catch {
      // keep original
    }
  }
  const sp = new URLSearchParams(raw);

  const hash = (sp.get('hash') || '').trim().toLowerCase();
  const authDateRaw = (sp.get('auth_date') || '').trim();
  const authDate = authDateRaw ? Number(authDateRaw) : NaN;
  const userJson = sp.get('user') || '';
  const startParam = sp.get('start_param') || sp.get('start_param[]') || '';

  if (!hash) return null;
  if (!/^[0-9a-f]{64}$/.test(hash)) return null;
  if (!Number.isFinite(authDate)) return null;
  if (!userJson) return null;

  const pairs: Array<[string, string]> = [];
  for (const [k, v] of sp.entries()) {
    if (k === 'hash') continue;
    pairs.push([k, v]);
  }
  pairs.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0));
  return { params: pairs, hash, authDate, userJson, startParam };
}

type Parsed = NonNullable<ReturnType<typeof parseInitData>>;

function parseMaxAgeSec(envKey: string, fallback = 86400): number {
  const raw = cleanEnvValue(process.env[envKey]);
  const n = raw ? Number(raw) : fallback;
  return Number.isFinite(n) ? Math.max(60, Math.trunc(n)) : fallback;
}

export function verifyTelegramInitData(initData: string): { ok: true; parsed: Parsed } | { ok: false; error: string } {
  const botToken = cleanEnvValue(process.env.TELEGRAM_BOT_TOKEN);
  if (!botToken) return { ok: false, error: 'not_configured' };
  const parsed = parseInitData(initData);
  if (!parsed) return { ok: false, error: 'invalid_init_data' };

  const maxAgeSec = parseMaxAgeSec('TELEGRAM_INITDATA_MAX_AGE_SEC');
  const nowSec = Math.floor(Date.now() / 1000);
  const authSec = authDateToEpochSec(parsed.authDate);
  if (!authSec || nowSec - authSec > maxAgeSec) return { ok: false, error: 'expired' };

  const dataCheckString = parsed.params.map(([k, v]) => `${k}=${v}`).join('\n');
  const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();
  const expectedHex = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  const a = Buffer.from(String(parsed.hash).trim().toLowerCase(), 'hex');
  const b = Buffer.from(expectedHex, 'hex');
  if (a.length !== b.length) return { ok: false, error: 'invalid_signature' };
  if (!timingSafeEqual(a, b)) return { ok: false, error: 'invalid_signature' };

  return { ok: true, parsed };
}

export function verifyMaxInitData(initData: string): { ok: true; parsed: Parsed } | { ok: false; error: string } {
  const botToken = cleanEnvValue(process.env.MAX_BOT_TOKEN);
  if (!botToken) return { ok: false, error: 'not_configured' };
  const parsed = parseInitData(initData);
  if (!parsed) return { ok: false, error: 'invalid_init_data' };

  const maxAgeSec = parseMaxAgeSec('MAX_INITDATA_MAX_AGE_SEC');
  const nowSec = Math.floor(Date.now() / 1000);
  const authSec = authDateToEpochSec(parsed.authDate);
  if (!authSec || nowSec - authSec > maxAgeSec) return { ok: false, error: 'expired' };

  const dataCheckString = parsed.params.map(([k, v]) => `${k}=${v}`).join('\n');

  // MAX verification is already tolerant in /api/auth/max; here we replicate the same multi-candidate check.
  const secretKeyHex = createHmac('sha256', botToken).update('WebAppData').digest('hex');
  const candidates: string[] = [];
  candidates.push(createHmac('sha256', Buffer.from(secretKeyHex, 'hex')).update(dataCheckString).digest('hex'));
  candidates.push(createHmac('sha256', secretKeyHex).update(dataCheckString).digest('hex'));
  const secretKeyAltHex = createHmac('sha256', 'WebAppData').update(botToken).digest('hex');
  candidates.push(createHmac('sha256', Buffer.from(secretKeyAltHex, 'hex')).update(dataCheckString).digest('hex'));
  candidates.push(createHmac('sha256', secretKeyAltHex).update(dataCheckString).digest('hex'));

  const target = Buffer.from(String(parsed.hash).trim().toLowerCase(), 'hex');
  let ok = false;
  for (const c of candidates) {
    const buf = Buffer.from(c, 'hex');
    if (buf.length !== target.length) continue;
    if (timingSafeEqual(buf, target)) {
      ok = true;
      break;
    }
  }
  if (!ok) return { ok: false, error: 'invalid_signature' };
  return { ok: true, parsed };
}


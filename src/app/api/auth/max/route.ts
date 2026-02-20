import { NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'node:crypto';
import bcrypt from 'bcryptjs';

import { prisma } from '../../../../lib/db';
import { AUTH_COOKIE_NAME, expiresAtFromNow, hashToken, newToken } from '../../../../lib/auth';
import { getBillingInfoByUserId, hasBillingAccess, trialEndsAtFromNow } from '../../../../lib/billing';

function cleanEnvValue(raw: unknown): string {
  let v = String(raw ?? '').trim();
  v = v.replaceAll('\r', ' ').replaceAll('\n', ' ').trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1).trim();
  return v;
}

function parseMaxAgeSec(): number {
  const raw = cleanEnvValue(process.env.MAX_INITDATA_MAX_AGE_SEC);
  const n = raw ? Number(raw) : 86400;
  return Number.isFinite(n) ? Math.max(60, Math.trunc(n)) : 86400;
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
  // MAX docs show initData as an URL-encoded string. In practice it can arrive already decoded.
  // Support both forms.
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

function hexHmacSha256(key: Buffer, data: string): string {
  return createHmac('sha256', key).update(data).digest('hex');
}

type ParsedInitData = NonNullable<ReturnType<typeof parseInitData>>;

function isHex64(v: string): boolean {
  return /^[0-9a-f]{64}$/.test(String(v || '').trim().toLowerCase());
}

function authDateToEpochSec(authDate: number): number {
  // Some clients send seconds, some milliseconds.
  const n = Number(authDate);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return n > 1e12 ? Math.floor(n / 1000) : Math.floor(n);
}

function verifyInitData(initData: string, botToken: string): { ok: true; parsed: ParsedInitData } | { ok: false; error: string } {
  const parsed = parseInitData(initData);
  if (!parsed) return { ok: false, error: 'invalid_init_data' };

  const maxAgeSec = parseMaxAgeSec();
  const nowSec = Math.floor(Date.now() / 1000);
  const authSec = authDateToEpochSec(parsed.authDate);
  if (!authSec || nowSec - authSec > maxAgeSec) return { ok: false, error: 'expired' };

  const dataCheckString = parsed.params.map(([k, v]) => `${k}=${v}`).join('\n');
  const hash = String(parsed.hash || '').trim().toLowerCase();
  if (!isHex64(hash)) return { ok: false, error: 'invalid_signature' };

  // MAX docs show secret_key as hex(HMAC_SHA256(BotToken, "WebAppData")).
  const secretKeyHex = createHmac('sha256', botToken).update('WebAppData').digest('hex');

  const candidates: string[] = [];
  // Variant A: use secret_key bytes (common for similar platforms).
  candidates.push(createHmac('sha256', Buffer.from(secretKeyHex, 'hex')).update(dataCheckString).digest('hex'));
  // Variant B: use secret_key hex string as ASCII key (docs wording can be interpreted this way).
  candidates.push(createHmac('sha256', secretKeyHex).update(dataCheckString).digest('hex'));
  // Variant C: alternate interpretation of secret_key derivation (defense-in-depth for client differences).
  const secretKeyAltHex = createHmac('sha256', 'WebAppData').update(botToken).digest('hex');
  candidates.push(createHmac('sha256', Buffer.from(secretKeyAltHex, 'hex')).update(dataCheckString).digest('hex'));
  candidates.push(createHmac('sha256', secretKeyAltHex).update(dataCheckString).digest('hex'));

  const target = Buffer.from(hash, 'hex');
  let ok = false;
  for (const c of candidates) {
    if (!isHex64(c)) continue;
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

function makeTechEmail(maxUserId: string): string {
  const id = String(maxUserId || '').trim();
  return `max+${id}@max.local`;
}

export async function POST(req: Request) {
  const botToken = cleanEnvValue(process.env.MAX_BOT_TOKEN);
  if (!botToken) return NextResponse.json({ error: 'not_configured' }, { status: 503 });

  const body = await req.json().catch(() => null);
  const initData = typeof body?.initData === 'string' ? body.initData : '';
  const startParamRaw = typeof body?.startParam === 'string' ? body.startParam.trim() : '';

  const v = verifyInitData(initData, botToken);
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 401 });

  let maxUser: any = null;
  try {
    maxUser = JSON.parse(v.parsed.userJson);
  } catch {
    return NextResponse.json({ error: 'invalid_user_json' }, { status: 400 });
  }

  const maxUserId = String(maxUser?.id ?? '').trim();
  if (!maxUserId) return NextResponse.json({ error: 'missing_user_id' }, { status: 400 });

  const firstName = typeof maxUser?.first_name === 'string' ? maxUser.first_name.trim() : '';
  const lastName = typeof maxUser?.last_name === 'string' ? maxUser.last_name.trim() : '';
  const displayName = `${firstName} ${lastName}`.trim() || null;

  const now = new Date();

  // Find by maxUserId. If absent — create.
  let user = await prisma.user.findUnique({
    where: { maxUserId },
    select: {
      id: true,
      email: true,
      role: true,
      displayName: true,
      emailVerifiedAt: true,
      trialEndsAt: true,
      billingStatus: true,
      paidUntil: true,
      authProvider: true,
      onboardingCompletedAt: true,
    },
  });
  if (!user) {
    const email = makeTechEmail(maxUserId);
    const passwordHash = await bcrypt.hash(newToken(), 10);
    user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: 'student',
        displayName,
        emailVerifiedAt: now,
        maxUserId,
        authProvider: 'max',
        onboardingCompletedAt: null,
      },
      select: {
        id: true,
        email: true,
        role: true,
        displayName: true,
        emailVerifiedAt: true,
        trialEndsAt: true,
        billingStatus: true,
        paidUntil: true,
        authProvider: true,
        onboardingCompletedAt: true,
      },
    });
  } else if (!user.emailVerifiedAt) {
    // Trust MAX user as verified identity for MVP.
    await prisma.user.update({ where: { id: user.id }, data: { emailVerifiedAt: now } });
  }

  // Honest trial: start on the first successful login (also for MAX logins).
  if (user.role !== 'admin' && !user.trialEndsAt && user.billingStatus === 'none' && !user.paidUntil) {
    await prisma.user.update({ where: { id: user.id }, data: { trialEndsAt: trialEndsAtFromNow(now), billingUpdatedAt: now } }).catch(() => undefined);
  }

  // Create session cookie.
  const token = newToken();
  await prisma.session.create({
    data: { userId: user.id, tokenHash: hashToken(token), expiresAt: expiresAtFromNow() },
  });

  // If MAX user hasn't selected the role yet — force onboarding.
  if (user.authProvider === 'max' && !user.onboardingCompletedAt) {
    const res = NextResponse.json({ ok: true, redirectTo: '/onboarding/role', access: { ok: true, reason: 'trial' }, startParam: startParamRaw || v.parsed.startParam || null });
    res.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });
    return res;
  }

  // Compute redirect target based on billing access (MVP).
  const info = await getBillingInfoByUserId(user.id).catch(() => null);
  const access = info
    ? hasBillingAccess({ role: info.role, trialEndsAt: info.trialEndsAt, billingStatus: info.billingStatus, paidUntil: info.paidUntil })
    : { ok: false as const, reason: 'none' as const };
  const redirectTo = access.ok ? '/class-2/addition' : '/billing';

  const res = NextResponse.json({ ok: true, redirectTo, access, startParam: startParamRaw || v.parsed.startParam || null });
  res.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
  return res;
}


import { NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { AuthWebAppLoginRequestDtoSchema, AuthWebAppLoginResponseDtoSchema } from '@smmtry/shared';

import { prisma } from '../../../../lib/db';
import { AUTH_COOKIE_NAME, expiresAtFromNow, hashToken, newToken } from '../../../../lib/auth';
import { getBillingInfoByUserId, hasBillingAccess, trialEndsAtFromNow } from '../../../../lib/billing';

function parseLinkToken(startParam: string): string | null {
  const sp = String(startParam || '').trim();
  const m = sp.match(/^link:(.+)$/i);
  if (!m) return null;
  const token = String(m[1] || '').trim();
  if (!/^[0-9a-f]{32,128}$/i.test(token)) return null;
  return token.toLowerCase();
}

function cleanEnvValue(raw: unknown): string {
  let v = String(raw ?? '').trim();
  v = v.replaceAll('\r', ' ').replaceAll('\n', ' ').trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1).trim();
  return v;
}

function parseMaxAgeSec(): number {
  const raw = cleanEnvValue(process.env.TELEGRAM_INITDATA_MAX_AGE_SEC);
  const n = raw ? Number(raw) : 86400;
  return Number.isFinite(n) ? Math.max(60, Math.trunc(n)) : 86400;
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
  // Support both encoded and decoded forms.
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
  const startParam = sp.get('start_param') || '';

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

type ParsedInitData = NonNullable<ReturnType<typeof parseInitData>>;

function verifyInitData(initData: string, botToken: string): { ok: true; parsed: ParsedInitData } | { ok: false; error: string } {
  const parsed = parseInitData(initData);
  if (!parsed) return { ok: false, error: 'invalid_init_data' };

  const maxAgeSec = parseMaxAgeSec();
  const nowSec = Math.floor(Date.now() / 1000);
  const authSec = authDateToEpochSec(parsed.authDate);
  if (!authSec || nowSec - authSec > maxAgeSec) return { ok: false, error: 'expired' };

  const dataCheckString = parsed.params.map(([k, v]) => `${k}=${v}`).join('\n');

  // Telegram WebApp validation:
  // secretKey = HMAC_SHA256(key="WebAppData", message=botToken)  (raw bytes)
  // expectedHash = HMAC_SHA256(key=secretKey, message=dataCheckString).hex
  const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();
  const expectedHex = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  const a = Buffer.from(String(parsed.hash).trim().toLowerCase(), 'hex');
  const b = Buffer.from(expectedHex, 'hex');
  if (a.length !== b.length) return { ok: false, error: 'invalid_signature' };
  if (!timingSafeEqual(a, b)) return { ok: false, error: 'invalid_signature' };

  return { ok: true, parsed };
}

function makeTechEmail(tgUserId: string): string {
  const id = String(tgUserId || '').trim();
  return `telegram+${id}@telegram.local`;
}

function makeDisplayName(user: Record<string, unknown>): string | null {
  const firstName = typeof user.first_name === 'string' ? user.first_name.trim() : '';
  const lastName = typeof user.last_name === 'string' ? user.last_name.trim() : '';
  const username = typeof user.username === 'string' ? user.username.trim() : '';
  const n = `${firstName} ${lastName}`.trim();
  return n || (username ? `@${username}` : null);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object';
}

export async function POST(req: Request) {
  const botToken = cleanEnvValue(process.env.TELEGRAM_BOT_TOKEN);
  if (!botToken) return NextResponse.json({ error: 'not_configured' }, { status: 503 });

  const rawBody: unknown = await req.json().catch(() => null);
  const parsedBody = AuthWebAppLoginRequestDtoSchema.safeParse(rawBody);
  if (!parsedBody.success) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  const { initData } = parsedBody.data;
  const startParamRaw = String(parsedBody.data.startParam || '').trim();

  const v = verifyInitData(initData, botToken);
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 401 });

  let tgUserUnknown: unknown = null;
  try {
    tgUserUnknown = JSON.parse(v.parsed.userJson);
  } catch {
    return NextResponse.json({ error: 'invalid_user_json' }, { status: 400 });
  }
  if (!isRecord(tgUserUnknown)) return NextResponse.json({ error: 'invalid_user_json' }, { status: 400 });
  const tgUser = tgUserUnknown;

  const tgUserId = String(tgUser.id ?? '').trim();
  if (!tgUserId) return NextResponse.json({ error: 'missing_user_id' }, { status: 400 });

  const displayName = makeDisplayName(tgUser);

  const now = new Date();
  const startParam = startParamRaw || v.parsed.startParam || '';
  const linkToken = parseLinkToken(startParam);

  // Resolve account: either explicit link to existing user, or identity login, or create a new user.
  const provider = 'telegram' as const;
  const identityKey = { provider_providerUserId: { provider, providerUserId: tgUserId } } as const;
  let userId: string | null = null;

  if (linkToken) {
    const tokenHash = hashToken(linkToken);
    const lt = await prisma.authLinkToken.findUnique({
      where: { tokenHash },
      select: { id: true, userId: true, provider: true, expiresAt: true, usedAt: true },
    });
    if (!lt) return NextResponse.json({ error: 'invalid_link_token' }, { status: 401 });
    if (lt.usedAt) return NextResponse.json({ error: 'link_token_used' }, { status: 401 });
    if (lt.expiresAt.getTime() <= now.getTime()) return NextResponse.json({ error: 'link_token_expired' }, { status: 401 });
    if (lt.provider !== provider) return NextResponse.json({ error: 'link_token_provider_mismatch' }, { status: 401 });

    const existing = await prisma.authIdentity.findUnique({ where: identityKey, select: { userId: true } });
    if (existing && existing.userId !== lt.userId) return NextResponse.json({ error: 'identity_already_linked' }, { status: 409 });

    if (!existing) {
      await prisma.authIdentity.create({
        data: { userId: lt.userId, provider, providerUserId: tgUserId, lastLoginAt: now },
        select: { id: true },
      });
    } else {
      await prisma.authIdentity.update({ where: identityKey, data: { lastLoginAt: now } }).catch(() => undefined);
    }

    await prisma.authLinkToken.update({ where: { id: lt.id }, data: { usedAt: now } }).catch(() => undefined);
    userId = lt.userId;
  } else {
    const identity = await prisma.authIdentity.findUnique({ where: identityKey, select: { userId: true } });
    if (identity) {
      userId = identity.userId;
      await prisma.authIdentity.update({ where: identityKey, data: { lastLoginAt: now } }).catch(() => undefined);
    }
  }

  // Create user if missing.
  if (!userId) {
    const email = makeTechEmail(tgUserId);
    const passwordHash = await bcrypt.hash(newToken(), 10);
    const created = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: 'student',
        displayName,
        emailVerifiedAt: null,
        authProvider: 'web',
        onboardingCompletedAt: null,
      },
      select: { id: true },
    });
    userId = created.id;
    await prisma.authIdentity.create({ data: { userId, provider, providerUserId: tgUserId, lastLoginAt: now }, select: { id: true } }).catch(() => undefined);
  }

  let user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      displayName: true,
      trialEndsAt: true,
      billingStatus: true,
      paidUntil: true,
    },
  });
  if (!user) return NextResponse.json({ error: 'user_not_found' }, { status: 404 });

  if (!user.displayName && displayName) {
    await prisma.user.update({ where: { id: user.id }, data: { displayName } }).catch(() => undefined);
    user = { ...user, displayName };
  }

  // Honest trial: start on the first successful login (also for Telegram logins).
  if (user.role !== 'admin' && !user.trialEndsAt && user.billingStatus === 'none' && !user.paidUntil) {
    await prisma.user.update({ where: { id: user.id }, data: { trialEndsAt: trialEndsAtFromNow(now), billingUpdatedAt: now } }).catch(() => undefined);
  }

  const token = newToken();
  await prisma.session.create({
    data: { userId: user.id, tokenHash: hashToken(token), expiresAt: expiresAtFromNow() },
  });

  const info = await getBillingInfoByUserId(user.id).catch(() => null);
  const access = info
    ? hasBillingAccess({ role: info.role, trialEndsAt: info.trialEndsAt, billingStatus: info.billingStatus, paidUntil: info.paidUntil })
    : { ok: false as const, reason: 'none' as const };
  const redirectTo = access.ok ? (info?.role === 'parent' ? '/progress/stats' : '/class-2/addition') : '/billing';

  const resBody = AuthWebAppLoginResponseDtoSchema.parse({ ok: true, redirectTo, access, startParam: startParam || null });
  const res = NextResponse.json(resBody);
  res.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
  return res;
}


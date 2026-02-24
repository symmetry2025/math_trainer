import { NextResponse } from 'next/server';
import { AuthProviderLinkRequestStartRequestDtoSchema, AuthProviderLinkRequestStartResponseDtoSchema } from '@smmtry/shared';
import type { IdentityProvider } from '@prisma/client';

import { prisma } from '../../../../lib/db';
import { hashToken, newToken } from '../../../../lib/auth';
import { verifyTelegramInitData, verifyMaxInitData } from '../../../../lib/providerInitData';

type Provider = Extract<IdentityProvider, 'telegram' | 'max'>;

function getProviderUserId(init: { userJson: string }): string | null {
  try {
    const u: unknown = JSON.parse(init.userJson);
    if (!u || typeof u !== 'object') return null;
    const idRaw = (u as { id?: unknown }).id;
    const id = String(idRaw ?? '').trim();
    return id || null;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const body: unknown = await req.json().catch(() => null);
  const parsedBody = AuthProviderLinkRequestStartRequestDtoSchema.safeParse(body);
  if (!parsedBody.success) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  const provider = (parsedBody.data.provider === 'telegram' ? 'telegram' : 'max') satisfies Provider;
  const initData = parsedBody.data.initData;

  const verified =
    provider === 'telegram' ? verifyTelegramInitData(initData) : provider === 'max' ? verifyMaxInitData(initData) : { ok: false as const, error: 'invalid_provider' };
  if (!verified.ok) return NextResponse.json({ error: verified.error }, { status: 401 });

  const providerUserId = getProviderUserId(verified.parsed);
  if (!providerUserId) return NextResponse.json({ error: 'missing_user_id' }, { status: 400 });

  const token = newToken();
  const expiresAt = new Date(Date.now() + 10 * 60_000);
  const tokenHash = hashToken(token);

  await prisma.authProviderLinkRequest.upsert({
    where: { provider_providerUserId: { provider, providerUserId } },
    create: { provider, providerUserId, tokenHash, expiresAt },
    update: { tokenHash, expiresAt, usedAt: null },
    select: { id: true },
  });

  const resBody = AuthProviderLinkRequestStartResponseDtoSchema.parse({
    ok: true,
    provider,
    requestToken: token,
    expiresAt: expiresAt.toISOString(),
  });
  return NextResponse.json(resBody);
}


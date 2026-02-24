import { NextResponse } from 'next/server';
import { AuthProviderLinkConfirmRequestDtoSchema, AuthProviderLinkConfirmResponseDtoSchema } from '@smmtry/shared';

import { prisma } from '../../../../lib/db';
import { getCurrentUserOrNull, hashToken } from '../../../../lib/auth';

type Provider = 'telegram' | 'max';

function asProvider(raw: unknown): Provider | null {
  const v = String(raw ?? '').trim();
  return v === 'telegram' || v === 'max' ? (v as Provider) : null;
}

export async function POST(req: Request) {
  const me = await getCurrentUserOrNull();
  if (!me) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body: unknown = await req.json().catch(() => null);
  const parsedBody = AuthProviderLinkConfirmRequestDtoSchema.safeParse(body);
  if (!parsedBody.success) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });

  const token = parsedBody.data.requestToken;
  const tokenHash = hashToken(token);
  const now = new Date();

  const out = await prisma.$transaction(async (tx) => {
    const lr = await tx.authProviderLinkRequest.findUnique({
      where: { tokenHash },
      select: { id: true, provider: true, providerUserId: true, expiresAt: true, usedAt: true },
    });
    if (!lr) return { ok: false as const, error: 'invalid_request_token' as const };
    if (lr.expiresAt.getTime() <= now.getTime()) return { ok: false as const, error: 'request_expired' as const };

    const provider = asProvider(lr.provider);
    if (!provider) return { ok: false as const, error: 'invalid_provider' as const };

    const identityKey = { provider_providerUserId: { provider, providerUserId: lr.providerUserId } } as const;
    const existing = await tx.authIdentity.findUnique({ where: identityKey as any, select: { userId: true } });

    if (existing && existing.userId !== me.id) return { ok: false as const, error: 'identity_already_linked' as const, provider };

    if (lr.usedAt) {
      if (existing?.userId === me.id) return { ok: true as const, provider, status: 'already_linked' as const };
      return { ok: false as const, error: 'request_used' as const, provider };
    }

    if (!existing) {
      await tx.authIdentity.create({
        data: { userId: me.id, provider: provider as any, providerUserId: lr.providerUserId, lastLoginAt: now } as any,
        select: { id: true } as any,
      });
    }

    await tx.authProviderLinkRequest.update({
      where: { id: lr.id },
      data: { usedAt: now },
      select: { id: true } as any,
    });

    return { ok: true as const, provider, status: existing ? ('already_linked' as const) : ('linked' as const) };
  });

  if (!out.ok) {
    const status = out.error === 'identity_already_linked' ? 409 : 401;
    return NextResponse.json({ error: out.error }, { status });
  }

  const resBody = AuthProviderLinkConfirmResponseDtoSchema.parse({ ok: true, provider: out.provider, status: out.status });
  return NextResponse.json(resBody);
}


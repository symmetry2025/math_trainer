import { NextResponse } from 'next/server';
import { AuthListIdentitiesResponseDtoSchema, AuthUnlinkIdentityRequestDtoSchema, AuthUnlinkIdentityResponseDtoSchema } from '@smmtry/shared';
import type { IdentityProvider } from '@prisma/client';

import { prisma } from '../../../../lib/db';
import { getCurrentUserOrNull } from '../../../../lib/auth';

function asIsoOrNull(d: Date | null): string | null {
  return d ? d.toISOString() : null;
}

export async function GET() {
  const me = await getCurrentUserOrNull();
  if (!me) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const identities = await prisma.authIdentity.findMany({
    where: { userId: me.id },
    orderBy: { createdAt: 'asc' },
    select: {
      provider: true,
      providerUserId: true,
      createdAt: true,
      lastLoginAt: true,
    },
  });

  // Map DB enum -> DTO provider values
  const dto = AuthListIdentitiesResponseDtoSchema.parse({
    ok: true,
    identities: identities
      .map((i) => {
        const provider = i.provider === 'max' ? 'max' : i.provider === 'telegram' ? 'telegram' : null;
        if (!provider) return null;
        return {
          provider,
          providerUserId: i.providerUserId,
          linkedAt: i.createdAt.toISOString(),
          lastLoginAt: asIsoOrNull(i.lastLoginAt),
        };
      })
      .filter(Boolean),
  });

  return NextResponse.json(dto);
}

function isProviderLocalEmail(email: string): boolean {
  const e = String(email || '').trim().toLowerCase();
  return e.endsWith('@telegram.local') || e.endsWith('@max.local');
}

function asDbProvider(p: string): Extract<IdentityProvider, 'telegram' | 'max'> | null {
  const v = String(p || '').trim();
  return v === 'telegram' || v === 'max' ? (v as Extract<IdentityProvider, 'telegram' | 'max'>) : null;
}

export async function DELETE(req: Request) {
  const me = await getCurrentUserOrNull();
  if (!me) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body: unknown = await req.json().catch(() => null);
  const parsed = AuthUnlinkIdentityRequestDtoSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  const provider = asDbProvider(parsed.data.provider);
  if (!provider) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });

  const ids = await prisma.authIdentity.findMany({
    where: { userId: me.id },
    select: { provider: true },
  });

  const hasThis = ids.some((i) => i.provider === provider);
  if (!hasThis) {
    const dto = AuthUnlinkIdentityResponseDtoSchema.parse({ ok: true, provider });
    return NextResponse.json(dto);
  }

  // Safety: do not allow unlinking the last identity for provider-local accounts
  // (user would lose the ability to login).
  if (me.role !== 'admin' && isProviderLocalEmail(me.email)) {
    const others = ids.some((i) => (i.provider === 'telegram' || i.provider === 'max') && i.provider !== provider);
    if (!others) return NextResponse.json({ error: 'would_lock_out' }, { status: 409 });
  }

  await prisma.authIdentity.deleteMany({
    where: { userId: me.id, provider },
  });

  const dto = AuthUnlinkIdentityResponseDtoSchema.parse({ ok: true, provider });
  return NextResponse.json(dto);
}


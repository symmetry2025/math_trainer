import { NextResponse } from 'next/server';
import { AuthListIdentitiesResponseDtoSchema, AuthUnlinkIdentityRequestDtoSchema, AuthUnlinkIdentityResponseDtoSchema } from '@smmtry/shared';

import { prisma } from '../../../../lib/db';
import { getCurrentUserOrNull } from '../../../../lib/auth';

function asIsoOrNull(d: Date | null): string | null {
  return d ? d.toISOString() : null;
}

function isProviderLocalEmail(email: string): boolean {
  const e = String(email || '').trim().toLowerCase();
  return e.endsWith('@max.local') || e.endsWith('@telegram.local');
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

export async function DELETE(req: Request) {
  const me = await getCurrentUserOrNull();
  if (!me) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body: unknown = await req.json().catch(() => null);
  const parsed = AuthUnlinkIdentityRequestDtoSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });

  const provider = parsed.data.provider;
  const dbProvider = provider === 'max' ? ('max' as const) : ('telegram' as const);

  const now = new Date();

  try {
    await prisma.$transaction(async (tx) => {
      const identities = await tx.authIdentity.findMany({
        where: { userId: me.id },
        orderBy: { createdAt: 'asc' },
        select: { id: true, provider: true },
      });

      const toRemove = identities.find((i) => i.provider === dbProvider) || null;
      if (!toRemove) return;

      // Do not allow removing the last way to sign in:
      // - if the user has a non-provider-local email (regular web account), "password" remains a login method.
      // - otherwise, require at least one other AuthIdentity to remain.
      const hasPasswordMethod = !isProviderLocalEmail(me.email);
      const otherIdentitiesCount = identities.filter((i) => i.id !== toRemove.id).length;
      if (!hasPasswordMethod && otherIdentitiesCount === 0) {
        throw new Error('would_lock_out');
      }

      await tx.authIdentity.delete({ where: { id: toRemove.id } });

      // Best-effort: if we removed MAX identity, clear legacy user.maxUserId too.
      if (dbProvider === 'max') {
        await tx.user.update({ where: { id: me.id }, data: { maxUserId: null, updatedAt: now } }).catch(() => undefined);
      }
    });

    const dto = AuthUnlinkIdentityResponseDtoSchema.parse({ ok: true, provider });
    return NextResponse.json(dto);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '';
    if (msg === 'would_lock_out') return NextResponse.json({ error: 'would_lock_out' }, { status: 409 });
    // eslint-disable-next-line no-console
    console.error('[auth/identities] unlink failed:', e);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}


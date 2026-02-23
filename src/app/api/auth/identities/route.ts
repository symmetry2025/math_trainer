import { NextResponse } from 'next/server';
import { AuthListIdentitiesResponseDtoSchema } from '@smmtry/shared';

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


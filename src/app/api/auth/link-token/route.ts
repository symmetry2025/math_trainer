import { NextResponse } from 'next/server';
import { AuthStartLinkTokenRequestDtoSchema, AuthStartLinkTokenResponseDtoSchema } from '@smmtry/shared';
import { prisma } from '../../../../lib/db';
import { getCurrentUserOrNull, hashToken, newToken } from '../../../../lib/auth';

function asIso(d: Date): string {
  return d.toISOString();
}

export async function POST(req: Request) {
  const me = await getCurrentUserOrNull();
  if (!me) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = AuthStartLinkTokenRequestDtoSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });

  const provider = parsed.data.provider;
  // Short-lived one-time token (explicit linking flow).
  const token = newToken(); // 64-hex
  const expiresAt = new Date(Date.now() + 10 * 60_000);

  // Map DTO provider -> DB enum (IdentityProvider)
  const dbProvider = provider === 'max' ? ('max' as const) : ('telegram' as const);

  await prisma.authLinkToken.create({
    data: {
      userId: me.id,
      provider: dbProvider,
      tokenHash: hashToken(token),
      expiresAt,
    },
    select: { id: true },
  });

  const resBody = AuthStartLinkTokenResponseDtoSchema.parse({
    ok: true,
    provider,
    token,
    startParam: `link:${token}`,
    expiresAt: asIso(expiresAt),
  });
  return NextResponse.json(resBody);
}


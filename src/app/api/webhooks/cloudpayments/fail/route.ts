import { NextResponse } from 'next/server';

import { prisma } from '../../../../../lib/db';
import { getCpSignatureHeader, verifyCpWebhookSignature } from '../../../../../lib/cloudpaymentsWebhooks';

export async function POST(req: Request) {
  const rawBody = await req.text();
  const sig = getCpSignatureHeader(req);
  const okSig = verifyCpWebhookSignature({ rawBody, signature: sig });
  if (!okSig) {
    // eslint-disable-next-line no-console
    console.warn('[cp/webhook/fail] invalid signature', { hasSig: !!sig });
    return NextResponse.json({ code: 13 }, { status: 200 });
  }

  const body = JSON.parse(rawBody || '{}');
  const accountId = typeof body?.AccountId === 'string' ? body.AccountId.trim() : '';
  if (!accountId) return NextResponse.json({ code: 0 }, { status: 200 });

  const user = await prisma.user.findUnique({ where: { id: accountId }, select: { id: true } });
  if (!user) return NextResponse.json({ code: 0 }, { status: 200 });

  const now = new Date();
  await prisma.user.update({
    where: { id: user.id },
    data: { billingStatus: 'past_due', billingUpdatedAt: now },
  });
  // eslint-disable-next-line no-console
  console.log('[cp/webhook/fail] updated', { accountId: user.id, status: 'past_due' });
  return NextResponse.json({ code: 0 }, { status: 200 });
}


import { NextResponse } from 'next/server';

import { prisma } from '../../../../../lib/db';
import { getCpSignatureHeaders, verifyCpWebhookRequest } from '../../../../../lib/cloudpaymentsWebhooks';
import { parseCpWebhookBody } from '../../../../../lib/cloudpaymentsWebhookBody';

export async function POST(req: Request) {
  const rawBody = await req.text();
  const contentType = req.headers.get('content-type');
  const { xContentHmac, contentHmac } = getCpSignatureHeaders(req);
  const okSig = verifyCpWebhookRequest(req, rawBody);
  if (!okSig) {
    // eslint-disable-next-line no-console
    console.warn('[cp/webhook/fail] invalid signature', {
      hasSig: !!(xContentHmac || contentHmac),
      hasXContentHmac: !!xContentHmac,
      hasContentHmac: !!contentHmac,
      contentType,
    });
    return NextResponse.json({ code: 13 }, { status: 200 });
  }

  const body = parseCpWebhookBody(rawBody, contentType);
  const accountId = typeof body?.AccountId === 'string' ? body.AccountId.trim() : '';
  if (!accountId) return NextResponse.json({ code: 0 }, { status: 200 });

  // IMPORTANT: we use AccountId = SubscriptionSeat.id (1 seat = 1 subscription).
  const seat = await prisma.subscriptionSeat.findUnique({ where: { id: accountId }, select: { id: true } });
  if (!seat) return NextResponse.json({ code: 0 }, { status: 200 });

  const now = new Date();
  await prisma.subscriptionSeat.update({
    where: { id: seat.id },
    data: { status: 'past_due', billingUpdatedAt: now },
  });
  // eslint-disable-next-line no-console
  console.log('[cp/webhook/fail] updated', { seatId: seat.id, status: 'past_due' });
  return NextResponse.json({ code: 0 }, { status: 200 });
}


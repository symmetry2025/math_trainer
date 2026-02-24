import { NextResponse } from 'next/server';

import { prisma } from '../../../../../lib/db';
import { getCpSignatureHeaders, verifyCpWebhookRequest } from '../../../../../lib/cloudpaymentsWebhooks';
import { parseCpWebhookBody } from '../../../../../lib/cloudpaymentsWebhookBody';

function mapStatus(raw: unknown): 'active' | 'past_due' | 'cancelled' | 'none' {
  const s = typeof raw === 'string' ? raw : '';
  if (s === 'Active') return 'active';
  if (s === 'PastDue') return 'past_due';
  if (s === 'Cancelled' || s === 'Expired' || s === 'Rejected') return 'cancelled';
  return 'none';
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  const contentType = req.headers.get('content-type');
  const { xContentHmac, contentHmac } = getCpSignatureHeaders(req);
  const okSig = verifyCpWebhookRequest(req, rawBody);
  if (!okSig) {
    // eslint-disable-next-line no-console
    console.warn('[cp/webhook/recurrent] invalid signature', {
      hasSig: !!(xContentHmac || contentHmac),
      hasXContentHmac: !!xContentHmac,
      hasContentHmac: !!contentHmac,
      contentType,
    });
    return NextResponse.json({ code: 13 }, { status: 200 });
  }

  const body = parseCpWebhookBody(rawBody, contentType);
  const accountId = typeof body?.AccountId === 'string' ? body.AccountId.trim() : '';
  const id = typeof body?.Id === 'string' ? body.Id.trim() : '';
  if (!accountId) return NextResponse.json({ code: 0 }, { status: 200 });

  // IMPORTANT: we use AccountId = SubscriptionSeat.id (1 seat = 1 subscription).
  const seat = await prisma.subscriptionSeat.findUnique({ where: { id: accountId }, select: { id: true } });
  if (!seat) return NextResponse.json({ code: 0 }, { status: 200 });

  const now = new Date();
  const status = mapStatus(body?.Status);
  await prisma.subscriptionSeat.update({
    where: { id: seat.id },
    data: {
      status: status === 'none' ? 'none' : status,
      billingUpdatedAt: now,
      ...(id ? { cpSubscriptionId: id } : {}),
    },
  });
  // eslint-disable-next-line no-console
  console.log('[cp/webhook/recurrent] updated', { seatId: seat.id, status, cpSubscriptionId: id || null });

  return NextResponse.json({ code: 0 }, { status: 200 });
}


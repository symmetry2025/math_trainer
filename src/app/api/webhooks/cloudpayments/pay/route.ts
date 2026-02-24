import { NextResponse } from 'next/server';

import { prisma } from '../../../../../lib/db';
import { cloudPaymentsCreateSubscription } from '../../../../../lib/cloudpayments';
import { BILLING_CURRENCY, getBillingPriceRub } from '../../../../../lib/billingConfig';
import { getCpSignatureHeaders, verifyCpWebhookRequest } from '../../../../../lib/cloudpaymentsWebhooks';
import { parseCpWebhookBody } from '../../../../../lib/cloudpaymentsWebhookBody';

function addOneMonthUtc(d: Date): Date {
  const x = new Date(d.getTime());
  x.setUTCMonth(x.getUTCMonth() + 1);
  return x;
}

async function markReferralFirstPaid(userId: string, now: Date): Promise<void> {
  await prisma.referralAttribution.updateMany({
    where: { userId, firstPaidAt: null },
    data: { firstPaidAt: now },
  });
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  const contentType = req.headers.get('content-type');
  const { xContentHmac, contentHmac } = getCpSignatureHeaders(req);
  const okSig = verifyCpWebhookRequest(req, rawBody);
  if (!okSig) {
    // eslint-disable-next-line no-console
    console.warn('[cp/webhook/pay] invalid signature', {
      hasSig: !!(xContentHmac || contentHmac),
      hasXContentHmac: !!xContentHmac,
      hasContentHmac: !!contentHmac,
      contentType,
    });
    try {
      const body = parseCpWebhookBody(rawBody, contentType);
      // eslint-disable-next-line no-console
      console.warn('[cp/webhook/pay] invalid signature payload', {
        accountId: typeof body?.AccountId === 'string' ? body.AccountId.trim() : '',
        invoiceId: typeof body?.InvoiceId === 'string' ? body.InvoiceId.trim() : '',
      });
    } catch {
      // ignore
    }
    return NextResponse.json({ code: 13 }, { status: 200 }); // NotAccepted
  }

  const body = parseCpWebhookBody(rawBody, contentType);
  const accountId = typeof body?.AccountId === 'string' ? body.AccountId.trim() : '';
  const token = typeof body?.Token === 'string' ? body.Token.trim() : '';
  const email = typeof body?.Email === 'string' ? body.Email.trim() : '';
  const subscriptionId = typeof body?.SubscriptionId === 'string' ? body.SubscriptionId.trim() : '';
  const invoiceId = typeof body?.InvoiceId === 'string' ? body.InvoiceId.trim() : '';
  const cardFirstSix = typeof body?.CardFirstSix === 'string' ? body.CardFirstSix.trim() : '';
  const cardLastFour = typeof body?.CardLastFour === 'string' ? body.CardLastFour.trim() : '';
  const cardMask = cardFirstSix && cardLastFour ? `${cardFirstSix}******${cardLastFour}` : null;

  // Always ACK to avoid retries storm.
  if (!accountId) return NextResponse.json({ code: 0 }, { status: 200 });

  // eslint-disable-next-line no-console
  console.log('[cp/webhook/pay] received', {
    accountId,
    invoiceId,
    hasToken: !!token,
    subscriptionId,
    hasCardMask: !!cardMask,
  });

  const now = new Date();
  const priceRub = getBillingPriceRub();

  // IMPORTANT: we use AccountId = SubscriptionSeat.id (1 seat = 1 subscription).
  const seat = await prisma.subscriptionSeat.findUnique({
    where: { id: accountId },
    select: { id: true, parentId: true, cpSubscriptionId: true, status: true, paidUntil: true },
  });
  if (!seat) return NextResponse.json({ code: 0 }, { status: 200 });
  const parent = await prisma.user.findUnique({ where: { id: seat.parentId }, select: { id: true, email: true } });
  if (!parent) return NextResponse.json({ code: 0 }, { status: 200 });

  const base = new Date(
    Math.max(
      now.getTime(),
      seat.paidUntil?.getTime() ?? 0,
    ),
  );
  const paidUntil = addOneMonthUtc(base);

  // If this is a recurring payment for an existing subscription — just extend access.
  if (subscriptionId || seat.cpSubscriptionId) {
    await prisma.subscriptionSeat.update({
      where: { id: seat.id },
      data: {
        status: 'active',
        paidUntil,
        billingUpdatedAt: now,
        ...(subscriptionId ? { cpSubscriptionId: subscriptionId } : {}),
        ...(cardMask ? { cpCardMask: cardMask } : {}),
      },
    });
    await markReferralFirstPaid(parent.id, now);
    // eslint-disable-next-line no-console
    console.log('[cp/webhook/pay] updated (extend)', { seatId: seat.id, parentId: parent.id, paidUntil: paidUntil.toISOString() });
    return NextResponse.json({ code: 0 }, { status: 200 });
  }

  // Initial payment: create a subscription in CloudPayments using the token from Pay notification.
  if (!token) {
    await prisma.subscriptionSeat.update({
      where: { id: seat.id },
      data: { status: 'active', paidUntil, billingUpdatedAt: now, ...(cardMask ? { cpCardMask: cardMask } : {}) },
    });
    await markReferralFirstPaid(parent.id, now);
    // eslint-disable-next-line no-console
    console.log('[cp/webhook/pay] updated (no token)', { seatId: seat.id, parentId: parent.id, paidUntil: paidUntil.toISOString() });
    return NextResponse.json({ code: 0 }, { status: 200 });
  }

  // If user pays during trial, extend access by 1 month from trial end
  // and set the first recurrent charge to happen when current access ends.
  const startDate = paidUntil.toISOString();
  try {
    const created = await cloudPaymentsCreateSubscription({
      token,
      accountId: seat.id,
      email: email || parent.email,
      description: `Подписка МатТренер — ${priceRub} ₽/мес`,
      amount: priceRub,
      currency: BILLING_CURRENCY,
      requireConfirmation: false,
      startDate,
      interval: 'Month',
      period: 1,
    });

    await prisma.subscriptionSeat.update({
      where: { id: seat.id },
      data: {
        status: 'active',
        paidUntil,
        billingUpdatedAt: now,
        cpSubscriptionId: created.id || null,
        cpToken: token,
        ...(cardMask ? { cpCardMask: cardMask } : {}),
      },
    });
    await markReferralFirstPaid(parent.id, now);
    // eslint-disable-next-line no-console
    console.log('[cp/webhook/pay] updated (subscription created)', {
      seatId: seat.id,
      parentId: parent.id,
      cpSubscriptionId: created.id || null,
      paidUntil: paidUntil.toISOString(),
    });
  } catch (e) {
    // If subscription creation fails, still keep access (user has paid).
    // eslint-disable-next-line no-console
    console.error('[cp/webhook/pay] create subscription failed:', e);
    await prisma.subscriptionSeat.update({
      where: { id: seat.id },
      data: { status: 'active', paidUntil, billingUpdatedAt: now, cpToken: token, ...(cardMask ? { cpCardMask: cardMask } : {}) },
    });
    await markReferralFirstPaid(parent.id, now);
    // eslint-disable-next-line no-console
    console.log('[cp/webhook/pay] updated (subscription create failed)', { seatId: seat.id, parentId: parent.id, paidUntil: paidUntil.toISOString() });
  }

  return NextResponse.json({ code: 0 }, { status: 200 });
}


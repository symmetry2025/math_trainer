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

  const user = await prisma.user.findUnique({
    where: { id: accountId },
    select: { id: true, email: true, cpSubscriptionId: true, billingStatus: true, paidUntil: true, trialEndsAt: true },
  });
  if (!user) return NextResponse.json({ code: 0 }, { status: 200 });

  const base = new Date(
    Math.max(
      now.getTime(),
      user.paidUntil?.getTime() ?? 0,
      user.trialEndsAt?.getTime() ?? 0,
    ),
  );
  const paidUntil = addOneMonthUtc(base);

  // If this is a recurring payment for an existing subscription — just extend access.
  if (subscriptionId || user.cpSubscriptionId) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        billingStatus: 'active',
        paidUntil,
        billingUpdatedAt: now,
        ...(subscriptionId ? { cpSubscriptionId: subscriptionId } : {}),
        ...(cardMask ? { cpCardMask: cardMask } : {}),
      },
    });
    await markReferralFirstPaid(user.id, now);
    // eslint-disable-next-line no-console
    console.log('[cp/webhook/pay] updated (extend)', { accountId: user.id, paidUntil: paidUntil.toISOString() });
    return NextResponse.json({ code: 0 }, { status: 200 });
  }

  // Initial payment: create a subscription in CloudPayments using the token from Pay notification.
  if (!token) {
    await prisma.user.update({
      where: { id: user.id },
      data: { billingStatus: 'active', paidUntil, billingUpdatedAt: now, ...(cardMask ? { cpCardMask: cardMask } : {}) },
    });
    await markReferralFirstPaid(user.id, now);
    // eslint-disable-next-line no-console
    console.log('[cp/webhook/pay] updated (no token)', { accountId: user.id, paidUntil: paidUntil.toISOString() });
    return NextResponse.json({ code: 0 }, { status: 200 });
  }

  // If user pays during trial, extend access by 1 month from trial end
  // and set the first recurrent charge to happen when current access ends.
  const startDate = paidUntil.toISOString();
  try {
    const created = await cloudPaymentsCreateSubscription({
      token,
      accountId: user.id,
      email: email || user.email,
      description: `Подписка МатТренер — ${priceRub} ₽/мес`,
      amount: priceRub,
      currency: BILLING_CURRENCY,
      requireConfirmation: false,
      startDate,
      interval: 'Month',
      period: 1,
    });

    await prisma.user.update({
      where: { id: user.id },
      data: {
        billingStatus: 'active',
        paidUntil,
        billingUpdatedAt: now,
        cpSubscriptionId: created.id || null,
        cpToken: token,
        ...(cardMask ? { cpCardMask: cardMask } : {}),
      },
    });
    await markReferralFirstPaid(user.id, now);
    // eslint-disable-next-line no-console
    console.log('[cp/webhook/pay] updated (subscription created)', {
      accountId: user.id,
      cpSubscriptionId: created.id || null,
      paidUntil: paidUntil.toISOString(),
    });
  } catch (e) {
    // If subscription creation fails, still keep access (user has paid).
    // eslint-disable-next-line no-console
    console.error('[cp/webhook/pay] create subscription failed:', e);
    await prisma.user.update({
      where: { id: user.id },
      data: { billingStatus: 'active', paidUntil, billingUpdatedAt: now, cpToken: token, ...(cardMask ? { cpCardMask: cardMask } : {}) },
    });
    await markReferralFirstPaid(user.id, now);
    // eslint-disable-next-line no-console
    console.log('[cp/webhook/pay] updated (subscription create failed)', { accountId: user.id, paidUntil: paidUntil.toISOString() });
  }

  return NextResponse.json({ code: 0 }, { status: 200 });
}


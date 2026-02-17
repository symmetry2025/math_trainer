import { NextResponse } from 'next/server';

import { prisma } from '../../../../../lib/db';
import { getCpSignatureHeader, verifyCpWebhookSignature } from '../../../../../lib/cloudpaymentsWebhooks';

function mapStatus(raw: unknown): 'active' | 'past_due' | 'cancelled' | 'none' {
  const s = typeof raw === 'string' ? raw : '';
  if (s === 'Active') return 'active';
  if (s === 'PastDue') return 'past_due';
  if (s === 'Cancelled' || s === 'Expired' || s === 'Rejected') return 'cancelled';
  return 'none';
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  const sig = getCpSignatureHeader(req);
  const okSig = verifyCpWebhookSignature({ rawBody, signature: sig });
  if (!okSig) {
    // eslint-disable-next-line no-console
    console.warn('[cp/webhook/recurrent] invalid signature', { hasSig: !!sig });
    return NextResponse.json({ code: 13 }, { status: 200 });
  }

  const body = JSON.parse(rawBody || '{}');
  const accountId = typeof body?.AccountId === 'string' ? body.AccountId.trim() : '';
  const id = typeof body?.Id === 'string' ? body.Id.trim() : '';
  if (!accountId) return NextResponse.json({ code: 0 }, { status: 200 });

  const user = await prisma.user.findUnique({ where: { id: accountId }, select: { id: true } });
  if (!user) return NextResponse.json({ code: 0 }, { status: 200 });

  const now = new Date();
  const status = mapStatus(body?.Status);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      billingStatus: status === 'none' ? 'none' : status,
      billingUpdatedAt: now,
      ...(id ? { cpSubscriptionId: id } : {}),
    },
  });
  // eslint-disable-next-line no-console
  console.log('[cp/webhook/recurrent] updated', { accountId: user.id, status, cpSubscriptionId: id || null });

  return NextResponse.json({ code: 0 }, { status: 200 });
}


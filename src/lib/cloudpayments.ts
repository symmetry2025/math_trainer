type CpResponse<TModel> = {
  Success: boolean;
  Message?: string | null;
  Model?: TModel;
};

function getCpBaseUrl(): string {
  return 'https://api.cloudpayments.ru';
}

function getCpAuth() {
  const publicId = String(process.env.CP_PUBLIC_ID ?? '').trim();
  const apiSecret = String(process.env.CP_API_SECRET ?? '').trim();
  if (!publicId) throw new Error('CP_PUBLIC_ID is required');
  if (!apiSecret) throw new Error('CP_API_SECRET is required');
  const basic = Buffer.from(`${publicId}:${apiSecret}`, 'utf8').toString('base64');
  return { publicId, apiSecret, basic };
}

async function cpPost<TModel>(path: string, payload: any): Promise<TModel> {
  const { basic } = getCpAuth();
  const res = await fetch(`${getCpBaseUrl()}${path}`, {
    method: 'POST',
    headers: {
      authorization: `Basic ${basic}`,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify(payload ?? {}),
    cache: 'no-store',
  });
  const body: CpResponse<TModel> = await res.json().catch(() => ({ Success: false, Message: 'invalid_json' } as any));
  if (!res.ok || !body?.Success) {
    const msg = body?.Message || `cp_request_failed:${res.status}`;
    throw new Error(msg);
  }
  return body.Model as TModel;
}

export async function cloudPaymentsTest(): Promise<{ message: string }> {
  const model = await cpPost<string>('/test', {});
  return { message: model };
}

export type CpSubscriptionInterval = 'Day' | 'Week' | 'Month';

export async function cloudPaymentsCreateSubscription(params: {
  token: string;
  accountId: string;
  email?: string;
  description: string;
  amount: number;
  currency: 'RUB';
  requireConfirmation?: boolean;
  startDate: string; // ISO string, UTC
  interval: CpSubscriptionInterval;
  period: number;
  maxPeriods?: number;
}): Promise<{
  id: string;
  status: string;
  startDateIso?: string;
  nextTransactionDateIso?: string | null;
  lastTransactionDateIso?: string | null;
}> {
  const model = await cpPost<any>('/subscriptions/create', {
    token: params.token,
    accountId: params.accountId,
    description: params.description,
    email: params.email,
    amount: params.amount,
    currency: params.currency,
    requireConfirmation: !!params.requireConfirmation,
    startDate: params.startDate,
    interval: params.interval,
    period: params.period,
    maxPeriods: params.maxPeriods,
  });
  return {
    id: String(model?.Id ?? ''),
    status: String(model?.Status ?? ''),
    startDateIso: typeof model?.StartDateIso === 'string' ? model.StartDateIso : undefined,
    nextTransactionDateIso: typeof model?.NextTransactionDateIso === 'string' ? model.NextTransactionDateIso : null,
    lastTransactionDateIso: typeof model?.LastTransactionDateIso === 'string' ? model.LastTransactionDateIso : null,
  };
}

export async function cloudPaymentsCancelSubscription(params: { id: string }): Promise<{ ok: true }> {
  await cpPost<any>('/subscriptions/cancel', { id: params.id });
  return { ok: true };
}


import { cleanEnvValue } from './env';
import { getCpMode } from './cloudpaymentsConfig';

export const BILLING_CURRENCY = 'RUB' as const;
export const TRIAL_DAYS = 7;

const DEFAULT_PRICE_RUB = 399;
const TEST_DEFAULT_PRICE_RUB = 1;

export function getBillingPriceRub(): number {
  const raw = cleanEnvValue(process.env.BILLING_PRICE_RUB);
  const n = raw ? Number(raw) : NaN;
  if (!Number.isFinite(n) || n <= 0) {
    return getCpMode() === 'test' ? TEST_DEFAULT_PRICE_RUB : DEFAULT_PRICE_RUB;
  }
  return Math.max(1, Math.floor(n));
}


import { cleanEnvValue } from './env';

export type CpMode = 'live' | 'test';

export function getCpMode(): CpMode {
  const raw = cleanEnvValue(process.env.CP_MODE).toLowerCase();
  return raw === 'test' ? 'test' : 'live';
}

export function getCpPublicId(): string {
  const mode = getCpMode();
  return cleanEnvValue(mode === 'test' ? process.env.CP_PUBLIC_ID_TEST : process.env.CP_PUBLIC_ID);
}

export function getCpApiSecret(): string {
  const mode = getCpMode();
  return cleanEnvValue(mode === 'test' ? process.env.CP_API_SECRET_TEST : process.env.CP_API_SECRET);
}

// CloudPayments webhook HMAC secret can be different from API secret.
// Prefer CP_WEBHOOK_SECRET*, but fallback to CP_API_SECRET* for backwards compatibility.
export function getCpWebhookSecret(): string {
  const mode = getCpMode();
  const primary = cleanEnvValue(mode === 'test' ? process.env.CP_WEBHOOK_SECRET_TEST : process.env.CP_WEBHOOK_SECRET);
  if (primary) return primary;
  return getCpApiSecret();
}

export function getCpWidgetPublicId(): string {
  const mode = getCpMode();
  return cleanEnvValue(mode === 'test' ? process.env.NEXT_PUBLIC_CP_PUBLIC_ID_TEST : process.env.NEXT_PUBLIC_CP_PUBLIC_ID);
}


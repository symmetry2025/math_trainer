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

export function getCpWidgetPublicId(): string {
  const mode = getCpMode();
  return cleanEnvValue(mode === 'test' ? process.env.NEXT_PUBLIC_CP_PUBLIC_ID_TEST : process.env.NEXT_PUBLIC_CP_PUBLIC_ID);
}


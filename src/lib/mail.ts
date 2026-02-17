import nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';

import type { RenderedEmail } from './mailTemplates';

type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  ipFamily: 0 | 4 | 6;
  enablePort25Fallback: boolean;
};

function cleanEnvValue(raw: unknown): string {
  let v = String(raw ?? '').trim();
  // Avoid broken values when env got serialized with newlines.
  v = v.replaceAll('\r', ' ').replaceAll('\n', ' ').trim();
  // Strip wrapping quotes if present (common when secrets include quotes but we also quote in .env).
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1).trim();
  }
  return v;
}

function parseBool(raw: string | undefined, fallback: boolean): boolean {
  const v = (raw ?? '').trim().toLowerCase();
  if (!v) return fallback;
  if (['1', 'true', 'yes', 'y', 'on'].includes(v)) return true;
  if (['0', 'false', 'no', 'n', 'off'].includes(v)) return false;
  return fallback;
}

function parseIpFamily(raw: unknown): 0 | 4 | 6 {
  const v = String(raw ?? '').trim();
  if (!v) return 4; // Default to IPv4 to avoid IPv6-first timeouts on many VPS.
  if (v === '0') return 0;
  if (v === '4') return 4;
  if (v === '6') return 6;
  return 4;
}

function parseBoolOr(raw: unknown, fallback: boolean): boolean {
  return parseBool(typeof raw === 'string' ? raw : undefined, fallback);
}

function readSmtpConfigFromEnv(env: NodeJS.ProcessEnv): SmtpConfig {
  const host = cleanEnvValue(env.SMTP_HOST);
  const portRaw = cleanEnvValue(env.SMTP_PORT);
  const port = portRaw ? Number(portRaw) : NaN;
  const secure = parseBool(env.SMTP_SECURE, port === 465);
  const user = cleanEnvValue(env.SMTP_USER);
  const pass = cleanEnvValue(env.SMTP_PASS);
  const from = cleanEnvValue(env.MAIL_FROM);
  const ipFamily = parseIpFamily(env.SMTP_IP_FAMILY);
  const enablePort25Fallback = parseBoolOr(env.SMTP_ENABLE_PORT25_FALLBACK, false);

  if (!host) throw new Error('SMTP_HOST is required');
  if (!portRaw || !Number.isFinite(port)) throw new Error('SMTP_PORT must be a number');
  if (!user) throw new Error('SMTP_USER is required');
  if (!pass) throw new Error('SMTP_PASS is required');
  if (!from) throw new Error('MAIL_FROM is required');

  return { host, port, secure, user, pass, from, ipFamily, enablePort25Fallback };
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(message)), timeoutMs);
    promise.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

function serializeMailError(err: unknown): Record<string, unknown> {
  if (!err || typeof err !== 'object') return { message: String(err) };
  const e = err as any;
  return {
    name: typeof e.name === 'string' ? e.name : undefined,
    message: typeof e.message === 'string' ? e.message : String(err),
    code: typeof e.code === 'string' ? e.code : undefined,
    command: typeof e.command === 'string' ? e.command : undefined,
    responseCode: typeof e.responseCode === 'number' ? e.responseCode : undefined,
    response: typeof e.response === 'string' ? e.response : undefined,
    errno: typeof e.errno === 'number' ? e.errno : undefined,
    syscall: typeof e.syscall === 'string' ? e.syscall : undefined,
    address: typeof e.address === 'string' ? e.address : undefined,
    port: typeof e.port === 'number' ? e.port : undefined,
  };
}

export async function sendMail(params: { to: string } & RenderedEmail): Promise<{ messageId?: string }> {
  const to = params.to.trim();
  if (!to) throw new Error('Missing "to"');

  const cfg = readSmtpConfigFromEnv(process.env);
  const connectionTimeoutMs = 10_000;
  const greetingTimeoutMs = 10_000;
  const socketTimeoutMs = 20_000;
  const makeTransport = (overrides?: Partial<Pick<SmtpConfig, 'port' | 'secure'>>) =>
    nodemailer.createTransport({
      host: cfg.host,
      port: overrides?.port ?? cfg.port,
      secure: overrides?.secure ?? cfg.secure,
      auth: { user: cfg.user, pass: cfg.pass },
      connectionTimeout: connectionTimeoutMs,
      greetingTimeout: greetingTimeoutMs,
      socketTimeout: socketTimeoutMs,
      // Force IPv4 by default (see SMTP_IP_FAMILY) — fixes common VPS IPv6 routing issues.
      family: cfg.ipFamily === 0 ? undefined : cfg.ipFamily,
    } as SMTPTransport.Options);

  const startedAt = Date.now();
  const attempt = async (label: string, overrides?: Partial<Pick<SmtpConfig, 'port' | 'secure'>>) => {
    const port = overrides?.port ?? cfg.port;
    const secure = overrides?.secure ?? cfg.secure;
    // eslint-disable-next-line no-console
    console.log(
      `[mail] sending(${label}) host=${cfg.host} port=${port} secure=${secure} family=${cfg.ipFamily} user=${cfg.user} from="${cfg.from}" to="${to}"`,
    );
    const transporter = makeTransport(overrides);
    try {
      return await withTimeout(
        transporter.sendMail({
          from: cfg.from,
          to,
          subject: params.subject,
          text: params.text,
          html: params.html,
        }),
        30_000,
        'SMTP send timed out',
      );
    } finally {
      // Best-effort: ensure sockets are closed even when withTimeout triggers.
      try {
        transporter.close();
      } catch {
        // ignore
      }
    }
  };

  try {
    const info = await attempt('primary');
    const durationMs = Date.now() - startedAt;
    // eslint-disable-next-line no-console
    console.log(`[mail] sent (duration=${durationMs}ms) messageId=${info.messageId ?? '-'}`);
    return { messageId: info.messageId };
  } catch (err: unknown) {
    // eslint-disable-next-line no-console
    console.error(`[mail] send failed (primary)`, serializeMailError(err));

    const e = err as any;
    const code = typeof e?.code === 'string' ? e.code : '';
    const isConnError = code === 'ETIMEDOUT' || code === 'ECONNREFUSED' || code === 'EHOSTUNREACH' || code === 'ENETUNREACH';
    const canFallback = isConnError && ((cfg.port === 465 && cfg.secure === true) || (cfg.port === 587 && cfg.secure === false));
    if (!canFallback) throw err;

    const fallbacks: Array<{ label: string; port: number; secure: boolean }> = [];
    if (cfg.port === 465) fallbacks.push({ label: 'fallback', port: 587, secure: false });
    if (cfg.port === 587) fallbacks.push({ label: 'fallback', port: 465, secure: true });
    if (cfg.enablePort25Fallback) fallbacks.push({ label: 'fallback25', port: 25, secure: false });

    let lastErr: unknown = null;
    for (const fb of fallbacks) {
      try {
        const info2 = await attempt(fb.label, { port: fb.port, secure: fb.secure });
        const durationMs = Date.now() - startedAt;
        // eslint-disable-next-line no-console
        console.log(`[mail] sent via ${fb.label} (duration=${durationMs}ms) messageId=${info2.messageId ?? '-'}`);
        return { messageId: info2.messageId };
      } catch (e2) {
        lastErr = e2;
        const durationMs = Date.now() - startedAt;
        // eslint-disable-next-line no-console
        console.error(`[mail] send failed (${fb.label}) (duration=${durationMs}ms)`, serializeMailError(e2));
      }
    }
    throw lastErr || err;
  }
}


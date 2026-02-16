import nodemailer from 'nodemailer';

import type { RenderedEmail } from './mailTemplates';

type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
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

function readSmtpConfigFromEnv(env: NodeJS.ProcessEnv): SmtpConfig {
  const host = cleanEnvValue(env.SMTP_HOST);
  const portRaw = cleanEnvValue(env.SMTP_PORT);
  const port = portRaw ? Number(portRaw) : NaN;
  const secure = parseBool(env.SMTP_SECURE, port === 465);
  const user = cleanEnvValue(env.SMTP_USER);
  const pass = cleanEnvValue(env.SMTP_PASS);
  const from = cleanEnvValue(env.MAIL_FROM);

  if (!host) throw new Error('SMTP_HOST is required');
  if (!portRaw || !Number.isFinite(port)) throw new Error('SMTP_PORT must be a number');
  if (!user) throw new Error('SMTP_USER is required');
  if (!pass) throw new Error('SMTP_PASS is required');
  if (!from) throw new Error('MAIL_FROM is required');

  return { host, port, secure, user, pass, from };
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
  const transportTimeoutMs = 10_000;
  const makeTransport = (overrides?: Partial<Pick<SmtpConfig, 'port' | 'secure'>>) =>
    nodemailer.createTransport({
      host: cfg.host,
      port: overrides?.port ?? cfg.port,
      secure: overrides?.secure ?? cfg.secure,
      auth: { user: cfg.user, pass: cfg.pass },
      connectionTimeout: transportTimeoutMs,
      greetingTimeout: transportTimeoutMs,
      socketTimeout: transportTimeoutMs,
    });

  const startedAt = Date.now();
  const attempt = async (label: string, overrides?: Partial<Pick<SmtpConfig, 'port' | 'secure'>>) => {
    const port = overrides?.port ?? cfg.port;
    const secure = overrides?.secure ?? cfg.secure;
    // eslint-disable-next-line no-console
    console.log(`[mail] sending(${label}) host=${cfg.host} port=${port} secure=${secure} user=${cfg.user} from="${cfg.from}" to="${to}"`);
    const transporter = makeTransport(overrides);
    return await withTimeout(
      transporter.sendMail({
        from: cfg.from,
        to,
        subject: params.subject,
        text: params.text,
        html: params.html,
      }),
      15_000,
      'SMTP send timed out',
    );
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

    try {
      const fallback = cfg.port === 465 ? { port: 587, secure: false } : { port: 465, secure: true };
      const info2 = await attempt('fallback', fallback);
      const durationMs = Date.now() - startedAt;
      // eslint-disable-next-line no-console
      console.log(`[mail] sent via fallback (duration=${durationMs}ms) messageId=${info2.messageId ?? '-'}`);
      return { messageId: info2.messageId };
    } catch (err2) {
      const durationMs = Date.now() - startedAt;
      // eslint-disable-next-line no-console
      console.error(`[mail] send failed (fallback) (duration=${durationMs}ms)`, serializeMailError(err2));
      throw err;
    }
  }
}


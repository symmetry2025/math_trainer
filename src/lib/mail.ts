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

function parseBool(raw: string | undefined, fallback: boolean): boolean {
  const v = (raw ?? '').trim().toLowerCase();
  if (!v) return fallback;
  if (['1', 'true', 'yes', 'y', 'on'].includes(v)) return true;
  if (['0', 'false', 'no', 'n', 'off'].includes(v)) return false;
  return fallback;
}

function readSmtpConfigFromEnv(env: NodeJS.ProcessEnv): SmtpConfig {
  const host = String(env.SMTP_HOST ?? '').trim();
  const portRaw = String(env.SMTP_PORT ?? '').trim();
  const port = portRaw ? Number(portRaw) : NaN;
  const secure = parseBool(env.SMTP_SECURE, port === 465);
  const user = String(env.SMTP_USER ?? '').trim();
  const pass = String(env.SMTP_PASS ?? '').trim();
  const from = String(env.MAIL_FROM ?? '').trim();

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
  const transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.pass },
    connectionTimeout: transportTimeoutMs,
    greetingTimeout: transportTimeoutMs,
    socketTimeout: transportTimeoutMs,
  });

  const startedAt = Date.now();
  try {
    // eslint-disable-next-line no-console
    console.log(`[mail] sending host=${cfg.host} port=${cfg.port} secure=${cfg.secure} user=${cfg.user} from="${cfg.from}" to="${to}"`);
    const info = await withTimeout(
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
    const durationMs = Date.now() - startedAt;
    // eslint-disable-next-line no-console
    console.log(`[mail] sent (duration=${durationMs}ms) messageId=${info.messageId ?? '-'}`);
    return { messageId: info.messageId };
  } catch (err) {
    const durationMs = Date.now() - startedAt;
    // eslint-disable-next-line no-console
    console.error(`[mail] send failed (duration=${durationMs}ms)`, serializeMailError(err));
    throw err;
  }
}


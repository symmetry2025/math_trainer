'use client';

import { useEffect, useState } from 'react';
import { Copy } from 'lucide-react';

import { AuthStartLinkTokenRequestDtoSchema, AuthStartLinkTokenResponseDtoSchema } from '@smmtry/shared';

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object';
}

export default function TelegramLinkPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<{ startParam: string; expiresAt: string } | null>(null);
  const [botUsername, setBotUsername] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch('/api/public-config', { method: 'GET', credentials: 'include', cache: 'no-store' });
      const body: unknown = await res.json().catch(() => null);
      if (cancelled) return;
      const username =
        isRecord(body) && typeof body.telegramBotUsername === 'string'
          ? String(body.telegramBotUsername).trim()
          : isRecord(body) && body.telegramBotUsername === null
            ? ''
            : '';
      setBotUsername(username);
    })().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const tgLink = token && botUsername ? `https://t.me/${encodeURIComponent(botUsername)}?startapp=${encodeURIComponent(token.startParam)}` : null;

  const start = async () => {
    setError(null);
    setBusy(true);
    setToken(null);
    try {
      const payload = AuthStartLinkTokenRequestDtoSchema.parse({ provider: 'telegram' });
      const res = await fetch('/api/auth/link-token', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(payload),
      });
      const body: unknown = await res.json().catch(() => null);
      if (!res.ok) throw new Error((isRecord(body) && typeof body.error === 'string' ? body.error : null) || 'request_failed');
      const parsed = AuthStartLinkTokenResponseDtoSchema.safeParse(body);
      if (!parsed.success) throw new Error('invalid_response');
      setToken({ startParam: parsed.data.startParam, expiresAt: parsed.data.expiresAt });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    const v = String(token?.startParam || '').trim();
    if (!v) return;
    try {
      await window.navigator.clipboard?.writeText(v);
    } catch {
      // ignore
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 md:p-10">
      <div className="card-elevated p-6 md:p-8 max-w-md w-full space-y-4">
        <div>
          <div className="text-lg font-bold">Привязка Telegram</div>
          <div className="text-sm text-muted-foreground">Сгенерируй одноразовый код и открой mini‑app в Telegram</div>
        </div>

        {error ? <div className="text-sm text-destructive">{error}</div> : null}

        <button type="button" className="btn-primary" onClick={start} disabled={busy}>
          {busy ? 'Генерирую…' : 'Сгенерировать код'}
        </button>

        {token ? (
          <div className="space-y-3">
            <div>
              <div className="text-sm font-semibold">Код</div>
              <div className="text-xs text-muted-foreground">Срок действия до: {new Date(token.expiresAt).toLocaleString()}</div>
            </div>

            <div className="flex items-center gap-2">
              <input
                readOnly
                value={token.startParam}
                className="h-10 flex-1 rounded-2xl border border-input bg-background px-3 py-2 text-sm font-mono"
              />
              <button type="button" className="btn-secondary" onClick={copy} title="Копировать">
                <Copy className="w-4 h-4" />
              </button>
            </div>

            {tgLink ? (
              <a className="btn-secondary inline-flex items-center justify-center" href={tgLink} target="_blank" rel="noreferrer">
                Открыть Telegram
              </a>
            ) : (
              <div className="text-xs text-muted-foreground">
                Укажи переменную <span className="font-mono">NEXT_PUBLIC_TELEGRAM_BOT_USERNAME</span>, чтобы сформировать кнопку открытия.
              </div>
            )}

            <div className="text-xs text-muted-foreground">
              В Telegram mini‑app должен открыться по ссылке <span className="font-mono">/tg</span> и передать этот код как{' '}
              <span className="font-mono">start_param</span>.
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}


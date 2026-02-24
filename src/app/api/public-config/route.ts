import { NextResponse } from 'next/server';

function cleanEnvValue(raw: unknown): string {
  let v = String(raw ?? '').trim();
  v = v.replaceAll('\r', ' ').replaceAll('\n', ' ').trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1).trim();
  return v;
}

export async function GET() {
  // Only public, non-secret config is allowed here.
  const telegramBotUsername = cleanEnvValue(process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME);
  return NextResponse.json({
    ok: true,
    telegramBotUsername: telegramBotUsername || null,
  });
}


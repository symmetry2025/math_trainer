import { randomBytes, createHash } from 'node:crypto';
import { cookies } from 'next/headers';
import type { Role, User } from '@prisma/client';

import { prisma } from './db';

export const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || 'smmtry_trainer_sess';
const TTL_DAYS = Number(process.env.AUTH_SESSION_TTL_DAYS || '30');

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function newToken(): string {
  return randomBytes(32).toString('hex');
}

export function getSessionCookieValue(): string | null {
  return cookies().get(AUTH_COOKIE_NAME)?.value ?? null;
}

export async function getCurrentUserOrNull(): Promise<(Pick<User, 'id' | 'email' | 'role' | 'displayName' | 'emailVerifiedAt'>) | null> {
  const token = getSessionCookieValue();
  if (!token) return null;
  const tokenHash = hashToken(token);
  let sess: any = null;
  try {
    sess = await prisma.session.findUnique({
      where: { tokenHash },
      include: { user: { select: { id: true, email: true, role: true, displayName: true, emailVerifiedAt: true } } },
    });
  } catch {
    // If DB is restarting/recovering, treat as "not logged in" (avoid 500 across the app).
    return null;
  }
  if (!sess) return null;
  if (sess.expiresAt.getTime() <= Date.now()) return null;
  return sess.user;
}

export function expiresAtFromNow(): Date {
  return new Date(Date.now() + TTL_DAYS * 24 * 60 * 60 * 1000);
}


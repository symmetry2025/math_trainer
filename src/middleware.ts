import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const COOKIE = process.env.AUTH_COOKIE_NAME || 'smmtry_trainer_sess';
const REF_COOKIE = process.env.REF_COOKIE_NAME || 'smmtry_ref';
const REF_TTL_DAYS = Number(process.env.REF_COOKIE_TTL_DAYS || '90');

function normalizeRefCode(v: string | null): string {
  const s = String(v || '').trim();
  if (!s) return '';
  // allow simple URL-safe codes only (avoid garbage in cookies)
  if (!/^[a-zA-Z0-9_-]{2,64}$/.test(s)) return '';
  return s;
}

function withRefCookieIfNeeded(req: NextRequest, res: NextResponse): NextResponse {
  const refRaw = req.nextUrl.searchParams.get('ref');
  const ref = normalizeRefCode(refRaw);
  if (!ref) return res;
  if (req.cookies.get(REF_COOKIE)?.value) return res; // first-touch: never overwrite

  const maxAgeDays = Number.isFinite(REF_TTL_DAYS) ? Math.max(1, Math.trunc(REF_TTL_DAYS)) : 90;
  res.cookies.set({
    name: REF_COOKIE,
    value: ref,
    httpOnly: true,
    sameSite: 'lax',
    secure: req.nextUrl.protocol === 'https:',
    path: '/',
    maxAge: maxAgeDays * 24 * 60 * 60,
  });
  return res;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Public routes
  if (
    pathname === '/' ||
    pathname === '/max' ||
    pathname === '/tg' ||
    pathname.startsWith('/tg-link') ||
    pathname.startsWith('/link/provider') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next')
  ) {
    return withRefCookieIfNeeded(req, NextResponse.next());
  }

  // Protected app routes (no /app prefix)
  const isProtected =
    /^\/(addition|subtraction|multiplication|division)(\/|$)/.test(pathname) ||
    /^\/class-\d+\/(addition|subtraction|multiplication|division)(\/|$)/.test(pathname) ||
    pathname === '/home' ||
    pathname === '/settings' ||
    pathname === '/billing' ||
    pathname === '/promoter' ||
    pathname === '/admin' ||
    pathname.startsWith('/admin/') ||
    pathname === '/progress' ||
    pathname.startsWith('/progress/');

  if (!isProtected) return withRefCookieIfNeeded(req, NextResponse.next());

  const token = req.cookies.get(COOKIE)?.value;
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return withRefCookieIfNeeded(req, NextResponse.redirect(url));
  }
  return withRefCookieIfNeeded(req, NextResponse.next());
}

export const config = {
  matcher: ['/:path*'],
};


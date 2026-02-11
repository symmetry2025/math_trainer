import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const COOKIE = process.env.AUTH_COOKIE_NAME || 'smmtry_trainer_sess';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Public routes
  if (pathname === '/' || pathname.startsWith('/login') || pathname.startsWith('/api') || pathname.startsWith('/_next')) {
    return NextResponse.next();
  }

  // Protected app routes (no /app prefix)
  const isProtected =
    pathname === '/addition' ||
    pathname.startsWith('/addition/') ||
    pathname === '/multiplication' ||
    pathname.startsWith('/multiplication/') ||
    pathname === '/division' ||
    pathname.startsWith('/division/') ||
    pathname === '/progress' ||
    pathname.startsWith('/progress/');

  if (!isProtected) return NextResponse.next();

  const token = req.cookies.get(COOKIE)?.value;
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/:path*'],
};


import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function decodeJwtPayload(token: string): Record<string, unknown> {
  try {
    const segment = token.split('.')[1];
    const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return {};
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isDashboard = pathname.startsWith('/dashboard');
  const isOrg = pathname.startsWith('/org');

  if (!isDashboard && !isOrg) return NextResponse.next();

  const token = request.cookies.get('access_token')?.value;

  if (!token) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  try {
    const payload = decodeJwtPayload(token);
    const exp = (payload.exp as number) ?? 0;

    // Expired — clear cookies and send to code entry
    if (Date.now() / 1000 > exp) {
      const res = NextResponse.redirect(new URL('/', request.url));
      res.cookies.delete('access_token');
      res.cookies.delete('refresh_token');
      return res;
    }

    const tokenType = payload.type as string;

    // Org routes require org-type JWT
    if (isOrg && tokenType !== 'org') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // Dashboard routes require gym-type JWT
    if (isDashboard && tokenType === 'org') {
      return NextResponse.redirect(new URL('/org', request.url));
    }

    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL('/', request.url));
  }
}

export const config = {
  matcher: ['/dashboard/:path*', '/org/:path*'],
};

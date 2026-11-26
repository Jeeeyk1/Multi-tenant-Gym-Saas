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

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

function redirectToLogin(request: NextRequest): NextResponse {
  const res = NextResponse.redirect(new URL('/', request.url));
  res.cookies.delete('access_token');
  res.cookies.delete('refresh_token');
  return res;
}

async function tryRefresh(
  refreshToken: string,
): Promise<{ accessToken: string; refreshToken: string } | null> {
  try {
    const apiUrl = process.env.API_URL ?? 'http://localhost:9001';
    const res = await fetch(`${apiUrl}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return null;
    return res.json() as Promise<{ accessToken: string; refreshToken: string }>;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isDashboard = pathname.startsWith('/dashboard');
  const isOrg = pathname.startsWith('/org');

  const token = request.cookies.get('access_token')?.value;

  if (!token) return redirectToLogin(request);

  try {
    const payload = decodeJwtPayload(token);
    const exp = (payload.exp as number) ?? 0;

    if (Date.now() / 1000 > exp) {
      const refreshToken = request.cookies.get('refresh_token')?.value;

      if (refreshToken) {
        const newTokens = await tryRefresh(refreshToken);
        if (newTokens) {
          const preserved = request.cookies
            .getAll()
            .filter((c) => c.name !== 'access_token' && c.name !== 'refresh_token')
            .map((c) => `${c.name}=${c.value}`)
            .join('; ');
          const newCookieHeader = [
            preserved,
            `access_token=${newTokens.accessToken}`,
            `refresh_token=${newTokens.refreshToken}`,
          ]
            .filter(Boolean)
            .join('; ');

          const response = NextResponse.next({
            request: {
              headers: new Headers({
                ...Object.fromEntries(request.headers),
                cookie: newCookieHeader,
              }),
            },
          });
          response.cookies.set('access_token', newTokens.accessToken, COOKIE_OPTS);
          response.cookies.set('refresh_token', newTokens.refreshToken, COOKIE_OPTS);
          return response;
        }
      }

      return redirectToLogin(request);
    }

    const tokenType = payload.type as string;

    if (isOrg && tokenType !== 'org') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    if (isDashboard && tokenType === 'org') {
      return NextResponse.redirect(new URL('/org', request.url));
    }

    return NextResponse.next();
  } catch {
    return redirectToLogin(request);
  }
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/org/:path*',
  ],
};

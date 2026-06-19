import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Subdomains that are never treated as gym slugs.
const RESERVED_SUBDOMAINS = new Set([
  'www', 'admin', 'api', 'app', 'landing', 'mail', 'smtp', 'status',
]);

function decodeJwtPayload(token: string): Record<string, unknown> {
  try {
    const segment = token.split('.')[1];
    const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return {};
  }
}

/**
 * Returns the gym/org slug if the request is coming from a known subdomain,
 * e.g. "onefitness" from "onefitness.lifthub.app".
 * Returns null for the root domain or reserved subdomains.
 */
function extractGymSlug(request: NextRequest): string | null {
  const appHost = (process.env.APP_HOST ?? 'lifthub.app').toLowerCase();
  const hostname = request.headers.get('host')?.split(':')[0]?.toLowerCase() ?? '';

  if (!hostname.endsWith(`.${appHost}`)) return null;

  const sub = hostname.slice(0, -(appHost.length + 1));
  if (!sub || RESERVED_SUBDOMAINS.has(sub)) return null;

  return sub.toUpperCase(); // gym codes are uppercase
}

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

function redirectToLogin(request: NextRequest, slug: string | null): NextResponse {
  const target = slug ? `/${slug}/login` : '/';
  const res = NextResponse.redirect(new URL(target, request.url));
  res.cookies.delete('access_token');
  res.cookies.delete('refresh_token');
  return res;
}

async function tryRefresh(
  refreshToken: string,
): Promise<{ accessToken: string; refreshToken: string } | null> {
  try {
    const apiUrl = process.env.API_URL ?? 'http://localhost:3000';
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
  const gymSlug = extractGymSlug(request);

  // ── Subdomain root redirect ──────────────────────────────────────────────
  // onefitness.lifthub.app/ → /ONEFITNESS/login (skip code-entry screen)
  if (gymSlug && pathname === '/') {
    return NextResponse.rewrite(new URL(`/${gymSlug}/login`, request.url));
  }

  // ── Protected route guard ────────────────────────────────────────────────
  const isDashboard = pathname.startsWith('/dashboard');
  const isOrg = pathname.startsWith('/org');

  if (!isDashboard && !isOrg) return NextResponse.next();

  const token = request.cookies.get('access_token')?.value;

  if (!token) return redirectToLogin(request, gymSlug);

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

      return redirectToLogin(request, gymSlug);
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
    return redirectToLogin(request, gymSlug);
  }
}

export const config = {
  matcher: [
    '/',
    '/dashboard/:path*',
    '/org/:path*',
  ],
};

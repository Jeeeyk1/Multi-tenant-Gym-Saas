# Subdomain Routing

## What it does

Gym staff and owners can access their dashboard via a custom subdomain:

```
onefitness.lifthub.app  →  /ONEFITNESS/login  →  /dashboard
```

Instead of visiting `lifthub.app`, entering a code, then logging in — they just go directly to their subdomain and see their gym's branded login page.

The root domain `lifthub.app` continues to work as before (generic code entry).

---

## How it works

`apps/web/src/middleware.ts` reads the `host` header on every request.

If the host is `{slug}.lifthub.app` and the slug is not reserved:
- Requests to `/` are internally rewritten to `/{SLUG}/login`
- The login page (`app/[code]/login/page.tsx`) fetches gym branding from `POST /auth/resolve-code` when no branding query params are present (subdomain flow)

Protected routes (`/dashboard`, `/org`) continue to validate the access token as normal.

---

## Reserved subdomains

These slugs are never treated as gym codes:

```
www, admin, api, app, landing, mail, smtp, status
```

Add new ones to `RESERVED_SUBDOMAINS` in `middleware.ts` as needed.

---

## Production setup (Vercel + Cloudflare)

### 1. DNS — Add wildcard record in Cloudflare

```
Type:  CNAME
Name:  *
Value: cname.vercel-dns.com  (or your Vercel CNAME)
TTL:   Auto
Proxy: DNS only (grey cloud) — Vercel needs to provision the SSL cert
```

### 2. Vercel — Add wildcard domain

In the Vercel project settings → Domains:
1. Add `*.lifthub.app`
2. Vercel provisions a wildcard SSL cert automatically

### 3. Environment variable

In Vercel project settings → Environment Variables:
```
APP_HOST=lifthub.app
```

---

## Local development

Subdomains don't resolve on `localhost`. Use `lvh.me` instead — it resolves all subdomains to `127.0.0.1`.

1. In `apps/web/.env.local`:
```
APP_HOST=lvh.me
```

2. Start the web app:
```bash
pnpm --filter @gym-saas/web dev
```

3. Access via subdomain in browser:
```
http://onefitness.lvh.me:3010
```

This simulates `onefitness.lifthub.app` locally.

---

## Future: gymCode in JWT

Currently the middleware cannot validate that the authenticated user's JWT belongs to the subdomain's gym. Tenant isolation is enforced by the API (the JWT's `gymId` controls what data is returned), but a user with a valid JWT for gym A could browse `gymb.lifthub.app` and see gym A's data.

To fix this properly: add `gymCode` and `gymName` to the gym-type JWT payload in `GymLoginUseCase` and `RefreshTokenUseCase`. The middleware can then compare `payload.gymCode` to the extracted subdomain and redirect if they don't match.

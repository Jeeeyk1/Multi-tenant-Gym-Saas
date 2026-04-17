# @gym-saas/web

Next.js 15 web application for the Gym SaaS platform.

## Local development

```bash
# From the repo root:
pnpm dev:web

# Or from this directory:
pnpm dev
```

App runs at `http://localhost:3000`.

## Environment

Copy `.env.example` to `.env.local` and adjust as needed.

| Variable               | Description         |
|------------------------|---------------------|
| `NEXT_PUBLIC_API_URL`  | Base URL for the API |

## Workspace packages

The web app consumes:
- `@gym-saas/contracts` — shared request/response types
- `@gym-saas/utils` — shared utilities
- `@gym-saas/ui` — shared React components (future)

`next.config.ts` transpiles these packages so Next.js can process their source.

## Build

```bash
pnpm build   # next build
pnpm start   # next start
```

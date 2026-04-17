# @gym-saas/api

NestJS REST API for the Gym SaaS platform.

## Local development

```bash
# From the repo root, start only the API:
pnpm dev:api

# Or from this directory:
pnpm dev
```

API runs at `http://localhost:3001/api`.
Health endpoint: `GET /api/health`

## Environment

Copy `.env.example` to `.env` and adjust as needed.
Required variables: `DATABASE_URL`, `REDIS_URL`.

## Architecture

```
src/
  main.ts           Bootstrap, global pipes/filters/interceptors
  app.module.ts     Root module, config validation
  config/           Typed config namespaces (app, database, redis)
  common/
    filters/        GlobalExceptionFilter — catches all unhandled exceptions
    interceptors/   LoggingInterceptor — logs method, path, duration
  modules/
    health/         GET /health — terminus memory check
```

Future feature modules follow the layered pattern:

```
modules/<feature>/
  application/    Use cases, commands, queries
  domain/         Entities, value objects, domain services
  infrastructure/ Repositories, external adapters (Prisma, Redis, …)
  presentation/   Controllers, DTOs, guards
```

## Build

```bash
pnpm build   # nest build → dist/
pnpm start   # node dist/main
```

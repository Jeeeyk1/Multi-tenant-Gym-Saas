# Gym SaaS — Monorepo

Multi-tenant gym management platform.

## Stack

| Layer     | Technology                       |
|-----------|----------------------------------|
| Monorepo  | pnpm workspaces + Turborepo      |
| API       | NestJS + Prisma + PostgreSQL     |
| Web       | Next.js 15 (App Router)          |
| Mobile    | Expo 51 (expo-router)            |
| Cache     | Redis                            |
| Local dev | Docker Compose                   |

## Prerequisites

- Node.js ≥ 20
- pnpm ≥ 9 (`npm install -g pnpm`)
- Docker Desktop

## First-time setup

```bash
# 1. Clone and install dependencies
pnpm install

# 2. Set up environment variables
cp .env.example .env
# Edit .env if you need non-default credentials

# 3. Start PostgreSQL and Redis
pnpm docker:up

# 4. Wait for services to be healthy, then run migrations
pnpm db:migrate

# 5. (Optional) Load development seed data
pnpm db:seed

# 6. Generate the Prisma client
pnpm prisma:generate

# 7. Start API + web in watch mode
pnpm dev
```

The API will be available at `http://localhost:3001/api`.
The web app will be available at `http://localhost:3000`.
Health check: `http://localhost:3001/api/health`.

## Development

```bash
pnpm dev           # API + web (watch mode)
pnpm dev:mobile    # Expo (opens Metro)
pnpm dev:all       # All apps + packages in watch mode
pnpm build         # Build everything (respects turbo dependency order)
pnpm typecheck     # TypeScript check across all packages
pnpm lint          # ESLint across all packages
```

## Docker services

```bash
pnpm docker:up     # Start postgres + redis in background
pnpm docker:down   # Stop all services
pnpm docker:logs   # Tail service logs
```

PostgreSQL is exposed on `localhost:5432`.
Redis is exposed on `localhost:6379`.

## Database workflow

```bash
pnpm db:migrate    # Apply new SQL migrations
pnpm db:seed       # Apply seed files (idempotent)
pnpm db:reset      # migrate + seed
```

### Migration strategy

This project uses **SQL-first migrations alongside Prisma**.

- `db/migrations/*.sql` — canonical migration history. Files are applied in
  lexical order by `db/scripts/apply-migrations.ts` using the `pg` client. A
  `schema_migrations` table tracks which files have been applied.
- `prisma/schema.prisma` — mirrors the current schema and is used **only** for
  generating the Prisma client (`pnpm prisma:generate`). Prisma Migrate is not
  used.

**When adding a model or column:**
1. Write a new `db/migrations/<version>_<name>.sql`
2. Run `pnpm db:migrate`
3. Mirror the change in `prisma/schema.prisma`
4. Run `pnpm prisma:generate`

## Project structure

```
apps/
  api/        NestJS — layered architecture (common/, config/, modules/)
  web/        Next.js 15 — App Router
  mobile/     Expo 51 — expo-router
packages/
  contracts/  Shared request/response types
  sdk/        Typed API client stub
  config/     Shared config utilities
  ui/         Shared React component library
  utils/      Shared utility functions
db/
  migrations/ SQL migration files (applied in order)
  seeds/      SQL seed files (idempotent, local dev only)
  scripts/    apply-migrations.ts, apply-seeds.ts
prisma/
  schema.prisma
docker-compose.yml
```

## Adding a new API feature module

Feature modules follow a layered structure:

```
src/modules/<feature>/
  application/    Use cases, commands, queries
  domain/         Entities, value objects, domain services
  infrastructure/ Repositories, external adapters
  presentation/   Controllers, DTOs
```

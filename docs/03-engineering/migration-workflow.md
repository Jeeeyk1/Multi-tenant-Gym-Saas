
---

# `docs/03-engineering/migration-workflow.md`

```md
# Database Migration Workflow

This project uses a **SQL-first migration strategy** with Prisma for typed access.

---

## Core principle

- SQL files are the **source of truth** for schema changes
- Prisma is used for:
  - typed queries
  - developer productivity
- Prisma does NOT replace SQL migrations

---

## Folder structure

```text
db/
  migrations/
  seeds/
  scripts/

Migrations
Location
text


db/migrations/
Naming convention
text


0001_init.sql
0002_create_users.sql
0003_create_organizations.sql
Rules:

sequential
descriptive
immutable once applied
Creating a migration
Create a new SQL file:
bash


db/migrations/000X_description.sql
Write SQL explicitly:
CREATE TABLE
ALTER TABLE
CREATE INDEX
ADD CONSTRAINT
Run:
bash


pnpm db:migrate
Migration rules
never edit old migration files
always create a new migration
keep migrations idempotent where possible
test locally before committing
Seeds
Location
text


db/seeds/
Purpose
Seed required data:

roles
permissions
plans
base config
Run seeds
bash


pnpm db:seed
Prisma alignment
After schema changes:

update SQL migration
apply migration
update prisma/schema.prisma
run:
bash


pnpm prisma:generate
Prisma must reflect actual DB schema.

Reset database
bash


pnpm db:reset
pnpm db:migrate
pnpm db:seed
Transactions
Use transactions when:

multiple writes must succeed together
consistency is required
Important constraints
Check-in guard
Prevent multiple active check-ins:

sql


CREATE UNIQUE INDEX ux_checkins_member_active
ON check_ins(member_id)
WHERE checked_out_at IS NULL;
Do's
keep migrations small and focused
add indexes early for hot queries
use explicit constraints
review SQL carefully
Don'ts
don't rely only on ORM schema changes
don't modify applied migrations
don't skip writing SQL
don't leave schema inconsistencies
Goal
A new developer should be able to:

clone repo
run docker
run migrations
run seeds
and have a fully working database without manual steps.
## Schema drift check (CI)

CI applies every file in `db/migrations` to an empty Postgres 16, then runs `pnpm db:check-drift`
(`db/scripts/check-schema-drift.ts`).

**What it checks:** that each table and column in `prisma/schema.prisma` exists in the migrated database with
the same nullability, and that the database has no tables or columns Prisma doesn't know about.

**Typical failures:** a column added to `schema.prisma` without a SQL migration, or a migration that changed
a column Prisma still describes the old way.

**Run it locally:** point `DATABASE_URL` at a database that has just had `pnpm db:migrate` applied, then run
`pnpm db:check-drift`.

**Not covered yet:** CHECK constraints that list enum values (the bug class fixed in `0041`). When adding a
value to a status enum, still grep `db/migrations/` for that column's CHECK constraint and update it in the same PR.

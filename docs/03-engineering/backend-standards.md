
---

# `docs/03-engineering/backend-standards.md`

```md
# Backend Coding Standards

This document defines how backend code should be written.

---

## Core principles

- clarity over cleverness
- small focused units
- explicit behavior
- consistent structure
- easy to test

---

## Naming

Use clear, direct names:

- CreateMemberUseCase
- MemberRepository
- MembersController
- MemberResponseDto

Avoid:
- Manager
- Handler
- Processor
- Generic names

---

## Use cases

- one class = one action
- one public method = execute()

Example:
- CreateMemberUseCase
- RenewMembershipUseCase

---

## Controllers

Controllers must:
- be thin
- call use cases
- return DTOs

Never:
- contain business logic
- access DB directly

---

## DTOs

Use DTOs for:
- input validation
- output shaping

Use class-validator.

---

## Errors

Use domain-specific errors:

- MemberNotFoundError
- MembershipExpiredError

Map them in global exception filter.

---

## Logging

- log requests
- log errors
- avoid console.log in business code

---

## Transactions

Use transactions when:
- multiple tables are involved
- consistency is required

---

## Multi-tenancy

Always:
- scope by gym_id when required
- validate tenant context

Never:
- trust request body for tenant-sensitive data

---

## Database

- use Prisma for access
- use SQL for migrations
- avoid SELECT *
- select only needed fields

---

## `updated_at` strategy

Use **application-level updates**. No DB triggers.

Every repository method that modifies a row must explicitly set `updated_at`:

```typescript
await prisma.gymMember.update({
  where: { id },
  data: {
    status: 'EXPIRED',
    updatedAt: new Date(),
  },
});
```

Rules:
- always set `updatedAt: new Date()` in every `update()` and `updateMany()` call
- never rely on DB defaults to handle this automatically
- cron jobs that perform bulk updates must also include `updatedAt`
- this applies to all tables that have an `updated_at` column

---

## Testing

See `docs/03-engineering/testing.md` for the full testing strategy, patterns, and conventions.

Summary:
- Every use case gets a `.spec.ts` file
- Guards and the global exception filter get spec files
- Cron jobs get spec files
- Mock `PrismaService`, `JwtService`, `ConfigService`, `RedisService` — never instantiate real ones in unit tests
- Do not test NestJS wiring or DTO validation rules in unit tests

---

## Code organization

- keep files small
- avoid large services
- separate layers properly

---

## Comments

Write comments only when:
- logic is non-obvious
- business rules need explanation

Avoid obvious comments.

---

## Imports

- avoid cross-module deep imports
- respect boundaries

---

## Final rule

Code should be:
- easy to read
- easy to test
- easy to extend

If a new developer cannot quickly understand it, it needs improvement.

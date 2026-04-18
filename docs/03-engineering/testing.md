# Testing Standards

This document defines the testing strategy, patterns, and conventions for the Gym SaaS API.

---

## Philosophy

- Test behavior, not implementation details.
- A test should break when the behavior is wrong, not when the code is refactored.
- Write tests that you would trust to catch a production regression.
- Do not test NestJS wiring (decorators, module imports) — that is framework behavior. Test your logic.

---

## Test types

### Unit tests

Scope: a single class in isolation. All dependencies mocked.

Use for:
- Use cases (primary target — this is where business logic lives)
- Guards
- Exception filter
- Domain error classes
- Any pure business logic

Do NOT use for:
- Prisma queries in isolation (not meaningful without a real DB)
- DTO validation (covered by e2e)

### Integration / e2e tests

Out of scope for MVP phases. Add these after Phase 10 when the API is stable.

---

## File placement

Unit tests live next to the file they test:

```
src/modules/identity/application/use-cases/
  gym-login.use-case.ts
  gym-login.use-case.spec.ts       ← sits here
```

Guards and filters:

```
src/common/guards/
  jwt-auth.guard.ts
  jwt-auth.guard.spec.ts
src/common/filters/
  global-exception.filter.spec.ts
```

---

## What to test per module

### Every use case

Each use case gets a spec file. Test:

| Scenario | Description |
|---|---|
| Happy path | Returns the expected result when inputs are valid |
| Not found | Throws the appropriate DomainError when an entity doesn't exist |
| Forbidden | Throws ForbiddenError when gym scope doesn't match |
| Conflict | Throws ConflictError when a uniqueness constraint would be violated |
| Business rule | Each distinct business rule gets at least one test case |

### Guards

`JwtAuthGuard`:
- Valid Bearer token → returns true, sets `request.user`
- Missing token → throws UnauthorizedException
- Expired/invalid token → throws UnauthorizedException

`PermissionsGuard`:
- Route with no permissions declared → returns true (open to any authenticated user)
- Org-level token on a permissioned route → returns false
- Gym-level token with required permission → returns true
- Gym-level token missing required permission → returns false
- Multiple permissions required — all present → true
- Multiple permissions required — one missing → false

### GlobalExceptionFilter

- DomainError → correct statusCode + code field
- HttpException (NestJS) → maps status code, extracts message
- Unknown error → 500, hides details, logs error

### Cron jobs

- Job acquires lock → runs the work
- Lock already held → skips, no work done
- Job processes items in batches (verify batch size respected)
- Idempotency: running twice does not double-process

---

## Mocking patterns

### Mock PrismaService

Use a typed partial mock object. Never instantiate the real PrismaService in unit tests.

```typescript
const mockPrisma = {
  gymMember: {
    findUnique: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  },
} as unknown as PrismaService;
```

In the test module:

```typescript
const module = await Test.createTestingModule({
  providers: [
    GymLoginUseCase,
    { provide: PrismaService, useValue: mockPrisma },
  ],
}).compile();
```

### Mock JwtService

```typescript
const mockJwtService = {
  sign: jest.fn().mockReturnValue('signed-token'),
  verify: jest.fn(),
} as unknown as JwtService;
```

### Mock ConfigService

```typescript
const mockConfigService = {
  getOrThrow: jest.fn((key: string) => {
    const map: Record<string, string> = {
      'jwt.accessSecret': 'test-secret',
      'jwt.accessExpiresIn': '15m',
      'jwt.refreshSecret': 'test-refresh-secret',
      'jwt.refreshExpiresIn': '7d',
    };
    return map[key];
  }),
} as unknown as ConfigService;
```

### Mock RedisService

```typescript
const mockRedisService = {
  acquireLock: jest.fn().mockResolvedValue(true),
  releaseLock: jest.fn().mockResolvedValue(undefined),
  withLock: jest.fn().mockImplementation((_key, _ttl, fn) => fn()),
} as unknown as RedisService;
```

---

## Use case test structure

```typescript
describe('GymLoginUseCase', () => {
  let useCase: GymLoginUseCase;
  let prisma: typeof mockPrisma;

  beforeEach(async () => {
    // reset mocks between tests
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        GymLoginUseCase,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    useCase = module.get(GymLoginUseCase);
  });

  describe('execute', () => {
    it('returns tokens when credentials are valid', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(validUser);
      const result = await useCase.execute(validDto);
      expect(result.accessToken).toBeDefined();
    });

    it('throws UnauthorizedError when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(useCase.execute(validDto)).rejects.toThrow(UnauthorizedError);
    });

    it('throws UnauthorizedError when password is wrong', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(userWithWrongHash);
      await expect(useCase.execute(validDto)).rejects.toThrow(UnauthorizedError);
    });
  });
});
```

Key rules:
- `jest.clearAllMocks()` in `beforeEach` — never let mock state leak between tests
- Use `rejects.toThrow(SomeError)` to assert DomainErrors
- Keep arrange / act / assert clearly separated in each test
- Test one thing per `it` block

---

## Guard test structure

Guards do not use `Test.createTestingModule` — instantiate them directly.

```typescript
describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new PermissionsGuard(reflector);
  });

  function buildContext(user: AuthenticatedUser | undefined, permissions: string[]) {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(permissions);
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;
  }

  it('allows access when no permissions are required', () => {
    const ctx = buildContext(gymUser, []);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('denies access for org-level token on permissioned route', () => {
    const ctx = buildContext(orgUser, ['members.view']);
    expect(guard.canActivate(ctx)).toBe(false);
  });
});
```

---

## Naming conventions

| Test subject | File name |
|---|---|
| `GymLoginUseCase` | `gym-login.use-case.spec.ts` |
| `JwtAuthGuard` | `jwt-auth.guard.spec.ts` |
| `PermissionsGuard` | `permissions.guard.spec.ts` |
| `GlobalExceptionFilter` | `global-exception.filter.spec.ts` |
| `AutoCheckoutJob` | `auto-checkout.job.spec.ts` |

---

## What NOT to test

- NestJS module wiring (providers, imports, exports)
- That `@Get()` maps to the right path — that is NestJS behavior
- Prisma query correctness in isolation — test the use case behavior, not the ORM call shape
- DTO `class-validator` rules — tested implicitly in e2e

---

## Running tests

```bash
# run all unit tests
pnpm test

# run with watch mode
pnpm test:watch

# run with coverage
pnpm test:cov
```

These commands run from within `apps/api/`. The root `turbo.json` will add a `test` pipeline.

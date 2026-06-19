# Frontend Standards

Applies to: `apps/web`, `apps/admin`, `apps/landing`, `apps/mobile`

---

## 1. HTTP Requests — Always Use the Custom API Client

**Never use raw `fetch` or an ad-hoc `axios.create()` inside a component or page.**

Each app has a purpose-built axios instance with consistent error normalization. Always use it.

### Server components / server actions / route handlers

```ts
// apps/web/src/lib/api.ts
// apps/admin/src/lib/api.ts
import { api } from '@/lib/api';

const data = await api.get<Gym[]>('/v1/gyms');
await api.patch(`/v1/gyms/${id}/status`, { status: GymStatus.SUSPENDED });
```

- Reads `access_token` / `admin_token` cookie server-side via `next/headers`
- Attaches `Authorization: Bearer <token>` automatically
- Normalizes all errors into a consistent `ApiError` shape

### Client components (`'use client'`)

Client components cannot call `cookies()` — use `clientApi` instead. It calls Next.js route handlers (`/api/...`) on the same origin; the browser sends cookies automatically.

```ts
// apps/web/src/lib/client-api.ts
// apps/admin/src/lib/client-api.ts
import { clientApi } from '@/lib/client-api';

const updated = await clientApi.patch<Gym>(`/api/admin/gyms/${id}/status`, { status: next });
```

### Why not raw fetch?

| | Raw `fetch` | `api` / `clientApi` |
|---|---|---|
| Error handling | Manual per call | Centralized in one place |
| Auth token | Manual per call | Automatic |
| Response typing | Cast manually | Generic `<T>` |
| Provider change | Update every file | Update one file |

---

## 2. Domain Constants — Never Hardcode Strings

**Never write `=== 'ACTIVE'`, `status: 'SUSPENDED'`, or `role === 'manager'` anywhere in frontend code.**

All status values, role names, and domain constants that come from the backend must be imported from `@gym-saas/contracts`.

### Wrong

```ts
const isActive = currentStatus === 'ACTIVE';
const next = isActive ? 'SUSPENDED' : 'ACTIVE';
```

### Correct

```ts
import { GymStatus } from '@gym-saas/contracts';

const isActive = currentStatus === GymStatus.ACTIVE;
const next = isActive ? GymStatus.SUSPENDED : GymStatus.ACTIVE;
```

### Available enums in `@gym-saas/contracts`

| Enum | Values |
|---|---|
| `GymStatus` | `ACTIVE`, `SUSPENDED`, `PENDING` |
| `MemberStatus` | `ACTIVE`, `INACTIVE`, `EXPIRED`, `SUSPENDED` |
| `StaffRole` | `OWNER`, `MANAGER`, `STAFF` |
| `MembershipPlanStatus` | `ACTIVE`, `INACTIVE` |

Add new enums to `packages/contracts/src/enums.ts` and run `pnpm --filter @gym-saas/contracts build` when the backend adds new domain constants.

### Why?

If the backend renames a status value, there is one place to update — the enum. Every frontend file that imports it gets the fix automatically. Scattered string literals break silently and are impossible to find with confidence.

---

## 3. External Integrations — API Only

Frontend and mobile apps must **never**:
- Hold external API keys (Groq, Anthropic, Stripe, etc.)
- Call third-party services directly
- Embed provider-specific SDK logic

All such calls go through the NestJS API. See `docs/01-architecture/system-overview.md` and `CLAUDE.md` for the full rule.

---

## 4. When to Use Server vs Client Components

Default to server components. Only add `'use client'` when the component needs:
- `useState` / `useEffect` / other React hooks
- Browser event handlers
- Browser-only APIs

| Scenario | Pattern |
|---|---|
| Fetch data for a page | Server component + `api` from `lib/api.ts` |
| Mutate data from a form | Server action + `api` from `lib/api.ts` |
| Interactive UI that reads/writes after mount | `'use client'` + `clientApi` from `lib/client-api.ts` |
| Proxy call from client to NestJS | Next.js route handler (`app/api/.../route.ts`) + `api` from `lib/api.ts` |

---

## 5. Type Sharing

Prefer importing shared types from `@gym-saas/contracts` over redefining them locally. Local interface definitions are fine for component-internal shapes that don't correspond to a backend contract.

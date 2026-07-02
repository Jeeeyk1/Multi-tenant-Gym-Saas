# Frontend data fetching

This is the canonical pattern for data fetching on the mobile and web apps.
Status of the broader migration lives in [tanstack-query-migration.md](./tanstack-query-migration.md).

---

## The mental model

- **HTTP client** (`apps/mobile/src/services/api.ts`, `apps/web/src/lib/api.ts`) is the transport layer. It owns auth headers, token refresh, error normalization. It is **not** replaced by TanStack Query.
- **Service modules** (`apps/mobile/src/services/*.service.ts`) are the typed transport API. One function per endpoint, returns a typed promise. These stay.
- **Query hooks** (`apps/mobile/src/hooks/<resource>.ts`) wrap the service functions with TanStack Query. This is the layer screens consume.
- **Screens** render `data`, `isLoading`, `error` straight from the hook. They no longer own `useEffect` / `useState` data triplets.

Diagram:

```
screen  ─▶  useMyMember()  ─▶  memberService.getMyMember()  ─▶  api.get()
            (hook)            (service / transport)              (fetch + auth)
                │
                └─▶  QueryClient (cache, dedupe, refetch, retry)
```

---

## Defining a resource's hooks

One file per resource: `apps/mobile/src/hooks/<resource>.ts`. Each file exports:

1. A `<resource>Keys` factory — typed tuples for cache keys.
2. One `use<Thing>` per query.
3. One `use<Verb><Thing>` per mutation.

### Query-key factory

Always a `const` factory, always `as const` tuples, always namespaced under the resource root so you can bulk-invalidate.

```ts
export const memberKeys = {
  all: ['members'] as const,
  me: (gymId: string | undefined) =>
    [...memberKeys.all, 'me', gymId] as const,
  myProfile: (gymId: string | undefined) =>
    [...memberKeys.all, 'me', 'profile', gymId] as const,
};
```

Anything that scopes the data — `gymId`, filters, pagination — goes in the key. If two callers pass identical args, TanStack Query dedupes them automatically.

### Query hook

Standard shape:

```ts
export function useMyMember() {
  const { user } = useAuth();
  const gymId = user?.gymId;
  return useQuery({
    queryKey: memberKeys.me(gymId),
    queryFn: () => memberService.getMyMember(gymId!),
    enabled: Boolean(gymId),
  });
}
```

- **Read `gymId` from `useAuth()` inside the hook.** Don't make every caller pass it. There's only one current-user gym; threading it through props is noise.
- **`enabled: Boolean(gymId)`** prevents the query from firing before auth resolves. The `!` non-null assertion on `gymId!` is safe because `enabled` gates it.
- **Don't catch errors silently.** Let them flow into `query.error`. The screen renders an error state from there.
- **Exception — 404 as "no data yet":** Some endpoints (e.g. `getMyProfile`) legitimately 404 when a member hasn't filled in their profile. Translate that single status in `queryFn` and return `null`/`[]`:
  ```ts
  queryFn: async () => {
    try { return await memberService.getMyProfile(gymId!); }
    catch (err) {
      if ((err as { statusCode?: number })?.statusCode === 404) return null;
      throw err;
    }
  },
  ```

### Mutation hook

```ts
export function useUpdateMyProfile() {
  const { user } = useAuth();
  const gymId = user?.gymId;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<MemberProfile>) => {
      if (!gymId) throw new Error('Not authenticated');
      return memberService.updateMyProfile(gymId, data);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(memberKeys.myProfile(gymId), updated);
    },
  });
}
```

- **Prefer `setQueryData` over `invalidateQueries`** when the server response is the authoritative new value. It updates the cache instantly with no refetch.
- **Use `invalidateQueries`** when the mutation affects multiple cached queries or the server returns less than the full new state (e.g. POSTing a check-in invalidates `myCheckIns` and `me`).
- **Don't wrap `useMutation` in a custom shape.** Return the full mutation result so callers can use `isPending`, `error`, `reset`, etc.

---

## Consuming hooks in screens

### Loading + error + data

```tsx
const memberQ = useMyMember();
const checkInsQ = useMyCheckIns(7);

const isLoading = memberQ.isLoading || checkInsQ.isLoading;
const errorMessage =
  (memberQ.error as { message?: string } | null)?.message ??
  (checkInsQ.error as { message?: string } | null)?.message ??
  null;
const member = memberQ.data ?? null;
const checkIns = checkInsQ.data ?? [];
```

Use `isLoading` (not `isPending`) — it's false when the query is `enabled: false`, so a screen that mounts before auth resolves won't get stuck on a spinner.

### Pull-to-refresh

```tsx
const refreshing = memberQ.isRefetching || checkInsQ.isRefetching;

function handleRefresh() {
  memberQ.refetch();
  checkInsQ.refetch();
}

<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
```

No `useState` for `refreshing`. `isRefetching` is the source of truth.

### Calling a mutation

```tsx
const updateProfile = useUpdateMyProfile();

function handleSave() {
  updateProfile.mutate(data, {
    onSuccess: () => onClose(),
    onError: () => setError('Failed to save. Please try again.'),
  });
}

<Button disabled={updateProfile.isPending} onPress={handleSave}>
  {updateProfile.isPending ? 'Saving…' : 'Save'}
</Button>
```

The mutation hook owns the cache update on success — the screen only handles UI side effects (close modal, show toast, navigate).

---

## What NOT to do

- ❌ Don't call services directly from `useEffect`. If the data is shown in the UI, it goes through a query hook.
- ❌ Don't pass `gymId` as a prop to every component just to thread it into a service call. The hook reads it from `useAuth()`.
- ❌ Don't wrap `useQuery` / `useMutation` in a custom return shape. Pass the full result through.
- ❌ Don't silently `.catch(() => null)` on a query. Either translate a specific status (404 → null) inside `queryFn`, or let the error flow to `query.error`.
- ❌ Don't put `useState` next to a query hook to mirror its `data`. Read from `query.data` directly — anything else means the cache and the UI can drift.
- ❌ Don't write inline query keys (`['members', 'me', gymId]`) at call sites. Always go through the `<resource>Keys` factory so invalidation and refetch references stay in sync.

---

## Defaults (locked in `apps/mobile/src/lib/query-client.ts`)

- `staleTime: 30s` — data is considered fresh for 30 seconds; no refetch during that window.
- `gcTime: 5min` — unused cache entries are garbage-collected after 5 min.
- `retry: 1`, skipping 401s (a 401 has already survived the silent refresh in `services/api.ts` — retrying is pointless).
- `refetchOnWindowFocus: true` — refetches when the app comes back to the foreground (wired via React Native `AppState` → `focusManager`).
- `mutations.retry: false` — mutations never auto-retry.

Override per-query when warranted:

```ts
useQuery({
  ...,
  staleTime: 5_000, // chatty real-time data
});

useQuery({
  ...,
  staleTime: 5 * 60_000, // sticky reference data
  refetchOnWindowFocus: false,
});
```

---

## When to add a new resource hook file

You're calling a service function from more than one screen, OR the screen owns more than one fetch, OR the data needs to invalidate on a mutation elsewhere. Otherwise, calling the service directly in a one-off `useQuery` inline is fine — but in practice, **always** go through a hook file once it exists for that resource. Don't fork patterns.

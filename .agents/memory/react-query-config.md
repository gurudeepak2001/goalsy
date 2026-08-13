---
name: React Query QueryClient config
description: Default QueryClient settings cause retry storms and excessive refetches — always configure with explicit defaults.
---

# React Query QueryClient defaults are dangerous for this app

## The rule
Always construct `QueryClient` with explicit `defaultOptions`; never use `new QueryClient()` bare.

**Why:** Defaults are `retry: 3`, `staleTime: 0`, `refetchOnWindowFocus: true`. On the deployed app this produced 200+ requests in 30 seconds — all 401 — because every 401 was retried 3×, every navigation re-fetched stale data, and every tab-focus triggered a full reload across all screens.

**How to apply:**
```ts
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: unknown) => {
        const status = (error as { status?: number })?.status;
        if (status === 401 || status === 403) return false;
        return failureCount < 1;
      },
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  },
});
```

- **Never retry 401/403** — auth errors won't succeed on retry and flood the server.
- **staleTime 60s** — prevents redundant refetches on every navigation/remount.
- **refetchOnWindowFocus: false** — stops burst refetches on tab-switch.

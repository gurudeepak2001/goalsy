---
name: Clerk FAPI session detection in fetch interceptor
description: How to correctly detect an active Clerk session from FAPI response shapes; covers the client-envelope bug that prevented token persistence.
---

## The bug
`isClientShape` only checked `data?.response?.sessions` (the shape of `/v1/client`).
Sign-in and touch endpoints return `{ response: { ...sign_in_or_session }, client: { sessions: [...] } }` — sessions are under `data.client.sessions`, not `data.response.sessions`.
This meant `hasActiveSession` never flipped after MFA / sign-in / session touch, so `flushPendingDbJwt` never ran and the token was never written to UserDefaults.

## The fix
Check BOTH `data?.response?.sessions` AND `data?.client?.sessions`:
```js
const responseSessions = Array.isArray(data?.response?.sessions)
  ? data.response.sessions
  : Array.isArray(data?.client?.sessions)
    ? data.client.sessions
    : [];
```
Use `responseSessions.length > 0` to set `hasActiveSession = true`.

## FAPI response shapes by endpoint
| Endpoint | sessions location |
|---|---|
| `/v1/client` | `data.response.sessions` |
| `/v1/client/sign_ins/*` | `data.client.sessions` |
| `/v1/client/sessions/*/touch` | `data.client.sessions` |
| `/v1/client/sessions/*/tokens` | `data.jwt` (no sessions) |

**Why:** Clerk's FAPI wraps the primary resource in `response` and always includes the full client state in `client`. Only the top-level `/v1/client` endpoint puts sessions inside `response` itself.

---
name: Concurrent mission transition tests
description: Safe assertions for endpoint tests that race mission completion and skipping against PostgreSQL.
---

When testing concurrent mission terminal actions, assert the final state PostgreSQL persists and apply state-specific invariants rather than assigning precedence based on the order requests were started.

**Why:** Promise or HTTP scheduling order does not guarantee lock acquisition order. Completion and skip are both valid winners; a test that demands one winner becomes flaky and incorrectly rejects a valid state transition.

**How to apply:** Race the requests, read the persisted mission, then verify no streak award for a skip winner and exactly one valid award for a completion winner. Keep pooled database connections owned by the shared test runner open.
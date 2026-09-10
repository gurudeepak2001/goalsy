---
name: Plaid partial-refresh resilience
description: Reliability and removal rules for multi-institution connected accounts.
---

A failed refresh for one Plaid item must not prevent Goalsy from returning saved account data from the other items or from the failing item’s last successful snapshot.

Individual account removal means hiding that account from Goalsy, its totals, and generated briefings while preserving the institution connection and sibling accounts. Normal refreshes must preserve the hidden state; an explicit institution relink may restore the account.

**Why:** Treating a multi-item refresh as all-or-nothing made every account appear deleted when only one connection failed. Deleting an individual local row without a persistent hidden state would make it reappear on the next Plaid refresh.

**How to apply:** Catch refresh errors per item, query cached owner-scoped rows afterward, exclude hidden accounts from all user-facing calculations, and keep institution-level disconnection as a separate destructive action.
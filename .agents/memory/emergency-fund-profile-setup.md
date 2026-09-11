---
name: Emergency fund profile setup
description: Rules for automatic emergency-fund goals created from a user's saved financial profile.
---

Every saved financial profile with monthly expenses has one automatic Emergency Fund goal. Its default target is three months of the current monthly-expense estimate, and the initial fund amount becomes the goal's opening amount.

**Why:** Financial Health needs an actual user-owned emergency-fund goal instead of fabricated progress. Profile saves can be retried or originate on multiple devices, while the fund may later receive ledger-backed progress.

**How to apply:** Serialize automatic setup per user, create the goal only when absent, and on later profile edits update only the target. Never replace `currentAmount`, `openingAmount`, or ledger history for an existing fund.
---
name: Weekly milestone projection anchors
description: How projected weekly goal totals must behave when the active week is confirmed before its date is past.
---

For a goal with confirmed weekly progress, start future projections one contribution after the latest confirmed week—even when that week’s milestone date is still ahead of the current clock.

**Why:** The app permits logging the active week before its date is technically past. Counting from the wall clock then treats that already-confirmed active week as an additional future deposit and makes the first unconfirmed row jump by two weekly contributions.

**How to apply:** When rendering weekly milestone projections from a confirmed progress ledger, use the highest confirmed week index as the projection anchor. The first later week is one planned contribution above the ledger total, then increase one contribution per milestone row.
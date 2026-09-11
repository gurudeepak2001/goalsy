---
name: Score change attribution
description: How Goalsy explains movement between recorded score snapshots.
---

Score-change explanations must compare the current result with the immediately preceding snapshot and name only drivers whose actual points changed. A missing or invalid prior breakdown cannot justify a guessed explanation.

**Why:** Generic claims such as bill payments or goal contributions can be false when those events are not part of the measured score change. Historical score snapshots already preserve driver-point breakdowns.

**How to apply:** Save driver snapshots reliably before returning the result, calculate current-minus-previous score and per-driver deltas server-side, show no-history or unavailable-breakdown states explicitly, and display the prior/current point values.
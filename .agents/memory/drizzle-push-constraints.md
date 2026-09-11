---
name: Drizzle push constraint safety
description: How to validate ownership constraints after a failed Drizzle schema push.
---

A failed `drizzle-kit push` must not be assumed atomic when adding or replacing PostgreSQL constraints. Inspect the live constraints after any failure, repair the development schema, rerun the push until it reports no changes, and run database-backed ownership/cascade tests.

**Why:** A composite foreign-key push failed because its referenced uniqueness was not yet available, after the previous foreign key had already been removed. The application schema still looked correct while the live database temporarily had neither ownership enforcement nor cascade deletion.

**How to apply:** For security-sensitive foreign keys or uniqueness changes, verify `pg_constraint`/`pg_indexes` after a failed push. Use formal composite `UNIQUE` constraints for referenced column sets, then confirm a clean schema diff and exercise direct constraint and cascade regression tests.

Legacy upgrade fixtures for non-interactive CI must already contain every populated-table constraint that Drizzle considers potentially destructive. The fixture can omit additive columns with safe defaults, but adding uniqueness during `push --force` still opens a truncation prompt and fails without a TTY.

**Why:** Drizzle Kit treats new uniqueness constraints on populated tables as possible data-loss operations even when fixture rows are valid and `--force` is present.

**How to apply:** Model the oldest supported schema after all historical uniqueness and ownership constraints were established, then exercise later additive schema changes from that baseline.
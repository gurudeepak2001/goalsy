---
name: Drizzle push constraint safety
description: How to validate ownership constraints after a failed Drizzle schema push.
---

A failed `drizzle-kit push` must not be assumed atomic when adding or replacing PostgreSQL constraints. Inspect the live constraints after any failure, repair the development schema, rerun the push until it reports no changes, and run database-backed ownership/cascade tests.

**Why:** A composite foreign-key push failed because its referenced uniqueness was not yet available, after the previous foreign key had already been removed. The application schema still looked correct while the live database temporarily had neither ownership enforcement nor cascade deletion.

**How to apply:** For security-sensitive foreign keys or uniqueness changes, verify `pg_constraint`/`pg_indexes` after a failed push. Use formal composite `UNIQUE` constraints for referenced column sets, then confirm a clean schema diff and exercise direct constraint and cascade regression tests.
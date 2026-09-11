# Historical schema upgrade fixtures

CI upgrades every `prior-schema*.sql` fixture directly to the current Drizzle
schema, then runs the shared assertions in `verify-upgrade.sql`.

## Supported baselines

- `prior-schema.sql`: the September 10, 2026 account-hiding release. It includes
  non-default weekly goal, opening balance, hidden-account, and milestone values,
  but predates persistent briefing views and Emergency Fund profile fields.
- `prior-schema-briefing-views.sql`: the September 10, 2026 persistent briefing
  views release. It adds a saved briefing view with a non-default timestamp and
  still predates the Emergency Fund profile fields.

These fixtures reproduce schema states visible in repository history, rather
than synthetic combinations of columns. Each fixture contains the same common
saved records and runs the same verifier. The verifier also checks whether the
release-specific briefing view should exist.

## Retirement policy

These two materially different release stages are supported. Baselines older
than the account-hiding release are unsupported because they predate the full
Plaid saved-data shape covered by this gate.

Retire or replace a fixture only in a pull request that:

1. names the baseline being retired and why it is no longer supported;
2. updates this supported-baseline list;
3. keeps at least two historical fixtures in CI; and
4. confirms the remaining fixtures still upgrade directly to the current
   schema and pass `verify-upgrade.sql`.
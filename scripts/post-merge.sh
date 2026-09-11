#!/bin/bash
set -e
pnpm install --frozen-lockfile
# Rebuild every shared-library declaration after a merge so artifact typechecks
# use the current API and database contracts.
pnpm exec tsc --build --force
pnpm --filter @workspace/db run push

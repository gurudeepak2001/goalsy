#!/bin/bash
set -e
pnpm install --frozen-lockfile
# Rebuild db type declarations so downstream packages (api-server, etc.) typecheck cleanly
pnpm --filter @workspace/db exec tsc -p tsconfig.json
pnpm --filter db push

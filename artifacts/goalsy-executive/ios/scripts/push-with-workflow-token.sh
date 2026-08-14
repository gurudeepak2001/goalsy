#!/usr/bin/env bash
# push-with-workflow-token.sh
#
# One-shot helper to push pending commits (including .github/workflows/) using
# a GitHub PAT that has the `workflow` scope.
#
# The token is read from the GITHUB_PUSH_TOKEN environment variable — never
# passed as a command-line argument — so it does not appear in shell history,
# process listings, or git config.  Credentials are supplied at push time via
# git's GIT_ASKPASS mechanism; the token is never written to .git/config or
# embedded in a remote URL.
#
# Usage (preferred — token stays out of shell history):
#   read -rs GITHUB_PUSH_TOKEN && export GITHUB_PUSH_TOKEN
#   bash artifacts/goalsy-executive/ios/scripts/push-with-workflow-token.sh
#
# Or pass via env in a single command:
#   GITHUB_PUSH_TOKEN="$(cat /path/to/token.txt)" \
#     bash artifacts/goalsy-executive/ios/scripts/push-with-workflow-token.sh
#
# Minimum recommended: fine-grained PAT scoped to this repo only with
#   "Contents" = Read & Write  and  "Workflows" = Read & Write.
# Avoid the broad classic `repo` scope when a fine-grained PAT will work.
#
# Security reminder: revoke or expire the token once the one-shot push is done.

set -euo pipefail

BRANCH="main"

# ── 1. Validate that the token is available ───────────────────────────────────

if [[ -z "${GITHUB_PUSH_TOKEN:-}" ]]; then
  cat >&2 <<'EOF'
Error: GITHUB_PUSH_TOKEN is not set.

Set it in your shell before running this script so it never appears in history:

  read -rs GITHUB_PUSH_TOKEN && export GITHUB_PUSH_TOKEN
  bash artifacts/goalsy-executive/ios/scripts/push-with-workflow-token.sh
EOF
  exit 1
fi

# ── 2. Derive the repo URL dynamically from the current remote ────────────────
#
# This avoids hard-coding a specific GitHub username or repository name so the
# script works after a fork or rename.

ORIGINAL_URL=$(git remote get-url origin)
REPO_PATH=$(echo "$ORIGINAL_URL" \
  | sed -E 's|https?://([^@]+@)?github\.com/||; s|git@github\.com:||; s|\.git$||')
REPO_URL="https://github.com/${REPO_PATH}.git"

# ── 3. Write a private askpass helper ────────────────────────────────────────
#
# git calls this executable when it needs a password.  It prints the token from
# the inherited environment.  The token is never embedded in a URL or git config.

ASKPASS="$(mktemp)"
chmod 700 "$ASKPASS"
# Single-quoted heredoc: $GITHUB_PUSH_TOKEN is NOT expanded here — the
# subprocess resolves it from the inherited environment when git invokes it.
cat > "$ASKPASS" << 'HELPER'
#!/bin/sh
printf '%s' "$GITHUB_PUSH_TOKEN"
HELPER

cleanup() { rm -f "$ASKPASS"; }
trap cleanup EXIT

# ── 4. Push — token never touches git config or any URL ───────────────────────

echo "→ Pushing $BRANCH to ${REPO_PATH} on GitHub (credentials via askpass)…"
GIT_ASKPASS="$ASKPASS" \
  GIT_TERMINAL_PROMPT=0 \
  git -c credential.username="x-access-token" \
  push "$REPO_URL" "$BRANCH"

echo ""
echo "✓ Push succeeded!  No credentials were written to .git/config."
echo ""
echo "Next steps:"
echo "  • Open https://github.com/${REPO_PATH}/actions to watch the"
echo "    'iOS Session-Restore Tests' workflow trigger on the main push."
echo "  • Open a draft PR that touches artifacts/goalsy-executive/ios/ to"
echo "    confirm the workflow also fires on pull_request events."
echo "  • The JUnit summary and xcresult bundle appear as artefacts in the"
echo "    Actions run once the macos-14 runner finishes."
echo ""
echo "Security reminder: revoke GITHUB_PUSH_TOKEN if it is no longer needed."

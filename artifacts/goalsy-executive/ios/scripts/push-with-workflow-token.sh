#!/usr/bin/env bash
# push-with-workflow-token.sh
#
# One-shot helper to push pending local commits (including .github/workflows/)
# to GitHub using a PAT that has `repo` + `workflow` scope.
#
# The token is consumed from the GITHUB_PUSH_TOKEN environment variable — never
# passed as a command-line argument — so it does not appear in shell history,
# process listings, or the git config that is left on disk.
#
# Usage:
#   GITHUB_PUSH_TOKEN=ghp_… bash artifacts/goalsy-executive/ios/scripts/push-with-workflow-token.sh
#
# How to get a token with the required scopes:
#   1. https://github.com/settings/tokens
#   2. "Generate new token" (classic) — or edit the existing one
#   3. Check ✓ repo  and  ✓ workflow
#   4. Copy the token and pass it via the environment variable above.
#      Never pass it as a positional argument ($1) — that exposes it to
#      `ps aux` and shell history.

set -euo pipefail

if [[ -z "${GITHUB_PUSH_TOKEN:-}" ]]; then
  echo "❌  GITHUB_PUSH_TOKEN is not set."
  echo ""
  echo "   Usage:"
  echo "     GITHUB_PUSH_TOKEN=ghp_… bash $(basename "$0")"
  echo ""
  echo "   Get a token with repo + workflow scopes at:"
  echo "   https://github.com/settings/tokens"
  exit 1
fi

# Derive the repo URL from the current remote so this script is not
# hard-coded to a specific GitHub username or repository name.
ORIGINAL_URL=$(git remote get-url origin)
REPO_PATH=$(echo "$ORIGINAL_URL" \
  | sed -E 's|https?://([^@]+@)?github\.com/||; s|git@github\.com:||; s|\.git$||')

AUTHED_URL="https://x-access-token:${GITHUB_PUSH_TOKEN}@github.com/${REPO_PATH}.git"

# ── 1. Temporarily update the remote, push, then restore ─────────────────────
echo "→ Pushing to ${REPO_PATH} on GitHub…"
git remote set-url origin "$AUTHED_URL"

# Ensure the token is scrubbed from the remote even if the push fails.
cleanup() {
  git remote set-url origin "$ORIGINAL_URL"
  echo "✓ Remote URL restored."
}
trap cleanup EXIT

git push origin main
echo ""
echo "✓ Push succeeded!"
echo ""
echo "Next steps:"
echo "  • Open https://github.com/${REPO_PATH}/actions to watch the"
echo "    'iOS Session-Restore Tests' workflow trigger on the main push."
echo "  • Open a draft PR that touches artifacts/goalsy-executive/ios/ to"
echo "    confirm the workflow also fires on pull_request events."
echo "  • The JUnit summary and xcresult bundle appear as artefacts in the"
echo "    Actions run once the macos-14 runner finishes."

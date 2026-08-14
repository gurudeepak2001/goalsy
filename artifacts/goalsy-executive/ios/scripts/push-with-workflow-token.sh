#!/usr/bin/env bash
# push-with-workflow-token.sh
#
# One-shot helper to update the GitHub remote with a PAT that has `workflow`
# scope and push all pending local commits (including .github/workflows/).
#
# Usage:
#   bash artifacts/goalsy-executive/ios/scripts/push-with-workflow-token.sh <NEW_TOKEN>
#
# Where <NEW_TOKEN> is a GitHub Personal Access Token with at minimum:
#   - repo     (full repository access)
#   - workflow (required to create/update .github/workflows/ files)
#
# How to get a token with both scopes:
#   1. https://github.com/settings/tokens
#   2. "Generate new token" (classic) — or edit the existing one
#   3. Check ✓ repo  and  ✓ workflow
#   4. Copy the token and pass it as the first argument to this script.

set -euo pipefail

if [ -z "${1:-}" ]; then
  echo "❌  Usage: $0 <NEW_GITHUB_TOKEN>"
  echo ""
  echo "   Get a token with repo + workflow scopes at:"
  echo "   https://github.com/settings/tokens"
  exit 1
fi

NEW_TOKEN="$1"
REPO_URL="https://gurudeepak2001:${NEW_TOKEN}@github.com/gurudeepak2001/goalsy.git"

# ── 1. Update the remote URL ──────────────────────────────────────────────────
echo "→ Updating git remote 'origin' with new token…"
git remote set-url origin "$REPO_URL"
echo "✓ Remote updated."

# ── 2. Push ───────────────────────────────────────────────────────────────────
echo "→ Pushing main to origin…"
git push origin main
echo ""
echo "✓ Push succeeded!"
echo ""
echo "Next steps:"
echo "  • Open https://github.com/gurudeepak2001/goalsy/actions to watch the"
echo "    'iOS Session-Restore Tests' workflow trigger on the main push."
echo "  • Open a draft PR that touches artifacts/goalsy-executive/ios/ to"
echo "    confirm the workflow also fires on pull_request events."
echo "  • The JUnit summary and xcresult bundle appear as artefacts in the"
echo "    Actions run once the macos-14 runner finishes."

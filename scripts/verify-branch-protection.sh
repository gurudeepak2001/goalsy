#!/usr/bin/env bash
# verify-branch-protection.sh
#
# Confirms that the required status check "clerk-cookie-round-trip" is
# configured on the main branch of this repository.
#
# Requirements:
#   - gh CLI authenticated (gh auth login)
#   - jq installed
#
# Exit codes:
#   0  — check is present
#   1  — check is missing or branch protection is not configured
#   2  — gh / jq not available, or API error

set -euo pipefail

REQUIRED_CHECK="clerk-cookie-round-trip"
BRANCH="main"

# ── Dependency checks ────────────────────────────────────────────────────────

if ! command -v gh &>/dev/null; then
  echo "❌  'gh' CLI not found. Install from https://cli.github.com/ and run 'gh auth login'."
  exit 2
fi

if ! command -v jq &>/dev/null; then
  echo "❌  'jq' not found. Install it (e.g. 'brew install jq' or 'apt install jq')."
  exit 2
fi

# ── Detect repository ────────────────────────────────────────────────────────

REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || true)
if [[ -z "$REPO" ]]; then
  echo "❌  Could not detect the current GitHub repository."
  echo "    Make sure you are inside the repo directory and 'gh auth login' has been run."
  exit 2
fi

echo "Repository : $REPO"
echo "Branch     : $BRANCH"
echo "Checking for required status check: $REQUIRED_CHECK"
echo ""

# ── Fetch branch protection ──────────────────────────────────────────────────

HTTP_STATUS=$(gh api \
  "repos/${REPO}/branches/${BRANCH}/protection" \
  --jq '.required_status_checks.contexts // []' \
  2>/tmp/gh-bp-error.txt \
  && echo "ok" || echo "error")

if [[ "$HTTP_STATUS" == "error" ]]; then
  ERROR=$(cat /tmp/gh-bp-error.txt)
  if echo "$ERROR" | grep -q "404"; then
    echo "⚠️   No branch protection rule found on '${BRANCH}'."
    echo ""
    echo "    Follow the runbook at .github/BRANCH_PROTECTION_RUNBOOK.md to set it up:"
    echo "    1. Create a classic PAT with 'repo' scope."
    echo "    2. Add it as the REPO_ADMIN_TOKEN repository secret."
    echo "    3. Run the 'Enforce Branch Protection' workflow via Actions → workflow_dispatch."
    exit 1
  else
    echo "❌  GitHub API error:"
    echo "$ERROR"
    exit 2
  fi
fi

# ── Check for required context ───────────────────────────────────────────────

CONTEXTS=$(gh api \
  "repos/${REPO}/branches/${BRANCH}/protection" \
  --jq '.required_status_checks.contexts // []')

if echo "$CONTEXTS" | jq -e --arg c "$REQUIRED_CHECK" 'index($c) != null' &>/dev/null; then
  echo "✅  '${REQUIRED_CHECK}' is a required check on ${BRANCH}."
  echo ""
  echo "All required contexts:"
  echo "$CONTEXTS" | jq -r '.[]' | sed 's/^/    • /'
  exit 0
else
  echo "❌  '${REQUIRED_CHECK}' is NOT in the required checks list for ${BRANCH}."
  echo ""
  echo "Currently required contexts:"
  if [[ $(echo "$CONTEXTS" | jq 'length') -eq 0 ]]; then
    echo "    (none)"
  else
    echo "$CONTEXTS" | jq -r '.[]' | sed 's/^/    • /'
  fi
  echo ""
  echo "Run the 'Enforce Branch Protection' workflow to add it:"
  echo "  gh workflow run enforce-branch-protection.yml --repo ${REPO}"
  exit 1
fi

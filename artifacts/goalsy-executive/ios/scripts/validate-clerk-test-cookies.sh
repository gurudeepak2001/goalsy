#!/usr/bin/env bash
# validate-clerk-test-cookies.sh
#
# CI preflight guard for CLERK_TEST_COOKIES.
#
# Behaviour
# ---------
#   • Developer machines (CI env var absent or empty): exits 0 silently.
#     The smoke test itself already uses XCTSkip when the variable is unset,
#     so no additional noise is needed locally.
#
#   • CI (CI=true): validates that CLERK_TEST_COOKIES is present AND contains
#     at least one cookie whose "expires" field is in the future.  If either
#     check fails, the script exits 1 with a clear human-readable message so
#     the pipeline turns red instead of silently skipping server validation.
#
# Usage
# -----
#   # Standalone (CI calls this before the xcodebuild test step):
#   bash ios/scripts/validate-clerk-test-cookies.sh
#
#   # Or inline in a GitHub Actions step:
#   - name: Validate Clerk test cookies
#     env:
#       CLERK_TEST_COOKIES: ${{ secrets.CLERK_TEST_COOKIES }}
#     run: bash artifacts/goalsy-executive/ios/scripts/validate-clerk-test-cookies.sh
#
# Exit codes
# ----------
#   0  — check passed (or skipped on a dev machine)
#   1  — check failed; pipeline should halt

set -euo pipefail

# ── 1. Guard: only enforce in CI ──────────────────────────────────────────────
if [[ "${CI:-}" != "true" ]]; then
  # Developer machine — CLERK_TEST_COOKIES is intentionally absent most of the
  # time.  The XCTSkip in SessionRestoreSmokeTests handles the no-credential
  # case gracefully.
  exit 0
fi

echo "→ [validate-clerk-test-cookies] Running in CI mode — enforcing CLERK_TEST_COOKIES."

# ── 2. Check the variable is set and non-empty ────────────────────────────────
if [[ -z "${CLERK_TEST_COOKIES:-}" ]]; then
  echo ""
  echo "✗ CLERK_TEST_COOKIES is missing or empty."
  echo ""
  echo "  In CI, the Clerk session-restore smoke test must not be silently skipped."
  echo "  Rotate the secret by running the extraction helper on a signed-in simulator:"
  echo ""
  echo "    bash artifacts/goalsy-executive/ios/scripts/extract-clerk-test-cookies.sh"
  echo ""
  echo "  Then store the output as the CLERK_TEST_COOKIES repository secret."
  echo ""
  exit 1
fi

# ── 3. Validate the value is parseable JSON ───────────────────────────────────
if ! python3 -c "import sys, json; json.loads(sys.stdin.read())" \
     <<< "${CLERK_TEST_COOKIES}" 2>/dev/null; then
  echo ""
  echo "✗ CLERK_TEST_COOKIES is not valid JSON."
  echo ""
  echo "  Expected a JSON array of cookie objects, e.g.:"
  echo '  [{"name":"__client","value":"…","domain":".clerk.goalsy.accounts.dev",'
  echo '    "path":"/","isSecure":true,"isHTTPOnly":false,"expires":1234567890}]'
  echo ""
  echo "  Re-extract the cookies using:"
  echo "    bash artifacts/goalsy-executive/ios/scripts/extract-clerk-test-cookies.sh"
  echo ""
  exit 1
fi

# ── 4. Check that at least one cookie has an expires timestamp in the future ──
NOW=$(date +%s)

EXPIRED_COUNT=$(python3 - <<EOF
import sys, json, time

cookies_json = """${CLERK_TEST_COOKIES}"""
now = ${NOW}

try:
    cookies = json.loads(cookies_json)
except json.JSONDecodeError:
    # Already caught above; shouldn't reach here.
    sys.exit(0)

if not isinstance(cookies, list):
    print(0)
    sys.exit(0)

# Cookies without an 'expires' field are session cookies — they are valid
# until the browser session ends.  Treat them as non-expired.
expired = sum(
    1 for c in cookies
    if isinstance(c, dict)
    and "expires" in c
    and isinstance(c["expires"], (int, float))
    and c["expires"] <= now
)

print(expired)
EOF
)

TOTAL_WITH_EXPIRY=$(python3 - <<EOF
import json

cookies_json = """${CLERK_TEST_COOKIES}"""
now = ${NOW}

try:
    cookies = json.loads(cookies_json)
except json.JSONDecodeError:
    print(0)
    raise SystemExit(0)

if not isinstance(cookies, list):
    print(0)
    raise SystemExit(0)

total = sum(
    1 for c in cookies
    if isinstance(c, dict) and "expires" in c and isinstance(c["expires"], (int, float))
)
print(total)
EOF
)

if [[ "${TOTAL_WITH_EXPIRY}" -gt 0 && "${EXPIRED_COUNT}" -eq "${TOTAL_WITH_EXPIRY}" ]]; then
  echo ""
  echo "✗ CLERK_TEST_COOKIES is present but all cookies with an expiry timestamp have expired."
  echo ""
  echo "  Expired: ${EXPIRED_COUNT} of ${TOTAL_WITH_EXPIRY} timestamped cookie(s)."
  echo "  Current time (Unix): ${NOW}"
  echo ""
  echo "  Rotate the secret by running the extraction helper on a signed-in simulator:"
  echo ""
  echo "    bash artifacts/goalsy-executive/ios/scripts/extract-clerk-test-cookies.sh"
  echo ""
  echo "  Then update the CLERK_TEST_COOKIES repository secret with the new value."
  echo ""
  exit 1
fi

# ── 5. All checks passed ──────────────────────────────────────────────────────
TOTAL_COOKIES=$(python3 -c \
  "import json; print(len(json.loads('''${CLERK_TEST_COOKIES}''')))" 2>/dev/null || echo "?")

echo "✓ CLERK_TEST_COOKIES is set, valid JSON, and contains ${TOTAL_COOKIES} cookie(s)."
if [[ "${TOTAL_WITH_EXPIRY}" -gt 0 ]]; then
  echo "  ${EXPIRED_COUNT} of ${TOTAL_WITH_EXPIRY} timestamped cookie(s) are expired" \
       "(session cookies without expiry are excluded from this count)."
fi
echo ""
exit 0

#!/usr/bin/env bash
# extract-clerk-test-cookies.sh
#
# One-command helper that extracts the Clerk session cookies saved by
# saveClerkCookies() from a running iOS Simulator and prints the value
# you need to set as the CLERK_TEST_COOKIES CI secret.
#
# Prerequisites
# -------------
#   • Xcode command-line tools installed  (xcode-select --install)
#   • At least one iOS Simulator currently booted  (open Simulator.app)
#   • The Goalsy Executive app installed and signed in with a Clerk
#     test-environment account (pk_test_… instance, not production)
#   • The app has been backgrounded at least once since sign-in so that
#     applicationDidEnterBackground fires and saveClerkCookies() writes
#     the cookies to UserDefaults
#
# Usage
# -----
#   # Basic — prints the JSON value to stdout:
#   bash ios/scripts/extract-clerk-test-cookies.sh
#
#   # Pipe directly into pbcopy (macOS clipboard) for pasting into GitHub:
#   bash ios/scripts/extract-clerk-test-cookies.sh | pbcopy
#
#   # Write to a file (keep this file out of git — it contains live session data):
#   bash ios/scripts/extract-clerk-test-cookies.sh > /tmp/clerk_test_cookies.json
#
# What this script does
# ---------------------
#   1. Finds the data container for com.goalsy.executive in the booted simulator.
#   2. Converts the binary plist at
#        Library/Preferences/com.goalsy.executive.plist
#      to JSON (non-destructive; does not modify the simulator's files).
#   3. Extracts the cm_clerk_cookies_v2 key — the same key that
#      ClerkCookiePersistence.restore() reads on cold start.
#   4. Validates that the extracted value is non-empty JSON before printing.
#
# The output is the exact string to set as CLERK_TEST_COOKIES.
# After updating the secret, re-run the CI pipeline to confirm the smoke
# test now executes instead of skipping.

set -euo pipefail

BUNDLE_ID="com.goalsy.executive"
PLIST_KEY="cm_clerk_cookies_v2"

# ── 1. Locate the app's data container ───────────────────────────────────────
echo "→ Locating data container for ${BUNDLE_ID} in the booted simulator…" >&2

if ! CONTAINER=$(xcrun simctl get_app_container booted "${BUNDLE_ID}" data 2>&1); then
  echo "" >&2
  echo "✗ Could not locate the data container for ${BUNDLE_ID}." >&2
  echo "" >&2
  echo "  Possible causes:" >&2
  echo "    • No simulator is currently booted — open Simulator.app and boot one." >&2
  echo "    • The app is not installed on the booted simulator — run it from Xcode first." >&2
  echo "    • The bundle ID has changed (current: ${BUNDLE_ID})." >&2
  echo "" >&2
  exit 1
fi

echo "  Container: ${CONTAINER}" >&2

# ── 2. Locate the preferences plist ──────────────────────────────────────────
PLIST="${CONTAINER}/Library/Preferences/${BUNDLE_ID}.plist"

if [[ ! -f "${PLIST}" ]]; then
  echo "" >&2
  echo "✗ Preferences plist not found at:" >&2
  echo "    ${PLIST}" >&2
  echo "" >&2
  echo "  Make sure you have:" >&2
  echo "    1. Signed in with a Clerk test-environment account." >&2
  echo "    2. Backgrounded the app at least once (press Home) so that" >&2
  echo "       applicationDidEnterBackground fires and saveClerkCookies() runs." >&2
  echo "" >&2
  exit 1
fi

# ── 3. Convert the binary plist to JSON and extract the cookie key ────────────
echo "→ Extracting '${PLIST_KEY}' from preferences plist…" >&2

COOKIES_JSON=$(
  plutil -convert json "${PLIST}" -o - \
  | python3 -c "
import sys, json
data = json.load(sys.stdin)
value = data.get('${PLIST_KEY}', '')
print(value)
"
)

# ── 4. Validate the extracted value ──────────────────────────────────────────
if [[ -z "${COOKIES_JSON}" ]]; then
  echo "" >&2
  echo "✗ The key '${PLIST_KEY}' is absent or empty in the preferences plist." >&2
  echo "" >&2
  echo "  This means saveClerkCookies() has not run yet.  Steps to trigger it:" >&2
  echo "    1. Launch the app and confirm you are signed in." >&2
  echo "    2. Press the Home button (or swipe up) to background the app." >&2
  echo "    3. Wait 2–3 seconds for the background handler to complete." >&2
  echo "    4. Re-run this script." >&2
  echo "" >&2
  exit 1
fi

if ! python3 -c "import json, sys; json.loads(sys.stdin.read())" \
     <<< "${COOKIES_JSON}" 2>/dev/null; then
  echo "" >&2
  echo "✗ The extracted value is not valid JSON." >&2
  echo "  Raw value:" >&2
  echo "    ${COOKIES_JSON}" >&2
  echo "" >&2
  echo "  This is unexpected — the value written by saveClerkCookies() should" >&2
  echo "  always be a JSON array.  Check AppDelegate.swift for serialisation errors." >&2
  echo "" >&2
  exit 1
fi

COOKIE_COUNT=$(python3 -c "import json, sys; print(len(json.loads(sys.stdin.read())))" \
               <<< "${COOKIES_JSON}" 2>/dev/null || echo "?")

echo "✓ Extracted ${COOKIE_COUNT} cookie(s) from the simulator." >&2
echo "" >&2
echo "  Next steps:" >&2
echo "    1. Copy the JSON printed to stdout (or pipe this script through pbcopy)." >&2
echo "    2. In your GitHub repository, go to:" >&2
echo "         Settings → Secrets and variables → Actions → Repository secrets" >&2
echo "    3. Create or update the secret named CLERK_TEST_COOKIES with the copied value." >&2
echo "    4. Re-run the CI pipeline to confirm the smoke test executes (not skipped)." >&2
echo "" >&2
echo "  To validate the secret before committing, run:" >&2
echo "    CLERK_TEST_COOKIES='<value>' CI=true \\" >&2
echo "      bash artifacts/goalsy-executive/ios/scripts/validate-clerk-test-cookies.sh" >&2
echo "" >&2

# ── 5. Print the cookie JSON to stdout (the only stdout output) ───────────────
printf '%s' "${COOKIES_JSON}"

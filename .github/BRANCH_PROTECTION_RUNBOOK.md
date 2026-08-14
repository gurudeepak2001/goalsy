# Branch Protection Setup Runbook

This document covers the one-time admin steps needed to activate the
`clerk-cookie-round-trip` required status check on `main`, and how to
verify that a failing PR is actually blocked.

---

## Prerequisites

- You are a **repository admin** (Settings tab is visible to you).
- You have the [GitHub CLI (`gh`)](https://cli.github.com/) installed and
  authenticated (`gh auth login`), or you can use the GitHub web UI.

---

## Step 1 — Create a classic PAT with `repo` scope

1. Go to **GitHub → Settings → Developer settings → Personal access tokens →
   Tokens (classic)**.
2. Click **Generate new token (classic)**.
3. Set a descriptive note, e.g. `goalsy-branch-protection-admin`.
4. Set expiration to **No expiration** (or your team's policy — but note that
   when it expires the workflow will fail silently; re-run this runbook).
5. Under **Select scopes**, tick **`repo`** (the top-level checkbox — this
   includes `administration:write` which the workflow needs).
6. Click **Generate token** and copy the value immediately.

---

## Step 2 — Add `REPO_ADMIN_TOKEN` as a repository secret

1. Go to **Repository → Settings → Secrets and variables → Actions**.
2. Click **New repository secret**.
3. Name: `REPO_ADMIN_TOKEN`
4. Value: paste the PAT from Step 1.
5. Click **Add secret**.

> ⚠️ This is a repository secret, not an environment secret. Make sure you are
> on the *Actions secrets* tab, not the *Codespaces* or *Dependabot* tabs.

---

## Step 3 — Run the Enforce Branch Protection workflow

### Via GitHub web UI

1. Go to **Repository → Actions → Enforce Branch Protection**.
2. Click **Run workflow** (top-right dropdown).
3. Leave the branch as `main`.
4. Click the green **Run workflow** button.
5. Wait ~30 seconds for the run to complete. A green tick confirms success.

### Via GitHub CLI

```bash
gh workflow run enforce-branch-protection.yml --repo <owner>/<repo>
# then watch it:
gh run watch --repo <owner>/<repo>
```

If the run fails with `Resource not accessible by integration`, the PAT either
has insufficient scope or the secret name is wrong.

---

## Step 4 — Verify the protection is live

### Option A — GitHub web UI

1. Go to **Repository → Settings → Branches**.
2. Click **Edit** on the `main` rule (or look at the existing rule details).
3. Under **Require status checks to pass before merging**, confirm
   `clerk-cookie-round-trip` appears in the list.

### Option B — Verification script

Run from repo root (requires `gh` auth and `jq`):

```bash
bash scripts/verify-branch-protection.sh
```

Expected output:

```
✅  clerk-cookie-round-trip  is a required check on main
```

---

## Step 5 — Smoke-test that a failing PR is blocked

Create a branch with a test that deliberately fails, open a PR, and confirm the
merge button is greyed out:

```bash
git checkout -b test/branch-protection-smoke
# Break a test — for example, add a failing assertion to any AppTests file:
echo '// TEMP' >> artifacts/goalsy-executive/ios/App/AppTests/SessionRestoreTests.swift
echo 'XCTFail("deliberate failure to test branch protection")' \
  >> artifacts/goalsy-executive/ios/App/AppTests/SessionRestoreTests.swift
git add -A
git commit -m "test: deliberate failure to confirm branch protection"
git push -u origin test/branch-protection-smoke
gh pr create --title "test: branch protection smoke" \
             --body  "Should be blocked by clerk-cookie-round-trip failing." \
             --base main
```

Once the `iOS Session-Restore Tests / Clerk Cookie Round-Trip (AppTests)` check
shows **Failed** on the PR, confirm that the **Merge pull request** button is
disabled with the message:

> *Required status check "clerk-cookie-round-trip" has not succeeded.*

Close the PR and delete the branch afterwards — **do not merge it**:

```bash
gh pr close <number> --delete-branch
```

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Workflow run fails with "Bad credentials" | PAT is wrong or expired | Re-generate PAT; update the secret |
| Workflow succeeds but check not shown in Settings | PAT missing `administration:write` | Re-create PAT with full `repo` scope |
| Merge button is still enabled after check fails | Branch protection not applied yet | Re-run the workflow; refresh the page |
| `gh` CLI says "Resource not accessible by integration" | GITHUB_TOKEN used instead of PAT | Ensure `GH_TOKEN` is set to `secrets.REPO_ADMIN_TOKEN` in the workflow |

---

## Re-applying after changes

If the protection rule is ever reset (e.g. by a repository transfer, or a
new admin accidentally clears it), simply re-run Step 3. The workflow is
idempotent — it merges the new check into whatever rules already exist without
overwriting anything else.

Task #96 (re-apply on a schedule) automates this so drift is caught
automatically.

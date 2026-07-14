---
name: Clerk custom (headless) UI on web
description: Gotchas when wiring Clerk auth into pre-existing custom React screens on web (not the prebuilt <SignIn>/<SignUp> components), using @clerk/react.
---

- In `@clerk/react` v6.x, the **main** entrypoint's `useSignIn`/`useSignUp` return the new signal-based "future" API (`{ signIn, errors, fetchStatus }`), not the classic `{ isLoaded, signIn, setActive }` shape most docs/examples show.
  **How to apply:** import the classic hooks from the `@clerk/react/legacy` subpath instead: `import { useSignIn, useSignUp } from '@clerk/react/legacy'`. Keep `useClerk`, `useUser`, `ClerkProvider`, `Show` from the main `@clerk/react` entry — those are unaffected.

- A custom sign-up form using `signUp.create()` needs a `<div id="clerk-captcha" />` rendered somewhere in the form (invisible, no styling needed) for Clerk's Smart CAPTCHA / Cloudflare Turnstile bot protection.
  **Why:** without it, `signUp.create()` fails to even fire a network request — Turnstile can't attach to a DOM element, so the SDK errors internally before hitting the API (symptom: submit button stuck in a loading state forever, no visible error, no network request to Clerk).
  **How to apply:** add the div to any screen that calls `signUp.create()`. Not needed for sign-in (`signIn.create()` has no CAPTCHA step).

- Cloudflare Turnstile (used for Clerk's bot protection on sign-up) commonly fails to complete inside headless/automated browsers (e.g. the Playwright-based testing subagent), even when the app is wired correctly — shows as repeated 400s to `challenges.cloudflare.com/cdn-cgi/challenge-platform/...` and the form hangs forever.
  **Why:** Turnstile's own bot detection flags automated browser contexts; this is a testing-environment limitation, not an app bug.
  **How to apply:** don't chase this as a bug if sign-in (no CAPTCHA) works fine and reaches Clerk's real API. Validate sign-up either manually in a real browser, or by testing only up through `signUp.create()`/error-surface behavior and treating full completion as unverifiable via the automated tester.

- Clerk dev/test-mode email addresses containing `+clerk_test` (e.g. `foo+clerk_test@example.com`) always accept the fixed verification code `424242` instead of sending a real email.
  **How to apply:** use this for automated/e2e testing of sign-up + email verification flows without needing real inbox access.

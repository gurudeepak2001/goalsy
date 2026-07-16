---
name: Capacitor mobile setup
description: How Goalsy Executive is packaged as Android/iOS apps via Capacitor, and key decisions made during setup.
---

## Setup summary
- Capacitor v8 added to artifacts/goalsy-executive with appId `com.goalsy.executive`
- webDir is `dist/public` — matches Vite's build.outDir
- Both `android/` and `ios/` platform folders exist in the repo with built assets already copied in
- Build + sync command: `pnpm cap:build` (runs vite build then cap sync)

## Key decisions
- **Biometrics stays simulated** — the Profile screen Face ID toggle remains a fake switch/toast. Real biometric wiring (using @capacitor/biometric-auth) was explicitly deferred until after the core mobile build is tested and working.
- **Clerk in WebView** — works via VITE_CLERK_PUBLISHABLE_KEY baked in at build time. hostname is `localhost` inside Capacitor WebView so publishableKeyFromHost falls back to the env var. No code change needed.
- **Allowed origins for Clerk** — before submitting to stores, user must add `http://localhost` and `capacitor://localhost` to Clerk dashboard → Configure → Domains → Allowed Origins. Without this, sign-in fails on production Clerk keys on real devices.

## Safe-area patches applied
- viewport-fit=cover added to index.html
- .pt-safe / .pb-safe CSS utilities added to index.css
- BottomNav: pb-safe added (clears home indicator)
- AppShell: header uses pt-safe; content uses calc(72px + var(--safe-top)) / calc(176px + var(--safe-bottom))
- AppModal: pb-safe added (clears home indicator in bottom sheets)

## What user needs outside Replit
- Android: Android Studio + Google Play dev account ($25) + signing keystore
- iOS: Mac + Xcode + Apple Developer Program ($99/year) + App Store Connect
- Both: Run `pnpm cap:build` then open the platform folder in the IDE, bump version, generate signed artifact

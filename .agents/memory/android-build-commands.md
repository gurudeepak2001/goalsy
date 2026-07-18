---
name: Android build commands
description: Exact shell commands the user runs locally to rebuild and test the Capacitor Android app after a git pull.
---

The user's local project lives at `~/StudioProjects/goalsy-main`.
After every push from this repl, they run this exact sequence:

```bash
cd ~/StudioProjects/goalsy-main
git pull
cd artifacts/goalsy-executive
pnpm run cap:build
npx cap sync android
npx cap open android
```

**Why:** The repo root is `goalsy-main`, not `goalsy-executive`. The `cap:build` step compiles the Vite bundle; `cap sync android` copies it into the Android project; `cap open android` launches Android Studio for device/emulator testing.

**How to apply:** Always give the user these exact commands (in this order) when telling them to pull and rebuild for Android testing.

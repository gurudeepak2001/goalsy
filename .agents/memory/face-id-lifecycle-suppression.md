---
name: Face ID lifecycle suppression
description: Preventing a second biometric prompt caused by iOS lifecycle timing after successful authentication.
---

Suppress biometric authentication requests briefly after a successful native prompt. Sharing only the in-flight request is insufficient because iOS may deliver the prompt-generated active event after the native promise has already resolved.

**Why:** Face ID can make the app inactive and then report it active roughly one second after success. If the shared promise is cleared immediately, that delayed active callback starts a second prompt.

**How to apply:** Keep concurrent requests attached to one promise, then begin a short post-success suppression interval. Test both the delayed callback inside that interval and a genuine later foreground event outside it.
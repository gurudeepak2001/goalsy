---
name: Capacitor identifier synchronization
description: Why changing Capacitor appId alone does not fully migrate native bundle/package identifiers.
---

Changing Capacitor's `appId` and running `cap sync` updates the generated platform configuration JSON, but does not rewrite existing Xcode target bundle identifiers or Android namespace, application ID, URL scheme, and Java package.

**Why:** During the Enteraxion migration, a successful Capacitor sync left the checked-in Xcode and Android project identifiers on the prior MyUI namespace. Treating a successful sync as proof of full identifier migration would produce mismatched native releases.

**How to apply:** For any app-ID migration, update and verify Capacitor config, every Xcode app/test target, Android namespace/application ID/resources/package path, and identifier-dependent CI tests. Then run `cap sync` and search active code/config for the old identifier.
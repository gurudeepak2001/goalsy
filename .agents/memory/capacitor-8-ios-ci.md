---
name: Capacitor 8 iOS CI
description: Toolchain and clean-runner requirements for SwiftPM-based Capacitor 8 iOS tests and archives.
---

Use Xcode 26 with Swift 6.2 or newer for Capacitor 8 Swift Package Manager builds. Before XCTest or archive commands on a clean runner, build shared TypeScript declarations and generate/copy the Capacitor iOS web resources.

**Why:** Capacitor 8's prebuilt Swift framework gates plugin APIs such as `CAPPluginCall.reject` behind `NonescapableTypes`. Xcode 15 and 16 hide those APIs, causing official and custom plugins to fail. Clean checkouts also lack generated library declarations and native web resources needed by the app test host.

**How to apply:** For any iOS CI job, use the supported Xcode 26 toolchain, prepare shared library outputs, run the native web copy/sync step, and only then invoke `xcodebuild`.
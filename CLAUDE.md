# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is the Purchasely Cordova SDK - a bridge layer enabling In-App Purchase & Subscriptions across iOS (App Store), Android (Google Play, Huawei, Amazon), and web platforms. It wraps native Purchasely SDKs and exposes them to JavaScript.

## Build & Development Commands

**Example app (for testing):**
```bash
cd purchasely/example
./ios.sh      # Build/run iOS
./android.sh  # Build/run Android
```

## Release Process

See `RELEASE.md` for full details. Summary:

1. Create branch `release/X.Y.Z` from `main`
2. Update versions in: `purchasely/plugin.xml`, `purchasely/package.json`, `purchasely/www/Purchasely.js`, `purchasely-google/plugin.xml`, `purchasely-google/package.json`, `VERSIONS.md`
3. Open PR, wait for CI, merge
4. Create a GitHub release tagged `X.Y.Z` — this triggers automated npm publish (trusted publishing via OIDC, no token needed)
5. Include native SDK release notes from `Purchasely/Purchasely-Android` and `Purchasely/Purchasely-iOS` GitHub releases

## Architecture

```
JavaScript Layer (www/Purchasely.js)
        ↓
   cordova.exec()
        ↓
Platform-Specific Native Code
├── iOS: src/ios/CDVPurchasely.m + Extensions
└── Android: src/android/PurchaselyPlugin.kt
        ↓
Native Purchasely SDKs (CocoaPods/Gradle)
```

**Two plugins:**
- `@purchasely/cordova-plugin-purchasely` - Main plugin (iOS + Android)
- `@purchasely/cordova-plugin-purchasely-google` - Google Play specific additions

## Key Files

| File | Purpose |
|------|---------|
| `purchasely/www/Purchasely.js` | JavaScript API (50+ methods) |
| `purchasely/src/ios/CDVPurchasely.m` | iOS native bridge |
| `purchasely/src/ios/CDVPurchasely+Events.m` | iOS event handling |
| `purchasely/src/ios/Hybrid/*` | iOS type marshaling (native → JSON) |
| `purchasely/src/android/PurchaselyPlugin.kt` | Android native bridge (Kotlin) |
| `purchasely/plugin.xml` | Cordova plugin manifest |
| `VERSIONS.md` | SDK version compatibility matrix |

## Native Method Pattern

**iOS:**
```objc
- (void)actionName:(CDVInvokedUrlCommand*)command {
    // Implementation
    [self successFor:command resultType:value];  // or failureFor:
}
```

**Android:**
```kotlin
override fun execute(action: String, args: JSONArray, callbackContext: CallbackContext): Boolean
```

## Version Alignment

Cordova SDK, iOS SDK, and Android SDK versions are usually close but **may differ** (e.g., Cordova 5.7.2 with iOS 5.7.2 and Android 5.7.3). Always check `VERSIONS.md` for the mapping.

## Dependencies

- iOS: `Purchasely` CocoaPod (declared in plugin.xml)
- Android: `io.purchasely:core` Gradle dependency
- Google plugin adds: `io.purchasely:google-play`

## CI/CD

- **`ci.yml`** — Runs on PRs: unit tests, iOS build, Android build, version consistency check
- **`publish.yml`** — Runs on GitHub release: calls CI first, then publishes both npm packages via OIDC trusted publishing (no npm token stored)

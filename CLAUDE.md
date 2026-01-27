# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is the Purchasely Cordova SDK - a bridge layer enabling In-App Purchase & Subscriptions across iOS (App Store), Android (Google Play, Huawei, Amazon), and web platforms. It wraps native Purchasely SDKs and exposes them to JavaScript.

## Build & Development Commands

**Publishing a release:**
```bash
./publish.sh VERSION [publish]  # e.g., ./publish.sh 5.7.0 true
```
Note: Manually update `plugin.xml` version before publishing.

**Example app (for testing):**
```bash
cd purchasely/example
./ios.sh      # Build/run iOS
./android.sh  # Build/run Android
```

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

Cordova SDK, iOS SDK, and Android SDK versions are kept in sync (e.g., all at 5.6.0). Update all three when bumping versions.

## Dependencies

- iOS: `Purchasely` CocoaPod (declared in plugin.xml)
- Android: `io.purchasely:core` Gradle dependency
- Google plugin adds: `io.purchasely:google-play`

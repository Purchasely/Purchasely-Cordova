# Cordova plugin Purchasely

Purchasely is a solution to ease the integration and boost your In-App Purchase & Subscriptions on the App Store, Google Play Store and Huawei App Gallery.

> **Upgrading from v5?** See [`MIGRATION-v6.md`](MIGRATION-v6.md). v6 removes the
> flat paywall API and introduces a **chainable builder API** at parity with the
> React Native and Flutter SDKs.

## Installation

```sh
cordova plugin add @purchasely/cordova-plugin-purchasely
```

### To use Google Play In-App Purchases on Android devices

```sh
cordova plugin add @purchasely/cordova-plugin-purchasely-google
```

> Both plugins must be pinned to the **same** version.

## Requirements (SDK v6)

The v6 plugins wrap the native Purchasely **6.0** SDKs. The native Android SDK
raises the toolchain baseline — set these in your app's `config.xml` so the
cordova-android build matches:

```xml
<preference name="android-minSdkVersion" value="24" />
<preference name="android-compileSdkVersion" value="36" />
<preference name="AndroidGradlePluginVersion" value="8.9.2" />
<preference name="GradlePluginKotlinVersion" value="2.2.21" />
<preference name="GradleVersion" value="8.13" />
```

| | iOS | Android |
|---|---|---|
| Native SDK | `Purchasely 6.0.0-rc.1` (pod) | `io.purchasely:core / google-play 6.0.0-beta.12` (mavenLocal) |
| Min OS | iOS 13.4 | minSdk 23 |
| Build | Xcode 15+, CocoaPods | compileSdk 36, AGP ≥ 8.9.1, Kotlin 2.2.x, Gradle 8.13, JDK 17 |
| Stores | App Store | Google Play (Billing 8.x) — no video player on Cordova |

## Usage

### 1. Initialize the SDK

```js
Purchasely.builder('YOUR_API_KEY')
    .runningMode('full')            // 'full' | 'observer' (default: 'observer')
    .appUserId(null)                // optional: set if user is known at start
    .logLevel('debug')              // use 'error' in production
    .stores(['google'])             // Android: 'google' | 'huawei' | 'amazon'
    .storekitVersion('storeKit2')   // iOS: 'storeKit2' (recommended) | 'storeKit1'
    .start()
    .then((configured) => {
        if (configured) {
            console.log('Purchasely SDK ready');
        }
    })
    .catch((error) => console.error('SDK start failed', error));
```

### 2. Display a paywall

```js
// Display a paywall for a placement, wait for the user to dismiss
Purchasely.PresentationBuilder
    .placement('ONBOARDING')
    .contentId('optional_content_id')   // optional
    .build()
    .display()                          // returns Promise<outcome>
    .then((outcome) => {
        // outcome = { presentation, purchaseResult, plan, closeReason, error }
        if (outcome.purchaseResult === 'purchased' || outcome.purchaseResult === 'restored') {
            console.log('User purchased', outcome.plan && outcome.plan.name);
        } else {
            console.log('Dismissed:', outcome.closeReason);
        }
    });
```

### 3. Pre-fetch a paywall

```js
const req = Purchasely.PresentationBuilder.placement('ONBOARDING').build();

// Fetch from network first (shows your own loading indicator)
req.preload().then((presentation) => {
    console.log('Paywall loaded', presentation.screenId);
    // Display when ready
    return req.display();
}).then((outcome) => {
    console.log('Dismissed:', outcome.closeReason);
});
```

### 4. Intercept actions (Observer mode)

```js
Purchasely.interceptAction('purchase', async (info, payload) => {
    try {
        const success = await MyBilling.purchase(payload.plan.productId);
        if (success) {
            Purchasely.synchronize();   // report receipt to Purchasely
            return 'success';           // 'success' | 'failed' | 'notHandled'
        }
        return 'failed';
    } catch (e) {
        return 'failed';
    }
});
```

### 5. Handle deeplink-opened paywalls

```js
// Set a handler for presentations opened by campaigns / deeplinks / Promoted IAP
Purchasely.setDefaultPresentationDismissHandler((outcome) => {
    // outcome = { presentation, purchaseResult, plan, closeReason, error }
    if (outcome.purchaseResult === 'purchased') {
        console.log('Purchased via deeplink', outcome.plan && outcome.plan.vendorId);
    }
});

// Pass deeplinks to Purchasely
Purchasely.handleDeeplink('app://ply/presentations/...', (handled) => {
    console.log('Handled by Purchasely:', handled);
}, console.error);
```

## Documentation

Full documentation is available at [https://docs.purchasely.com](https://docs.purchasely.com/quick-start/sdk-installation/cordova).

Migration guide: [`MIGRATION-v6.md`](MIGRATION-v6.md).

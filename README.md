# Cordova plugin Purchasely

Purchasely is a solution to ease the integration and boost your In-App Purchase & Subscriptions on the App Store, Google Play Store and Huawei App Gallery.

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

The v6 plugins wrap the native Purchasely **6.0** SDKs (iOS `6.0.0-rc.1`, Android
`6.0.0-rc.1`). The native Android SDK raises the toolchain baseline — set these in
your app's `config.xml` so the cordova-android build matches:

```xml
<preference name="android-minSdkVersion" value="24" />          <!-- SDK requires ≥ 23 -->
<preference name="android-compileSdkVersion" value="36" />
<preference name="AndroidGradlePluginVersion" value="8.9.2" />  <!-- compileSdk 36 needs AGP ≥ 8.9.1 -->
<preference name="GradlePluginKotlinVersion" value="2.2.21" />  <!-- core 6.0 is compiled with Kotlin 2.2.x -->
<preference name="GradleVersion" value="8.13" />
```

Requirements summary:

| | iOS | Android |
|---|---|---|
| Native SDK | `Purchasely 6.0.0-rc.1` (pod) | `io.purchasely:core / google-play 6.0.0-rc.1` |
| Min OS | iOS 13.4 | minSdk 23 |
| Build | Xcode 15+, CocoaPods | compileSdk 36, AGP ≥ 8.9.1, Kotlin 2.2.x, Gradle 8.13, JDK 17 |
| Stores | App Store | Google Play (Billing 8.x) — no video player on Cordova |

> ⚠️ Migrating from v5? See [`MIGRATION-v6.md`](MIGRATION-v6.md). v6 is a major
> release with breaking renames (`allowDeeplink`, `handleDeeplink`,
> `RunningMode.observer`) and a default running-mode change to **Observer**.

## Usage

More details in our [documentation](https://docs.purchasely.com/quick-start/sdk-implementation) 

```js
Purchasely.start(
    'API_KEY',                     // set your own api key
    ['Google'],                    // list of stores for Android, accepted values: Google, Huawei and Amazon
    false,                         // set to false to use StoreKit2, true to use StoreKit1
    null,                          // set your user id
    Purchasely.LogLevel.DEBUG,     // log level, should be warning or error in production
    Purchasely.RunningMode.full,   // running mode, can be observer or full (default is observer in v6)
    (isConfigured) => {
        if(isConfigured) {
            // Purchasely is ready, you can display paywalls, set user attributes, start a purchase flow etc.
        }
    },
    (error) => {
        console.log(error);
    }
);

// display a paywall from a placement
Purchasely.presentPresentationForPlacement(
    'placementId',
    'my_content_id', // may be null
    false, //display in fullscreen mode
    (callback) => {
        console.log(callback);
        if(callback.result == Purchasely.PurchaseResult.CANCELLED) {
            console.log("User cancelled purchased");
        } else {
            console.log("User purchased " + callback.plan.name);
        }
    },
    (error) => {
        console.log("Error with purchase : " + error);
    }
);
```

## 🏁 Documentation

A complete documentation is available on our website [https://docs.purchasely.com](https://docs.purchasely.com/quick-start/sdk-installation/cordova)

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

## Usage

More details in our [documentation](https://docs.purchasely.com/quick-start/sdk-implementation).

> **Upgrading from 5.x?** See [MIGRATION-v6.md](MIGRATION-v6.md) — `start()` now takes an
> options object, `RunningMode` defaults to `observer`, the presentation API is now a
> builder (`Purchasely.presentation`), and a few methods were renamed.

```js
Purchasely.start(
    {
        apiKey: 'API_KEY',                  // set your own api key
        stores: [Purchasely.Store.google],  // Android stores: Store.google, Store.huawei, Store.amazon
        storeKit1: false,                   // iOS: false to use StoreKit2, true for StoreKit1
        appUserId: null,                    // set your user id
        logLevel: Purchasely.LogLevel.DEBUG, // should be warning or error in production
        runningMode: Purchasely.RunningMode.full // observer or full (defaults to observer)
    },
    (isConfigured) => {
        if(isConfigured) {
            // Purchasely is ready, you can display paywalls, set user attributes, start a purchase flow etc.
        }
    },
    (error) => {
        console.log(error);
    }
);

// display a paywall from a placement — Purchasely.presentation is the v6 builder:
// pick a source (.placement/.screen/.defaultSource), .build(), then .display(transition?).
// display() resolves at dismiss with a 5-field outcome.
Purchasely.presentation
    .placement('placementId')
    .contentId('my_content_id') // optional, may be omitted
    .build()
    .display(Purchasely.TransitionType.fullScreen) // display mode
    .then((outcome) => {
        console.log(outcome);
        if (outcome.error) {
            console.log("Error with purchase : " + outcome.error);
        } else if (outcome.purchaseResult === 'purchased' || outcome.purchaseResult === 'restored') {
            console.log("User purchased " + outcome.plan.name);
        } else {
            console.log("User cancelled purchased");
        }
    });
```

## 🏁 Documentation

A complete documentation is available on our website [https://docs.purchasely.com](https://docs.purchasely.com/quick-start/sdk-installation/cordova)

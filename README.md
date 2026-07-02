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
> options object, `RunningMode` defaults to `observer`, and a few methods were renamed.

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

// display a paywall from a placement
Purchasely.presentPresentationForPlacement(
    'placementId',
    'my_content_id', // may be null
    Purchasely.TransitionType.fullScreen, // display mode
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

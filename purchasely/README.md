# Cordova plugin Purchasely

Purchasely is a solution to ease the integration and boost your In-App Purchase & Subscriptions on the App Store, Google Play Store and Huawei App Gallery.

## Installation

```sh
cordova plugin add @purchasely/cordova-plugin-purchasely
```

## Usage

> **Upgrading from 5.x?** See [MIGRATION-v6.md](../MIGRATION-v6.md).

```js
Purchasely.start(
    {
        apiKey: 'API_KEY',
        stores: [Purchasely.Store.google], // Android stores: Store.google, Store.huawei, Store.amazon
        appUserId: null, // your user id
        logLevel: Purchasely.LogLevel.DEBUG, // should be warning or error in production
        runningMode: Purchasely.RunningMode.full // observer or full (defaults to observer)
    },
    (isConfigured) => {
        if(isConfigured) {} // you can use the SDK like display a paywall or make a purchase
    },
    (error) => {
        console.log(error);
    }
);

Purchasely.presentPresentationWithIdentifier(
    'my_presentation_id', // may be null
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

# Cordova plugin Purchasely

Purchasely is a solution to ease the integration and boost your In-App Purchase & Subscriptions on the App Store, Google Play Store and Huawei App Gallery.

## Installation

```sh
cordova plugin add @purchasely/cordova-plugin-purchasely
```

## Usage

```js
Purchasely.startWithAPIKey(
    'API_KEY',
    ['Google'], // list of stores for Android, accepted values: Google, Huawei and Amazon
    null, // your user id
    Purchasely.LogLevel.DEBUG, // log level, should be warning or error in production
    Purchasely.RunningMode.full, // running mode
    (isConfigured) => {
        if(isConfigured) // you can use the SDK like display a paywall or make a purchase
    },
    (error) => {
        console.log(error);
    }
);

Purchasely.presentPresentationWithIdentifier(
    'my_presentation_id', // may be null
    'my_content_id', // may be null
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

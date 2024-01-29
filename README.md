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

```js
Purchasely.start(
    'API_KEY',                     // set your own api key
    ['Google'],                    // list of stores for Android, accepted values: Google, Huawei and Amazon
    false,                         // set to false to use StoreKit2, true to use StoreKit1
    null,                          // set your user id
    Purchasely.LogLevel.DEBUG,     // log level, should be warning or error in production
    Purchasely.RunningMode.full,   // running mode, can be paywallObserver or full
    (isConfigured) => {
        if(isConfigured) onPuchaselySdkReady();
    },
    (error) => {
        console.log(error);
    }
);

Purchasely.presentPresentationWithIdentifier(
    'my_presentation_id', // may be null
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

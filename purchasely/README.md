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

Purchasely.presentation
    .placement('my_placement_id') // or .screen('my_presentation_id'), .defaultSource()
    .contentId('my_content_id') // may be omitted
    .build()
    .display(Purchasely.TransitionType.fullScreen) // display mode
    .then((outcome) => {
        console.log(outcome);
        if (outcome.purchaseResult === 'purchased') {
            console.log("User purchased " + outcome.plan.name);
        } else if (outcome.purchaseResult === 'cancelled') {
            console.log("User cancelled purchase");
        } else {
            console.log("Dismissed", outcome.closeReason);
        }
    });
```

## Limitations

- **No inline/embedded paywall view.** iOS, Android, Flutter and React Native all support
  embedding a paywall directly inside a screen (`PLYPresentationView` / `buildView` /
  `getFragment`). This is not available on Cordova: the plugin only supports
  modal/fullscreen/push presentation via the presentation builder
  (`Purchasely.presentation.…build().display()`). Embedding a native view inside the WebView
  isn't supported by this bridge architecture; this is an accepted platform limitation, not a bug.

## 🏁 Documentation

A complete documentation is available on our website [https://docs.purchasely.com](https://docs.purchasely.com/quick-start/sdk-installation/cordova)

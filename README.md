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

## What is new in 6.1.0

### Anonymous user id

Set the anonymous user id the SDK reports for this device.

```js
Purchasely.start({
    apiKey: 'API_KEY',
    anonymousUserId: '3f2504e0-4f89-11d3-9a0c-0305e82c3301'
}, onConfigured, onError);
```

`anonymousUserId` must be a canonical UUID string. JavaScript has no UUID type, so the
native bridge parses the string. The bridge logs an error and skips the option when the
string is not a canonical UUID. The SDK still starts.

The SDK stores the id in uppercase, and applies it only when the device holds no anonymous
id yet. Add `anonymousUserIdOverride: true` to replace an existing id.

**An override splits the user history.** The backend keeps every event and every purchase
under the previous id. Use it only when your app owns the anonymous identity, for example
after a cross-device restore.

### API proxy

Route the Purchasely API traffic through a proxy instead of `api.purchasely.io`, for a
region where that host is unreachable, such as mainland China.

```js
Purchasely.start({ apiKey: 'API_KEY', proxy: 'https://svc.purchasely.io' }, onConfigured, onError);
```

Purchasely operates a proxy at `https://svc.purchasely.io`. You can also host your own.

The SDK overrides the API host only: the paywall host and the tracking host stay on
production. `proxy` must be an `https` base URL with a host, and it must carry no query,
no fragment and no credentials. Each native SDK refuses any other value with an error log,
keeps the production host, and drops a trailing slash.

This is a start-time option on both platforms. Neither native SDK has a runtime setter
for it.

**The option has three states, and they are not interchangeable.** Passing `null` clears
the proxy, which is a supported operation and not an error:

| Call | Effect |
|------|--------|
| `proxy: 'https://svc.purchasely.io'` | routes the API host |
| `proxy: null` | **clears** the proxy, back to `api.purchasely.io` |
| the key is absent | leaves the current setting untouched |

So pass the key with `null` to clear, and omit the key to leave the setting alone. Through
the builder:

```js
Purchasely.builder('API_KEY').proxy(null).start();   // clear
Purchasely.builder('API_KEY').start();               // leave untouched
```

`proxy()` with no argument is refused with an error log, because the no-argument native
modifiers disagree: on iOS it routes through Purchasely's own proxy, on Android it clears.
Always pass a URL or `null`.

### Web2App redemption

Listen to the outcome of a Web2App redemption (`{scheme}://ply/redeem/{token}`).

A redemption can settle **during** `start()`, from a cold start the link itself triggered
or from a token a previous launch left pending. Neither native SDK has a runtime setter for
the delegate, so a listener registered after `start()` misses exactly the case the feature
exists for.

Put the listener on the start builder. It subscribes when you chain it, before `start()`
runs, so the ordering cannot go wrong:

```js
Purchasely.builder('API_KEY')
    .webRedemptionListener((result) => {
        if (result.isSuccess) {
            console.log('Redemption granted', result.context && result.context.subscription);
            if (result.replay) {
                console.log('The server reports this token was redeemed before');
            }
        } else {
            // Show errorMessage to the user. Do not log it: see the note below.
            showError(result.errorCode, result.errorMessage);
        }
    })
    .start();
```

The optional second argument is shorthand for `appHandlesRedemptionAlert`:

```js
Purchasely.builder('API_KEY').webRedemptionListener(onRedemption, true).start();
```

**Secondary path, for the runtime case.** `Purchasely.addWebRedemptionListener(cb)` and
`Purchasely.removeWebRedemptionListener()` let an app replace the listener while the SDK
already runs. The trade-off: a redemption that settles during `start()` is missed, so call
it before `start()` if you use it at all.

```js
Purchasely.addWebRedemptionListener((result) => { /* ... */ });

Purchasely.start({
    apiKey: 'API_KEY',
    appHandlesRedemptionAlert: false // default: the SDK shows its own popin
}, onConfigured, onError);
```

The SDK calls the listener on the main thread, exactly once per settled redemption, on
success and on failure alike. `appHandlesRedemptionAlert` decides *when*:

| Value | The SDK shows | The SDK calls the listener |
|-------|---------------|----------------------------|
| `false` (default) | its own result popin | after the user acknowledges the popin |
| `true` | nothing | as soon as the redemption settles |

The result has five fields:

| Field | Description |
|-------|-------------|
| `isSuccess` | `true` for a granted redemption, `false` for a failed one |
| `context` | What the redemption granted, or `null`. `context.subscription` is separately nullable |
| `replay` | `true` when the server reports the token was redeemed before |
| `errorCode` | `'EXPIRED_REDEMPTION_TOKEN'`, `'INVALID_REDEMPTION_TOKEN'`, or `null` |
| `errorMessage` | Human-readable reason, or `null` |

Three behaviours to know:

- `replay` is a verdict about the **token**, not an observation of the user. The SDK keeps
  no cache and calls the server on every attempt.
- A redemption deeplink is **not** subject to `allowDeeplink`. The native SDK intercepts
  `ply/redeem` before the routing branch that gate sits behind, so a redemption still
  completes with `allowDeeplink: false`.
- **On iOS only**, `errorMessage` for an expired link can contain a masked email address,
  so you can tell the user where the fresh link went. Show that text to the user. Do not
  send it to an analytics stack or to a crash reporter. The `REDEMPTION_FAILED` event
  drops it.

The SDK also emits two analytics events for a redemption, `REDEMPTION_CONSUMED` and
`REDEMPTION_FAILED`. Read them with `Purchasely.addEventListener`. The payload is in
`event.properties.redemption`:

| Field | On | Description |
|-------|----|-------------|
| `token` | both | the redemption link token the event reports on |
| `receipt` | consumed | `{ id, validation_status }`, where `validation_status` is uppercase, e.g. `'COMPLETED'` |
| `subscriptions` | consumed | what the redemption transferred. Active subscriptions and non-consumables only: an expired subscription is absent, because a redemption grants rather than reports history |
| `purchase_context` | consumed | `{ version, source, sandbox, replay, built_in_attributes, custom_attributes }` |
| `error_code` | failed | `'EXPIRED_REDEMPTION_TOKEN'`, `'INVALID_REDEMPTION_TOKEN'`, or absent for a failure that never reached the server |

A failure also carries the reason in the **top-level** `event.properties.error_message`,
not inside `redemption`. The masked email hint never reaches this event: the SDK gives it
to the redemption listener only, on iOS.

### A note on subscription fields, on iOS

The native iOS `PLYSubscription` has no purchase token property, so the iOS bridge cannot
emit `purchaseToken` and never did. It also omits `nextRenewalDate` and `cancelledDate`
when the native date is `nil`.

Read all three as optional rather than as guaranteed strings. This affects
`userSubscriptions()` and `userSubscriptionsHistory()` as well as the redemption
`context.subscription`, since the three share one mapper. Cordova ships plain JavaScript
with no type declarations, so nothing enforces this for you:

```js
const token = subscription.purchaseToken;         // undefined on iOS
const renews = subscription.nextRenewalDate || null;
```

## 🏁 Documentation

A complete documentation is available on our website [https://docs.purchasely.com](https://docs.purchasely.com/quick-start/sdk-installation/cordova)

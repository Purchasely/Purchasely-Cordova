# Migrating the Purchasely Cordova plugin to SDK v6

The Purchasely Cordova plugin v6 wraps the **native Purchasely 6.0 SDKs**
(iOS `6.0.0-rc.1`, Android `6.0.0-rc.1`). Unlike the React Native and Flutter
v6 plugins — which introduced a brand new builder API — the Cordova
JavaScript surface is **kept method‑based and almost entirely unchanged**: the
native bridges were rewired to the v6 SDK behind the existing `cordova.exec`
actions. This guide lists the **only** JS‑visible changes a host app must make.

> v6 is a **major** release. There is **no v5 source‑compatibility shim**: the
> renamed methods below were renamed, not aliased.

---

## TL;DR — what changed for a Cordova host app

| v5 (removed) | v6 |
|--------------|----|
| `Purchasely.readyToOpenDeeplink(bool)` | `Purchasely.allowDeeplink(bool)` |
| `Purchasely.isDeeplinkHandled(url, success, error)` | `Purchasely.handleDeeplink(url, success, error)` |
| `Purchasely.RunningMode.paywallObserver` | `Purchasely.RunningMode.observer` |
| `Purchasely.synchronize()` (fire‑and‑forget) | `Purchasely.synchronize(success, error)` (resolves on completion) |
| `Purchasely.presentSubscriptions()` | **no‑op** (native subscriptions UI removed) |
| `Purchasely.setDefaultPresentationResultHandler(cb)` | `Purchasely.setDefaultPresentationDismissHandler(cb)` (richer outcome — see §8) |

Everything else — `start`, `fetchPresentation` / `fetchPresentationForPlacement`,
`presentPresentation`, `presentPresentationForPlacement`,
`setPaywallActionInterceptor` + `onProcessAction`, `userLogin`/`userLogout`,
`allProducts`, `purchaseWithPlanVendorId`, `restoreAllProducts`,
`userSubscriptions(History)`, every `setUserAttributeWith*`, `setThemeMode`,
`revokeDataProcessingConsent`, … — keeps the **same name and signature**.

---

## 1. Install the v6 plugins

Both Cordova plugins must be pinned to the **same** version:

```bash
cordova plugin add @purchasely/cordova-plugin-purchasely@6.0.0-rc.1
cordova plugin add @purchasely/cordova-plugin-purchasely-google@6.0.0-rc.1
```

This pulls the native SDKs:

| Platform | Native artifact |
|----------|-----------------|
| iOS | `pod 'Purchasely', '6.0.0-rc.1'` (CocoaPods) |
| Android | `io.purchasely:core:6.0.0-rc.1` + `io.purchasely:google-play:6.0.0-rc.1` (Maven Central) |

> ⚠️ **Every `io.purchasely:*` dependency must resolve to the same pre‑release**:
> a stray `6.0.0` (release) ranks *above* `6.0.0-rc.1` in Gradle and silently
> upgrades `core`, producing a `NoSuchMethodError` at runtime.

There is **no video player plugin on Cordova** (the `io.purchasely:player`
artifact is not bridged).

---

## 2. Running mode — default is now Observer (native change)

In v6 the **native default running mode changed from Full to Observer**. The
Cordova `start` call always passes a running mode explicitly, so this is mostly
transparent — but make sure you pass `Full` if Purchasely must own the purchase
flow, and use the renamed `observer` constant:

```js
Purchasely.start(
  'API_KEY',
  ['Google'],
  false,                      // storeKit1 (iOS) — false = StoreKit 2
  null,                       // userId
  Purchasely.LogLevel.DEBUG,
  Purchasely.RunningMode.full, // .observer | .full  (was .paywallObserver | .full)
  (isConfigured) => { /* started */ },
  (error) => console.error(error)
);
```

`Purchasely.RunningMode.paywallObserver` was **removed** — use
`Purchasely.RunningMode.observer` (same value `2`).

---

## 3. Deeplinks renamed

```js
// Before (v5)
Purchasely.readyToOpenDeeplink(true);
Purchasely.isDeeplinkHandled(url, onHandled, onError);

// After (v6)
Purchasely.allowDeeplink(true);
Purchasely.handleDeeplink(url, onHandled, onError);
```

`allowDeeplink` maps to native `Purchasely.allowDeeplink(_:)` and
`handleDeeplink` to native `Purchasely.handleDeeplink(_:)` /
`handleDeeplink(uri, activity)`.

---

## 4. `synchronize` now reports completion

```js
// Before (v5): fire-and-forget, no callbacks
Purchasely.synchronize();

// After (v6): optional success / error callbacks, resolved when the
// native synchronize(success:failure:) / synchronize(onSuccess,onError) finishes.
Purchasely.synchronize(
  () => console.log('Purchasely synchronized'),
  (error) => console.error('Sync failed', error)
);
```

Calling `Purchasely.synchronize()` with no arguments still works (the callbacks
are optional).

---

## 5. `presentSubscriptions` is a no‑op

The native subscriptions‑list UI was removed from both SDKs in v6
(`subscriptionsController` on iOS, `subscriptionsFragment` on Android).
`Purchasely.presentSubscriptions()` now logs a warning and does nothing. Build
your own management screen from `Purchasely.userSubscriptions(...)` /
`Purchasely.userSubscriptionsHistory(...)`.

---

## 6. Behaviour notes (no API change)

- **Action interceptor** — `setPaywallActionInterceptor(cb)` + `onProcessAction(bool)`
  keep working exactly as before. Internally the bridge now registers one v6
  per‑action interceptor per action kind and maps `onProcessAction(true)` →
  `NOT_HANDLED` (let Purchasely proceed) and `onProcessAction(false)` →
  `SUCCESS` (you handled it). The `result.info.presentationId` /
  `result.parameters.*` shapes are unchanged.
- **`fetchPresentation` + `presentPresentation`** — unchanged JS contract. The
  bridge now uses the native `PLYPresentationBuilder` (iOS) /
  `PLYPresentation { }` DSL (Android) under the hood.
- **`showPresentation` / `hidePresentation`** — v6 has no native hide/show. The
  bridge retains the last displayed presentation: `hidePresentation()` closes all
  screens and `showPresentation()` **re‑displays** the retained presentation. In
  Observer mode you generally no longer need the hide/show dance: run your
  purchase, call `synchronize()`, return via `onProcessAction(false)` and
  `closePresentation()`.
- **`presentProductWithIdentifier` / `presentPlanWithIdentifier`** — product‑ and
  plan‑specific presentations were removed natively. The bridge displays the
  presentation by its **screenId** (the 2nd argument, formerly “presentationId”) —
  a presentation is identified by a `placementId` **or** a `screenId`.
- **Purchase result codes are unchanged** — `Purchasely.PurchaseResult`
  (`PURCHASED:0, CANCELLED:1, RESTORED:2`) keeps the same values; the bridge maps
  the new native `PLYPurchaseResult` to them.

---

## 7. Observer‑mode purchase flow (unchanged JS pattern)

```js
Purchasely.setPaywallActionInterceptor((result) => {
  if (result.action === Purchasely.PaywallAction.purchase) {
    // run your own billing flow, then:
    Purchasely.synchronize();        // upload the receipt to Purchasely
    Purchasely.onProcessAction(false); // you handled the purchase
    Purchasely.closePresentation();    // Observer mode does not auto-close
  } else {
    Purchasely.onProcessAction(true);  // let Purchasely proceed
  }
});
```

---

## 8. Default presentation dismiss handler renamed (+ richer outcome)

The global handler for presentations the app did **not** open itself — campaigns,
deeplinks, Promoted In‑App Purchases — was renamed (native v6 breaking change, no
alias):

```js
// Before (v5)
Purchasely.setDefaultPresentationResultHandler(onResult, onError);

// After (v6)
Purchasely.setDefaultPresentationDismissHandler(onResult, onError);
```

The success callback now receives a **richer outcome object**. The legacy `result`
(PurchaseResult code) and `plan` fields are **kept** for source compatibility, and
three v6 fields are added for parity with the React Native / Flutter SDKs:

| Field | Type | Notes |
|---|---|---|
| `result` | int | Legacy `PurchaseResult` code (`0`=PURCHASED, `1`=CANCELLED, `2`=RESTORED). Unchanged. |
| `plan` | object | The purchased/restored plan (unchanged shape). |
| `purchaseResult` | string \| null | `'purchased'` \| `'cancelled'` \| `'restored'` \| `null` (no purchase). |
| `closeReason` | string \| null | `'button'`, `'back_system'` (Android system back / interactive dismiss), `'interactiveDismiss'` (iOS), `'programmatic'`, or `null`. |
| `presentation` | object \| null | The presentation that produced the outcome — **always populated** for this handler, so you can tell which campaign/deeplink closed (`screenId`, `placementId`, `campaignId`, `abTestId`, …). |

```js
Purchasely.setDefaultPresentationDismissHandler((outcome) => {
  console.log('Dismissed:', outcome.presentation && outcome.presentation.screenId);
  console.log('Purchase:', outcome.purchaseResult, '/ close:', outcome.closeReason);
  if (outcome.result === Purchasely.PurchaseResult.PURCHASED) {
    console.log('Purchased', outcome.plan && outcome.plan.vendorId);
  }
}, (error) => console.error(error));
```

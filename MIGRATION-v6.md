# Migrating the Purchasely Cordova plugin to SDK v6

Purchasely Cordova plugin **v6 is a full rewrite of the paywall API** (no v5
source-compatibility shim). The JavaScript surface now matches the chainable
**builder API** introduced in the React Native and Flutter v6 SDKs. Calling any
removed v5 paywall method will throw at runtime — these methods no longer exist.

> v6 wraps **iOS 6.0.0-rc.1** (CocoaPods) and **Android 6.0.0-beta.12**
> (mavenLocal, testing pin — to be restored to a final published version before
> release). See [native pins](#native-sdk-pins) for details.

---

## TL;DR

The paywall surface is now built around three entry points on the `Purchasely`
export:

- `Purchasely.builder(apiKey)` — chainable SDK start.
- `Purchasely.PresentationBuilder` — `.placement(id)`, `.screen(id)`, `.default()`.
- `Purchasely.interceptAction(kind, handler)` — typed action interception (no more `onProcessAction`).

`PresentationBuilder.build()` returns a **`PresentationRequest`** with a
lifecycle (`preload()`, `display(transition?)`, `close()`, `back()`).

`display()` resolves at **dismiss** with a 5-field outcome:
`{ presentation, purchaseResult, plan, closeReason, error }`.

All **core** methods (user identity, products, subscriptions, attributes,
event listeners, deeplinks) are **unchanged**.

---

## Removed v5 paywall API → v6 replacement

| Removed v5 method | v6 replacement |
|---|---|
| `Purchasely.start(apiKey, stores, storeKit1, userId, logLevel, runningMode, success, error)` | `Purchasely.builder(apiKey).appUserId(userId).runningMode('full').logLevel('error').stores(['google']).storekitVersion('storeKit2').start()` |
| `Purchasely.fetchPresentation(placementId, …)` | `Purchasely.PresentationBuilder.placement(id).build().preload()` |
| `Purchasely.fetchPresentationForPlacement(placementId, …)` | `Purchasely.PresentationBuilder.placement(id).build().preload()` |
| `Purchasely.presentPresentationForPlacement(placementId, contentId, fullscreen, success, error)` | `Purchasely.PresentationBuilder.placement(id).contentId(cid).build().display()` |
| `Purchasely.presentPresentation(presentation, …)` | Preload then display the same request: `const req = …build(); await req.preload(); await req.display()` |
| `Purchasely.showPresentation()` | `request.display()` |
| `Purchasely.hidePresentation()` / `Purchasely.closePresentation()` | `request.close()` |
| `Purchasely.setPaywallActionInterceptor(cb)` + `Purchasely.onProcessAction(bool)` | `Purchasely.interceptAction(kind, handler)` — handler returns `'success' \| 'failed' \| 'notHandled'` (no more `onProcessAction`) |
| `Purchasely.setDefaultPresentationResultHandler(cb)` | `Purchasely.setDefaultPresentationDismissHandler(outcome => …)` — renamed (breaking, no alias) |
| `Purchasely.presentSubscriptions()` | **REMOVED — no replacement.** Build your own UI with `Purchasely.userSubscriptions()`. |
| `Purchasely.readyToOpenDeeplink(bool)` | `Purchasely.allowDeeplink(bool)` (or `.allowDeeplink(true)` in the builder) |
| `Purchasely.isDeeplinkHandled(url, success, error)` | `Purchasely.handleDeeplink(url, success, error)` |
| `Purchasely.RunningMode.paywallObserver` | `Purchasely.RunningMode.observer` (same numeric value `2`) |

---

## 1. Install the v6 plugins

```bash
cordova plugin add @purchasely/cordova-plugin-purchasely@6.0.0-rc.1
cordova plugin add @purchasely/cordova-plugin-purchasely-google@6.0.0-rc.1
```

Both plugins must be pinned to the **same** version.

---

## 2. SDK initialization — `Purchasely.builder()`

### Before (v5 — removed)

```js
Purchasely.start(
  'API_KEY',
  ['Google'],
  false,                            // storeKit1 = false → StoreKit 2
  null,                             // userId
  Purchasely.LogLevel.DEBUG,
  Purchasely.RunningMode.full,      // was .paywallObserver | .full
  (isConfigured) => { /* started */ },
  (error) => console.error(error)
);
```

### After (v6)

```js
Purchasely.builder('API_KEY')
    .runningMode('full')            // 'observer' (default) | 'full'
    .appUserId(null)                // set if known at start time
    .logLevel('debug')              // 'debug'|'info'|'warn'|'error'
    .stores(['google'])             // Android stores; 'google'|'huawei'|'amazon'
    .storekitVersion('storeKit2')   // iOS; 'storeKit2' (recommended) | 'storeKit1'
    .allowDeeplink(true)            // optional — allow deeplink display
    .allowCampaigns(true)           // optional — allow campaign display (default true)
    .start()
    .then((configured) => {
        if (configured) {
            // SDK ready — display paywalls, set attributes, etc.
        }
    })
    .catch((error) => console.error('SDK start failed', error));
```

**Builder chain:** `Purchasely.builder(apiKey)` is the static entry point.
Every method except `.start()` returns the builder itself (fluent API).
`.start()` returns a `Promise<boolean>`.

Default values when not specified: `runningMode('observer')`,
`logLevel('error')`, `allowDeeplink(false)`, `allowCampaigns(true)`,
`stores(['google'])`, `storekitVersion('storeKit2')`.

> **BREAKING:** `RunningMode.paywallObserver` is removed. Use
> `Purchasely.RunningMode.observer` or the string `'observer'`.

---

## 3. Displaying paywalls — `PresentationBuilder`

### Before (v5 — removed)

```js
Purchasely.presentPresentationForPlacement(
  'placementId',
  'contentId',        // optional
  false,              // fullscreen
  (callback) => {
    if (callback.result === Purchasely.PurchaseResult.CANCELLED) {
      console.log('User cancelled');
    } else {
      console.log('Purchased', callback.plan.name);
    }
  },
  (error) => console.log('Error', error)
);
```

### After (v6)

```js
const outcome = await Purchasely.PresentationBuilder
    .placement('ONBOARDING')
    .contentId('my_content_id')     // optional
    .build()
    .display();                     // resolves at dismiss

// outcome = { presentation, purchaseResult, plan, closeReason, error }
if (outcome.error) {
    console.error(outcome.error.message);
} else if (outcome.purchaseResult === 'purchased' || outcome.purchaseResult === 'restored') {
    console.log('User purchased', outcome.plan && outcome.plan.name);
} else {
    console.log('Dismissed:', outcome.closeReason);
}
```

### Entry points

| Method | Description |
|---|---|
| `Purchasely.PresentationBuilder.placement(id)` | Show the paywall configured for a placement |
| `Purchasely.PresentationBuilder.screen(id)` | Show a specific screen by its vendor ID |
| `Purchasely.PresentationBuilder.default()` | Default handler for presentations the app did not open (campaigns, deeplinks, Promoted IAP) |

### Builder options

```js
Purchasely.PresentationBuilder.placement('PLACEMENT_ID')
    .contentId('optional_content_id')
    .onLoaded((presentation, error) => { /* preload callback */ })
    .onPresented((presentation, error) => { /* displayed */ })
    .onCloseRequested(() => { /* user pressed close */ })
    .onDismissed((outcome) => { /* dismissed with outcome */ })
    .build()
    .display('fullScreen');         // optional transition (see TransitionType)
```

### `display(transition?)` transition types

```js
Purchasely.TransitionType.fullScreen   // default full-screen modal
Purchasely.TransitionType.push         // push navigation
Purchasely.TransitionType.modal        // sheet modal
Purchasely.TransitionType.drawer       // side drawer
Purchasely.TransitionType.popin        // small pop-in
Purchasely.TransitionType.inlinePaywall
```

### 5-field dismiss outcome

| Field | Type | Notes |
|---|---|---|
| `presentation` | object \| null | The presentation that was displayed (`screenId`, `placementId`, `contentId`, `abTestId`, …) |
| `purchaseResult` | string \| null | `'purchased'` \| `'restored'` \| `'cancelled'` \| `null` (no purchase) |
| `plan` | object \| null | The purchased/restored plan |
| `closeReason` | string \| null | `'button'` (user tapped close), `'backSystem'` (Android back button / iOS interactive dismiss — see note below), `'programmatic'` (closed by `request.close()`), or `null` |
| `error` | object \| null | Error object — mutually exclusive with `closeReason` |

> **`closeReason: 'backSystem'`** — iOS interactive dismiss (swipe-to-dismiss on a
> modal sheet) maps to `'backSystem'` in the Cordova plugin (same as Android's
> system back gesture). The native `PLYCloseReason.interactiveDismiss` (iOS) is
> normalized to `'backSystem'` by the JS bridge for cross-platform parity.

---

## 4. Pre-fetching (preload + display)

```js
// Step 1 — preload (fetches from network)
const req = Purchasely.PresentationBuilder.placement('ONBOARDING').build();
const presentation = await req.preload();

// At this point `presentation` is available (screenId, type, plans, etc.)
// You can inspect it before deciding to display.

// Step 2 — display the same request when ready
const outcome = await req.display();
```

The same `PresentationRequest` instance is used for both steps. If you call
`display()` without `preload()`, the SDK fetches and displays in one step.

---

## 5. Action interceptor — `interceptAction`

### Before (v5 — removed)

```js
Purchasely.setPaywallActionInterceptor((result) => {
    if (result.action === Purchasely.PaywallAction.purchase) {
        // custom purchase flow
        Purchasely.synchronize();
        Purchasely.onProcessAction(false); // you handled it
    } else {
        Purchasely.onProcessAction(true);  // let Purchasely proceed
    }
});
```

### After (v6)

```js
Purchasely.interceptAction('purchase', async (info, payload) => {
    try {
        const storeProductId = payload.plan.productId;
        const success = await MyBilling.purchase(storeProductId);
        if (success) {
            Purchasely.synchronize();
            return 'success';   // you handled it
        }
        return 'failed';
    } catch (e) {
        return 'failed';
    }
});

// Let Purchasely handle all other actions
Purchasely.interceptAction('navigate', async (info, payload) => {
    console.log('Navigate to', payload.url);
    return 'notHandled';        // let Purchasely handle it
});
```

### Return values (`Purchasely.InterceptResult`)

| Value | Meaning |
|---|---|
| `'success'` | Your code handled the action successfully |
| `'failed'` | Your code tried but failed |
| `'notHandled'` | Let the SDK perform its default behaviour |

### Interceptable action kinds (`Purchasely.PresentationAction`)

| Kind | Description |
|---|---|
| `'close'` / `'closeAll'` | User tapped the close button |
| `'login'` | User tapped the login button |
| `'navigate'` | User wants to open an external URL |
| `'purchase'` | User tapped a purchase button |
| `'restore'` | User tapped the restore button |
| `'openPresentation'` | User wants to open another presentation |
| `'openPlacement'` | User wants to open another placement |
| `'promoCode'` | User wants to enter a promo code |
| `'webCheckout'` | User wants to start a web checkout |

### Managing interceptors

```js
Purchasely.removeActionInterceptor('purchase');    // remove one
Purchasely.removeAllActionInterceptors();           // remove all
```

---

## 6. Default presentation dismiss handler (renamed)

The global handler for presentations the app did **not** open itself (campaigns,
deeplinks, Promoted In-App Purchases) was renamed — breaking change, no alias:

### Before (v5 — removed)

```js
Purchasely.setDefaultPresentationResultHandler(onResult, onError);
```

### After (v6)

```js
Purchasely.setDefaultPresentationDismissHandler((outcome) => {
    // outcome = { presentation, purchaseResult, plan, closeReason, error }
    console.log('Presentation closed:', outcome.presentation && outcome.presentation.screenId);
    if (outcome.purchaseResult === 'purchased') {
        console.log('Purchased', outcome.plan && outcome.plan.vendorId);
    }
});

// Remove when no longer needed
Purchasely.removeDefaultPresentationDismissHandler();
```

The callback receives the same 5-field outcome as `display()`.

---

## 7. Observer mode (full example)

```js
// 1. Start in observer mode
await Purchasely.builder('API_KEY')
    .runningMode('observer')
    .start();

// 2. Intercept purchase actions
Purchasely.interceptAction('purchase', async (info, payload) => {
    try {
        const success = await MyBilling.purchase(payload.plan.productId);
        if (success) {
            Purchasely.synchronize(); // report receipt to Purchasely
            return 'success';
        }
        return 'failed';
    } catch (e) {
        return 'failed';
    }
});

// 3. Display a placement — resolves when user dismisses
const outcome = await Purchasely.PresentationBuilder
    .placement('ONBOARDING')
    .build()
    .display();

console.log('Outcome:', outcome.purchaseResult, outcome.closeReason);
```

---

## 8. `presentSubscriptions` is REMOVED (BREAKING)

> **BREAKING:** `Purchasely.presentSubscriptions()` has been **removed** — no
> replacement. The native subscriptions-list UI was removed from both native SDKs
> in v6. Build your own management screen from the data returned by
> `Purchasely.userSubscriptions(success, error)` and
> `Purchasely.userSubscriptionsHistory(success, error)`.

---

## 9. Inline `PLYPresentationView` — out of scope on Cordova

Cordova does **not** support the inline paywall view (`PLYPresentationView`). There
is no embedded/inline paywall in the Cordova plugin: paywalls are always displayed
as full overlays via `PresentationRequest.display()`. If you need an inline paywall,
use the React Native or Flutter SDK.

---

## 10. `synchronize` now reports completion

```js
// v5: fire-and-forget
Purchasely.synchronize();

// v6: optional callbacks (fully backward-compatible — no arguments still works)
Purchasely.synchronize(
    () => console.log('Synchronized'),
    (error) => console.error('Sync failed', error)
);
```

---

## 11. Deeplinks renamed

```js
// v5 (removed)
Purchasely.readyToOpenDeeplink(true);
Purchasely.isDeeplinkHandled(url, success, error);

// v6
Purchasely.allowDeeplink(true);
Purchasely.handleDeeplink(url, success, error);
```

---

## 12. What's unchanged (core methods)

All of the following keep the **exact same name and signature** as v5:

`getAnonymousUserId`, `userLogin`, `userLogout`, `setLogLevel`, `setAttribute`,
`addEventsListener`, `removeEventsListener`, `addUserAttributeListener`,
`removeUserAttributeListener`, `purchaseWithPlanVendorId`, `restoreAllProducts`,
`silentRestoreAllProducts`, `purchasedSubscription`, `allProducts`,
`planWithIdentifier`, `productWithIdentifier`, `userSubscriptions`,
`userSubscriptionsHistory`, `userDidConsumeSubscriptionContent`,
`setLanguage`, `setThemeMode`, `setDebugMode`,
`setUserAttributeWithString`, `setUserAttributeWithBoolean`,
`setUserAttributeWithInt`, `setUserAttributeWithDouble`,
`setUserAttributeWithDate`, `setUserAttributeWithStringArray`,
`setUserAttributeWithIntArray`, `setUserAttributeWithDoubleArray`,
`setUserAttributeWithBooleanArray`,
`userAttribute`, `clearUserAttribute`, `clearUserAttributes`,
`clearBuiltInAttributes`, `isEligibleForIntroOffer`, `signPromotionalOffer`,
`revokeDataProcessingConsent`.

---

## Native SDK pins

| Platform | Artifact | Pin |
|---|---|---|
| iOS | `pod 'Purchasely'` (CocoaPods) | `6.0.0-rc.1` |
| Android | `io.purchasely:core` + `io.purchasely:google-play` | `6.0.0-beta.12` (mavenLocal, testing pin) |

> **Android pin note:** The `setDefaultPresentationDismissHandler` rename and the
> `closeReason` / `presentation` fields in `PLYPresentationOutcome` live in
> `6.0.0-beta.12`, which is available from mavenLocal during development.
> The plugin.xml references `6.0.0-beta.12` and requires `mavenLocal()` in the
> repositories block. This will be updated to the final published version before
> the Cordova plugin's public release.

> **iOS rename note:** The iOS native SDK method
> `setDefaultPresentationDismissHandler` is gated behind iOS PR #652 (not yet
> merged). The Cordova iOS bridge code mirrors the Android implementation; it will
> not compile against the published `6.0.0-rc.1` pod until PR #652 ships. All
> other iOS bridge code compiles against `6.0.0-rc.1`.

# Migrating the Purchasely Cordova plugin to 6.0

`@purchasely/cordova-plugin-purchasely@6.0.0-rc.3` wraps the Purchasely **6.0** native
SDKs (iOS `Purchasely 6.0.0-rc.3`, Android `io.purchasely:core 6.0.0-rc.3`). This guide
lists every change to the JavaScript API. Most of the SDK is source-compatible; the
breaking surfaces are **SDK start**, the **presentation API** (now a builder, parity
with the React Native/Flutter SDKs), and the **action interceptor result**.

> The 6.0 line is a release candidate. It is published to npm under the `next` dist-tag:
> `cordova plugin add @purchasely/cordova-plugin-purchasely@next`.

## Install

```bash
cordova plugin add @purchasely/cordova-plugin-purchasely@6.0.0-rc.3
cordova plugin add @purchasely/cordova-plugin-purchasely-google@6.0.0-rc.3   # Google Play
```

---

## 1. `start()` now takes an options object (breaking)

The positional argument list is replaced by a single configuration object.

```js
// Before (5.x)
Purchasely.start(
  'YOUR_API_KEY',
  ['Google'],
  false,               // storeKit1
  null,                // userId
  Purchasely.LogLevel.DEBUG,
  Purchasely.RunningMode.full,
  (isConfigured) => { /* ... */ },
  (error) => { /* ... */ }
);

// After (6.0)
Purchasely.start(
  {
    apiKey: 'YOUR_API_KEY',
    stores: [Purchasely.Store.google],   // Store.google | Store.huawei | Store.amazon
    storeKit1: false,                    // iOS only
    appUserId: null,
    logLevel: Purchasely.LogLevel.DEBUG,
    runningMode: Purchasely.RunningMode.full,
    allowDeeplink: true,                 // optional
    allowCampaigns: true,                // optional
  },
  (isConfigured) => { /* ... */ },
  (error) => { /* ... */ }
);
```

Recognised options: `apiKey` (required), `appUserId`, `logLevel`, `runningMode`, `stores`,
`storeKit1` / `storekitVersion` (iOS), `allowDeeplink`, `allowCampaigns`, `deeplink`
(cold‑start URL).

## 2. `RunningMode` — new values, new default

Native 6.0 removed `transactionOnly` and `paywallObserver`; only **`observer`** and
**`full`** remain, and the SDK now **defaults to `observer`** (5.x behaved like `full`).

- `RunningMode` values are now **name strings** (`'observer'` / `'full'`), not integers —
  the underlying native enums use different raw values per platform, so the bridge maps by
  name. If you passed the numeric constants (`Purchasely.RunningMode.full`) you don't need
  to change anything.
- `RunningMode.paywallObserver` was **removed** — use `observer`.
- **To keep the 5.x behaviour where Purchasely owns the purchase flow, pass
  `runningMode: Purchasely.RunningMode.full`.**

## 3. `synchronize()` now reports completion

```js
// Before: fire-and-forget
Purchasely.synchronize();

// After: success / error callbacks
Purchasely.synchronize(
  (ok) => console.log('synchronized', ok),
  (error) => console.log(error)   // e.g. BillingUnavailable
);
```

## 4. Presentation API is now the v6 builder (breaking)

The imperative presentation surface (`presentPresentationForPlacement`,
`presentPresentationWithIdentifier`, `presentPresentationForDefault`, `fetchPresentation`,
`fetchPresentationForPlacement`, `fetchPresentationForDefault`, `presentPresentation`,
`backPresentation`) is **REMOVED**, not deprecated — replaced by a chainable, promise-based
builder that matches the React Native and Flutter SDKs. It wraps the exact same native
actions those methods used; only the JavaScript surface changed.

```js
// Present a placement full-screen (was presentPresentationForPlacement)
const outcome = await Purchasely.presentation.placement('ONBOARDING').build().display();

// Present a specific screen (was presentPresentationWithIdentifier)
await Purchasely.presentation.screen('SCREEN_ID').build().display();

// Present the default (audience-targeted) presentation (was presentPresentationForDefault)
await Purchasely.presentation.defaultSource().build().display(); // or .default(), iOS-style alias

// Preselect a product/plan content id (was the contentId parameter)
await Purchasely.presentation.placement('ONBOARDING').contentId('my_content_id').build().display();
```

`display()` resolves at **dismiss** with a 5-field outcome:
`{ presentation, purchaseResult, plan, closeReason, error }` (`presentation.screenId` is
the authoritative identifier — see below).

### Preloading (was `fetchPresentation*` + `presentPresentation`)

```js
const request = Purchasely.presentation.placement('ONBOARDING').build();
const presentation = await request.preload();   // screenId is authoritative
// ...later, re-display the exact screen that was preloaded:
const outcome = await request.display();
```

> `onPresented` / `onCloseRequested` fire on the `preload()` → `display()` re-display
> path on both platforms (matching the direct `display()` path). The final outcome always
> resolves on both platforms.

### Display transitions

`display(transition?)` takes the same transition object as before — a
`Purchasely.TransitionType` string, a legacy boolean (`true` → `fullScreen`, `false` →
`modal`), or a full transition object for drawer/popin sizing:

```js
await Purchasely.presentation.placement('ONBOARDING').build().display({
  type: Purchasely.TransitionType.drawer,
  dismissible: true,
  height: { type: Purchasely.DimensionType.percentage, value: 0.8 }, // 0.0–1.0
  backgroundColor: '#000000'
});
```

`TransitionType`: `fullScreen`, `modal`, `drawer`, `popin`, `push`, `inlinePaywall`.
`DimensionType`: `pixel`, `percentage`. `width` applies to `popin` only; `height` drives `drawer` + `popin`.

> Platform note: on **iOS** only a *percentage* `height` (plus `dismissible` and
> `backgroundColor`) is applied to drawer/popin — pixel sizing and popin `width` are not
> exposed to the bridge by the native iOS SDK. **Android** honors the full set.

### Presentation modifiers

`.backgroundColor(hex)` sets the loading/background color:

```js
await Purchasely.presentation.placement('ONBOARDING').backgroundColor('#101010').build().display();
```

> It is the only style modifier wired through the Cordova bridge, and it takes effect on
> **iOS** (passed to `presentPresentation`'s native background argument on the
> `preload()` → `display()` path, and via the transition on the direct path). On **Android**
> a background color only applies through a drawer/popin transition (native limitation). The
> RN/Flutter builder's `progressColor`, `displayCloseButton` and `displayBackButton` are
> **not** available on Cordova — no native present action accepts them.

### Lifecycle callbacks

`onPresented` / `onCloseRequested` / `onDismissed` are chained on the builder, before
`.build()`:

```js
const request = Purchasely.presentation.placement('ONBOARDING')
  .onPresented((presentation, error) => console.log('presented', presentation && presentation.screenId))
  .onCloseRequested(() => console.log('user requested close'))
  .onDismissed((outcome) => console.log('dismissed', outcome.purchaseResult, outcome.closeReason))
  .build();

await request.display();
```

> `onPresented` / `onCloseRequested` fire on both the direct `display()` path and the
> `preload()` → `display()` re-display path, on both platforms.

### Close / back

```js
request.close(); // closeAllScreens() under the hood — closes every displayed screen
request.back();  // was the standalone backPresentation()
```

### screenId is authoritative

Every presentation object returned by `preload()`, or carried in an outcome's
`presentation` field, exposes `screenId` as the stable public identifier (the JS bridge
tolerates a raw `id` fallback, `screenId ?? id`, for defensiveness). Any native re-display
handle used internally to make `preload()` → `display()` work (e.g. Android's synthetic
fetch handle) is a private implementation detail of the request and is never part of the
returned presentation object.

### Migration table

| Removed | Replacement |
|---|---|
| `fetchPresentation(id, contentId, ok, err)` | `Purchasely.presentation.screen(id).contentId(contentId).build().preload()` |
| `fetchPresentationForPlacement(id, contentId, ok, err)` | `Purchasely.presentation.placement(id).contentId(contentId).build().preload()` |
| `fetchPresentationForDefault(contentId, ok, err)` | `Purchasely.presentation.defaultSource().contentId(contentId).build().preload()` |
| `presentPresentationWithIdentifier(id, contentId, mode, ok, err, cb)` | `Purchasely.presentation.screen(id).contentId(contentId).onPresented(...).onCloseRequested(...).build().display(mode)` |
| `presentPresentationForPlacement(id, contentId, mode, ok, err, cb)` | `Purchasely.presentation.placement(id).contentId(contentId)...build().display(mode)` |
| `presentPresentationForDefault(contentId, mode, ok, err, cb)` | `Purchasely.presentation.defaultSource().contentId(contentId)...build().display(mode)` |
| `presentPresentation(presentation, mode, bgColor, ok, err, cb)` | `request.preload()` then `request.display(mode)` on that same request |
| `backPresentation()` | `request.back()` |
| `presentSubscriptions()` | No native screen in 6.0. Build your own from `userSubscriptions()` / `userSubscriptionsHistory()`. |
| `presentProductWithIdentifier()` | `Purchasely.presentation.screen(id).contentId(contentId).build().display()` |
| `presentPlanWithIdentifier()` | `Purchasely.presentation.screen(id).build().display()` |
| `showPresentation()` / `hidePresentation()` | `request.display()` / `request.close()` |

## 5. Action interceptor

Purchasely 6.0 intercepts actions **per kind**, matching the native SDK. Register a
handler for each action you care about with `interceptAction(kind, handler)`. The handler
receives `(info, parameters)` and returns — or resolves to — an `InterceptResult`
(`success`, `failed`, `notHandled`).

```js
Purchasely.interceptAction(Purchasely.PresentationAction.purchase, (info, parameters) => {
  // let the SDK proceed with the purchase
  return Purchasely.InterceptResult.notHandled;
});

Purchasely.interceptAction(Purchasely.PresentationAction.login, (info, parameters) => {
  // the app fully handled this action
  Purchasely.userLogin('MY_USER_ID');
  return Purchasely.InterceptResult.success;
});

// Stop intercepting one kind, or all of them:
Purchasely.removeActionInterceptor(Purchasely.PresentationAction.purchase);
Purchasely.removeAllActionInterceptors();
```

- `InterceptResult`: `success`, `failed`, `notHandled`.
- Handlers may return a value or a `Promise`; async work (e.g. showing your own login
  screen) is supported — report the result once it resolves.
- Each intercept resolves independently, so concurrent intercepts never clobber one another.

### Removed: the single global interceptor

`setPaywallActionInterceptor(callback)` + `onProcessAction(result)` were **removed**.
Migrate to per-action `interceptAction(kind, handler)`; each handler reports its outcome
by returning an `InterceptResult` instead of calling `onProcessAction`.

- The `PaywallAction` constant was **renamed to `PresentationAction`** (same string
  values); the old `PaywallAction` name was removed.

## 6. Deeplink API renames

| Before (removed) | After |
|---|---|
| `readyToOpenDeeplink(allow)` | `allowDeeplink(allow)` |
| `isDeeplinkHandled(url, ok, err)` | `handleDeeplink(url, ok, err)` |
| — | `allowCampaigns(allow)` (new) |

The old `readyToOpenDeeplink` / `isDeeplinkHandled` names were **removed** — use the new ones.

## 7. Default dismiss handler rename

`setDefaultPresentationResultHandler(success, error)` → **`setDefaultPresentationDismissHandler(success, error)`**
(old name **removed**). Stop receiving these with **`removeDefaultPresentationDismissHandler()`**.

The dismiss **outcome** object (delivered to this handler and to every `present*` success
callback) exposes:

| Field | Type | Notes |
|---|---|---|
| `result` | int | Legacy `PurchaseResult` (`0` purchased / `1` cancelled / `2` restored). |
| `purchaseResult` | string | `'purchased'` / `'cancelled'` / `'restored'` (omitted when no purchase). Matches the Flutter bridge. |
| `closeReason` | string | `button` / `back_system` / `programmatic` (native PLYCloseReason contract). |
| `plan` | object | The purchased plan, when applicable. |
| `presentation` | object | The presentation that closed. |
| `error` | string | Present only on failure. |

> iOS note: a swipe-to-dismiss is reported as `back_system`; a close with no
> dismiss reason (e.g. after a purchase) omits `closeReason`.

## 8. New exported constants

`InterceptResult`, `PresentationType`, `CloseReason`, `TransitionType`, `DimensionType`,
`Store`, `StorekitVersion`, `PresentationAction`, `BillingPlanType`.

## 9. Apple commitment info (iOS 26.4+, Apple only)

Apple's "monthly subscription with 12-month commitment" is now surfaced through the bridge.
These fields are **iOS-only** — they are absent on Android and on plans/subscriptions without
a commitment, so read them defensively.

- **`Purchasely.BillingPlanType`** — `{ unspecified: 0, upFront: 1, monthly: 2 }`. Pass it as
  the new 4th argument of `setDynamicOffering(reference, planVendorId, offerVendorId,
  billingPlanType, success, error)` (defaults to `unspecified` when omitted).

- **`plan.commitmentInfo`** — an array present on plans returned by `allProducts()` /
  `planWithIdentifier()`, on a presentation outcome's `plan`, and on the
  `interceptAction('purchase')` payload's `parameters.plan`. Each entry:

  ```js
  {
    billingPlanType, // Number — see Purchasely.BillingPlanType
    billingPrice,    // Number — per-cycle price
    billingPeriod,   // String — ISO 8601 duration, e.g. "P1M"
    totalPrice,      // Number — total over the full commitment
    totalPeriod,     // String — ISO 8601 duration, e.g. "P1Y"
    totalDuration    // Number — number of billing cycles (e.g. 12)
  }
  ```

- **`subscription.commitmentProgress`** — present on subscriptions returned by
  `userSubscriptions()` / `userSubscriptionsHistory()`:

  ```js
  {
    billingPeriodNumber,   // Number — current billing period (1-based)
    totalBillingPeriods,   // Number — total periods in the commitment
    commitmentExpiresDate, // String — ISO 8601 date
    commitmentPrice        // Number — price for this period
  }
  ```

---

See `VERSIONS.md` for the Cordova ↔ native SDK version mapping, and the native release
notes for [Purchasely-iOS 6.0.0-rc.3](https://github.com/Purchasely/Purchasely-iOS/releases)
and [Purchasely-Android 6.0.0-rc.3](https://github.com/Purchasely/Purchasely-Android/releases).

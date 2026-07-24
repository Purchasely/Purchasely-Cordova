# Migrating the Purchasely Cordova plugin to 6.0

`@purchasely/cordova-plugin-purchasely@6.0.0` wraps the Purchasely **6.0** native
SDKs (iOS `Purchasely 6.0.0`, Android `io.purchasely:core 6.0.1`). This guide
lists every change to the JavaScript API. Most of the SDK is source-compatible; the
breaking surfaces are **SDK start** (a new fluent builder alongside the existing
options-object form), the **presentation API** (now a builder, parity with the
React Native/Flutter SDKs), and the **action interceptor** (now per action kind,
not a single global callback).

> **Tip — let the AI help you migrate.** The Purchasely AI plugin and the
> `purchasely-integrate`, `purchasely-review` and `purchasely-debug` skills can
> read your integration and rewrite the removed v5 calls to the v6 builder API
> for you. Point them at the files that call `Purchasely.start`,
> `presentPresentationForPlacement`, `fetchPresentation`,
> `setPaywallActionInterceptor`, etc.

## Install

```bash
cordova plugin add @purchasely/cordova-plugin-purchasely@6.0.0
cordova plugin add @purchasely/cordova-plugin-purchasely-google@6.0.0   # Google Play
```

---

## What's unchanged

All of the following keep their v5 name, signature and behaviour (a few gained
a new **optional** trailing parameter — noted inline — which does not break
existing call sites):

- **User**: `userLogin`, `userLogout` (gained an optional `clearUserAttributes`
  bool, defaults to `true`), `getAnonymousUserId`.
- **Products**: `allProducts`, `productWithIdentifier`, `planWithIdentifier`,
  `purchaseWithPlanVendorId`, `isEligibleForIntroOffer`, `setDynamicOffering`
  (gained an optional `billingPlanType` 4th argument — see below),
  `getDynamicOfferings`, `removeDynamicOffering`, `clearDynamicOfferings`.
- **Subscriptions data**: `userSubscriptions` / `userSubscriptionsHistory`
  (both gained an optional `invalidateCache` bool), `restoreAllProducts`,
  `silentRestoreAllProducts`, `userDidConsumeSubscriptionContent`.

  > **Removed:** `presentSubscriptions()` no longer exists. The native v6 SDKs
  > dropped the built-in subscription-list UI — build your own screen from
  > `userSubscriptions()` / `userSubscriptionsHistory()`.
- **Attributes**: `setUserAttributeWithString/Number/Boolean/Date/...Array`,
  `incrementUserAttribute` / `decrementUserAttribute` (the increment/decrement
  `value` argument is now optional, defaulting to `1` natively when omitted),
  `userAttribute`, `clearUserAttribute`, `clearUserAttributes`,
  `clearBuiltInAttributes`, `setAttribute`.
- **Listeners**: `addUserAttributeListener` / `removeUserAttributeListener`.
- **Misc**: `setLogLevel`, `setLanguage`, `setThemeMode`, `setDebugMode`,
  `revokeDataProcessingConsent`.

See [10. Other v6 changes](#10-other-v6-changes-non-breaking) for the new
read-only accessors (`isAnonymous`, `userAttributes`, `getBuiltInAttribute(s)`)
added in this release.

---

## 1. `start()` — new builder, options object unchanged

### Recommended: `Purchasely.builder(apiKey)` (parity with React Native/Flutter)

```js
Purchasely.builder('YOUR_API_KEY')
  .appUserId(null)
  .runningMode('full')                       // 'observer' (default) | 'full'
  .logLevel(Purchasely.LogLevel.DEBUG)
  .allowDeeplink(true)
  .allowCampaigns(true)
  .stores([Purchasely.Store.google])          // Android only
  .storekitVersion('storeKit2')               // iOS only: 'storeKit1' | 'storeKit2'
  .storeKit1(false)                           // iOS only, alias for the boolean form
  .deeplink(coldStartUrl)                     // optional cold-start deeplink
  .start()
  .then((isConfigured) => { /* ... */ });

// Callback form is also supported:
Purchasely.builder('YOUR_API_KEY').runningMode('full').start(
  (isConfigured) => { /* ... */ },
  (error) => { /* ... */ }
);
```

`.start()` with no arguments returns a `Promise<boolean>` that resolves
`isConfigured`; pass `(success, error)` callbacks instead if you prefer that
style.

### Still supported: the options object

```js
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
(cold-start URL). Both forms configure the exact same native `start()` call — pick
whichever style fits your codebase; the builder is the one that stays in sync with
the React Native and Flutter SDKs.

## 2. `RunningMode` — new values, new default

Native 6.0 removed `transactionOnly` and `paywallObserver`; only **`observer`** and
**`full`** remain, and the SDK now **defaults to `observer`** (5.x behaved like `full`).

- `RunningMode` values are now **name strings** (`'observer'` / `'full'`), not integers —
  the underlying native enums use different raw values per platform, so the bridge maps by
  name. If you passed the numeric constants (`Purchasely.RunningMode.full`) you don't need
  to change anything.
- `RunningMode.paywallObserver` was **removed** — use `observer`.
- **To keep the 5.x behaviour where Purchasely owns the purchase flow, pass
  `runningMode: Purchasely.RunningMode.full`** (or `.runningMode('full')` on the builder).

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

> `onPresented` / `onCloseRequested` fire on both the direct `display()` path and the
> `preload()` → `display()` re-display path, on both platforms. The final outcome always
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
> **not** available on Cordova — no native present action accepts them (deferred, see
> [Cross-SDK divergences](#cross-sdk-divergences--known-limitations) below).

### Lifecycle callbacks

`onLoaded` / `onPresented` / `onCloseRequested` / `onDismissed` are chained on the builder,
before `.build()`:

```js
const request = Purchasely.presentation.placement('ONBOARDING')
  .onLoaded((presentation, error) => console.log('loaded', presentation && presentation.screenId))
  .onPresented((presentation, error) => console.log('presented', presentation && presentation.screenId))
  .onCloseRequested(() => console.log('user requested close'))
  .onDismissed((outcome) => console.log('dismissed', outcome.purchaseResult, outcome.closeReason))
  .build();

await request.preload();
await request.display();
```

> **`onLoaded` is new in 6.0 and fires only on the `preload()` path** (parity with
> RN/Flutter's `onLoaded`, which is likewise a preload-only success signal). A bare
> `request.display()` with no prior `preload()` has no separate "loaded" event — it goes
> straight to `onPresented`. A failed `preload()` rejects the promise instead of calling
> `onLoaded`.
>
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

`Purchasely.PresentationAction` — all 10 kinds. The keys are camelCase; the wire
value sent by the native side is snake_case for the multi-word kinds. Always
reference the constant, never the raw string:

| `PresentationAction` key | Wire value |
|---|---|
| `close` | `close` |
| `closeAll` | `close_all` |
| `login` | `login` |
| `navigate` | `navigate` |
| `purchase` | `purchase` |
| `restore` | `restore` |
| `openPresentation` | `open_presentation` |
| `openPlacement` | `open_placement` |
| `promoCode` | `promo_code` |
| `webCheckout` | `web_checkout` |

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

The dismiss **outcome** object (delivered to this handler and resolved by every
`presentation...build().display()` call) exposes exactly 5 fields — there is no
legacy numeric `result` field:

| Field | Type | Notes |
|---|---|---|
| `purchaseResult` | string | `'purchased'` / `'cancelled'` / `'restored'` (omitted when no purchase). Matches the Flutter bridge. |
| `closeReason` | string | See below — compare against `Purchasely.CloseReason.*`, not a hardcoded string. |
| `plan` | object | The purchased plan, when applicable. |
| `presentation` | object | The presentation that closed. |
| `error` | string | Present only on failure. |

`closeReason` is one of the `Purchasely.CloseReason` constants: `button`,
`backSystem`, `programmatic`. **The `backSystem` constant's wire value is
`'back_system'`** (snake_case) — always compare against
`Purchasely.CloseReason.backSystem`, never the literal string `'backSystem'` or
`'back_system'`, so your code keeps working if the wire spelling ever changes.

> iOS note: a swipe-to-dismiss is reported as `Purchasely.CloseReason.backSystem`; a
> close with no dismiss reason (e.g. after a purchase) omits `closeReason`.

## 8. New exported constants

`LogLevel`, `RunningMode`, `Attribute`, `PurchaseResult`, `PlanType`,
`SubscriptionSource`, `InterceptResult`, `PresentationType`, `CloseReason`,
`TransitionType`, `DimensionType`, `Store`, `StorekitVersion`, `PresentationAction`,
`BillingPlanType`, `ThemeMode`, `DataProcessingLegalBasis`, `DataProcessingPurpose`.

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

## 10. Other v6 changes (non-breaking)

The following are additive — existing call sites keep working unchanged:

- **`closeAllScreens()`** is the canonical method to dismiss every currently
  displayed screen. **`closePresentation()`** is kept as a deprecated alias
  (identical native call) — prefer `closeAllScreens()` in new code.
- **`addEventListener` / `removeEventListener`** are the canonical listener
  names (parity with the React Native SDK). **`addEventsListener` /
  `removeEventsListener`** (the original Cordova-only, pluralized "Events"
  spelling) are kept as deprecated aliases of the same native action.
- **`userLogout(clearUserAttributes)`** — new optional boolean parameter,
  defaulting to `true` (locally cached user attributes are cleared on logout,
  matching prior behaviour). Pass `false` to log out while keeping locally
  stored attributes.
- **`synchronize(success, error)` now reports completion** — see
  [section 3](#3-synchronize-now-reports-completion).
- **`userSubscriptions(success, error, invalidateCache)` /
  `userSubscriptionsHistory(success, error, invalidateCache)`** gained an
  optional `invalidateCache` boolean (native default `false`) that forces a
  fresh fetch instead of returning the cached list.
- **New read accessors**: `getBuiltInAttribute(key, success, error)` /
  `getBuiltInAttributes(success, error)` (read-only, SDK-computed built-in
  attributes), `isAnonymous(success, error)` (whether the current user is
  anonymous, i.e. `userLogin` has not been called), and `userAttributes(success,
  error)` (bulk read of every currently stored user attribute, alongside the
  existing single-key `userAttribute(key, ...)`).
- **`incrementUserAttribute(key, value)` / `decrementUserAttribute(key, value)`**
  — `value` is now optional; it defaults to `1` natively when omitted.
- **`signPromotionalOffer(storeProductId, storeOfferId, success, error)`** is
  iOS-only (StoreKit promotional offer signing). On **Android** it is now a
  no-op that resolves successfully with `null` — there is no native Android
  equivalent, so calling it there no longer needs special error handling.
- **`Purchasely.Attribute`** gained **`ONESIGNAL_USER_ID`**, alongside the
  existing `ONESIGNAL_EXTERNAL_ID`.
- **`Purchasely.PresentationType`** — `{ normal: 0, fallback: 1, deactivated: 2,
  client: 3 }`. `deactivated` means no paywall is configured for the
  placement/screen; `client` means the screen is a Build-Your-Own-Screen (BYOS)
  presentation that the host app is expected to render itself (BYOS render
  callbacks are not yet wired on Cordova — see
  [Cross-SDK divergences](#cross-sdk-divergences--known-limitations) below).

---

## Cross-SDK divergences & known limitations

> - **Snake_case wire values.** Several constants (`CloseReason.backSystem` →
>   `'back_system'`, `PresentationAction.closeAll` → `'close_all'`, `.openPresentation`
>   → `'open_presentation'`, etc.) carry a snake_case value on the wire even though the
>   JS key is camelCase. Always compare against the exported constant
>   (`Purchasely.CloseReason.backSystem`) — never hardcode the string.
> - **Event transport.** Lifecycle, interceptor and dismiss events ride Cordova
>   `cordova.exec` keep-alive callbacks — there is no `NativeEventEmitter` (React
>   Native) or `EventChannel` (Flutter). The **payload shapes are identical** to
>   those SDKs; only the delivery mechanism differs.
> - **Inline `PLYPresentationView` is out of scope for Cordova.** iOS, Android, React
>   Native and Flutter all support embedding a paywall directly inside a screen
>   (`PLYPresentationView` / `buildView` / `getFragment`). The Cordova plugin is a
>   WebView bridge with no declarative native view layer, so only modal/fullscreen/push
>   presentation is supported. This is an accepted platform limitation, not a bug.
> - **Deferred to Cordova v6.1** (tracked in the Linear project **"Cordova — parité &
>   compléments v6.1"**):
>   - The builder style modifiers `progressColor` / `displayCloseButton` /
>     `displayBackButton` (only `.backgroundColor()` is wired today).
>   - `automaticDeeplinkHandling` (Android-only `start()` option, available on
>     React Native/Flutter).
>   - Build-Your-Own-Screen support: `clientPresentationDisplayed` /
>     `clientPresentationClosed`.

---

See `VERSIONS.md` for the Cordova ↔ native SDK version mapping, and the native release
notes for [Purchasely-iOS 6.0.0](https://github.com/Purchasely/Purchasely-iOS/releases/tag/6.0.0)
and [Purchasely-Android 6.0.1](https://github.com/Purchasely/Purchasely-Android/releases/tag/6.0.1).

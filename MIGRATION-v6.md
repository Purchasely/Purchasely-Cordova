# Migrating the Purchasely Cordova plugin to 6.0

`@purchasely/cordova-plugin-purchasely@6.0.0-rc.3` wraps the Purchasely **6.0** native
SDKs (iOS `Purchasely 6.0.0-rc.3`, Android `io.purchasely:core 6.0.0-rc.3`). This guide
lists every change to the JavaScript API. Most of the SDK is source-compatible; the
breaking surfaces are **SDK start**, **presentation display mode**, and the **action
interceptor result**.

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

## 4. Presentation display mode & transitions

The `isFullscreen` boolean on the `present*` methods is replaced by a **display mode**.
Pass either a `Purchasely.TransitionType` string or a full **transition object** (for
drawer/popin sizing). Legacy booleans still work (`true` → `fullScreen`, `false` → `modal`).

```js
// Simple: a display-mode string
Purchasely.presentPresentationForPlacement('ONBOARDING', null, Purchasely.TransitionType.fullScreen, ok, err);

// Rich: a transition object (drawer/popin sizing, dismissible, background color)
Purchasely.presentPresentationForPlacement('ONBOARDING', null, {
  type: Purchasely.TransitionType.drawer,
  dismissible: true,
  height: { type: Purchasely.DimensionType.percentage, value: 0.8 }, // 0.0–1.0
  backgroundColor: '#000000'
}, ok, err);
```

`TransitionType`: `fullScreen`, `modal`, `drawer`, `popin`, `push`, `inlinePaywall`.
`DimensionType`: `pixel`, `percentage`. `width` applies to `popin` only; `height` drives `drawer` + `popin`.

> Platform note: on **iOS** only a *percentage* `height` (plus `dismissible` and
> `backgroundColor`) is applied to drawer/popin — pixel sizing and popin `width` are not
> exposed to the bridge by the native iOS SDK. **Android** honors the full set.

### Presentation lifecycle callbacks

The `present*` methods accept an optional final `callbacks` object to observe the
presentation lifecycle. The `success` callback still receives the final dismiss outcome.

```js
Purchasely.presentPresentationForPlacement('ONBOARDING', null, Purchasely.TransitionType.fullScreen,
  (outcome) => console.log('dismissed', outcome.purchaseResult, outcome.closeReason),
  (err) => console.error(err),
  {
    onPresented: (presentation, error) => console.log('presented', presentation && presentation.screenId),
    onCloseRequested: () => console.log('user requested close'),
  }
);
```

> `onPresented` / `onCloseRequested` fire for the direct `present*` methods on both
> platforms; on Android they do not fire for the `fetchPresentation` → `presentPresentation`
> re-display path (iOS covers both).

### Default (audience-targeted) presentation

Present or fetch the default presentation — no placement or presentation id:

```js
Purchasely.presentPresentationForDefault(null /* contentId */, Purchasely.TransitionType.fullScreen, ok, err);
Purchasely.fetchPresentationForDefault(null /* contentId */, onLoaded, err);
```

### Removed presentation methods

| Removed | Replacement |
|---|---|
| `presentSubscriptions()` | No native screen in 6.0. Build your own from `userSubscriptions()` / `userSubscriptionsHistory()`. |
| `presentProductWithIdentifier()` | Use placement/screen-based presentation (`presentPresentationForPlacement` / `presentPresentationWithIdentifier`). |
| `presentPlanWithIdentifier()` | Same as above. |
| `showPresentation()` / `hidePresentation()` | No hide/show primitive in 6.0. Use `closePresentation()`; `backPresentation()` was added to navigate back. |

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
`Store`, `StorekitVersion`, `PresentationAction`.

---

See `VERSIONS.md` for the Cordova ↔ native SDK version mapping, and the native release
notes for [Purchasely-iOS 6.0.0-rc.3](https://github.com/Purchasely/Purchasely-iOS/releases)
and [Purchasely-Android 6.0.0-rc.3](https://github.com/Purchasely/Purchasely-Android/releases).

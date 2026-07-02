# Migrating the Purchasely Cordova plugin to 6.0

`@purchasely/cordova-plugin-purchasely@6.0.0-rc.1` wraps the Purchasely **6.0** native
SDKs (iOS `Purchasely 6.0.0-rc.2`, Android `io.purchasely:core 6.0.0-rc.2`). This guide
lists every change to the JavaScript API. Most of the SDK is source-compatible; the
breaking surfaces are **SDK start**, **presentation display mode**, and the **action
interceptor result**.

> The 6.0 line is a release candidate. It is published to npm under the `next` dist-tag:
> `cordova plugin add @purchasely/cordova-plugin-purchasely@next`.

## Install

```bash
cordova plugin add @purchasely/cordova-plugin-purchasely@6.0.0-rc.1
cordova plugin add @purchasely/cordova-plugin-purchasely-google@6.0.0-rc.1   # Google Play
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
- `RunningMode.paywallObserver` is kept as a **deprecated alias of `observer`**.
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

## 4. Presentation display mode replaces `isFullscreen`

The `isFullscreen` boolean on the `present*` methods is replaced by a **display mode
string** (`Purchasely.TransitionType`). Booleans are still accepted for compatibility
(`true` → `fullScreen`, `false` → `modal`).

```js
// Before
Purchasely.presentPresentationForPlacement('ONBOARDING', null, true, ok, err);

// After
Purchasely.presentPresentationForPlacement(
  'ONBOARDING', null, Purchasely.TransitionType.fullScreen, ok, err
);
```

`TransitionType`: `fullScreen`, `modal`, `drawer`, `popin`, `push`, `inlinePaywall`.

### Removed presentation methods

| Removed | Replacement |
|---|---|
| `presentSubscriptions()` | No native screen in 6.0. Build your own from `userSubscriptions()` / `userSubscriptionsHistory()`. |
| `presentProductWithIdentifier()` | Use placement/screen-based presentation (`presentPresentationForPlacement` / `presentPresentationWithIdentifier`). |
| `presentPlanWithIdentifier()` | Same as above. |
| `showPresentation()` / `hidePresentation()` | No hide/show primitive in 6.0. Use `closePresentation()`; `backPresentation()` was added to navigate back. |

## 5. Action interceptor result

`onProcessAction` now takes an `InterceptResult` value instead of a boolean. Legacy
booleans are mapped automatically (`true` → `notHandled`, `false` → `success`).

```js
Purchasely.setPaywallActionInterceptor((result) => {
  if (result.action === Purchasely.PresentationAction.purchase) {
    // let the SDK proceed with the purchase
    Purchasely.onProcessAction(Purchasely.InterceptResult.notHandled);
  } else if (result.action === Purchasely.PresentationAction.login) {
    // the app fully handled this action
    Purchasely.onProcessAction(Purchasely.InterceptResult.success);
  }
});
```

- `InterceptResult`: `success`, `failed`, `notHandled`.
- The `PaywallAction` constant was renamed to **`PresentationAction`** (same string
  values); `PaywallAction` is kept as a deprecated alias.

## 6. Deeplink API renames

| Before | After |
|---|---|
| `readyToOpenDeeplink(allow)` | `allowDeeplink(allow)` |
| `isDeeplinkHandled(url, ok, err)` | `handleDeeplink(url, ok, err)` |
| — | `allowCampaigns(allow)` (new) |

The old names remain as deprecated aliases that delegate to the new ones.

## 7. Default dismiss handler rename

`setDefaultPresentationResultHandler(success, error)` → **`setDefaultPresentationDismissHandler(success, error)`**
(old name kept as a deprecated alias). The dismiss outcome now also carries a
`closeReason` (`none` / `button` / `interactive_dismiss` / `programmatic`).

> iOS note: a swipe-to-dismiss is reported as `interactive_dismiss`.

## 8. New exported constants

`InterceptResult`, `PresentationType`, `CloseReason`, `TransitionType`, `DimensionType`,
`Store`, `StorekitVersion`, `PresentationAction`.

---

See `VERSIONS.md` for the Cordova ↔ native SDK version mapping, and the native release
notes for [Purchasely-iOS 6.0.0-rc.2](https://github.com/Purchasely/Purchasely-iOS/releases)
and [Purchasely-Android 6.0.0-rc.2](https://github.com/Purchasely/Purchasely-Android/releases).

# Purchasely Cordova SDK Documentation

This document provides comprehensive documentation for integrating and using the
Purchasely Cordova SDK (JavaScript/Cordova).

> **Upgrading from v5?** The v5 paywall API has been **removed** in v6 in favour
> of the chainable builder API documented here. See [`MIGRATION-v6.md`](./MIGRATION-v6.md)
> for the complete old→new mapping.

---

## Table of Contents

1. [Requirements](#requirements)
2. [Installation](#installation)
3. [SDK Initialization](#sdk-initialization)
4. [Displaying Paywalls](#displaying-paywalls)
5. [Pre-fetching Screens](#pre-fetching-screens)
6. [Action Interceptor](#action-interceptor)
7. [Default Presentation Dismiss Handler](#default-presentation-dismiss-handler)
8. [User Identification](#user-identification)
9. [Subscription Status and Entitlements](#subscription-status-and-entitlements)
10. [Custom User Attributes](#custom-user-attributes)
11. [Event Listeners](#event-listeners)
12. [Deeplinks Management](#deeplinks-management)
13. [Platform-Specific Features](#platform-specific-features)

---

## Requirements

| | iOS | Android |
|---|---|---|
| Native SDK | `Purchasely 6.0.0-rc.1` (CocoaPods) | `io.purchasely:core / google-play 6.0.0-beta.12` (mavenLocal) |
| Min OS | iOS 13.4 | minSdk 23 |
| Build | Xcode 15+, CocoaPods | compileSdk 36, AGP ≥ 8.9.1, Kotlin 2.2.x, Gradle 8.13, JDK 17 |

> **Android toolchain note:** The native Android SDK v6 requires a toolchain above
> the cordova-android 14 defaults. Add these preferences to your app's `config.xml`:
>
> ```xml
> <preference name="android-minSdkVersion" value="24" />
> <preference name="android-compileSdkVersion" value="36" />
> <preference name="AndroidGradlePluginVersion" value="8.9.2" />
> <preference name="GradlePluginKotlinVersion" value="2.2.21" />
> <preference name="GradleVersion" value="8.13" />
> ```

---

## Installation

```sh
# Main plugin (iOS + Android)
cordova plugin add @purchasely/cordova-plugin-purchasely

# Google Play In-App Purchases (Android)
cordova plugin add @purchasely/cordova-plugin-purchasely-google
```

Both plugins must be pinned to the **same** version. There is no video player
plugin for Cordova (`io.purchasely:player` is not bridged).

---

## SDK Initialization

Initialize the Purchasely SDK as early as possible in your application lifecycle
using `Purchasely.builder(apiKey)`.

```js
// Only the API key is required; every other option has a sensible default.
Purchasely.builder('YOUR_API_KEY')
    .runningMode('full')            // 'full' | 'observer' (default: 'observer')
    .appUserId(null)                // optional: set if user is known at start
    .logLevel('error')              // 'debug' | 'info' | 'warn' | 'error'
    .stores(['google'])             // Android: 'google' | 'huawei' | 'amazon'
    .storekitVersion('storeKit2')   // iOS: 'storeKit2' (recommended) | 'storeKit1'
    .allowDeeplink(true)            // allow deeplink-opened presentations
    .allowCampaigns(true)           // allow campaign-opened presentations (default true)
    .start()
    .then((configured) => {
        if (configured) {
            console.log('Purchasely SDK configured successfully');
        }
    })
    .catch((error) => {
        console.error('Purchasely SDK not configured properly', error);
    });
```

### Builder API reference

| Method | Default | Description |
|---|---|---|
| `Purchasely.builder(apiKey)` | — | Static entry point; required |
| `.appUserId(id)` | `null` | Associate a user ID from the start |
| `.runningMode('observer'|'full')` | `'observer'` | SDK running mode |
| `.logLevel('debug'|'info'|'warn'|'error')` | `'error'` | Log verbosity |
| `.stores(['google'|'huawei'|'amazon'])` | `['google']` | Android store implementations |
| `.storekitVersion('storeKit2'|'storeKit1')` | `'storeKit2'` | iOS StoreKit version |
| `.allowDeeplink(bool)` | `false` | Allow deeplink-triggered paywall display |
| `.allowCampaigns(bool)` | `true` | Allow campaign-triggered paywall display |
| `.start()` | — | Starts the SDK; returns `Promise<boolean>` |

### Running modes

- **`'full'`** — Purchasely owns the purchase flow (handles transactions and receipts).
- **`'observer'`** — Purchasely displays paywalls and analytics only; your code handles billing. **This is the default in v6.**

---

## Displaying Paywalls

Purchasely paywalls are displayed using **placements** — named locations in your
app (e.g., `ONBOARDING`, `SETTINGS`). Use `Purchasely.PresentationBuilder` to
build and display a `PresentationRequest`.

### Display by placement

```js
Purchasely.PresentationBuilder
    .placement('ONBOARDING')
    .contentId('my_content_id')     // optional: associate content with the purchase
    .build()
    .display()                      // returns Promise<outcome> — resolves at dismiss
    .then((outcome) => {
        // outcome = { presentation, purchaseResult, plan, closeReason, error }
        if (outcome.error) {
            console.error(outcome.error.message);
        } else if (outcome.purchaseResult === 'purchased' || outcome.purchaseResult === 'restored') {
            console.log('User purchased', outcome.plan && outcome.plan.name);
            // Unlock entitlements
        } else {
            console.log('Dismissed:', outcome.closeReason);
        }
    });
```

### Display by screen ID

```js
// Show a specific presentation by its vendor ID
Purchasely.PresentationBuilder
    .screen('SCREEN_VENDOR_ID')
    .build()
    .display();
```

### `PresentationBuilder` options

```js
Purchasely.PresentationBuilder
    .placement('ONBOARDING')
    .contentId('optional_content_id')
    .onLoaded((presentation, error) => {
        // Called when the paywall is fetched (preload step)
    })
    .onPresented((presentation, error) => {
        // Called when the paywall is displayed on screen
    })
    .onCloseRequested(() => {
        // Called when the user presses close (before the paywall dismisses)
    })
    .onDismissed((outcome) => {
        // Called when the paywall dismisses (same 5-field outcome as display())
    })
    .build()
    .display('fullScreen');         // optional transition type
```

### Transition types (`Purchasely.TransitionType`)

| Value | Description |
|---|---|
| `'fullScreen'` | Full-screen modal (default) |
| `'push'` | Push navigation animation |
| `'modal'` | Sheet modal |
| `'drawer'` | Side drawer |
| `'popin'` | Small pop-in overlay |
| `'inlinePaywall'` | Inline (not available as a standalone transition on Cordova) |

### 5-field dismiss outcome

`display()` resolves with an outcome object:

| Field | Type | Notes |
|---|---|---|
| `presentation` | object \| null | The displayed presentation (`screenId`, `placementId`, `contentId`, `abTestId`, …) |
| `purchaseResult` | string \| null | `'purchased'` \| `'restored'` \| `'cancelled'` \| `null` (no purchase action) |
| `plan` | object \| null | The purchased or restored plan |
| `closeReason` | string \| null | `'button'` \| `'backSystem'` \| `'programmatic'` \| `null` |
| `error` | object \| null | Error — mutually exclusive with `closeReason` |

> **`closeReason: 'backSystem'`** — covers both the Android system back gesture
> and iOS interactive dismiss (swipe-to-dismiss on a modal). The native
> `PLYCloseReason.interactiveDismiss` (iOS) maps to `'backSystem'` for
> cross-platform consistency.

### `PresentationRequest` lifecycle

Once you call `.build()` you receive a `PresentationRequest`:

| Method | Description |
|---|---|
| `.preload()` | Fetches the paywall from the network; returns `Promise<presentation>` |
| `.display(transition?)` | Displays the paywall; returns `Promise<outcome>` — resolves at dismiss |
| `.close()` | Programmatically closes the displayed paywall |
| `.back()` | Goes back to the previous screen within the paywall |

> **Note on inline paywall view:** `PLYPresentationView` (inline/embedded paywall)
> is **out of scope on Cordova**. Paywalls are always displayed as full overlays.
> Use the React Native or Flutter SDK for embedded inline paywalls.

---

## Pre-fetching Screens

Pre-fetch paywalls from the network before displaying them for a smoother
user experience.

```js
const req = Purchasely.PresentationBuilder.placement('ONBOARDING').build();

// Step 1: fetch from network (show your own loading indicator)
req.preload()
    .then((presentation) => {
        console.log('Paywall loaded:', presentation.screenId);
        // presentation.type can be checked here if needed

        // Step 2: display when ready (reuses the same request)
        return req.display();
    })
    .then((outcome) => {
        if (outcome.purchaseResult === 'purchased') {
            console.log('Purchased', outcome.plan && outcome.plan.name);
        }
    })
    .catch((error) => {
        console.error('Preload failed:', error);
    });
```

If you call `display()` without `preload()`, the SDK fetches and displays in one step.

---

## Action Interceptor

The action interceptor lets you intercept and handle user actions on the paywall.
Register **one handler per action kind** with `Purchasely.interceptAction(kind, handler)`.

The handler receives `(info, payload)` and must return one of:

| Return value | Meaning |
|---|---|
| `'success'` | Your code handled the action |
| `'failed'` | Your code tried but failed |
| `'notHandled'` | Let the SDK perform its default behaviour |

### Observer mode — handle purchases yourself

```js
Purchasely.interceptAction('purchase', async (info, payload) => {
    try {
        // payload.plan.productId = the store product ID the user tapped
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

Purchasely.interceptAction('restore', async () => {
    try {
        await MyBilling.restorePurchases();
        Purchasely.synchronize();
        return 'success';
    } catch (e) {
        return 'failed';
    }
});
```

### Intercept login

```js
Purchasely.interceptAction('login', async (info, payload) => {
    // Show your login screen, then:
    Purchasely.userLogin('MY_USER_ID', () => {});
    return 'success';
});
```

### Intercept navigation

```js
Purchasely.interceptAction('navigate', async (info, payload) => {
    console.log('User wants to navigate to', payload.url);
    window.open(payload.url, '_system');
    return 'success';
});
```

### Available action kinds (`Purchasely.PresentationAction`)

| Kind | Enum value | Description |
|---|---|---|
| `'close'` | `Purchasely.PresentationAction.close` | User tapped the close button |
| `'closeAll'` | `Purchasely.PresentationAction.closeAll` | Close all paywall screens |
| `'login'` | `Purchasely.PresentationAction.login` | User tapped the login button |
| `'navigate'` | `Purchasely.PresentationAction.navigate` | Open an external URL |
| `'purchase'` | `Purchasely.PresentationAction.purchase` | User tapped a purchase button |
| `'restore'` | `Purchasely.PresentationAction.restore` | User tapped the restore button |
| `'openPresentation'` | `Purchasely.PresentationAction.openPresentation` | Open another presentation |
| `'openPlacement'` | `Purchasely.PresentationAction.openPlacement` | Open another placement |
| `'promoCode'` | `Purchasely.PresentationAction.promoCode` | Enter a promo code |
| `'webCheckout'` | `Purchasely.PresentationAction.webCheckout` | Start a web checkout |

### Managing interceptors

```js
Purchasely.removeActionInterceptor('purchase');    // remove one handler
Purchasely.removeAllActionInterceptors();           // remove all handlers
```

---

## Default Presentation Dismiss Handler

For presentations that the app did **not** open itself (campaigns, deeplinks,
Promoted In-App Purchases), set a global dismiss handler:

```js
Purchasely.setDefaultPresentationDismissHandler((outcome) => {
    // outcome = { presentation, purchaseResult, plan, closeReason, error }
    console.log('Presentation from campaign closed');
    console.log('Screen:', outcome.presentation && outcome.presentation.screenId);

    if (outcome.purchaseResult === 'purchased') {
        console.log('Purchased', outcome.plan && outcome.plan.vendorId);
        // Refresh entitlements
    }
});

// Remove when no longer needed (e.g., on page destroy)
Purchasely.removeDefaultPresentationDismissHandler();
```

---

## User Identification

```js
// Get the anonymous user ID (auto-generated, stable per install)
Purchasely.getAnonymousUserId((anonymousId) => {
    console.log('Anonymous User ID:', anonymousId);
});

// Log in a user
Purchasely.userLogin('123456789', () => {
    console.log('User logged in');
});

// Log out a user (clears user ID and custom attributes)
Purchasely.userLogout();
```

---

## Subscription Status and Entitlements

```js
// Active subscriptions
Purchasely.userSubscriptions((subscriptions) => {
    if (subscriptions.length > 0) {
        console.log('Plan:', subscriptions[0].plan);
        console.log('Source:', subscriptions[0].subscriptionSource);
        console.log('Next renewal:', subscriptions[0].nextRenewalDate);
    }
}, (error) => console.error(error));

// Subscription history (including expired)
Purchasely.userSubscriptionsHistory((history) => {
    console.log('History:', history);
}, (error) => console.error(error));

// Purchase a plan directly (bypasses paywall)
Purchasely.purchaseWithPlanVendorId(
    'PLAN_VENDOR_ID',
    null,           // optional offer ID
    null,           // optional content ID
    (result) => console.log('Purchased:', result),
    (error) => console.error('Purchase failed:', error)
);

// Restore purchases
Purchasely.restoreAllProducts(
    (restored) => console.log('Restored:', restored),
    (error) => console.error('Restore failed:', error)
);
```

> **Note:** There is a few seconds delay before `userSubscriptions()` reflects a
> new purchase. If you check entitlements immediately after a purchase, wait ~3 s
> or listen to the `PURCHASE_COMPLETE` event before querying.

---

## Custom User Attributes

Custom user attributes allow you to segment users and personalize their journey.

```js
// Set attributes
Purchasely.setUserAttributeWithString('gender', 'man');
Purchasely.setUserAttributeWithInt('age', 21);
Purchasely.setUserAttributeWithDouble('weight', 78.2);
Purchasely.setUserAttributeWithBoolean('premium', true);
Purchasely.setUserAttributeWithDate('subscription_date', new Date().toISOString());
Purchasely.setUserAttributeWithStringArray('interests', ['music', 'sports']);

// Read an attribute
Purchasely.userAttribute('subscription_date', (value) => {
    console.log('Subscription date:', value);
}, console.error);

// Clear
Purchasely.clearUserAttribute('gender');
Purchasely.clearUserAttributes();               // clear all
Purchasely.clearBuiltInAttributes();            // clear SDK built-ins only
```

### Legal basis (GDPR)

All `setUserAttributeWith*` methods accept an optional `processLegalBasis`
parameter:

```js
Purchasely.setUserAttributeWithString('newsletter', 'yes',
    Purchasely.DataProcessingLegalBasis.optional);

// Revoke consent
Purchasely.revokeDataProcessingConsent([
    Purchasely.DataProcessingPurpose.analytics,
    Purchasely.DataProcessingPurpose.campaigns,
]);
```

---

## Event Listeners

### Analytics events

```js
Purchasely.addEventsListener((event) => {
    console.log('Event:', event.name, event.properties);
    // Forward to your analytics platform
});

Purchasely.removeEventsListener();
```

### User attribute events

When a user submits answers to a survey, the SDK may set attributes automatically:

```js
Purchasely.addUserAttributeListener((attribute) => {
    console.log('Attribute set by SDK:', attribute.key, attribute.value);
});

Purchasely.removeUserAttributeListener();
```

---

## Deeplinks Management

```js
// 1. Allow deeplink-triggered display (set in builder or at runtime)
Purchasely.allowDeeplink(true);

// 2. Pass deeplinks to Purchasely
Purchasely.handleDeeplink('app://ply/presentations/...', (handled) => {
    console.log('Handled by Purchasely:', handled);
}, console.error);

// 3. Handle the outcome of deeplink-opened presentations
Purchasely.setDefaultPresentationDismissHandler((outcome) => {
    console.log('Deeplink paywall dismissed:', outcome.closeReason);
});
```

---

## Platform-Specific Features

### StoreKit selection (iOS)

```js
Purchasely.builder('YOUR_API_KEY')
    .storekitVersion('storeKit2')   // 'storeKit2' (recommended) | 'storeKit1'
    .start();
```

### Android stores

```js
Purchasely.builder('YOUR_API_KEY')
    .stores(['google'])             // 'google' | 'huawei' | 'amazon'
    .start();
```

### Android purchase parameters

When intercepting a `purchase` action on Android, the `subscriptionOffer` field
provides base plan and offer details:

```js
Purchasely.interceptAction('purchase', async (info, payload) => {
    if (payload) {
        const storeProductId  = payload.plan.productId;
        const basePlanId      = payload.subscriptionOffer && payload.subscriptionOffer.basePlanId;
        const offerId         = payload.subscriptionOffer && payload.subscriptionOffer.offerId;
        const offerToken      = payload.subscriptionOffer && payload.subscriptionOffer.offerToken;
    }
    return 'notHandled';
});
```

### Promotional offers (iOS only)

```js
Purchasely.signPromotionalOffer(
    'com.example.product',
    'PROMO_OFFER_ID',
    (signature) => console.log('Signature:', signature),
    (error) => console.error(error)
);
```

### Theme mode

```js
Purchasely.setThemeMode(Purchasely.ThemeMode.system);  // .light | .dark | .system
```

---

## Enums Reference

### `Purchasely.RunningMode`

| Value | Numeric | Description |
|---|---|---|
| `'observer'` | `2` | Observer mode (default) |
| `'full'` | `3` | Full mode |

### `Purchasely.PurchaseResult`

| Value | Numeric | Description |
|---|---|---|
| `'purchased'` | — (string from bridge) | User purchased |
| `'cancelled'` | — | User cancelled |
| `'restored'` | — | User restored |

### `Purchasely.CloseReason`

| Value | Description |
|---|---|
| `'button'` | User tapped the close button |
| `'backSystem'` | Android back gesture / iOS interactive dismiss (swipe-down) |
| `'programmatic'` | Closed by `request.close()` |

### `Purchasely.InterceptResult`

| Value | Description |
|---|---|
| `'success'` | Handler handled the action |
| `'failed'` | Handler failed |
| `'notHandled'` | SDK should handle it |

### `Purchasely.TransitionType`

`fullScreen` | `push` | `modal` | `drawer` | `popin` | `inlinePaywall`

### `Purchasely.LogLevel`

`DEBUG (0)` | `INFO (1)` | `WARN (2)` | `ERROR (3)`

---

## Troubleshooting

**SDK not initialized:** Call `Purchasely.builder(apiKey).…start()` before any
other SDK method.

**Purchases not working on Android:** Ensure `cordova-plugin-purchasely-google`
is installed at the same version as the main plugin and that `stores(['google'])`
is set.

**Paywall not displaying:** Check that the placement exists in your Purchasely
Console and the SDK is initialized.

**Android build fails with Kotlin/AGP error:** Add the `config.xml` preferences
listed in [Requirements](#requirements).

**Debug logging:**

```js
Purchasely.builder('YOUR_API_KEY')
    .logLevel('debug')  // change to 'error' in production
    .start();
```

---

## Additional Resources

- [Purchasely Console](https://console.purchasely.io)
- [npm package](https://www.npmjs.com/package/@purchasely/cordova-plugin-purchasely)
- [Purchasely Documentation](https://docs.purchasely.com/quick-start/sdk-installation/cordova)
- [Migration guide](./MIGRATION-v6.md)
- [Version compatibility](./VERSIONS.md)

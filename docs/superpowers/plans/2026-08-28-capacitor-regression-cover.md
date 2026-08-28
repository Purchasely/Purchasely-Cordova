# Capacitor regression cover for the `pluginInitialize` bug

**Created:** 2026-08-28
**Completed:** 2026-08-28

## Context

`CDVPurchasely` allocated `presentationsLoaded`, `actionInterceptorCallbackIds` and
`pendingInterceptCompletions` in an `-init` override. Reported by WeGlow (support
conversation `ad73ac28`), fixed by community PR #66 (approved 2026-08-28).

A subclass `-init` override runs only if the host calls `[self init]`:

| Host | `initWithWebViewEngine:` | `-init` runs |
|---|---|---|
| cordova-ios 5.1.1 to 6.3.0 | `[super init]` | No. Broken. |
| cordova-ios 7.0.0+ | `[self init]` | Yes |
| Capacitor 6, 7, 8, main | `[super init]` | No. Broken. |

A write into a nil `NSMutableDictionary` is a silent no-op, so the bug is invisible:
no crash, no warning, no log.

## Why CI missed it

1. `purchasely/__tests__/Purchasely.test.js` mocks `cordova/exec`. No Objective-C runs.
2. No native test target exists in the repo. `build-ios` only compiles, and both the
   broken and the fixed code compile.
3. `purchasely/example/package.json` pins `cordova-ios: 8.1.1`, the one host where the
   `-init` override does run. The E2E suite is green on the only host that is not broken.

Adding the client's suggested `interceptAction` spec to the existing suite would not have
caught it: it would pass on cordova-ios 8.1.1 both before and after the fix.

## Goal

Regression cover that goes red on the pre-fix code and green on the post-fix code.

## Deliverables

### D1. Native XCTest (hard gate, deterministic, offline)
Instantiate `CDVPurchasely` through Capacitor's `[super init]` path
(`initWithWebViewEngine:`), then call `pluginInitialize` the way
`CDVPluginManager.registerPlugin` does, and assert the three collections are non-nil.
No network, no store, no simulator UI. Seconds, not minutes.

Lives in the Capacitor sample's checked-in `ios/App` project. Capacitor commits `ios/`,
unlike Cordova's generated `platforms/`.

### D2. Capacitor sample app
`purchasely/example-capacitor/`, Capacitor 8 exact, `@capacitor/ios`, consuming the
plugin from `file:../`. Reuses the Cordova example's `www` content plus a running-mode
toggle so observer mode is reachable.

`plugin.xml`'s `<podspec>` is parsed by the Capacitor CLI
(`cli/src/ios/update.ts:386`), which emits `pod 'Purchasely', '6.0.0'` and the
`CordovaPlugins` pod. `use-frameworks="true"` routes to the dynamic-framework variant.

### D3. E2E specs that actually fail on a broken host
- `preload-display.e2e.js` (**hard gate**): `preload()` then `display()`, asserting the
  result is not `Presentation not loaded`. This is the exact `presentationsLoaded` path.
  Nightly logs confirm `preload` resolves cleanly in CI (`screenId: 'facetune'`), so the
  spec cannot silently skip itself.
- `interceptor.e2e.js` (**soft gate**): register an interceptor, display a paywall, tap
  the CTA natively, assert the JS callback fires. Tap-driven, so gated like `dismiss`.

Both specs run against both hosts.

### D4. CI
- `ci.yml`: new PR-gating `capacitor-ios-unit` job running D1.
- `e2e-ios-capacitor.yml`: mirrors `e2e-ios.yml` against the Capacitor `.app`.

### D5. Supported-host declaration (DEFERRED, not in this branch)
`plugin.xml` declares no `cordova-ios` minimum, which is how cordova-ios 6.x users stayed
in scope unnoticed. Setting one changes what installs for existing users, so it is a
separate decision and a separate PR.

## Verification

Run D1 and D3 twice locally: once with the `-init` code restored (must be red), once
with the `pluginInitialize` fix (must be green). Record both outputs. A test that is
never seen red proves nothing.

## Result

Verified locally on Xcode 26.6, iPhone 17 Pro simulator.

Pre-fix (origin/main), `xcodebuild test -scheme AppTests`:

    testCollectionsAreAllocatedOnTheCapacitorInitPath   failed
    testInterceptorCallbackIdSurvivesAWrite             failed
    testPreloadedPresentationSurvivesAWrite             failed
    ** TEST FAILED **

Post-fix (PR #66 cherry-picked, `npx cap sync ios`):

    Executed 3 tests, with 0 failures (0 unexpected) in 0.015 seconds
    ** TEST SUCCEEDED **

`purchasely` jest suite: 125 passed, 125 total.

# AGENTS.md

Guidance for AI coding agents working in this repository.

## Overview

Purchasely Cordova SDK: a bridge that exposes the native Purchasely SDKs (iOS App Store, Android Google Play, Huawei, Amazon) to JavaScript. It also loads in Capacitor (iOS SPM and CocoaPods paths are tested in CI).

Two npm packages:
- `@purchasely/cordova-plugin-purchasely` in `purchasely/` (iOS + Android)
- `@purchasely/cordova-plugin-purchasely-google` in `purchasely-google/` (Google Play additions)

Engines (`purchasely/plugin.xml`): cordova >= 11, cordova-android >= 12. Kotlin plugin 2.3.21, Android `compileSdk` 36 and `minSdk` 23 (`purchasely/android-tests/build.gradle`).

## Architecture

```
www/Purchasely.js -> cordova.exec() -> native bridge -> native Purchasely SDK
```

| File | Purpose |
|------|---------|
| `purchasely/www/Purchasely.js` | JavaScript API |
| `purchasely/src/ios/CDVPurchasely*.m` | iOS bridge (`+Events`, `+UserAttributes` categories) |
| `purchasely/src/ios/Hybrid/*` | iOS marshaling, native types to JSON |
| `purchasely/src/android/PurchaselyPlugin.kt` | Android bridge (`execute(action, args, callbackContext)`) |
| `purchasely/plugin.xml` | Plugin manifest, pod and Gradle dependencies |
| `purchasely/Package.swift` | SwiftPM manifest for Cordova iOS 8 and Capacitor SPM |
| `VERSIONS.md` | Cordova / iOS / Android SDK version matrix |

iOS actions are `- (void)actionName:(CDVInvokedUrlCommand*)command` and answer with `successFor:` or `failureFor:`.

Native dependencies: `Purchasely` pod (`nospm="true"`, Package.swift covers SPM), `io.purchasely:core`, and `io.purchasely:google-play` in the Google plugin.

Do not edit the top of `purchasely/Package.swift`. The Capacitor CLI rewrites it, and prose above the first dependency breaks that rewrite (see the file header).

## Versions

Cordova, iOS and Android SDK versions may differ. `VERSIONS.md` is the mapping; `plugin.xml` is the truth.

## Commands

```bash
cd purchasely && npm ci && npm test        # Jest unit tests (cordova/exec is mocked)
cd purchasely/example && ./ios.sh          # build/run example on iOS
cd purchasely/example && ./android.sh      # build/run example on Android
```

Native unit tests: Android in `purchasely/android-tests` (Gradle), iOS XCTest in `purchasely/example-capacitor`.

## Release

Full steps and the file list are in `RELEASE.md`. Summary:
1. Branch `release/X.Y.Z` from `main`.
2. Bump every file listed in `RELEASE.md` (plugin.xml, package.json, lockfiles, `Package.swift`, `Purchasely.js` `cordovaSdkVersion`, the `start` Jest test, `android-tests/build.gradle`, `VERSIONS.md`). `publish.sh` only covers part of them.
3. Open a PR, wait for CI, merge.
4. Create a GitHub release tagged `X.Y.Z`. This triggers `publish.yml` (npm trusted publishing via OIDC, no token).
5. Copy native SDK release notes from `Purchasely/Purchasely-Android` and `Purchasely/Purchasely-iOS`.

## Testing scope of the bridge

The bridge tests its own code and its calls to the native SDK. The native SDK tests its own behavior after the bridge calls it.

Test these three things:

1. **The bridge code.** Argument parsing, type conversion, default values, validation, error mapping, and the no-op of a platform-specific method.
2. **The call to the native SDK.** The JS, TypeScript or Dart call reaches the native bridge with the expected method name and argument format, and the native bridge accepts that format.
3. **The result that the bridge can see.** When the call has a completion (callback, promise, `Future` result or returned value), check it on a real device in the E2E suite: success or error, and the returned value. Examples: `setUserAttribute` has a listener callback, and `getUserAttribute` returns the value that was set. When the call has no completion (for example `emit`), stop at points 1 and 2.

Do not test:

- What the native SDK does after the call: network requests, backend reception, event delivery, StoreKit or Google Play Billing behavior. The native SDK owns this part.
- The backend or an analytics database (for example ClickHouse) to prove that a call worked.
- New iOS tests that swizzle a native SDK method. Existing swizzle tests stay.

## CI

- `ci.yml`: Unit Tests, Build iOS, Capacitor iOS (per package manager), Capacitor iOS Native Tests, Build Android, Android Bridge Unit Tests, Validate Version Consistency. Runs on PR open and on demand with the `run-ci` label or `workflow_dispatch`.
- `publish.yml`: on GitHub release, runs CI then publishes both packages. Tags `X.Y.Z-*` go to npm `next`, stable tags to `latest`. Mark RC releases as pre-release.
- `e2e-android.yml`, `e2e-ios.yml`: device E2E (Appium + WebdriverIO) against the real backend, not part of `ci.yml`. See `purchasely/example/e2e/README.md`.

E2E caveat: a green E2E check does not prove the suite passed. `ci_run_e2e_ios.sh` retries each spec up to 6 times (`E2E_TRIES`), and tolerant assertions turn a timeout into a pass (for example `expect(typeof res.error).toBe('string')` accepts `'timeout'`). Read the job log for `attempt N/`, `passing`, `failing`, and `::warning::` lines. Run `gh run view` from inside a git repo, or it returns empty output.

## Rules

- Keep the iOS and Android bridges at parity: a new JS method needs both native handlers, a Jest test, and the native tests where they exist.
- Use `fd`, `rg`, `ast-grep`, `jq` for search and JSON.
- Branches: `feat/<desc>` or `fix/<desc>`. Never commit to `main`. Rebase on `origin/main`, never merge it. Push rebased branches with `--force-with-lease`.
- Commits: Conventional Commits, small and atomic.
- Keep changes in scope. Do not upgrade dependencies unless asked.
- Run the tests and confirm CI status before you report work as done.

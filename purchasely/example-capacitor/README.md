# Capacitor sample

A minimal Capacitor 8 app that consumes `@purchasely/cordova-plugin-purchasely` from
`file:../`. It exists because the Cordova sample cannot observe a whole class of bug.

`purchasely/example` pins `cordova-ios: 8.1.1`. cordova-ios calls `[self init]` from
`-initWithWebViewEngine:` since 7.0.0, so a subclass `-init` override runs there. Every
Capacitor version, and every cordova-ios up to 6.3.0, calls `[super init]` instead, which
dispatches to NSObject and skips the override. That is how the nil-collections bug
(support conversation `ad73ac28`, fixed in #66) survived from 2021: no host in CI could
see it.

The web assets are not duplicated. `capacitor.config.json` points `webDir` at
`../example/www`, so both samples run byte-identical app code and any difference in
results is a host difference.

## Setup

```bash
npm ci
npx cap sync ios          # copies the plugin sources and runs pod install
```

CocoaPods, not the Capacitor 8 SPM default: `plugin.xml` declares the Purchasely SDK
through `<podspec>`, and the SPM path drops it silently. The platform was added with
`npx cap add ios --packagemanager Cocoapods`.

`ios/capacitor-cordova-ios-plugins` and `ios/App/Pods` are gitignored, so `cap sync`
always rebuilds them from the plugin sources in this working tree.

## Native tests

```bash
cd ios/App
xcodebuild test -workspace App.xcworkspace -scheme AppTests \
  -destination 'platform=iOS Simulator,name=iPhone 16'
```

`AppTests/CDVPurchaselyLifecycleTests.m` builds the plugin through Capacitor's
`initWithWebViewEngine:` + `pluginInitialize` path and asserts the mutable collections
both exist and retain a write. Offline: no network, no store, no SDK start. It runs in
CI as the `capacitor-ios-tests` job in `ci.yml`.

The `App` and `AppTests` schemes are shared and committed. Xcode autocreates schemes into
`xcuserdata`, which `ios/.gitignore` excludes, so without sharing them a fresh clone
cannot run `xcodebuild -scheme App`. `tools/add_test_target.rb` recreates both if the
`ios/` project is ever regenerated from scratch.

## Known limitation: the Appium E2E suite cannot drive this app

`purchasely/example/e2e` runs against the Cordova sample only. The specs and
`wdio.ios.conf.js` already accept `PURCHASELY_E2E_APP` and `PURCHASELY_E2E_BUNDLE_ID`, so
pointing them here is a one-line change, but the run never gets past the first hook:

```
Error: WEBVIEW context never appeared
[RemoteDebugger] Error checking application PID:31732: 'Empty page dictionary received'
```

Appium's XCUITest driver locates a WKWebView through the WebKit remote inspector. Against
this app the inspector sees the process but reports zero pages. What was ruled out:

- The app itself is fine. It launches, the web assets load, `deviceready` fires and the
  plugin is clobbered ("DEVICE IS READY" renders).
- `ios.webContentsDebuggingEnabled: true` in `capacitor.config.json` is set and reaches
  the built bundle. No change.
- Forcing `webView.isInspectable = true` in `sceneDidBecomeActive`, verified applied via
  NSLog on the running app. No change.
- Not the runner or the toolchain: the Cordova leg passes on the same CI runner, same
  Appium, same specs, and the same failure reproduces locally on Xcode 26.6.

So the blocker is at the WebKit/Appium level, not in the plugin, the sample, or the test
suite. Reproduced on Appium XCUITest RemoteDebugger 12.1.4.

Until that is resolved, `AppTests` is the Capacitor-host regression gate. It is the
stronger gate anyway: deterministic, offline, and it fails in 0.015s rather than 44
minutes.

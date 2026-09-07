# Purchasely Cordova — End-to-End tests

Device-level E2E tests for the example app, driving the **real** Purchasely 6.0 native
SDK through the Cordova bridge. Built with **Appium + WebdriverIO**:

- **WEBVIEW context** — calls `window.Purchasely.*` and asserts the results directly
  (the deterministic `bridge` suite).
- **NATIVE_APP context** — injects OS-level touches (interceptor / dismiss suites).

These mirror the Flutter `integration_test` suite (`E2E_TEST_INDEX.md`) adapted to the
Cordova imperative API. They are **not** part of the PR-gating `ci.yml`; they run via the
`E2E Android` / `E2E iOS` workflows (`workflow_dispatch`, nightly `schedule`, and scoped
`pull_request`).

## Suites & gating

| Suite | File | Gate | Notes |
|-------|------|------|-------|
| bridge | `specs/bridge.e2e.js` | **hard** | anonymous id, allProducts, fetchPresentationForPlacement, synchronize completion, user-attribute round-trip (string/int/boolean), userSubscriptions |
| dismiss | `specs/dismiss.e2e.js` | best-effort | present placement or default presentation + programmatic close → dismiss outcome + `closeReason` (needs a paywall to render) |
| start options 6.1.0 | `specs/start-options-6-1-0.e2e.js` | **hard** (redemption outcome best-effort) | the 6.1.0 surface exists on the object Cordova clobbered on-device; `proxy`'s three wire states (url / present null / absent key) asserted against each other after a real JSON round trip; `anonymousUserId` + its override flag on the wire and a canonical id back from native; the builder listener subscribing before the native `start`; a `ply/redeem` deeplink settling through native into the JS listener |

The `proxy` assertions cover the **bridge contract** — what crosses `cordova.exec` into the
native `start` action. They do not assert that the SDK's resolved API host changed: that is
SDK-internal state this harness cannot observe. The native half of the contract is covered
by the XCTest target (`purchasely/example-capacitor`) and the Android unit-test module
(`purchasely/android-tests`), which drive the resolvers `start()` switches on.

The redemption outcome needs the real backend reachable from the runner. When no outcome
arrives the spec logs `[redemption] KNOWN:` and returns rather than asserting on something
that cannot arrive — the same policy the store-dependent bridge assertions use.

## Adding a spec

`tools/ci_run_e2e.sh` and `tools/ci_run_e2e_ios.sh` name every spec **explicitly** and pass
`--spec`, so wdio's own `specs: ['./specs/**/*.e2e.js']` glob does **not** apply in CI. A
new spec file that is not added to both scripts never runs there, while the job still
reports green. `start-options-6-1-0.e2e.js` shipped that way on its first push.

Both scripts now assert that every `./specs/*.e2e.js` on disk has a `run_suite` line, and
fail with `::error::spec file(s) not registered` otherwise. So add the spec, add its
`run_suite` line with a hard or soft gate, and the guard keeps the two in step.

Best-effort suites emit `::warning::` on failure and do not fail the job (native/paywall
rendering is flaky in CI — same policy as the Flutter suite). Each suite retries up to 3×.

## Requirements to go green

1. The placement `PURCHASELY_E2E_PLACEMENT` (default `ONBOARDING`) must exist on the
   backend the example API key (`www/js/index.js`) points to, for app id
   `com.purchasely.demo`. Override with the env var if your integration placement differs.
2. Android: an emulator with Google APIs (the workflow uses API 34, `pixel_6`).
3. iOS: an iPhone 16/15 simulator (the workflow discovers one).

## Run locally

```bash
# Android (emulator already booted, apk already built via `cordova build android`)
cd purchasely/example/e2e && npm install
bash ./tools/ci_run_e2e.sh emulator-5554

# iOS (simulator booted, app built via `cordova build ios --emulator`)
bash ./tools/ci_run_e2e_ios.sh <simulator-udid>
```

Logs are written to `purchasely/example/e2e/ci-logs/` (uploaded as CI artifacts).

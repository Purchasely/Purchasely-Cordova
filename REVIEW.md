# REVIEW.md

The review and merge rules of the Purchasely SDKs: Android, iOS, React Native, Flutter and
Cordova. Each repo has a copy of this file. Sections 1 to 4 are the same in each copy. Section 5
is the part of that repo.

We cannot replace a released SDK version. Maven Central, npm and pub.dev keep each published
version, and the integrating apps keep the version they shipped in the stores. A fix is a new
version, and each app developer must ship an app update to get it. A backend flag can limit
some failures before that update. So we control a change before the merge, and again before the
release.

Words in this file:

- **Author**: the person who wrote the change, or who drove the agent that wrote it.
- **Platform reviewer**: an engineer of the platform that the change affects, who is not the
  author. For a bridge change (React Native, Flutter, Cordova), an engineer of the native SDK
  that the change affects.
- **SDK lead**: the lead of the mobile SDKs (`kherembourg`).

## 1. Tiers

The behavior that a change can break sets the tier. The author and the size of the diff do not.
Each tier includes the checks of the lower tiers.

| Tier | Meaning | Before merge | Before release |
|------|---------|--------------|----------------|
| **T0** | No effect on an integrating app at runtime, at build time or in its store review. | The required checks ran on the head commit and passed. All review threads are resolved. One approval from a team member who is not the author. | No test for this change. The release checklist of the repo still applies to every release. |
| **T1** | A contained runtime change that QA can see. | The approval comes from a platform reviewer. | Smoke test of the sample app on the affected area. |
| **T2** | Can break integrating apps, revenue or app start; or QA cannot easily see it; or an app needs an update to recover. | The SDK lead is the author or approves. A deep AI review of the final code (Greptile, or a Codex review at high effort), with its threads resolved. The PR body fills **Integrator impact** and **Mitigation after release**. | A row in the release test plan of the repo for each affected flow (purchase, restore, paywall display, start), run in the release QA. A release candidate when the change touches purchase or start. Migration steps in the version note when an app must change. |
| **T3** | Controls publication, artifact integrity, signing, credentials, release permissions or a required check. Also a change that deletes data on purpose with no way to recover it. | A second approval from a person who is not the author. An engineer of another SDK platform can give it. Do not use the admin bypass. | The release checklist of the repo, with a record of the artifact, its destination, its version and the publication permissions. A dry run where the registry has one. |

## 2. The matrix

The highest tier of all the rows that a PR matches is the tier of the PR. When a file matches
two rows, the more specific row wins. Section 5 gives the paths of each area in the repo.

| Area | Typical signals | Tier |
|------|-----------------|------|
| Docs, README, code comments | `docs/`, `*.md`, comments only | T0 |
| Process docs | `AGENTS.md`, `REVIEW.md`, release docs | T1. The SDK lead is the author or approves. |
| Sample app UI | screens and texts of the sample apps | T0 |
| Sample app configuration | API key, backend host, Builder options, application id, signing, install scripts | T1 |
| Tests: new tests, corrected tests | test folders | T0 |
| Tests: a removed test or a weaker assertion | test folders | The tier of the risk that the test controls. |
| Internal refactor, no behavior change, no public declaration changed | internal code only | T1 |
| Logs and debug tools | logger, log levels | T1. T2 if it runs on the main thread or logs user data. |
| Paywall rendering, layout, components, localization | renderer, layout engine, fonts, images, string files | T1. T2 if it can block a display or a purchase, crash the app, change the format arguments of a string, or change action handling, flow navigation or TV focus. |
| Media player | video and audio players | T1 for the appearance. T2 for lifecycle, threads, the shared audio session or resource ownership. |
| Backend API contract | request and response models, parsers, endpoints | T1. T2 if a parse failure can block a display or a purchase. |
| Network and security | TLS, hosts, proxy, API key and headers, interceptors, compression, timeouts, retries | T2: a failure affects every call of every app. |
| Analytics and SDK events | event names, properties, triggers, identity, delivery, deduplication | T2: a wrong event corrupts dashboards and A/B test results, and QA does not see it. T1 for an implementation change that keeps all of these. |
| Public API | any public declaration that an integrating app can use (section 5) | T2. A breaking change also needs migration steps in the version note, and a major version or an exception that the SDK lead writes in the PR body. |
| Purchase, restore, entitlements, receipts and tokens | store billing clients, transaction observers, sync with the backend, web checkout | T2 |
| User identity | login, logout, anonymous ID, purchase transfer, the cache of each user | T2 |
| Start, lifecycle, threads | `start()`, application hooks, coroutines and dispatchers, main thread work, background tasks | T2: a crash or an ANR at start hits every user of every integrating app. |
| Local data and migrations | SharedPreferences, DataStore, UserDefaults, Keychain, caches, file formats | T2: we cannot roll back data on a device. |
| Deeplinks and webviews | deeplink routing, redemption links, preview links, webview settings and navigation | T2: input from outside the app. |
| Campaigns and triggers | trigger evaluation, capping, exposure | T2: an error can show a paywall to every user. |
| Consent and privacy | consent, legal basis, data processing purposes, redaction, data export | T2: legal risk that QA does not see. |
| Crash handler and telemetry | uncaught exception handler, telemetry exporter | T2: it can hide crashes of the app or send data to the wrong place. |
| Backend configuration and its defaults | the configuration model and its default values | T2: it is the rollback path of rule 5. |
| Build compatibility and runtime dependencies | min OS, compile SDK, language and toolchain versions, store billing libraries, any dependency of a published artifact (also transitive) | T2 |
| Build-only and test-only dependencies | test libraries, build plugins with no effect on the published artifact | T1 |
| Consumer rules, library manifest, consumer lint | `consumer-rules.pro`, the `AndroidManifest.xml` of a library, published lint checks | T2: they act only in the build or the release build of the app. |
| Privacy manifest, required-reason APIs, permissions | `PrivacyInfo.xcprivacy`, manifest permissions | T2: the store review of the app can reject it. |
| Generated or rewritten files | files that a script builds or rewrites | T2 |
| Hybrid bridge, contained change | bridge code that keeps the arguments, defaults, type mappings, errors, results, callbacks and listener lifetime | T1 |
| Hybrid bridge, contract change | a change to one of the items above, or to purchase, restore, identity or entitlement behavior, also with no signature change | T2 |
| Native SDK version in a bridge | the native pins: `build.gradle`, `.podspec`, `Package.swift`, `plugin.xml`, lockfiles | T2 minimum, or the highest tier of the native changes that the new version brings. Keep all native pins at the same version. |
| CI: comments and formatting | workflow files, no behavior change | T0 |
| CI: tests and reports | test workflows, CI scripts, Actions version bumps | T1 |
| Publication, signing, credentials, required checks | publish workflows and scripts, signing, secrets, `permissions:`, the composition of the published artifact, a required check | T3, wherever the code is. |
| The release | version tag, GitHub release, publication to the registry | T3 |

## 3. Rules

1. **Do not count the author as a reviewer.** Do not count an agent as a reviewer. Its review
   is evidence for the human reviewers.
2. **Bind the checks to the head commit.** Before the merge, the required checks ran on the
   head commit and passed. A skipped check is not a pass: start the run again (section 5 says
   how).
3. **Keep or renew the approval after new commits.**
   - For T2 and T3, a new commit that changes production code, build files or CI needs a new
     approval from the platform reviewer.
   - A commit that changes only T0 files or process docs keeps the approval.
   - A rebase keeps the approval when `git range-diff <old-base>..<old-head> <new-base>..<new-head>`
     shows no change in the commits of the PR. Write the old and new head SHAs and the result in a
     PR comment. Then run the required checks on the new head.
   - The repos do not dismiss stale approvals automatically. The person who merges checks the
     approval against these rules.
4. **Change a tier with a reason.** Anyone, and an AI review, can propose a higher tier. A human
   reviewer confirms the tier. To lower a tier, write the reason in the PR body and get the
   agreement of the SDK lead and of a reviewer who is not the author. Do not go below a row of
   the matrix.
5. **Add a kill switch when you can.** Give a T2 feature a backend configuration flag that turns
   it off, and test the off state. In the PR, write the flag path, the off value, the platforms
   and any app setting that overrides it. The SDK reads the configuration only after the
   configuration response of `start()`. So a flag cannot stop code that runs before it: the
   start path, data migrations, the crash handler. Examples:
   - `telemetry.mode` = `"disabled"`: Android and iOS.
   - `user_subscription_auto_fetch_activated` = `false`: Android and iOS. It stops only the
     automatic subscription fetch.
   - `allow_campaigns` = `false`: Android and iOS. On iOS, an explicit app setting overrides it.
   - `request_body_gzip_enabled` = `false`: Android.

## 4. The PR body

Every PR body has these three sections:

```markdown
## Tier
<T0, T1, T2 or T3>: <the row of the matrix that sets it, and the evidence>.

## Integrator impact
What an integrating app sees or must do. Copy the "Impact for the application" line of the
version note when the repo has one. "None" when apps see no difference.

## Mitigation after release
How we limit the damage if this change is wrong in a released version: the backend flag
(rule 5), a hotfix release, a workaround for app developers. "Not needed" for T0.
```

Add them to the sections that the repo already asks for (section 5). Do not repeat a section
that the repo already has under another name. When the `pr-ready` skill writes the body, keep
its headings (`What`, `Why`, `How to verify`, `Notes`, `Deploy`, `Greptile`) and add the three
sections after `Why`. A PR body does not replace a required file (version note, feature doc).

## 5. This repo: Cordova

For section 5 of the other repos, start from the [Android `REVIEW.md`](https://github.com/Purchasely/Purchasely-Android-Sources/blob/develop/REVIEW.md).

### Paths of each area

These paths are examples. Classify every other file by the behavior it can change. Paths with no
prefix are under `purchasely/`.

| Area | Paths |
|------|-------|
| Public API | `www/Purchasely.js`; in `plugin.xml`: `<js-module>`, `<clobbers target="Purchasely">`, `<engines>`, `<preference>`; the names in `Package.swift` (they must equal the npm package id). `purchasely-google/www/PurchaselyGoogle.js` exports nothing and `purchasely-google/src/android/PurchaselyGoogle.java` is a stub: the API of the Google package is its `plugin.xml` (`<clobbers target="cordova.plugins.PurchaselyGoogle">` and the `google-play` dependency). `README.md` is a reference, not the full list. |
| Hybrid bridge, JS side | `www/Purchasely.js`: the `exec()` calls, their action names, arguments and defaults |
| Hybrid bridge, Android side | `src/android/PurchaselyPlugin.kt` (`execute(action, args, callbackContext)`), `purchasely-google/src/android/PurchaselyGoogle.java` |
| Hybrid bridge, iOS side | `src/ios/CDVPurchasely.m`, `src/ios/CDVPurchasely+Events.m`, `src/ios/CDVPurchasely+UserAttributes.m`, `src/ios/Hybrid/` (native types to JSON) |
| Purchase and restore | `src/android/`, `src/ios/`, and in `www/Purchasely.js` the purchase, restore and `synchronize` methods and `presentPresentation` (actions `purchaseWithPlanVendorId`, `restoreAllProducts`, `silentRestoreAllProducts`, `synchronize`) |
| User identity | the `userLogin`, `userLogout` and `getAnonymousUserId` actions in the three bridge sides |
| Deeplinks | the `handleDeeplink` and `allowDeeplink` actions in the three bridge sides |
| Native SDK version pins | `plugin.xml` (`<pod name="Purchasely" spec=…>` for iOS, `<framework src="io.purchasely:core:…">` for Android), `Package.swift` (`Purchasely-iOS.git`, `exact:`), `purchasely-google/plugin.xml` (`io.purchasely:google-play:…`), `android-tests/build.gradle` (test only), `example-capacitor/ios/App/App.xcodeproj/project.xcworkspace/xcshareddata/swiftpm/Package.resolved` (sample lockfile), and the row of `VERSIONS.md`. The repo has no `.podspec` file and no committed `Podfile`: the `<podspec>` block of `plugin.xml` is the CocoaPods pin. |
| Build compatibility | `plugin.xml`: `<engines>` (cordova, cordova-android), the Kotlin and AndroidX `<preference>` entries, `package="swift"` and `nospm="true"`; `src/android/build-extras.gradle`; `Package.swift` (`platforms:`, the `cordova-ios` dependency) |
| Generated or rewritten files | `Package.swift`: the Capacitor CLI rewrites it at each sync. Do not edit its top (see its header). The lockfiles (`package-lock.json`, `yarn.lock`) and `Package.resolved`. |
| Sample app configuration | `example/config.xml`, `example/www/js/index.js` (API key, `start()` options), `example/ios.sh`, `example/android.sh`, `example-capacitor/capacitor.config.json`, `example-capacitor/ios/`, `example-capacitor/tools/add_test_target.rb` |
| Sample app UI | `example/www/index.html`, `example/www/css/` |
| Tests | `__tests__/Purchasely.test.js` (Jest, `cordova/exec` is mocked), `android-tests/` (Android bridge unit tests), `example-capacitor/ios/App/AppTests/` (iOS XCTest), `example/e2e/` (Appium device E2E) |
| CI | `.github/workflows/ci.yml`, `.github/workflows/e2e-android.yml`, `.github/workflows/e2e-ios.yml`, `example/e2e/tools/` |
| Publication | `.github/workflows/publish.yml`, `publish.sh` (at the repo root), the `files` field of `package.json` |
| Process docs | `AGENTS.md`, `REVIEW.md`, `RELEASE.md`, `.github/pull_request_template.md` |
| Docs | `README.md`, `purchasely/README.md`, `MIGRATION-v6.md`, `INTERNAL`, `docs/` |

The repo has no `PrivacyInfo.xcprivacy`. The native iOS SDK ships it.

Publication facts:

- npm, 2 packages: `@purchasely/cordova-plugin-purchasely` (`purchasely/`) and
  `@purchasely/cordova-plugin-purchasely-google` (`purchasely-google/`). The other
  `package.json` files are sample apps and the E2E suite.
- `publish.yml` runs when a GitHub release is published. It calls `ci.yml`, checks that the two
  `package.json` versions equal the tag, and publishes with npm trusted publishing (OIDC, no
  token). A tag with `-` goes to the npm `next` tag, other tags go to `latest`.
- `publish.sh` publishes by hand. It changes only the two `package.json` versions and
  `cordovaSdkVersion`, not `plugin.xml`, `Package.swift` or the lockfiles. It gives no
  `--tag`, so a release candidate that it publishes becomes `latest`. Use `publish.yml`.
- `purchasely/package.json` limits the package to `src`, `www`, `plugin.xml` and
  `Package.swift`. `purchasely-google/package.json` has no `files` field and the repo has no
  `.npmignore`, so npm publishes all of `purchasely-google/`.

### Checks of this repo

- **CI on the head commit:** `ci.yml` has 7 jobs: Unit Tests, Build iOS, Capacitor iOS (SPM and
  CocoaPods), Capacitor iOS Native Tests, Build Android, Android Bridge Unit Tests, Validate
  Version Consistency. It runs when a PR opens, reopens or becomes ready for review, and on the
  `run-ci` label. A push to an open PR does not start it, so the new head commit has no check.
  After each push, add the `run-ci` label. The Unit Tests job removes the label. On a fork or
  Dependabot PR, the job cannot remove it: remove it by hand before you add it again.
  `workflow_dispatch` on the branch also runs `ci.yml`.
- **No required check on `main`:** GitHub does not stop a merge when a check fails or did not
  run. The person who merges reads the checks of the head commit.
- **E2E:** `e2e-android.yml` and `e2e-ios.yml` run on device against the real backend, with the
  same triggers and the same label, only when the PR changes `purchasely/www/`, the native side
  of that platform, `purchasely/example/` or the workflow. A green E2E check does not prove
  that the suite passed: read the job log for `attempt N/`, `passing`, `failing` and
  `::warning::` (see `AGENTS.md`).
- **Native pins:** `Validate Version Consistency` compares the plugin version in `plugin.xml`,
  `package.json` and the lockfiles, and checks that `Package.swift` depends on `cordova-ios`. It
  does not compare the native pins. The platform reviewer checks that the pins of the table above
  have the same version and that `VERSIONS.md` has the row.
- **Public API:** no check in CI. The platform reviewer reads the diff of `www/Purchasely.js` and
  of the two `plugin.xml` (`<js-module>`, `<clobbers>`, `<engines>`, `<preference>`,
  `<framework>`, `<pod>`).
- **Release checklist:** `RELEASE.md` (the files to change, then the GitHub release) and the row
  of `VERSIONS.md`. The repo has no release test plan file: the E2E suite and a smoke test of
  the sample app replace it.
- **Tier label:** put the label `tier:T0`, `tier:T1`, `tier:T2` or `tier:T3` on the PR. It
  repeats the **Tier** section of the body.
- **Reviewers:** `.github/CODEOWNERS` requests the owners of the T2 and T3 paths. Branch
  protection does not require a code owner review: the tier sets who must approve. For a T2 or
  T3 file that `CODEOWNERS` does not list, the author requests the reviewers.
- **The PR also has:** both native handlers, a Jest test and the native tests where they exist
  for a new JS method (bridge parity); all native pins at the same version and a `VERSIONS.md`
  row when a pin changes; a rebase on `origin/main`; the `run-ci` label after the last push.

### Not in place yet

- A public API check in CI. The package ships no `.d.ts` typings.
- A CI check that the native pins have the same version.
- Required checks on `main`. Today `main` requires 1 approval and no check, does not require
  resolved threads, and allows force pushes.
- A release test plan file.

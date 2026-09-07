const path = require('path');
const fs = require('fs');
const os = require('os');
const { config } = require('./wdio.shared.conf');

// Path to the .app built by `cordova build ios --emulator` (simulator build).
// cordova-ios 8.x emits it under build/Debug-iphonesimulator; older cordova-ios
// used build/emulator. Prefer whichever exists so the suite survives toolchain bumps.
const APP_CANDIDATES = [
  '../platforms/ios/build/Debug-iphonesimulator/HelloCordova.app',
  '../platforms/ios/build/emulator/HelloCordova.app',
].map((p) => path.resolve(__dirname, p));
const APP = process.env.PURCHASELY_E2E_APP ||
  APP_CANDIDATES.find((p) => fs.existsSync(p)) ||
  APP_CANDIDATES[0];

// Where xcodebuild puts (and finds) the WebDriverAgent build.
//
// Overridable, and left that way deliberately: caching this directory between CI runs was
// tried and MEASURED NOT TO WORK. Restoring it (53s) still left the prebuild at 140s, worse
// than the 102s clean cold build in the run before it — xcodebuild does not trust restored
// mtimes and rebuilds anyway. Runs 34144808577 (cold, 102s) and 34147235666 (restored,
// 140s). Do not re-add actions/cache here without beating those numbers.
const WDA_DERIVED = process.env.PURCHASELY_E2E_WDA_DERIVED ||
  path.join(os.tmpdir(), 'ply-wda-derived');

exports.config = Object.assign({}, config, {
  capabilities: [{
    platformName: 'iOS',
    'appium:automationName': 'XCUITest',
    'appium:app': APP,
    // Force a reinstall on every session, for the same reason as the Android config:
    // XCUITest also skips reinstalling a bundle it considers unchanged, so the simulator
    // can serve a previous build's bundled plugin JS. See wdio.android.conf.js.
    'appium:enforceAppInstall': true,
    // The Cordova sample's id. Both the app path and the id are overridable so this config
    // can drive another host's .app unchanged. No workflow does that today: the Capacitor
    // leg is blocked because Appium cannot attach to the Capacitor web view, and the
    // elimination trail is in purchasely/example-capacitor/README.md. The overrides are
    // kept because they cost one line each and are what re-enabling that leg needs.
    'appium:bundleId': process.env.PURCHASELY_E2E_BUNDLE_ID || 'com.purchasely.demo',
    'appium:deviceName': process.env.PURCHASELY_E2E_SIM || 'iPhone 16',
    // Pin an already-booted simulator when provided (CI boots one and exports its udid).
    'appium:udid': process.env.PURCHASELY_E2E_UDID || undefined,
    'appium:platformVersion': process.env.PURCHASELY_E2E_IOS_VERSION || undefined,
    'appium:newCommandTimeout': 240,
    'appium:autoAcceptAlerts': true,
    // WebDriverAgent's FIRST build on a cold CI runner can take several minutes; even 240s
    // wasn't enough ("Unable to start WebDriverAgent ... after 240000ms"), so the first spec
    // burned all its retries before WDA finished building. Give one attempt a long window to
    // build WDA, then reuse it (useNewWDA:false) — later specs start in a few seconds.
    'appium:wdaLaunchTimeout': 600000,
    'appium:wdaConnectionTimeout': 600000,
    'appium:wdaStartupRetries': 1,
    'appium:wdaStartupRetryInterval': 20000,
    'appium:useNewWDA': false,
    // Build WebDriverAgent into a FIXED DerivedData dir so it is compiled once and reused
    // across spec retries. Without it appium uses a fresh temp dir per session, so WDA is
    // rebuilt from scratch every attempt and the hard-gate bridge spec times out before the
    // (slow, cold) build ever finishes.
    //
    // CI overrides the location: os.tmpdir() on a macOS runner is a per-boot random path,
    // which cannot be restored from actions/cache. tools/prebuild_wda.js reads this same
    // value, so the prebuilt WDA and the sessions always share one directory.
    'appium:derivedDataPath': WDA_DERIVED,
  }],

  // The client must outlast the SERVER's WDA budget above. It did not, and that was the
  // single biggest cost in this job: wdio.shared.conf.js sets connectionRetryTimeout to
  // 120s with 2 retries, so the client abandoned `POST /session` after two minutes while
  // appium kept building WDA — and every retry started ANOTHER driver on the same simulator
  // and the same DerivedData dir. Run 34126281588 ended up with nine concurrent
  // xcodebuilds; the first WDA came up 18m47s later, after the bridge spec had burned three
  // full attempts (19 minutes) failing with a bare "Request timed out!". The 600000ms
  // wdaLaunchTimeout tuned above had never once applied.
  //
  // 660000 > wdaLaunchTimeout, so appium's own timeout always fires first and reports what
  // actually went wrong. connectionRetryCount 0 because retrying a session-creation request
  // that the server is still working on is what created the pile-up: there is nothing to
  // gain from a second in-flight session, and tools/ci_run_e2e_ios.sh already retries the
  // whole spec. Individual test commands stay bounded by mocha's 300s timeout; this longer
  // window only covers session creation.
  connectionRetryTimeout: 660000,
  connectionRetryCount: 0,
});

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

exports.config = Object.assign({}, config, {
  capabilities: [{
    platformName: 'iOS',
    'appium:automationName': 'XCUITest',
    'appium:app': APP,
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
    'appium:derivedDataPath': path.join(os.tmpdir(), 'ply-wda-derived'),
  }],
});

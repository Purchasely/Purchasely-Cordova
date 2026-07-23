const path = require('path');
const fs = require('fs');
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
    'appium:bundleId': 'com.purchasely.demo',
    'appium:deviceName': process.env.PURCHASELY_E2E_SIM || 'iPhone 16',
    // Pin an already-booted simulator when provided (CI boots one and exports its udid).
    'appium:udid': process.env.PURCHASELY_E2E_UDID || undefined,
    'appium:platformVersion': process.env.PURCHASELY_E2E_IOS_VERSION || undefined,
    'appium:newCommandTimeout': 240,
    'appium:autoAcceptAlerts': true,
    // WebDriverAgent's first build on a cold CI runner routinely exceeds the 60s
    // default and aborts session creation ("Unable to start WebDriverAgent ...
    // after 60000ms"). Give it room and keep the built WDA between retries.
    'appium:wdaLaunchTimeout': 240000,
    'appium:wdaConnectionTimeout': 240000,
    'appium:wdaStartupRetries': 2,
    'appium:wdaStartupRetryInterval': 20000,
    'appium:useNewWDA': false,
  }],
});

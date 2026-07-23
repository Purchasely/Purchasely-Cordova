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
    'appium:platformVersion': process.env.PURCHASELY_E2E_IOS_VERSION || undefined,
    'appium:newCommandTimeout': 240,
    'appium:autoAcceptAlerts': true,
  }],
});

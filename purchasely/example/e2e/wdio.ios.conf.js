const path = require('path');
const { config } = require('./wdio.shared.conf');

// Path to the .app built by `cordova build ios --emulator` (simulator build).
const APP = process.env.PURCHASELY_E2E_APP ||
  path.resolve(__dirname, '../platforms/ios/build/emulator/HelloCordova.app');

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

const path = require('path');
const { config } = require('./wdio.shared.conf');

// Path to the debug apk built by `cordova build android`.
const APK = process.env.PURCHASELY_E2E_APK ||
  path.resolve(__dirname, '../platforms/android/app/build/outputs/apk/debug/app-debug.apk');

exports.config = Object.assign({}, config, {
  capabilities: [{
    platformName: 'Android',
    'appium:automationName': 'UiAutomator2',
    'appium:app': APK,
    'appium:appPackage': 'com.purchasely.demo',
    'appium:newCommandTimeout': 240,
    'appium:autoGrantPermissions': true,
    // The Cordova WebView is debuggable in the debug build, so Appium can attach
    // chromedriver and expose the WEBVIEW context.
    'appium:ensureWebviewsHavePages': true,
    'appium:nativeWebScreenshot': true,
  }],
});

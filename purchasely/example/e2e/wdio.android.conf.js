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
    // Force a reinstall on every session.
    //
    // Without this Appium compares the installed package's version against the APK and,
    // when they match, does a "fast reset" (clear app data) instead of reinstalling. The
    // AVD is restored from a cache, so the app is already there at the same versionCode
    // from an earlier run, and the emulator then serves the PREVIOUS build's bundled
    // plugin JS. Proven in appium-android.log:
    //
    //   [AndroidUiautomator2Driver] Performing fast reset on 'com.purchasely.demo'
    //
    // The bridge suite never caught it, because the stale build already had the methods it
    // asserts. start-options-6-1-0 was the first spec to exercise newly added JS, and
    // every one of its 6.1.0 lookups came back 'undefined' against code that is present in
    // the APK. A cordova build never bumps the version, so this cannot be left to
    // Appium's version comparison.
    'appium:enforceAppInstall': true,
    'appium:appPackage': 'com.purchasely.demo',
    // Pin the target device when several are attached (env override); CI has a
    // single emulator so this is normally undefined.
    'appium:udid': process.env.PURCHASELY_E2E_UDID || undefined,
    'appium:newCommandTimeout': 240,
    'appium:autoGrantPermissions': true,
    // The Cordova WebView is debuggable in the debug build, so Appium can attach
    // chromedriver and expose the WEBVIEW context.
    'appium:ensureWebviewsHavePages': true,
    'appium:nativeWebScreenshot': true,
  }],
});

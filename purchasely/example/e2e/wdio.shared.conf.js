// Shared WebdriverIO config for the Purchasely Cordova E2E suite.
// Platform-specific configs (wdio.android.conf.js / wdio.ios.conf.js) extend this
// and set `capabilities`.
//
// The example app boots the Purchasely SDK on `deviceready` (see www/js/index.js).
// Tests switch to the WEBVIEW context and call `window.Purchasely.*` directly, and
// switch to NATIVE_APP to inject OS-level touches for the interceptor / dismiss suites.
exports.config = {
  runner: 'local',
  specs: ['./specs/**/*.e2e.js'],
  maxInstances: 1,
  logLevel: 'info',
  bail: 0,
  waitforTimeout: 20000,
  connectionRetryTimeout: 120000,
  connectionRetryCount: 2,
  framework: 'mocha',
  reporters: ['spec'],
  mochaOpts: {
    ui: 'bdd',
    // 300s, not 120s. These specs drive a real backend and a real paywall: a preload plus
    // a display plus a dismiss can legitimately exceed two minutes on a loaded CI runner.
    // At 120s mocha killed the test first and reported a bare "Error: Timeout", which hid
    // whichever step was actually slow. Setting it per-test with this.timeout() inside the
    // it() did not take effect under @wdio/mocha-framework, so it belongs here.
    // A larger ceiling costs nothing when specs pass; it only stops a slow run being
    // reported as a failure. Keep each spec's own budgets summing below it so a real
    // problem surfaces as that step's explicit message rather than as this timeout.
    timeout: 300000,
  },
  // Appium is started as a service by the CI runner scripts (tools/ci_run_e2e*.sh),
  // so we point WDIO at the already-running server rather than the @wdio/appium-service.
  hostname: '127.0.0.1',
  port: 4723,
  path: '/',
};

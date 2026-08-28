// Action interceptor round-trip: native paywall CTA -> JS handler. BEST-EFFORT
// (non-blocking in CI): it needs a paywall to actually render for the configured placement
// against the real backend, and its CTA to be found in the native view tree — same
// tolerance as dismiss.e2e.js.
//
// Why it exists: the iOS bridge allocated `actionInterceptorCallbackIds` in an `-init`
// override. Hosts that call `[super init]` (cordova-ios <= 6.3.0, every Capacitor version)
// never run it, so the dictionary stays nil, `registerActionInterceptor` writes its Cordova
// callbackId into nothing, and the native handler later reads back nil and completes
// `.notHandled` without ever calling into JS. Silent: every paywall CTA is inert and
// nothing is logged. Only a real tap can observe it.
const {
  waitForPurchaselyReady,
  switchToWebview,
  switchToNative,
  pollGlobal,
  displayPresentation,
  closeCurrentPresentation,
  tapPurchaseCta,
} = require('../helpers/driver');

const PLACEMENT = process.env.PURCHASELY_E2E_PLACEMENT || 'ONBOARDING';

const BROKEN_HOST_HINT =
  'On iOS this means actionInterceptorCallbackIds was nil when registerActionInterceptor ' +
  'stored the callbackId, i.e. the host never ran CDVPurchasely -init (it called ' +
  '[super init]: cordova-ios <= 6.3.0, or any Capacitor version). The native handler then ' +
  'reads back nil and completes .notHandled without calling JS.';

describe('Action interceptor (NATIVE_APP tap)', () => {
  before(async () => {
    await waitForPurchaselyReady();
  });

  it('a purchase CTA tap reaches the JS interceptor handler', async () => {
    // 1. Register the handler. It cannot go through callBridge/fireBridge: a function
    // argument is not serializable across browser.execute, so the handler is defined
    // inside the injected script and records its invocation on a window global.
    // The public JS API is interceptAction(kind, handler) — Purchasely.js drives the
    // native registerActionInterceptor/completeActionInterceptor actions itself and
    // completes the intercept with whatever the handler returns.
    await browser.execute(function () {
      window.__plyIntercept = undefined;
      // 'failed' is deliberate: 'notHandled' would hand the action back to the SDK and
      // start the real StoreKit/Billing flow (a purchase sheet the suite cannot dismiss),
      // and 'success' would make the SDK treat the purchase as completed. 'failed' just
      // releases the paywall's loader so it does not hang.
      window.Purchasely.interceptAction(window.Purchasely.PresentationAction.purchase, function (info, parameters) {
        window.__plyIntercept = { info: info || null, parameters: parameters || null };
        return 'failed';
      });
    });

    // 2. Display the paywall (fire-and-forget, so the session stays free to tap and close).
    // A fresh request is fine here: this spec asserts the interceptor, not the preload path.
    await displayPresentation('placement', PLACEMENT, 'fullScreen');
    await browser.pause(8000);

    // 3. Tap the CTA natively.
    await switchToNative();
    const tapped = await tapPurchaseCta();

    // 4. Read the handler's record back — polling a window global needs WEBVIEW context.
    await switchToWebview();

    if (!tapped) {
      // Tolerated: paywall layout varies per backend configuration, so "no CTA found" is
      // inconclusive rather than a regression. Mirrors dismiss.e2e.js's best-effort stance.
      console.log('[interceptor] no purchase CTA found in the native view tree — skipping the assertion');
    } else {
      const intercepted = await pollGlobal('__plyIntercept', 20000);
      if (!intercepted || intercepted.error === 'timeout') {
        throw new Error(
          'a purchase CTA was tapped but the interceptor handler never ran in JS. ' + BROKEN_HOST_HINT
        );
      }
      expect(intercepted).toBeDefined();
    }

    // 5. Close so the next spec starts on a clean screen. The handler already answered
    // 'failed', so the paywall is not waiting on the intercept.
    await closeCurrentPresentation();
    await browser.pause(1000);
  });
});

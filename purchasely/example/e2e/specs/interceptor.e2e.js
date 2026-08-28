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
// nothing is logged. Only a real tap can observe it end to end, which is what this spec
// attempts; see the note in the test body for what a negative result can and cannot prove.
const {
  waitForPurchaselyReady,
  switchToWebview,
  switchToNative,
  pollGlobal,
  displayPresentation,
  awaitPresented,
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
    const presented = await awaitPresented();
    if (!presented.ok) {
      console.log('[interceptor] the paywall never presented — inconclusive');
      return;
    }

    // 3. Tap the CTA natively.
    await switchToNative();
    const tapped = await tapPurchaseCta();

    // 4. Read the handler's record back — polling a window global needs WEBVIEW context.
    await switchToWebview();

    // What this spec can and cannot conclude.
    //
    // tapPurchaseCta() matches on a label, so a `true` return means "tapped an element
    // whose label looks like a CTA", NOT "triggered a purchase action". On the first CI
    // run this spec failed all six attempts against a host that HAS the fix, blaming a nil
    // actionInterceptorCallbackIds that was demonstrably non-nil: it had tapped some other
    // element on the paywall. A soft-gated check that cries wolf on a healthy host is
    // worse than no check, because it trains everyone to skip the warning.
    //
    // So a missing callback is reported and NOT failed: from the outside we cannot
    // distinguish "tapped something that was never a purchase action" from "the
    // interceptor is dead". A callback that DOES arrive is still worth asserting the shape
    // of, and its arrival is real evidence the round trip works.
    //
    // The deterministic gate for this bug is the native test instead:
    // purchasely/example-capacitor/ios/App/AppTests/CDVPurchaselyLifecycleTests.m, which
    // proves the callbackId survives a write and fails in 0.015s when it does not.
    if (!tapped) {
      console.log('[interceptor] no CTA-looking element found in the native view tree — inconclusive');
      return;
    }

    const intercepted = await pollGlobal('__plyIntercept', 20000);
    if (!intercepted || intercepted.error === 'timeout') {
      console.log(
        '[interceptor] tapped a CTA-looking element but no interceptor callback arrived — ' +
        'inconclusive (the tap may not have been a purchase action). If a purchase action ' +
        'WAS pressed, this is the bug: ' + BROKEN_HOST_HINT
      );
      return;
    }
    expect(intercepted.info === null || typeof intercepted.info === 'object').toBe(true);
    console.log('[interceptor] handler ran in JS — round trip confirmed');

  });

  // Always close, including after the inconclusive early returns above, so the next spec
  // starts on a clean screen. The handler already answered 'failed', so the paywall is not
  // waiting on the intercept.
  afterEach(async () => {
    await switchToWebview();
    await closeCurrentPresentation();
    await browser.pause(1000);
  });
});

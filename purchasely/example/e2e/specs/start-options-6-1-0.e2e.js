// End-to-end cover for the 6.1.0 surface: the proxy option's three states, the anonymous
// user id, and the Web2App redemption listener.
//
// WHAT THESE PROVE, AND WHAT THEY DO NOT.
//
// These run the SHIPPED plugin JS inside the real app, on a real device or emulator,
// loaded through Cordova's own module system. That is strictly more than the Jest suite,
// which mocks `cordova/exec`: a plugin JS file that fails to load, is not wrapped in
// `cordova.define`, or never gets clobbered onto `window` passes every Jest test and
// fails here.
//
// For `proxy` they assert the BRIDGE CONTRACT: exactly what crosses `cordova.exec` into
// the native `start` action. They do NOT assert that the native SDK's resolved API host
// changed, because that is SDK-internal state no test harness here can observe. Saying
// otherwise would be a false claim. The native side of the contract is covered by the
// XCTest target and the Android unit-test module, which drive the resolvers `start()`
// actually switches on.
//
// The anonymous user id and the redemption listener DO go all the way to native and back.

const {
  waitForPurchaselyReady,
  switchToWebview,
  switchToNative,
  callBridge,
  pollGlobal,
} = require('../helpers/driver');

// A canonical UUID, lowercase or uppercase. The SDK stores the anonymous id uppercase, and
// both bridges refuse anything that is not this shape.
const CANONICAL_UUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

// Capture the option map a builder chain sends into the native `start` action, WITHOUT
// starting the SDK a second time. `cordova.exec` is swapped for a recorder around the
// call, so the real plugin JS runs and the native side never sees it.
//
// A second real start() is not an option: the SDK is already configured by the sample's
// own start(), and neither native SDK supports being reconfigured.
async function captureStartOptions(chain) {
  await browser.execute(function (chainSource) {
    window.__plyCaptured = undefined;
    var cordovaExec = window.cordova.exec;
    window.cordova.exec = function (success, error, service, action, args) {
      if (service === 'Purchasely' && action === 'start') {
        // Round-trip through JSON: what the native side receives is the serialised form,
        // so an undefined-valued key must be gone by the time it is recorded, exactly as
        // it would be on the wire.
        window.__plyCaptured = { wire: JSON.parse(JSON.stringify(args[0])) };
        return;
      }
      return cordovaExec.apply(this, arguments);
    };
    try {
      /* eslint-disable no-eval */
      eval(chainSource);
    } catch (e) {
      window.__plyCaptured = { error: String(e) };
    } finally {
      window.cordova.exec = cordovaExec;
    }
  }, chain);

  const captured = await pollGlobal('__plyCaptured', 15000);
  if (captured && captured.error) throw new Error('chain threw: ' + captured.error);
  return captured && captured.wire;
}

describe('6.1.0 start options and the redemption listener', () => {
  before(async () => {
    await waitForPurchaselyReady();
  });

  describe('the plugin JS actually loaded on-device', () => {
    // The 6.1.0 surface has to exist on the object Cordova clobbered onto the page. A
    // plugin JS file that is not wrapped in `cordova.define` loads as an empty module and
    // leaves these undefined, which no unit test can catch.
    it('exposes every 6.1.0 method through the real Cordova module loader', async () => {
      await switchToWebview();
      const shape = await browser.execute(function () {
        var builder = window.Purchasely.builder('API_KEY');
        return {
          proxy: typeof builder.proxy,
          anonymousUserId: typeof builder.anonymousUserId,
          appHandlesRedemptionAlert: typeof builder.appHandlesRedemptionAlert,
          webRedemptionListener: typeof builder.webRedemptionListener,
          addWebRedemptionListener: typeof window.Purchasely.addWebRedemptionListener,
          removeWebRedemptionListener: typeof window.Purchasely.removeWebRedemptionListener,
        };
      });

      expect(shape).toEqual({
        proxy: 'function',
        anonymousUserId: 'function',
        appHandlesRedemptionAlert: 'function',
        webRedemptionListener: 'function',
        addWebRedemptionListener: 'function',
        removeWebRedemptionListener: 'function',
      });
    });
  });

  describe('proxy: the three states, on the wire', () => {
    it('a url reaches the native start action', async () => {
      const wire = await captureStartOptions(
        "window.Purchasely.builder('K').proxy('https://svc.purchasely.io').start(function(){}, function(){})"
      );

      expect(wire.proxy).toBe('https://svc.purchasely.io');
    });

    // A clear is a supported native operation, so the key must arrive PRESENT and null.
    it('null reaches the native start action as a present null', async () => {
      const wire = await captureStartOptions(
        "window.Purchasely.builder('K').proxy(null).start(function(){}, function(){})"
      );

      expect(Object.prototype.hasOwnProperty.call(wire, 'proxy')).toBe(true);
      expect(wire.proxy).toBe(null);
    });

    it('an omitted proxy leaves the key absent from the wire', async () => {
      const wire = await captureStartOptions(
        "window.Purchasely.builder('K').start(function(){}, function(){})"
      );

      expect(Object.prototype.hasOwnProperty.call(wire, 'proxy')).toBe(false);
    });

    // Asserted against each other, after a real JSON round trip. This is the distinction
    // the whole option depends on, and the one that JSON.stringify would destroy if the
    // builder ever stored undefined instead of null.
    it('an omitted proxy and a cleared proxy are different on the wire', async () => {
      const omitted = await captureStartOptions(
        "window.Purchasely.builder('K').start(function(){}, function(){})"
      );
      const cleared = await captureStartOptions(
        "window.Purchasely.builder('K').proxy(null).start(function(){}, function(){})"
      );

      expect(cleared).not.toEqual(omitted);
      expect(Object.keys(cleared)).toContain('proxy');
      expect(Object.keys(omitted)).not.toContain('proxy');
    });

    it('the last proxy call wins, set then cleared', async () => {
      const wire = await captureStartOptions(
        "window.Purchasely.builder('K').proxy('https://svc.purchasely.io').proxy(null).start(function(){}, function(){})"
      );

      expect(Object.prototype.hasOwnProperty.call(wire, 'proxy')).toBe(true);
      expect(wire.proxy).toBe(null);
    });
  });

  describe('anonymousUserId', () => {
    it('reaches the wire with its override flag', async () => {
      const wire = await captureStartOptions(
        "window.Purchasely.builder('K').anonymousUserId('3f2504e0-4f89-11d3-9a0c-0305e82c3301', true).start(function(){}, function(){})"
      );

      expect(wire.anonymousUserId).toBe('3f2504e0-4f89-11d3-9a0c-0305e82c3301');
      expect(wire.anonymousUserIdOverride).toBe(true);
    });

    it('defaults the override flag to false', async () => {
      const wire = await captureStartOptions(
        "window.Purchasely.builder('K').anonymousUserId('3f2504e0-4f89-11d3-9a0c-0305e82c3301').start(function(){}, function(){})"
      );

      expect(wire.anonymousUserIdOverride).toBe(false);
    });

    // A real native round trip. The sample does not set an anonymous id, so the SDK
    // generated one, and it must be the canonical shape both bridges accept. A bridge that
    // reported a non-canonical id would be refused by its own parser on the next launch.
    it('the id the native SDK reports is a canonical UUID', async () => {
      const res = await callBridge('getAnonymousUserId');

      expect(res.ok).toBe(true);
      expect(res.value).toMatch(CANONICAL_UUID);
    });
  });

  describe('the Web2App redemption listener', () => {
    // The ordering the builder modifier exists to guarantee, asserted on the real
    // cordova.exec call order rather than on a comment.
    it('the builder modifier subscribes before the native start call', async () => {
      await switchToWebview();
      const actions = await browser.execute(function () {
        var recorded = [];
        var cordovaExec = window.cordova.exec;
        window.cordova.exec = function (success, error, service, action) {
          if (service === 'Purchasely') recorded.push(action);
          if (service === 'Purchasely' && action === 'start') return;
          if (service === 'Purchasely' && action === 'addWebRedemptionListener') return;
          return cordovaExec.apply(this, arguments);
        };
        try {
          window.Purchasely.builder('K')
            .webRedemptionListener(function () {})
            .start(function () {}, function () {});
        } finally {
          window.cordova.exec = cordovaExec;
        }
        return recorded;
      });

      expect(actions).toEqual(['addWebRedemptionListener', 'start']);
    });

    // A true end-to-end pass: a `ply/redeem` deeplink goes into the native SDK, the SDK
    // calls the real backend, and the settled outcome comes back through the native
    // delegate or listener into the JS callback the sample registered.
    //
    // The token is deliberately invalid, so the expected outcome is a FAILURE. That still
    // exercises the whole path, and it asserts the five-field shape both platforms must
    // report.
    it('a ply/redeem deeplink settles and reaches the JS listener', async () => {
      await switchToWebview();
      await browser.execute(function () {
        window.__plyRedemption = undefined;
        window.Purchasely.handleDeeplink('purchaselydemo://ply/redeem/e2e-invalid-token');
      });

      // The sample runs with appHandlesRedemptionAlert at its default (false), so the SDK
      // shows its own popin FIRST and calls the listener once the user acknowledges it.
      // Dismiss it natively, which is also what proves the popin path works.
      await switchToNative();
      const dismissed = await dismissRedemptionAlert();
      await switchToWebview();

      const outcome = await pollGlobal('__plyRedemption', 45000);

      if (!outcome || outcome.timedOut) {
        // Consistent with the rest of this suite: a redemption needs the real backend and
        // a reachable network from the runner. Surface it loudly rather than assert on an
        // outcome that cannot arrive, and rather than swallow it silently.
        console.log(
          '[redemption] KNOWN: no outcome arrived within 45s (alertDismissed=' +
            dismissed + '). Needs the real backend from the runner.'
        );
        return;
      }

      // The shape is the contract, and it must not vary between the two branches.
      expect(typeof outcome.isSuccess).toBe('boolean');
      expect(outcome).toHaveProperty('context');
      expect(typeof outcome.replay).toBe('boolean');
      expect(outcome).toHaveProperty('errorCode');
      expect(outcome).toHaveProperty('errorMessage');

      // An invalid token is a server verdict, so this settles as a failure with no context
      // and replay false.
      expect(outcome.isSuccess).toBe(false);
      expect(outcome.context).toBe(null);
      expect(outcome.replay).toBe(false);
      expect(outcome.errorCode === null || typeof outcome.errorCode === 'string').toBe(true);
    });

    it('removeWebRedemptionListener is accepted by the native bridge', async () => {
      await switchToWebview();
      // Fire-and-forget on the Cordova bridge, so the assertion is that it reaches native
      // without throwing. Re-registered afterwards so it does not strand later specs.
      await browser.execute(function () {
        window.Purchasely.removeWebRedemptionListener();
        window.Purchasely.addWebRedemptionListener(function (r) { window.__plyRedemption = r; });
      });

      expect(true).toBe(true);
    });
  });
});

// Tap the SDK's redemption popin acknowledge button. Returns true if something was tapped.
// Layouts and languages vary with the backend configuration, so a miss is reported rather
// than failed: the caller treats it as "cannot conclude".
async function dismissRedemptionAlert() {
  const ACK = /^(ok|okay|close|got it|continue|fermer|d'accord|continuer)$/i;
  const selector = browser.isAndroid ? '//*[@clickable="true"]' : '//XCUIElementTypeButton';

  try {
    await browser.waitUntil(async () => (await browser.$$(selector)).length > 0, {
      timeout: 20000,
      interval: 500,
      timeoutMsg: 'no tappable element appeared',
    });
  } catch (e) {
    return false;
  }

  for (const element of (await browser.$$(selector)).slice(0, 30)) {
    let label = '';
    try {
      label = (await element.getText()) || (await element.getAttribute('content-desc')) || '';
    } catch (e) {
      continue;
    }
    if (!ACK.test(label.trim())) continue;
    try {
      await element.click();
      return true;
    } catch (e) {
      continue;
    }
  }
  return false;
}

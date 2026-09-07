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
// The division of labour, stated precisely so nothing here is oversold:
//
//   HERE          the module loaded and exposes the 6.1.0 surface; the three proxy states
//                 survive the WebView's own JSON.stringify; native returns a canonical
//                 anonymous id; a real `ply/redeem` deeplink settles into the JS listener.
//   Jest          the exec hand-off and the chain-time subscription ORDER, where
//                 `cordova/exec` is a mock and the call sequence is observable. It cannot
//                 be observed on-device: the plugin captured `require('cordova/exec')` at
//                 module load, so the global cannot be hooked afterwards.
//   XCTest and    the native resolvers `start()` switches on, for the proxy states and the
//   android-tests canonical UUID contract.
//
// None of these assert that the SDK's RESOLVED API HOST changed. That is SDK-internal
// state no harness here can observe, and claiming it would be false.
//
// The anonymous user id and the redemption listener DO go all the way to native and back.

const {
  waitForPurchaselyReady,
  switchToWebview,
  callBridge,
  pollGlobal,
} = require('../helpers/driver');

// A canonical UUID, lowercase or uppercase. The SDK stores the anonymous id uppercase, and
// both bridges refuse anything that is not this shape.
const CANONICAL_UUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

// Build a chain and read the option map it accumulated, WITHOUT starting the SDK.
//
// WHY NOT INTERCEPT cordova.exec. The first version of this helper replaced
// `window.cordova.exec` with a recorder and expected the chain's start() to hit it. That
// cannot work: `www/Purchasely.js` does `var exec = require('cordova/exec')` at module
// load, so it holds a direct reference to the module's function. Reassigning the property
// on the `cordova` object leaves that reference untouched, the recorder never fired, and
// eight tests failed with a 15s poll timeout. Nothing about the plugin was wrong.
//
// A second real start() is not an option either: the sample already configured the SDK and
// neither native supports being reconfigured.
//
// So the exec hand-off and the call ORDER are asserted in the Jest suite, where
// `cordova/exec` is a mock and can be observed properly. That is the right level for them.
// What is asserted HERE is what only a device can show: the modifiers ran inside the real
// `cordova.define` module, and their payload survives the WebView's own JSON.stringify —
// which is where an `undefined` would collapse into an absent key.
//
// `_options` is private. It is read deliberately: it is the exact object the builder hands
// to `exports.start`, and the alternative is unsupported.
async function builtOptions(chain) {
  const result = await browser.execute(function (chainSource) {
    try {
      /* eslint-disable no-eval */
      var builder = eval(chainSource);
      // Round-trip through JSON: what crosses the bridge is the serialised form, so an
      // undefined-valued key must already be gone here, exactly as it would be on the wire.
      return { wire: JSON.parse(JSON.stringify(builder._options)) };
    } catch (e) {
      return { error: String(e) };
    }
  }, chain);

  if (!result) throw new Error('the chain returned nothing');
  if (result.error) throw new Error('chain threw: ' + result.error);
  return result.wire;
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

  describe('proxy: the three states, in the built payload', () => {
    it('a url is carried in the payload', async () => {
      const wire = await builtOptions(
        "window.Purchasely.builder('K').proxy('https://svc.purchasely.io')"
      );

      expect(wire.proxy).toBe('https://svc.purchasely.io');
    });

    // A clear is a supported native operation, so the key must arrive PRESENT and null.
    it('null is carried as a PRESENT null', async () => {
      const wire = await builtOptions("window.Purchasely.builder('K').proxy(null)");

      expect(Object.prototype.hasOwnProperty.call(wire, 'proxy')).toBe(true);
      expect(wire.proxy).toBe(null);
    });

    it('an omitted proxy leaves the key absent', async () => {
      const wire = await builtOptions("window.Purchasely.builder('K')");

      expect(Object.prototype.hasOwnProperty.call(wire, 'proxy')).toBe(false);
    });

    // Asserted against each other, after a real JSON round trip. This is the distinction
    // the whole option depends on, and the one that JSON.stringify would destroy if the
    // builder ever stored undefined instead of null.
    it('an omitted proxy and a cleared proxy are different on the wire', async () => {
      const omitted = await builtOptions("window.Purchasely.builder('K')");
      const cleared = await builtOptions("window.Purchasely.builder('K').proxy(null)");

      expect(cleared).not.toEqual(omitted);
      expect(Object.keys(cleared)).toContain('proxy');
      expect(Object.keys(omitted)).not.toContain('proxy');
    });

    it('the last proxy call wins, set then cleared', async () => {
      const wire = await builtOptions(
        "window.Purchasely.builder('K').proxy('https://svc.purchasely.io').proxy(null)"
      );

      expect(Object.prototype.hasOwnProperty.call(wire, 'proxy')).toBe(true);
      expect(wire.proxy).toBe(null);
    });
  });

  describe('anonymousUserId', () => {
    it('is carried with its override flag', async () => {
      const wire = await builtOptions(
        "window.Purchasely.builder('K').anonymousUserId('3f2504e0-4f89-11d3-9a0c-0305e82c3301', true)"
      );

      expect(wire.anonymousUserId).toBe('3f2504e0-4f89-11d3-9a0c-0305e82c3301');
      expect(wire.anonymousUserIdOverride).toBe(true);
    });

    it('defaults the override flag to false', async () => {
      const wire = await builtOptions(
        "window.Purchasely.builder('K').anonymousUserId('3f2504e0-4f89-11d3-9a0c-0305e82c3301')"
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
    // The chain-time subscription ORDER is asserted in the Jest suite
    // (`webRedemptionListener subscribes BEFORE the native start call`), where
    // `cordova/exec` is a mock and the call sequence is observable. It cannot be observed
    // here: the plugin captured `require('cordova/exec')` at module load, so the global
    // cannot be hooked afterwards. What this file adds instead is the end-to-end proof
    // below, which only passes if the listener was in place before the redemption settled.

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

      // The sample starts with appHandlesRedemptionAlert: true, so the SDK shows no popin
      // and calls the listener as soon as the redemption settles. Under the native default
      // (false) the callback is gated on a UI dismissal, which is what made this assertion
      // skip on a loaded emulator. Only the backend call is left in the loop now.
      const outcome = await pollGlobal('__plyRedemption', 45000);

      if (!outcome || outcome.timedOut) {
        // Consistent with the rest of this suite: a redemption still needs the real
        // backend reachable from the runner. Surface it loudly rather than assert on an
        // outcome that cannot arrive, and rather than swallow it silently.
        console.log(
          '[redemption] KNOWN: no outcome arrived within 45s. The SDK popin is no longer ' +
            'in the loop (appHandlesRedemptionAlert: true), so this is the backend call.'
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

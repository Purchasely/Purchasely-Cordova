// Deterministic Dart<->native bridge assertions (no native taps). HARD gate — these
// must pass. Mirrors the Flutter E2E_TEST_INDEX suite T1/T3/T5/T6 adapted to the
// Cordova imperative API.
const { waitForPurchaselyReady, callBridge, fireBridge, callPresentation } = require('../helpers/driver');

const PLACEMENT = process.env.PURCHASELY_E2E_PLACEMENT || 'ONBOARDING';

describe('Purchasely bridge (WEBVIEW context)', () => {
  before(async () => {
    await waitForPurchaselyReady();
  });

  // T1 — anonymous user id
  it('getAnonymousUserId returns a non-empty id', async () => {
    const res = await callBridge('getAnonymousUserId');
    expect(res.ok).toBe(true);
    expect(typeof res.value).toBe('string');
    expect(res.value.length).toBeGreaterThan(0);
  });

  // T5 — catalog. Store-dependent: the iOS simulator has no StoreKit products configured,
  // so allProducts settles as a clean error there while the Android emulator (Google
  // Billing) returns a list. Assert the bridge round-trips cleanly either way.
  it('allProducts returns a list', async () => {
    const res = await callBridge('allProducts');
    if (res.ok) {
      expect(Array.isArray(res.value)).toBe(true);
    } else {
      expect(typeof res.error).toBe('string');
    }
  });

  // T3 — preload a presentation for a placement (was fetchPresentationForPlacement;
  // now Purchasely.presentation.placement(id).build().preload())
  it('presentation.placement(...).build().preload() returns a presentation object', async () => {
    const res = await callPresentation('placement', PLACEMENT, 'preload');
    // Store-dependent (preload fetches the paywall + its products): tolerate a clean error
    // on the store-less iOS simulator, assert the shape when it resolves.
    if (res.ok) {
      // v6 presentation normalizes screenId as the authoritative identifier.
      expect(res.value === null || typeof res.value === 'object').toBe(true);
      if (res.value) {
        expect(typeof res.value.screenId).toBe('string');
      }
    } else {
      expect(typeof res.error).toBe('string');
    }
  });

  // T6 — synchronize now reports completion (v6 change). On a bare emulator/simulator
  // with no billing, exactly one of success/error must fire (no fire-and-forget).
  it('synchronize resolves exactly one callback', async () => {
    const res = await callBridge('synchronize');
    expect(typeof res.ok).toBe('boolean');
  });

  // user-attribute round-trip (set then read back). The setters are fire-and-forget on
  // the Cordova bridge (no success callback), so fire them via fireBridge and read back
  // with callBridge; the small pause lets the native set land before the read.
  it('setUserAttributeWithString then userAttribute round-trips', async () => {
    await fireBridge('setUserAttributeWithString', ['e2e_key', 'e2e_value', 'ESSENTIAL']);
    await browser.pause(300);
    const res = await callBridge('userAttribute', ['e2e_key']);
    expect(res.ok).toBe(true);
    expect(res.value).toBe('e2e_value');
  });

  // user-attribute round-trip, int variant
  it('setUserAttributeWithInt then userAttribute round-trips', async () => {
    await fireBridge('setUserAttributeWithInt', ['e2e_key_int', 7, 'ESSENTIAL']);
    await browser.pause(300);
    const res = await callBridge('userAttribute', ['e2e_key_int']);
    expect(res.ok).toBe(true);
    expect(res.value).toBe(7);
  });

  // user-attribute round-trip, boolean variant (CDV-W-09 fixed: both platforms now
  // return a real JSON boolean, so this asserts strict equality, not just truthiness).
  it('setUserAttributeWithBoolean then userAttribute round-trips', async () => {
    await fireBridge('setUserAttributeWithBoolean', ['e2e_key_bool', true, 'ESSENTIAL']);
    await browser.pause(300);
    const res = await callBridge('userAttribute', ['e2e_key_bool']);
    expect(res.ok).toBe(true);
    expect(res.value).toBe(true);
  });

  // userSubscriptions on a fresh anonymous user. Store-dependent: settles as a list on the
  // Android emulator, can settle as a clean error on the store-less iOS simulator.
  it('userSubscriptions returns a list', async () => {
    const res = await callBridge('userSubscriptions');
    if (res.ok) {
      expect(Array.isArray(res.value)).toBe(true);
    } else {
      expect(typeof res.error).toBe('string');
    }
  });

  // T2 — login/logout cycle: isAnonymous flips true -> false -> true. userLogin/userLogout
  // are fire-and-forget on the Cordova bridge, so drive them via fireBridge + verify via
  // the callback-based isAnonymous getter.
  it('isAnonymous flips around userLogin / userLogout', async () => {
    let res = await callBridge('isAnonymous');
    expect(res.ok).toBe(true);
    expect(res.value).toBe(true);

    await fireBridge('userLogin', ['cordova_e2e_user']);
    await browser.pause(500);
    res = await callBridge('isAnonymous');
    expect(res.value).toBe(false);

    await fireBridge('userLogout', []);
    await browser.pause(500);
    res = await callBridge('isAnonymous');
    expect(res.value).toBe(true);
  });

  // T4 — dynamic offerings list (may be empty on a bare emulator)
  it('getDynamicOfferings returns a list', async () => {
    const res = await callBridge('getDynamicOfferings');
    expect(res.ok).toBe(true);
    expect(Array.isArray(res.value)).toBe(true);
  });

  // T18 — dynamic offerings set / get / remove / clear round-trip (list stays an array,
  // no throw). The mutators are fire-and-forget; getDynamicOfferings reads back.
  it('dynamic offerings set / remove / clear round-trip', async () => {
    await fireBridge('setDynamicOffering', ['e2e_ref', 'e2e_plan', null, 0]);
    await browser.pause(300);
    let res = await callBridge('getDynamicOfferings');
    expect(Array.isArray(res.value)).toBe(true);

    await fireBridge('removeDynamicOffering', ['e2e_ref']);
    await fireBridge('clearDynamicOfferings', []);
    await browser.pause(300);
    res = await callBridge('getDynamicOfferings');
    expect(res.ok).toBe(true);
    expect(Array.isArray(res.value)).toBe(true);
  });

  // T16 — increment / decrement a numeric user attribute
  it('increment / decrement a numeric user attribute', async () => {
    await fireBridge('setUserAttributeWithInt', ['e2e_counter', 5, 'ESSENTIAL']);
    await browser.pause(300);
    await fireBridge('incrementUserAttribute', ['e2e_counter', 3]);
    await browser.pause(300);
    let res = await callBridge('userAttribute', ['e2e_counter']);
    expect(res.value).toBe(8);

    await fireBridge('decrementUserAttribute', ['e2e_counter', 2]);
    await browser.pause(300);
    res = await callBridge('userAttribute', ['e2e_counter']);
    expect(res.value).toBe(6);
  });
});

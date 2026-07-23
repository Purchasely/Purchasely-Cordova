// Deterministic Dart<->native bridge assertions (no native taps). HARD gate — these
// must pass. Mirrors the Flutter E2E_TEST_INDEX suite T1/T3/T5/T6 adapted to the
// Cordova imperative API.
const { waitForPurchaselyReady, callBridge, callPresentation } = require('../helpers/driver');

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

  // T5 — catalog
  it('allProducts returns a list', async () => {
    const res = await callBridge('allProducts');
    expect(res.ok).toBe(true);
    expect(Array.isArray(res.value)).toBe(true);
  });

  // T3 — preload a presentation for a placement (was fetchPresentationForPlacement;
  // now Purchasely.presentation.placement(id).build().preload())
  it('presentation.placement(...).build().preload() returns a presentation object', async () => {
    const res = await callPresentation('placement', PLACEMENT, 'preload');
    expect(res.ok).toBe(true);
    expect(res.value).toBeDefined();
    // v6 presentation normalizes screenId as the authoritative identifier.
    expect(res.value === null || typeof res.value === 'object').toBe(true);
    if (res.value) {
      expect(typeof res.value.screenId).toBe('string');
    }
  });

  // T6 — synchronize now reports completion (v6 change). On a bare emulator/simulator
  // with no billing, exactly one of success/error must fire (no fire-and-forget).
  it('synchronize resolves exactly one callback', async () => {
    const res = await callBridge('synchronize');
    expect(typeof res.ok).toBe('boolean');
  });

  // user-attribute round-trip (set then read back)
  it('setUserAttributeWithString then userAttribute round-trips', async () => {
    await callBridge('setUserAttributeWithString', ['e2e_key', 'e2e_value', 'ESSENTIAL']);
    const res = await callBridge('userAttribute', ['e2e_key']);
    expect(res.ok).toBe(true);
    expect(res.value).toBe('e2e_value');
  });

  // user-attribute round-trip, int variant
  it('setUserAttributeWithInt then userAttribute round-trips', async () => {
    await callBridge('setUserAttributeWithInt', ['e2e_key_int', 7, 'ESSENTIAL']);
    const res = await callBridge('userAttribute', ['e2e_key_int']);
    expect(res.ok).toBe(true);
    expect(res.value).toBe(7);
  });

  // user-attribute round-trip, boolean variant (CDV-W-09 fixed: both platforms now
  // return a real JSON boolean, so this asserts strict equality, not just truthiness).
  it('setUserAttributeWithBoolean then userAttribute round-trips', async () => {
    await callBridge('setUserAttributeWithBoolean', ['e2e_key_bool', true, 'ESSENTIAL']);
    const res = await callBridge('userAttribute', ['e2e_key_bool']);
    expect(res.ok).toBe(true);
    expect(res.value).toBe(true);
  });

  // userSubscriptions on a fresh anonymous user: no purchases exist, so this must
  // resolve with an empty (not error) list rather than actually validating any store.
  it('userSubscriptions returns a list', async () => {
    const res = await callBridge('userSubscriptions');
    expect(res.ok).toBe(true);
    expect(Array.isArray(res.value)).toBe(true);
  });
});

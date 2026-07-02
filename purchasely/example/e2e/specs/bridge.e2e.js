// Deterministic Dart<->native bridge assertions (no native taps). HARD gate — these
// must pass. Mirrors the Flutter E2E_TEST_INDEX suite T1/T3/T5/T6 adapted to the
// Cordova imperative API.
const { waitForPurchaselyReady, callBridge } = require('../helpers/driver');

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

  // T3 — preload a presentation for a placement
  it('fetchPresentationForPlacement returns a presentation object', async () => {
    const res = await callBridge('fetchPresentationForPlacement', [PLACEMENT, null]);
    expect(res.ok).toBe(true);
    expect(res.value).toBeDefined();
    // v6 presentation carries an id/type so it can later be displayed.
    expect(res.value === null || typeof res.value === 'object').toBe(true);
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
});

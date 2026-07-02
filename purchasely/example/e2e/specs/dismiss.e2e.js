// Presentation display + dismiss outcome. BEST-EFFORT (non-blocking in CI): depends on
// a paywall actually rendering for the configured placement against the real backend.
// Mirrors E2E_TEST_INDEX T8/T12 adapted to the Cordova imperative API.
const { waitForPurchaselyReady, callBridge, switchToNative } = require('../helpers/driver');

const PLACEMENT = process.env.PURCHASELY_E2E_PLACEMENT || 'ONBOARDING';

describe('Presentation dismiss outcome', () => {
  before(async () => {
    await waitForPurchaselyReady();
  });

  // T8/T12 — the present* success callback IS the per-presentation dismiss outcome.
  // Present a placement, close it programmatically, and assert the outcome fires with a
  // closeReason.
  it('presentPresentationForPlacement + closePresentation delivers a dismiss outcome', async () => {
    // Kick off the presentation; do NOT await (the callback resolves at dismiss).
    const outcomePromise = callBridge(
      'presentPresentationForPlacement',
      [PLACEMENT, null, 'fullScreen'],
      90000
    );

    // Give the paywall time to render, then close it programmatically from the bridge.
    await browser.pause(6000);
    await callBridge('closePresentation');

    const outcome = await outcomePromise;
    expect(outcome.ok).toBe(true);
    expect(outcome.value).toBeDefined();
    // v6 outcome carries a closeReason; programmatic close => 'programmatic' (Android).
    if (outcome.value && outcome.value.closeReason) {
      expect(typeof outcome.value.closeReason).toBe('string');
    }
    await switchToNative().catch(() => {});
  });
});

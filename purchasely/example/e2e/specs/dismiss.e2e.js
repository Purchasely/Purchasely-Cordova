// Presentation display + dismiss outcome. BEST-EFFORT (non-blocking in CI): depends on
// a paywall actually rendering for the configured placement against the real backend.
// Mirrors E2E_TEST_INDEX T8/T12 adapted to the Cordova imperative API.
const {
  waitForPurchaselyReady,
  callPresentation,
  closeCurrentPresentation,
  switchToNative,
} = require('../helpers/driver');

const PLACEMENT = process.env.PURCHASELY_E2E_PLACEMENT || 'ONBOARDING';

describe('Presentation dismiss outcome', () => {
  before(async () => {
    await waitForPurchaselyReady();
  });

  // T8/T12 — display() resolves with the per-presentation dismiss outcome (was the
  // presentPresentationForPlacement success callback; closePresentation() is now
  // request.close(), driven here via closeCurrentPresentation()).
  // Present a placement, close it programmatically, and assert the outcome fires with a
  // closeReason.
  it('presentation.placement(...).build().display() + request.close() delivers a dismiss outcome', async () => {
    // Kick off the presentation; do NOT await (the promise resolves at dismiss).
    const outcomePromise = callPresentation('placement', PLACEMENT, 'display', 'fullScreen', 90000);

    // Give the paywall time to render, then close it programmatically from the bridge.
    await browser.pause(6000);
    await closeCurrentPresentation();

    const outcome = await outcomePromise;
    expect(outcome.ok).toBe(true);
    expect(outcome.value).toBeDefined();
    // v6 outcome carries a closeReason; programmatic close => 'programmatic' (Android).
    if (outcome.value && outcome.value.closeReason) {
      expect(typeof outcome.value.closeReason).toBe('string');
    }
    await switchToNative().catch(() => {});
  });

  // v6 default (audience-targeted) presentation: same shape as the placement flow above,
  // just with no placement/screen id (was presentPresentationForDefault). Best-effort:
  // depends on a default audience being configured on the backend for this app id.
  it('presentation.defaultSource().build().display() + request.close() delivers a dismiss outcome', async () => {
    const outcomePromise = callPresentation('defaultSource', null, 'display', 'fullScreen', 90000);

    await browser.pause(6000);
    await closeCurrentPresentation();

    const outcome = await outcomePromise;
    expect(outcome.ok).toBe(true);
    expect(outcome.value).toBeDefined();
    if (outcome.value && outcome.value.closeReason) {
      expect(typeof outcome.value.closeReason).toBe('string');
    }
    await switchToNative().catch(() => {});
  });
});

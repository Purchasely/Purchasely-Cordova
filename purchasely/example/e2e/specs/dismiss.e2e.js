// Presentation display + dismiss outcome. BEST-EFFORT (non-blocking in CI): depends on
// a paywall actually rendering for the configured placement against the real backend.
// Mirrors E2E_TEST_INDEX T8/T12 adapted to the Cordova imperative API.
const {
  waitForPurchaselyReady,
  displayPresentation,
  awaitPresented,
  awaitDismissOutcome,
  closeCurrentPresentation,
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
    // Fire display() fire-and-forget (its promise settles at dismiss and would otherwise
    // block the session so close() could never run).
    await displayPresentation('placement', PLACEMENT, 'fullScreen');

    // Wait for the paywall to actually be on screen, then close it from the bridge. A fixed
    // 6s pause used to stand in for this and lost the race on loaded CI runners: close()
    // arrived before the presentation existed, so no dismiss outcome was ever produced and
    // the assertion below failed on a timeout.
    const presented = await awaitPresented();
    if (!presented.ok) {
      console.log('[dismiss] the paywall never presented (' + (presented.error || 'unknown') +
        ') — nothing to close, so there is no dismiss outcome to assert');
      return;
    }
    await closeCurrentPresentation();

    const outcome = await awaitDismissOutcome(30000);
    expect(outcome.ok).toBe(true);
    expect(outcome.value).toBeDefined();
    // v6 outcome carries a closeReason; programmatic close => 'programmatic' (Android).
    if (outcome.value && outcome.value.closeReason) {
      expect(typeof outcome.value.closeReason).toBe('string');
    }
  });

  // v6 default (audience-targeted) presentation: same shape as the placement flow above,
  // just with no placement/screen id (was presentPresentationForDefault). Best-effort:
  // depends on a default audience being configured on the backend for this app id.
  it('presentation.defaultSource().build().display() + request.close() delivers a dismiss outcome', async () => {
    await displayPresentation('defaultSource', null, 'fullScreen');

    const presented = await awaitPresented();
    if (!presented.ok) {
      console.log('[dismiss] the default presentation never presented (' +
        (presented.error || 'unknown') + ') — nothing to close');
      return;
    }
    await closeCurrentPresentation();

    const outcome = await awaitDismissOutcome(30000);
    expect(outcome.ok).toBe(true);
    expect(outcome.value).toBeDefined();
    if (outcome.value && outcome.value.closeReason) {
      expect(typeof outcome.value.closeReason).toBe('string');
    }
  });
});

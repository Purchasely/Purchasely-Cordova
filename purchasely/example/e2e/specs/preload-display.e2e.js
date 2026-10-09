// preload() bridge contract: the call reaches the native bridge and its callback answers.
// The native SDK owns what happens after the call (see AGENTS.md, "Testing scope of the
// bridge"), so this spec does not wait on StoreKit and does not check a displayed paywall.
const { waitForPurchaselyReady, callPresentation } = require('../helpers/driver');

const PLACEMENT = process.env.PURCHASELY_E2E_PLACEMENT || 'ONBOARDING';

describe('Presentation preload', () => {
  before(async function () {
    // Skipped on iOS: updateStatusFromStoreKit() has no time limit on a simulator without an Apple account, so start() never calls back. Back after the iOS SDK bounds it (Purchasely-Cordova PR #83).
    if (browser.isIOS) this.skip();
    await waitForPurchaselyReady();
  });

  it('preload() settles with a presentation or a native error', async () => {
    const res = await callPresentation('placement', PLACEMENT, 'preload', undefined, 30000);
    // No callback at all means the bridge call was lost: that is the only failure.
    expect(res.timedOut).not.toBe(true);
    if (res.ok) {
      expect(typeof res.value.screenId).toBe('string');
    } else {
      expect(typeof res.error).toBe('string');
    }
  });
});

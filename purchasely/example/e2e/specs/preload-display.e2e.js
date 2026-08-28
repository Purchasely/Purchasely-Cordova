// preload() -> display() on the SAME request. HARD gate — this is a host-compatibility
// regression test, not a paywall-rendering test.
//
// Why it exists: the iOS bridge allocated `presentationsLoaded` in an `-init` override.
// A subclass `-init` only runs when the host calls `[self init]`; cordova-ios 7.0.0+ does,
// but cordova-ios <= 6.3.0 and every Capacitor version call `[super init]`, which lands on
// NSObject and never reaches the override. Writing into a nil NSMutableArray is a silent
// no-op, so on those hosts `fetchPresentation` "succeeds" while storing nothing, and the
// later `presentPresentation` looks the presentation up, misses, and fails with the exact
// string "Presentation not loaded". No crash, no warning — only this flow catches it.
//
// display() re-displays the preloaded presentation ONLY when it is driven from the same
// request object (see displayLastPresentation), which is why this spec does not reuse
// displayPresentation() the way dismiss.e2e.js does.
const {
  waitForPurchaselyReady,
  callPresentation,
  displayLastPresentation,
  awaitDismissOutcome,
  closeCurrentPresentation,
} = require('../helpers/driver');

const PLACEMENT = process.env.PURCHASELY_E2E_PLACEMENT || 'ONBOARDING';

// The native failure string for a presentation missing from `presentationsLoaded`
// (CDVPurchasely.m, -presentPresentation:). It reaches JS as a RESOLVED outcome carrying
// an `error` field, not as a rejection: display()'s promise has no reject path — its
// onNativeError settles the outcome with the message.
const NOT_LOADED = 'Presentation not loaded';

const BROKEN_HOST_HINT =
  'the preloaded presentation was not found natively. On iOS this means presentationsLoaded ' +
  'was nil when fetchPresentation wrote to it, i.e. the host never ran CDVPurchasely -init ' +
  '(it called [super init]: cordova-ios <= 6.3.0, or any Capacitor version).';

describe('Preloaded presentation display', () => {
  before(async () => {
    await waitForPurchaselyReady();
  });

  it('preload() then display() on the same request does not report "Presentation not loaded"', async () => {
    // 1. Preload. Unlike bridge.e2e.js T3 this does NOT tolerate a preload error: a
    // tolerated branch would silently skip the regression check that follows. The nightly
    // iOS run resolves preload cleanly against the real backend, so a failure here is a
    // real problem and must be loud.
    // 60s, not the 90s default: 90 + the 6s pause + the 30s outcome poll overruns the 120s
    // mocha timeout, which would replace the loud message below with a generic timeout.
    const preloaded = await callPresentation('placement', PLACEMENT, 'preload', undefined, 60000);
    if (!preloaded.ok) {
      throw new Error(
        'preload() failed for placement "' + PLACEMENT + '" (' + preloaded.error + '). ' +
        'This spec cannot verify the preload->display path without a loaded presentation; ' +
        'check the placement exists on the backend for this app id.'
      );
    }
    expect(preloaded.value).toBeDefined();
    expect(typeof preloaded.value.screenId).toBe('string');

    // 2. Display THAT presentation (fire-and-forget: display() settles at dismiss and would
    // otherwise block the session so close() could never run), then close it.
    await displayLastPresentation('fullScreen');
    await browser.pause(6000);
    await closeCurrentPresentation();

    const outcome = await awaitDismissOutcome(30000);

    // 3. The assertion this spec exists for. On a broken host the native error arrives
    // immediately, well inside the poll window, so an outcome timeout can never hide it —
    // which is why the timeout itself is tolerated (store-dependent) while this is not.
    const error = outcome.ok && outcome.value ? outcome.value.error : outcome.error;
    if (typeof error === 'string' && error.indexOf(NOT_LOADED) !== -1) {
      throw new Error(
        'display() of the preloaded presentation failed with "' + NOT_LOADED + '": ' +
        BROKEN_HOST_HINT
      );
    }

    // Any OTHER display error is tolerated: displaying a real paywall depends on the store
    // and on the backend configuration for this placement.
    expect(outcome).toBeDefined();
  });
});

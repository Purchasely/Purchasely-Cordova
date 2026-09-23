// Drawer closed by a real tap (iOS only). Port of React Native T31.
//
// Regression guard for the bug fixed in iOS SDK 6.1.2: a drawer, popin or modal closed by
// its own button or by a tap on the background left the SDK window alive, invisible and
// key above the app, and PRESENTATION_CLOSED was never sent. The app then took no more
// taps. The Cordova bridge has no window logic of its own, so only a real tap on a real
// device window can observe it.
//
// Each pass: display a 70% drawer -> tap (close button, then the scrim) -> dismiss outcome
// + PRESENTATION_CLOSED -> a full-screen probe <div> appears in the WebView and the spec
// taps the centre of the screen BY COORDINATES. The probe tap is the symptom itself: with a
// leftover SDK window on top, the OS tap never reaches the WebView.
//
// If the paywall never presents (real backend, see dismiss.e2e.js), the pass is
// inconclusive and returns: there is nothing to close. Everything after a presented drawer
// is asserted.
const {
  waitForPurchaselyReady,
  switchToWebview,
  switchToNative,
  pollGlobal,
  displayPresentation,
  awaitPresented,
  awaitDismissOutcome,
  closeCurrentPresentation,
} = require('../helpers/driver');

const PLACEMENT = process.env.PURCHASELY_E2E_PLACEMENT || 'ONBOARDING';
const DRAWER = { type: 'drawer', height: { type: 'percentage', value: 0.7 } }; // iOS reads 0.0-1.0 (CDVPurchasely.m)
const CLOSE_LABEL = /^(x|×|close|fermer|dismiss)$|close/i;

// Record PRESENTATION_CLOSED. The native events slot holds one callback, so this replaces
// the sample's logger for the rest of the session; nothing else in this spec needs it.
async function listenForClosed() {
  await browser.execute(function () {
    window.__plyClosed = undefined;
    window.Purchasely.addEventListener(function (event) {
      if (event && event.name === 'PRESENTATION_CLOSED') window.__plyClosed = event;
    });
  });
}

// Tap by coordinates in NATIVE_APP context. The point is NOT resolved from the a11y tree:
// with the bug that tree belongs to the leftover SDK window.
async function tapAt(x, y) {
  await browser.execute('mobile: tap', { x: Math.round(x), y: Math.round(y) });
}

// The drawer's close button, by label; null if the screen has none.
async function findCloseButton() {
  for (const el of await browser.$$('//XCUIElementTypeButton')) {
    try {
      const label = (await el.getAttribute('label')) || (await el.getAttribute('name')) || '';
      if (!CLOSE_LABEL.test(label.trim())) continue;
      const r = await el.getElementRect(el.elementId);
      if (r.width > 0 && r.height > 0 && r.width <= 120 && r.height <= 120) return r;
    } catch (e) {
      continue; // stale while the drawer animates in
    }
  }
  return null;
}

// Show a full-screen probe in the WebView, tap the screen centre natively, and resolve
// true if that tap reached the WebView.
async function probeTapReachesApp(size) {
  await switchToWebview();
  await browser.execute(function () {
    window.__plyProbeTaps = undefined;
    var old = document.getElementById('ply-e2e-probe');
    if (old) old.remove();
    var probe = document.createElement('div');
    probe.id = 'ply-e2e-probe';
    probe.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:#1a237e;';
    probe.addEventListener('click', function () { window.__plyProbeTaps = (window.__plyProbeTaps || 0) + 1; });
    document.body.appendChild(probe);
  });
  await browser.pause(500);
  await switchToNative();
  await tapAt(size.width / 2, size.height / 2);
  await switchToWebview();
  const taps = await pollGlobal('__plyProbeTaps', 10000);
  await browser.execute(function () {
    var probe = document.getElementById('ply-e2e-probe');
    if (probe) probe.remove();
  });
  return typeof taps === 'number' && taps > 0;
}

describe('Drawer closed by a real tap (iOS SDK 6.1.2)', () => {
  before(async function () {
    if (browser.isAndroid) this.skip(); // iOS-only bug
    await waitForPurchaselyReady();
  });

  for (const mode of ['button', 'outside']) {
    it(`a ${mode} tap closes the drawer, sends PRESENTATION_CLOSED and the app still takes taps`, async () => {
      await switchToWebview();
      await listenForClosed();
      await displayPresentation('placement', PLACEMENT, DRAWER);
      const presented = await awaitPresented();
      if (!presented.ok) {
        console.log(`[drawer:${mode}] the paywall never presented (${presented.error || 'unknown'}) — inconclusive`);
        return;
      }
      await browser.pause(1500); // drawer animation

      await switchToNative();
      const size = await browser.getWindowSize();
      if (mode === 'button') {
        const r = await findCloseButton();
        if (!r) {
          console.log('[drawer:button] the screen has no labelled close button — inconclusive');
          return;
        }
        await tapAt(r.x + r.width / 2, r.y + r.height / 2);
      } else {
        await tapAt(size.width / 2, size.height * 0.12); // the scrim above a 70% drawer
      }

      await switchToWebview();
      const outcome = await awaitDismissOutcome(20000);
      const closed = await pollGlobal('__plyClosed', 10000);
      const reachesApp = await probeTapReachesApp(size);

      console.log(`[drawer:${mode}] outcome=${JSON.stringify(outcome)} closed=${!closed.timedOut} probe=${reachesApp}`);
      expect(outcome.ok).toBe(true);
      expect(closed.timedOut).toBeUndefined();
      expect(reachesApp).toBe(true);
      if (mode === 'button') expect(outcome.value.closeReason).toBe('button');
    });
  }

  // A pass that returned early or failed can leave the drawer up.
  afterEach(async () => {
    await switchToWebview();
    await closeCurrentPresentation();
    await browser.pause(1000);
  });
});

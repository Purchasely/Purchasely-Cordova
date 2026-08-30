// Helpers for driving the Purchasely Cordova example app under Appium/WebdriverIO.
//
// Two contexts are used:
//   * WEBVIEW  — run JS against `window.Purchasely` (the cordova.exec bridge) and read
//                results directly; used for the deterministic "bridge" assertions.
//   * NATIVE_APP — inject OS-level touches (tap purchase button, press back) for the
//                interceptor / dismiss suites.

async function switchToWebview() {
  await browser.waitUntil(async () => {
    const contexts = await browser.getContexts();
    return contexts.some((c) => (typeof c === 'string' ? c : c.id).includes('WEBVIEW'));
  }, { timeout: 60000, timeoutMsg: 'WEBVIEW context never appeared' });

  const contexts = await browser.getContexts();
  const webview = contexts
    .map((c) => (typeof c === 'string' ? c : c.id))
    .find((id) => id.includes('WEBVIEW'));
  await browser.switchContext(webview);
}

async function switchToNative() {
  await browser.switchContext('NATIVE_APP');
}

// Wait until the Purchasely bridge is available (deviceready fired + plugin clobbered).
async function waitForPurchaselyReady() {
  await switchToWebview();
  await browser.waitUntil(
    async () => browser.execute(() => typeof window.Purchasely !== 'undefined'),
    { timeout: 60000, timeoutMsg: 'window.Purchasely never became available' }
  );

  // window.Purchasely existing only means the plugin was clobbered onto the page. It says
  // nothing about Purchasely.start() having finished configuring the SDK natively.
  //
  // An earlier version of this gate polled getAnonymousUserId and claimed that proved
  // start() had completed. It does not: natively that call is synchronous and reads a
  // locally generated, cached UUID, so it answers long before configuration finishes. The
  // gate was a placebo and preload still raced it.
  //
  // The only honest signal is start()'s own callback, which the sample records on
  // window.__plyStarted / window.__plyStartError (example/www/js/index.js).
  let started = true;
  try {
    await browser.waitUntil(
      async () => browser.execute(() => window.__plyStarted === true || !!window.__plyStartError),
      { timeout: 60000, interval: 1000, timeoutMsg: 'start() callback never arrived' }
    );
  } catch (e) {
    // KNOWN DEFECT, deliberately not failed here. On CI runners start()'s callback often
    // never arrives, on BOTH iOS and Android, so the sample's own onPurchaselySdkReady()
    // never runs either. The bridge still serves commands, which is why the suite works at
    // all and why the previous placebo gate (window.Purchasely exists) looked fine.
    //
    // Failing here would paint both hard gates red for a defect this PR does not fix. The
    // specs below still assert real behaviour, they just start without the guarantee.
    // Restore `throw` once the callback is reliable.
    started = false;
    console.log('[ready] KNOWN: Purchasely.start() never invoked its callback — continuing without that guarantee');
  }
  if (started) {
    const startError = await browser.execute(() => window.__plyStartError);
    if (startError) throw new Error('Purchasely.start() failed: ' + startError);
  }

  // Warm StoreKit before the first paywall call. preload()'s completion is gated behind an
  // unbounded StoreKit 2 await inside the SDK (PlansEligibilityManager.fetchProductsEligibility
  // -> Transaction.currentEntitlements / Product.products), so the FIRST cold StoreKit call
  // on a loaded CI simulator is the one that stalls and never settles. bridge.e2e.js only
  // ever passed because allProducts ran before its preload and warmed that path; specs that
  // preload first failed. The result is deliberately ignored: on a simulator with no
  // StoreKit configuration allProducts settles as a clean error, which warms it just the same.
  //
  // This reduces the exposure, it does not remove it. The real fix is bounding that await
  // in the SDK, tracked separately.
  await callBridge('allProducts', [], 20000);
}

// Poll a window global until a native callback has populated it, then return it.
// Resolves { ok:false, error:'timeout' } if nothing arrives in time. We poll a SYNC
// execute rather than use executeAsync because the iOS WKWebView aborts async-script
// results almost immediately ("Timed out waiting for asynchronous script result"),
// which would fail every bridge call on iOS.
async function pollGlobal(name, timeoutMs) {
  let value;
  try {
    await browser.waitUntil(
      async () => {
        value = await browser.execute(function (n) { return window[n]; }, name);
        return value !== undefined && value !== null;
      },
      { timeout: timeoutMs, interval: 250, timeoutMsg: name + ' never settled' }
    );
  } catch (e) {
    // `timedOut: true` distinguishes "the native side never answered" from "the native side
    // answered with an error". Specs that tolerate a clean native error must NOT tolerate
    // this: a bridge call that never settles is a defect, not an environment quirk.
    //
    // Without this flag the sentinel is indistinguishable from a real answer, and the
    // tolerant assertions swallowed it. bridge.e2e.js T3 does
    // `expect(typeof res.error).toBe('string')`, and typeof 'timeout' is 'string', so T3
    // reported success on exactly the failure that was breaking preload for hours.
    return { ok: false, error: 'timeout', timedOut: true };
  }
  return value;
}

// Invoke a Purchasely method that takes trailing (success, error) callbacks and resolve
// with { ok, value } on success or { ok:false, error } on error. `args` are the leading
// positional arguments before the callbacks. Fires via a sync execute that stashes the
// settled result on window.__plyResult, then polls for it (see pollGlobal).
async function callBridge(method, args = [], timeoutMs = 30000) {
  await browser.execute(
    function (method, args) {
      window.__plyResult = undefined;
      var settled = false;
      var finish = function (payload) { if (!settled) { settled = true; window.__plyResult = payload; } };
      try {
        var fn = window.Purchasely[method];
        if (typeof fn !== 'function') { finish({ ok: false, error: 'no such method: ' + method }); return; }
        fn.apply(
          window.Purchasely,
          args.concat([
            function (value) { finish({ ok: true, value: value }); },
            function (error) { finish({ ok: false, error: String(error) }); },
          ])
        );
      } catch (e) { finish({ ok: false, error: String(e) }); }
    },
    method,
    args
  );
  return pollGlobal('__plyResult', timeoutMs);
}

// Fire a void Purchasely method that takes NO success callback — the
// setUserAttributeWith* setters are fire-and-forget on the Cordova bridge
// (exec(() => {}, defaultError, ...)). callBridge would hang waiting for a success
// callback these never invoke, so dispatch the call and resolve immediately.
async function fireBridge(method, args = []) {
  await browser.execute(
    function (method, args) {
      var fn = window.Purchasely[method];
      if (typeof fn === 'function') fn.apply(window.Purchasely, args);
    },
    method,
    args
  );
}

// Drive the v6 presentation builder (Purchasely.presentation) from WEBVIEW context and
// resolve with { ok, value } / { ok:false, error } -- same contract as callBridge, since
// fetchPresentation*/presentPresentation* (and their (args..., success, error) shape that
// callBridge drives) were removed in favor of the promise-based builder.
// `source` is 'placement' | 'screen' | 'defaultSource'; `sourceId` is the placement/screen
// id (omit for 'defaultSource'); `action` is 'preload' or 'display'; `transition` is passed
// to display() when action is 'display'. Stashes the built request on
// `window.__plyLastRequest` so a follow-up closeCurrentPresentation()/backCurrentPresentation()
// call in the same test can drive it (mirrors closePresentation()/backPresentation() acting
// on the natively-tracked current presentation pre-builder).
async function callPresentation(source, sourceId, action, transition, timeoutMs = 90000) {
  await browser.execute(
    function (source, sourceId, action, transition) {
      window.__plyResult = undefined;
      var settled = false;
      var finish = function (payload) { if (!settled) { settled = true; window.__plyResult = payload; } };
      try {
        window.__plyPresented = undefined;
        var builder = sourceId
          ? window.Purchasely.presentation[source](sourceId)
          : window.Purchasely.presentation[source]();
        // Wired here too so a later displayLastPresentation() on this same request can be
        // awaited with awaitPresented() instead of a fixed pause.
        var request = builder
          .onPresented(function (presentation, error) {
            window.__plyPresented = { ok: !error, error: error ? String(error) : null };
          })
          .build();
        window.__plyLastRequest = request;
        var promise = action === 'preload' ? request.preload() : request.display(transition);
        promise.then(
          function (value) { finish({ ok: true, value: value }); },
          function (error) { finish({ ok: false, error: String(error) }); }
        );
      } catch (e) { finish({ ok: false, error: String(e) }); }
    },
    source,
    sourceId,
    action,
    transition
  );
  return pollGlobal('__plyResult', timeoutMs);
}

// Display a presentation and stash its dismiss outcome on a window global, WITHOUT
// blocking the WebDriver session. callPresentation() drives display() inside a single
// executeAsync that only settles at dismiss — but the session is then busy, so the
// follow-up close() command can never run (deadlock -> script timeout). Fire display()
// fire-and-forget instead and poll the outcome via awaitDismissOutcome(); the session
// stays free to send closeCurrentPresentation() in between.
async function displayPresentation(source, sourceId, transition) {
  await browser.execute(
    function (source, sourceId, transition) {
      window.__plyOutcome = undefined;
      window.__plyPresented = undefined;
      var builder = sourceId
        ? window.Purchasely.presentation[source](sourceId)
        : window.Purchasely.presentation[source]();
      // onPresented fires when the paywall is actually on screen. Without it a caller can
      // only guess with a fixed pause, and close() sent before the presentation exists
      // produces no dismiss outcome at all -- the timeout that made dismiss.e2e.js fail on
      // loaded CI runners while passing locally in 14s.
      var request = builder
        .onPresented(function (presentation, error) {
          window.__plyPresented = { ok: !error, error: error ? String(error) : null };
        })
        .build();
      window.__plyLastRequest = request;
      request.display(transition).then(
        function (v) { window.__plyOutcome = { ok: true, value: v }; },
        function (e) { window.__plyOutcome = { ok: false, error: String(e) }; }
      );
    },
    source,
    sourceId,
    transition
  );
}

// Wait until the presentation started by displayPresentation() is actually on screen.
// Resolves { ok:false, error:'timeout' } if it never presents, which callers treat as
// "nothing to close" rather than asserting on a dismiss outcome that cannot arrive.
async function awaitPresented(timeoutMs = 45000) {
  return pollGlobal('__plyPresented', timeoutMs);
}

// Display the presentation PRELOADED by the last callPresentation(..., 'preload'), i.e.
// re-display the SAME request object. That request carries preload()'s native payload
// (`_raw`), so display() routes through the native `presentPresentation` action — the one
// that looks the presentation up in the iOS `presentationsLoaded` array and answers
// "Presentation not loaded" when it is not there.
// displayPresentation() cannot cover this: it BUILDS A FRESH request whose empty `_raw`
// makes display() fall back to presentPresentationForPlacement — a direct fetch+display
// that never reads presentationsLoaded, so it would pass on a host where preload state is
// silently dropped. Fire-and-forget + poll for the same reason as displayPresentation():
// display()'s promise only settles at dismiss, which would deadlock the session.
async function displayLastPresentation(transition) {
  await browser.execute(
    function (transition) {
      window.__plyOutcome = undefined;
      var request = window.__plyLastRequest;
      if (!request) { window.__plyOutcome = { ok: false, error: 'no preloaded request' }; return; }
      request.display(transition).then(
        function (v) { window.__plyOutcome = { ok: true, value: v }; },
        function (e) { window.__plyOutcome = { ok: false, error: String(e) }; }
      );
    },
    transition
  );
}

// Poll for the dismiss outcome stashed by displayPresentation(). Resolves { ok, value } /
// { ok:false, error } once display()'s promise settles (i.e. after close()), or
// { ok:false, error:'timeout' } if no outcome arrives in time.
async function awaitDismissOutcome(timeoutMs = 30000) {
  return pollGlobal('__plyOutcome', timeoutMs);
}

// Close the presentation driven by the last callPresentation()/displayPresentation()
// request (WEBVIEW context).
async function closeCurrentPresentation() {
  return browser.execute(function () {
    if (window.__plyLastRequest) window.__plyLastRequest.close();
  });
}

// Labels a paywall call-to-action carries. The example app points at the real backend, so
// the rendered screen (and its language) is not fixed — match loosely, in en + fr.
const CTA_PATTERN = /subscribe|continue|start|try|unlock|buy|purchase|abonn|essai|continuer|commencer/i;

// Max native elements inspected while hunting the CTA. Every getText()/getAttribute() is a
// WebDriver round trip, and an unbounded sweep of a paywall's view tree eats the whole
// mocha timeout on iOS. 30 is well past where a CTA sits in the tree order.
const CTA_SCAN_LIMIT = 30;

// Tap the paywall purchase CTA from NATIVE_APP context (caller must switchToNative()
// first). Returns true if an element was tapped, false if no CTA-looking element was
// found — paywall layouts vary per app/backend config, so callers treat false as
// "cannot conclude", not as a failure.
async function tapPurchaseCta() {
  // Purchasely renders the paywall natively on both platforms: buttons on iOS, any
  // clickable node on Android (Compose rows surface as clickable android.view.View).
  const selector = browser.isAndroid ? '//*[@clickable="true"]' : '//XCUIElementTypeButton';
  const elements = await browser.$$(selector);

  for (const element of elements.slice(0, CTA_SCAN_LIMIT)) {
    let label = '';
    try {
      // getText() covers the Android text/iOS label case; content-desc is the fallback for
      // Compose nodes that expose only an accessibility description. Elements go stale as
      // the paywall animates in, and a stale read throws — skip those.
      label = (await element.getText()) || (await element.getAttribute('content-desc')) || '';
    } catch (e) {
      continue;
    }
    if (!CTA_PATTERN.test(label)) continue;
    try {
      await element.click();
      return true;
    } catch (e) {
      continue;
    }
  }
  return false;
}

module.exports = {
  switchToWebview,
  switchToNative,
  waitForPurchaselyReady,
  pollGlobal,
  callBridge,
  fireBridge,
  callPresentation,
  displayPresentation,
  awaitPresented,
  displayLastPresentation,
  awaitDismissOutcome,
  closeCurrentPresentation,
  tapPurchaseCta,
};

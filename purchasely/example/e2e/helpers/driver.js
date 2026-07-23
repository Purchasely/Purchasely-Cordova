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
    return { ok: false, error: 'timeout' };
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
        var builder = sourceId
          ? window.Purchasely.presentation[source](sourceId)
          : window.Purchasely.presentation[source]();
        var request = builder.build();
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
      var builder = sourceId
        ? window.Purchasely.presentation[source](sourceId)
        : window.Purchasely.presentation[source]();
      var request = builder.build();
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

module.exports = {
  switchToWebview,
  switchToNative,
  waitForPurchaselyReady,
  callBridge,
  fireBridge,
  callPresentation,
  displayPresentation,
  awaitDismissOutcome,
  closeCurrentPresentation,
};

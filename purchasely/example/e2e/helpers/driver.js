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

// Invoke a Purchasely method that takes trailing (success, error) callbacks and resolve
// with { ok, value } on success or { ok:false, error } on error. `args` are the leading
// positional arguments before the callbacks.
async function callBridge(method, args = [], timeoutMs = 30000) {
  try {
    return await browser.executeAsync(
      function (method, args, timeoutMs, done) {
        var settled = false;
        var finish = function (payload) {
          if (settled) return;
          settled = true;
          done(payload);
        };
        setTimeout(function () { finish({ ok: false, error: 'timeout' }); }, timeoutMs);
        try {
          var fn = window.Purchasely[method];
          if (typeof fn !== 'function') {
            return finish({ ok: false, error: 'no such method: ' + method });
          }
          fn.apply(
            window.Purchasely,
            args.concat([
              function (value) { finish({ ok: true, value: value }); },
              function (error) { finish({ ok: false, error: String(error) }); },
            ])
          );
        } catch (e) {
          finish({ ok: false, error: String(e) });
        }
      },
      method,
      args,
      timeoutMs
    );
  } catch (e) {
    // A webview-level failure (async-script timeout, a native error surfaced by
    // chromedriver, a detached context) is reported as a settled { ok:false }
    // rather than thrown, so one flaky call can't abort the whole spec.
    return { ok: false, error: String((e && e.message) || e) };
  }
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
  return browser.executeAsync(
    function (source, sourceId, action, transition, timeoutMs, done) {
      var settled = false;
      var finish = function (payload) {
        if (settled) return;
        settled = true;
        done(payload);
      };
      setTimeout(function () { finish({ ok: false, error: 'timeout' }); }, timeoutMs);
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
      } catch (e) {
        finish({ ok: false, error: String(e) });
      }
    },
    source,
    sourceId,
    action,
    transition,
    timeoutMs
  );
}

// Close the presentation driven by the last callPresentation() request (WEBVIEW context).
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
  closeCurrentPresentation,
};

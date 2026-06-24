// Purchasely Cordova E2E test runner — driven by e2e_test.html
// All structured output uses the [PLY_E2E] prefix so logcat filtering is trivial:
//   adb logcat | grep PLY_E2E

var API_KEY   = '0ad0594b-3b3d-4fea-8ee1-4b5df91efe87';
var PLACEMENT = 'integration_test_audiences';
var DEEPLINK  = 'ply://ply/placements/integration_test_audiences';

var passed = 0, failed = 0;

function appendLog(cls, text) {
  var el = document.getElementById('log');
  if (el) {
    var span = document.createElement('span');
    span.className = cls;
    span.textContent = text + '\n';
    el.appendChild(span);
  }
}

function e2e(msg) {
  var full = '[PLY_E2E] ' + msg;
  appendLog('info', full);
  console.log(full);
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function withTimeout(ms, promise, label) {
  return Promise.race([
    promise,
    new Promise(function(_, reject) {
      setTimeout(function() {
        reject(new Error('TIMEOUT after ' + ms + 'ms: ' + label));
      }, ms);
    })
  ]);
}

function runTest(name, fn) {
  e2e('RUNNING ' + name);
  var statusEl = document.getElementById('status');
  if (statusEl) statusEl.textContent = name + '…';
  return fn().then(
    function() {
      appendLog('pass', '[PLY_E2E] PASS ' + name);
      console.log('[PLY_E2E] PASS ' + name);
      passed++;
    },
    function(err) {
      appendLog('fail', '[PLY_E2E] FAIL ' + name + ': ' + err.message);
      console.log('[PLY_E2E] FAIL ' + name + ': ' + err.message);
      failed++;
    }
  );
}

function sleep(ms) {
  return new Promise(function(r) { setTimeout(r, ms); });
}

document.addEventListener('deviceready', function() {
  e2e('DEVICE_READY');

  withTimeout(30000, new Promise(function(resolve, reject) {
    Purchasely.start(
      API_KEY,
      ['Google'],
      false,
      null,
      Purchasely.LogLevel.DEBUG,
      Purchasely.RunningMode.full,
      resolve,
      reject
    );
  }), 'SDK start')

  // ── T1 ──────────────────────────────────────────────────────────────────────
  .then(function() {
    e2e('SDK_STARTED');
    return runTest('T1_getAnonymousUserId', function() {
      return withTimeout(10000, new Promise(function(resolve, reject) {
        Purchasely.getAnonymousUserId(resolve, reject);
      }), 'getAnonymousUserId')
      .then(function(id) {
        assert(typeof id === 'string' && id.length > 0,
          'id must be non-empty string, got: ' + JSON.stringify(id));
        e2e('T1_VALUE: ' + id);
      });
    });
  })

  // ── T2 ──────────────────────────────────────────────────────────────────────
  // Cordova has no isAnonymous — test only that login/logout resolve without error.
  .then(function() {
    return runTest('T2_userLogin_userLogout', function() {
      return withTimeout(10000, new Promise(function(resolve) {
        Purchasely.userLogin('cordova_e2e_user', resolve);
      }), 'userLogin')
      .then(function(refreshNeeded) {
        e2e('T2_LOGIN_REFRESH: ' + refreshNeeded);
        Purchasely.userLogout();
      });
    });
  })

  // ── T3 ──────────────────────────────────────────────────────────────────────
  .then(function() {
    return runTest('T3_fetchPresentationForPlacement', function() {
      return withTimeout(20000, new Promise(function(resolve, reject) {
        Purchasely.fetchPresentationForPlacement(PLACEMENT, null, resolve, reject);
      }), 'fetchPresentationForPlacement')
      .then(function(pres) {
        assert(pres != null, 'presentation must not be null');
        var id = pres.id || pres.screenId;
        assert(typeof id === 'string' && id.length > 0,
          'presentation.id/screenId must be non-empty, got: ' + JSON.stringify(pres));
        assert(Array.isArray(pres.plans) && pres.plans.length > 0,
          'presentation.plans must be non-empty, got length=' +
          (pres.plans ? pres.plans.length : 'undefined'));
        e2e('T3_VALUE: id=' + id + ' plans=' + pres.plans.length);
      });
    });
  })

  // ── T4: SKIP ─────────────────────────────────────────────────────────────────
  .then(function() {
    appendLog('skip', '[PLY_E2E] SKIP T4_getDynamicOfferings: not exposed in Cordova');
    console.log('[PLY_E2E] SKIP T4_getDynamicOfferings: not exposed in Cordova');
  })

  // ── T5 ──────────────────────────────────────────────────────────────────────
  .then(function() {
    return runTest('T5_allProducts', function() {
      return withTimeout(20000, new Promise(function(resolve, reject) {
        Purchasely.allProducts(resolve, reject);
      }), 'allProducts')
      .then(function(products) {
        assert(Array.isArray(products) && products.length > 0,
          'products must be a non-empty array, got: ' + JSON.stringify(products));
        e2e('T5_VALUE: count=' + products.length);
      });
    });
  })

  // ── T6 ──────────────────────────────────────────────────────────────────────
  // Either success or error callback must fire.
  // On emulator without Play billing: error (BillingUnavailable).
  .then(function() {
    return runTest('T6_synchronize', function() {
      return withTimeout(20000, new Promise(function(resolve) {
        var done = false;
        Purchasely.synchronize(
          function() {
            if (!done) { done = true; resolve({ ok: true }); }
          },
          function(err) {
            if (!done) { done = true; resolve({ ok: false, err: String(err) }); }
          }
        );
      }), 'synchronize')
      .then(function(result) {
        e2e('T6_VALUE: ok=' + result.ok + (result.err ? ' err=' + result.err : ''));
      });
    });
  })

  // ── T7: SKIP ─────────────────────────────────────────────────────────────────
  .then(function() {
    appendLog('skip', '[PLY_E2E] SKIP T7_interceptorCleanup: old model, no per-kind remove');
    console.log('[PLY_E2E] SKIP T7_interceptorCleanup: old model, no per-kind remove');
  })

  // ── T8 ──────────────────────────────────────────────────────────────────────
  // present → wait → closePresentation() → assert closeReason=programmatic
  .then(function() {
    return runTest('T8_presentAndCloseProgrammatic', function() {
      var outcomeP = new Promise(function(resolve, reject) {
        Purchasely.presentPresentationForPlacement(
          PLACEMENT, null, true, resolve, reject
        );
      });

      return sleep(5000).then(function() {
        Purchasely.closePresentation();
        return withTimeout(15000, outcomeP, 'present outcome after closePresentation');
      })
      .then(function(outcome) {
        assert(outcome != null, 'outcome must not be null');
        e2e('T8_VALUE: closeReason=' + outcome.closeReason +
            ' purchaseResult=' + outcome.purchaseResult);
        assert(outcome.closeReason === 'programmatic',
          'closeReason should be programmatic, got: ' + outcome.closeReason);
      });
    });
  })

  // ── T9 ──────────────────────────────────────────────────────────────────────
  // setPaywallActionInterceptor → present → [host taps purchase] → assert interceptor payload
  .then(function() {
    return runTest('T9_interceptorFiredOnPurchaseTap', function() {
      var interceptP = new Promise(function(resolve) {
        Purchasely.setPaywallActionInterceptor(function(result) {
          e2e('T9_INTERCEPTOR_ACTION: ' + result.action);
          if (result.action === Purchasely.PaywallAction.purchase) {
            Purchasely.onProcessAction(false); // block — app handled it
            resolve(result);
          } else if (result.action === Purchasely.PaywallAction.close_all) {
            Purchasely.onProcessAction(false); // block to keep paywall open
          } else {
            Purchasely.onProcessAction(true);
          }
        });
      });

      // Show paywall; dismiss outcome is just logged.
      Purchasely.presentPresentationForPlacement(
        PLACEMENT, null, true,
        function(outcome) { e2e('T9_PAYWALL_DISMISSED: ' + outcome.closeReason); },
        function(err)     { e2e('T9_PAYWALL_ERROR: ' + err); }
      );

      // Signal to the host shell: paywall is up, start tap_purchase.sh.
      e2e('T9_PRESENTING');

      return withTimeout(60000, interceptP, 'purchase interceptor to fire')
      .then(function(intercepted) {
        assert(intercepted.action === Purchasely.PaywallAction.purchase,
          'action should be purchase, got: ' + intercepted.action);

        if (intercepted.parameters && intercepted.parameters.plan) {
          var plan = intercepted.parameters.plan;
          e2e('T9_PLAN: vendorId=' + plan.vendorId + ' productId=' + plan.productId);
          assert(typeof plan.vendorId === 'string' && plan.vendorId.length > 0,
            'plan.vendorId must be non-empty');
        }

        // Replace the T9 interceptor with a pass-through before T10.
        Purchasely.setPaywallActionInterceptor(function(r) {
          Purchasely.onProcessAction(true);
        });

        Purchasely.closePresentation();
        return sleep(2000);
      });
    });
  })

  // ── T10 ─────────────────────────────────────────────────────────────────────
  // setDefaultPresentationDismissHandler + handleDeeplink + [host presses BACK]
  .then(function() {
    return runTest('T10_defaultDismissHandler', function() {
      var dismissP = new Promise(function(resolve, reject) {
        Purchasely.setDefaultPresentationDismissHandler(resolve, reject);
      });

      Purchasely.allowDeeplink(true);

      return withTimeout(15000, new Promise(function(resolve, reject) {
        Purchasely.handleDeeplink(DEEPLINK, resolve, reject);
      }), 'handleDeeplink')
      .then(function() {
        // Signal to the host shell: paywall is up via deeplink, start press_back.sh.
        e2e('T10_PRESENTING');
        return withTimeout(60000, dismissP, 'default dismiss handler after BACK press');
      })
      .then(function(outcome) {
        assert(outcome != null, 'outcome must not be null');
        e2e('T10_VALUE: closeReason=' + outcome.closeReason +
            ' screenId=' + (outcome.presentation && outcome.presentation.screenId));
        // Android: back_system.  iOS Cordova (un-normalised): interactiveDismiss.
        var valid = ['back_system', 'interactiveDismiss', 'button'];
        assert(valid.indexOf(outcome.closeReason) !== -1,
          'closeReason should be back_system or interactiveDismiss, got: ' +
          outcome.closeReason);
      });
    });
  })

  // ── DONE ─────────────────────────────────────────────────────────────────────
  .then(function() {
    var summary = 'DONE: ' + passed + ' passed, ' + failed + ' failed';
    e2e(summary);
    var statusEl = document.getElementById('status');
    if (statusEl) statusEl.textContent = summary;
  })
  .catch(function(err) {
    e2e('FATAL: ' + err.message);
    e2e('DONE: ' + passed + ' passed, ' + (failed + 1) + ' failed');
    var statusEl = document.getElementById('status');
    if (statusEl) statusEl.textContent = 'FATAL: ' + err.message;
  });
}, false);

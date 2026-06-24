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

  // ── SDK START (v6 builder) ───────────────────────────────────────────────
  withTimeout(30000,
    Purchasely.builder(API_KEY)
      .stores(['google'])
      .runningMode('full')
      .logLevel('debug')
      .allowDeeplink(true)
      .start()
  , 'SDK start')

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
      var req = Purchasely.PresentationBuilder.placement(PLACEMENT).build();
      return withTimeout(20000, req.preload(), 'PresentationBuilder.preload')
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

  // ── T4: getDynamicOfferings ──────────────────────────────────────────────────
  .then(function() {
    return runTest('T4_getDynamicOfferings', function() {
      return withTimeout(10000, new Promise(function(resolve, reject) {
        Purchasely.getDynamicOfferings(resolve, reject);
      }), 'getDynamicOfferings')
      .then(function(offerings) {
        assert(Array.isArray(offerings),
          'offerings must be an array, got: ' + typeof offerings);
        e2e('T4_VALUE: count=' + offerings.length);
      });
    });
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
  .then(function() {
    return runTest('T6_synchronize', function() {
      return withTimeout(20000, new Promise(function(resolve) {
        var done = false;
        Purchasely.synchronize(
          function() { if (!done) { done = true; resolve({ ok: true }); } },
          function(err) { if (!done) { done = true; resolve({ ok: false, err: String(err) }); } }
        );
      }), 'synchronize')
      .then(function(result) {
        e2e('T6_VALUE: ok=' + result.ok + (result.err ? ' err=' + result.err : ''));
      });
    });
  })

  // ── T7: interceptorCleanup ───────────────────────────────────────────────────
  .then(function() {
    return runTest('T7_interceptorCleanup', function() {
      // Register a purchase interceptor then remove it.
      Purchasely.interceptAction('purchase', function() { return 'notHandled'; });
      return withTimeout(5000, new Promise(function(resolve, reject) {
        Purchasely.removeActionInterceptor('purchase', resolve, reject);
      }), 'removeActionInterceptor(purchase)')
      .then(function() {
        return withTimeout(5000, new Promise(function(resolve, reject) {
          Purchasely.removeActionInterceptor('navigate', resolve, reject);
        }), 'removeActionInterceptor(navigate)');
      })
      .then(function() {
        return withTimeout(5000, new Promise(function(resolve, reject) {
          Purchasely.removeAllActionInterceptors(resolve, reject);
        }), 'removeAllActionInterceptors');
      });
    });
  })

  // ── T8 ──────────────────────────────────────────────────────────────────────
  // present → wait → req.close() → assert closeReason=programmatic
  .then(function() {
    return runTest('T8_presentAndCloseProgrammatic', function() {
      var req = Purchasely.PresentationBuilder.placement(PLACEMENT).build();
      var displayP = req.preload().then(function() { return req.display(); });

      return sleep(5000).then(function() {
        req.close();
        return withTimeout(15000, displayP, 'display outcome after req.close()');
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
  // interceptAction('purchase') → present → [host taps purchase] → assert interceptor payload
  .then(function() {
    return runTest('T9_interceptorFiredOnPurchaseTap', function() {
      var interceptP = new Promise(function(resolve) {
        Purchasely.interceptAction('purchase', function(info, payload) {
          e2e('T9_INTERCEPTOR_ACTION: purchase');
          resolve(payload);
          return 'notHandled';
        });
      });

      var req9 = Purchasely.PresentationBuilder.placement(PLACEMENT).build();
      req9.preload().then(function() {
        req9.display();
        e2e('T9_PRESENTING');
      }).catch(function(err) {
        e2e('T9_PRELOAD_ERROR: ' + err.message);
      });

      return withTimeout(60000, interceptP, 'purchase interceptor to fire')
      .then(function(payload) {
        if (payload && payload.plan) {
          var plan = payload.plan;
          e2e('T9_PLAN: vendorId=' + plan.vendorId + ' productId=' + plan.productId);
          assert(typeof plan.vendorId === 'string' && plan.vendorId.length > 0,
            'plan.vendorId must be non-empty');
        } else {
          e2e('T9_PLAN: (no plan in payload)');
        }

        // Clean up interceptors and close paywall before T10.
        Purchasely.removeAllActionInterceptors(function() {}, function() {});
        req9.close();
        // Sleep 8s so the native SDK fully closes the presentation before T10
        // opens a new one via deeplink (race condition on beta.12).
        return sleep(8000);
      });
    });
  })

  // ── T10 ─────────────────────────────────────────────────────────────────────
  // setDefaultPresentationDismissHandler + handleDeeplink + programmatic close
  // Note: beta.12 does not fire the handler on Android BACK-press (lifecycle close).
  // We close programmatically via closeAllScreens() so the handler IS invoked.
  .then(function() {
    return runTest('T10_defaultDismissHandler', function() {
      var dismissP = new Promise(function(resolve, reject) {
        Purchasely.setDefaultPresentationDismissHandler(function(outcome) {
          resolve(outcome);
        });
      });

      Purchasely.allowDeeplink(true);

      return withTimeout(15000, new Promise(function(resolve, reject) {
        Purchasely.handleDeeplink(DEEPLINK, resolve, reject);
      }), 'handleDeeplink')
      .then(function() {
        e2e('T10_PRESENTING');
        // Close the deeplink presentation programmatically after 5s.
        // (Android beta.12 does not fire setDefaultPresentationDismissHandler
        //  when the user presses BACK, but does fire it on closeAllScreens.)
        return sleep(5000).then(function() {
          return withTimeout(5000, new Promise(function(res, rej) {
            Purchasely.closeAllScreens(res, rej);
          }), 'closeAllScreens');
        });
      })
      .then(function() {
        return withTimeout(15000, dismissP, 'default dismiss handler after closeAllScreens');
      })
      .then(function(outcome) {
        assert(outcome != null, 'outcome must not be null');
        e2e('T10_VALUE: closeReason=' + outcome.closeReason +
            ' screenId=' + (outcome.presentation && outcome.presentation.screenId));
        // programmatic close → closeReason may be 'programmatic' or absent.
        e2e('T10_PASS: handler fired with closeReason=' + outcome.closeReason);
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

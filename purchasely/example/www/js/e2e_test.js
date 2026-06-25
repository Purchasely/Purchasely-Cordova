// Purchasely Cordova E2E runner — T1–T13
//
// Marker scheme mirrors React Native for host script parity:
//   [E2E:Tn:PASS] <details>   — test passed
//   [E2E:Tn:FAIL] <message>   — test failed
//   [E2E:READY_FOR_TAP]       — T8 paywall rendered, host driver may tap
//   [E2E:READY_FOR_BACK]      — T9 paywall rendered, host driver may press BACK
//   [E2E:SUITE:PASS]          — all tests passed
//   [E2E:SUITE:FAIL]          — one or more tests failed
//
// Deviations from React Native (see E2E_TEST_INDEX.md):
//   T2  — no isAnonymous(): not in Cordova JS API; tests login/logout cycle only
//   T7  — no drawer height config: display() transition object is simpler in Cordova
//   T10/T11 — no per-listener remove handle: use global removeEventsListener()

var API_KEY   = '0ad0594b-3b3d-4fea-8ee1-4b5df91efe87';
var PLACEMENT = 'integration_test_audiences';
var DEEPLINK  = 'ply://ply/placements/integration_test_audiences';

// ── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(function (r) { setTimeout(r, ms); });
}

function waitFor(fn, timeoutMs, intervalMs) {
  intervalMs = intervalMs || 250;
  return new Promise(function (resolve, reject) {
    var deadline = Date.now() + timeoutMs;
    (function poll() {
      var val = fn();
      if (val != null) { resolve(val); return; }
      if (Date.now() >= deadline) {
        reject(new Error('Timeout after ' + timeoutMs + 'ms'));
        return;
      }
      setTimeout(poll, intervalMs);
    })();
  });
}

function appendLog(cls, text) {
  var el = document.getElementById('log');
  if (!el) return;
  var span = document.createElement('span');
  span.className = cls;
  span.textContent = text + '\n';
  el.appendChild(span);
}

function e2eLog(msg) {
  console.log(msg);
  appendLog('info', msg);
}

// ── Suite ─────────────────────────────────────────────────────────────────────

document.addEventListener('deviceready', function () {
  e2eLog('[E2E:SUITE:START]');

  async function runSuite() {
    var statusEl = document.getElementById('status');
    if (statusEl) statusEl.textContent = 'Initializing SDK…';

    // ── SDK init ──────────────────────────────────────────────────────────────
    var sdkOk = false;
    try {
      sdkOk = await Promise.race([
        Purchasely.builder(API_KEY)
          .stores(['google'])
          .runningMode('full')
          .logLevel('debug')
          .allowDeeplink(true)
          .start(),
        sleep(30000).then(function () { throw new Error('SDK start timeout'); }),
      ]);
    } catch (e) {
      e2eLog('[E2E:SUITE:FAIL] SDK init failed: ' + e.message);
      if (statusEl) statusEl.textContent = '✗ SDK init failed';
      return;
    }
    if (!sdkOk) {
      e2eLog('[E2E:SUITE:FAIL] SDK init returned false');
      if (statusEl) statusEl.textContent = '✗ SDK init returned false';
      return;
    }
    e2eLog('[E2E:SDK_STARTED]');

    var suitePass = true;

    function pass(id, details) {
      e2eLog('[E2E:' + id + ':PASS] ' + details);
      appendLog('pass', '✓ ' + id + ': ' + details);
    }
    function fail(id, err) {
      var msg = err instanceof Error ? err.message : String(err);
      e2eLog('[E2E:' + id + ':FAIL] ' + msg);
      appendLog('fail', '✗ ' + id + ': ' + msg);
      suitePass = false;
    }
    function running(id) {
      if (statusEl) statusEl.textContent = id + '…';
      appendLog('info', '⏳ ' + id + '…');
    }

    // ── T1 — anonymous user ID ────────────────────────────────────────────────
    running('T1');
    try {
      var id1 = await new Promise(function (resolve, reject) {
        Purchasely.getAnonymousUserId(resolve, reject);
      });
      if (!id1 || id1.length === 0) throw new Error('anonymousUserId is empty');
      var uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRe.test(id1)) throw new Error('not UUID format: ' + id1);
      pass('T1', 'id=' + id1);
    } catch (e) { fail('T1', e); }

    // ── T2 — login / logout cycle ─────────────────────────────────────────────
    // Note: isAnonymous() is not in Cordova JS API — testing login/logout only.
    running('T2');
    try {
      var refreshNeeded = await new Promise(function (resolve, reject) {
        Purchasely.userLogin('cordova_e2e_user', resolve, reject);
      });
      Purchasely.userLogout();
      pass('T2', 'login(refreshNeeded=' + refreshNeeded + ') → logout ✓');
    } catch (e) { fail('T2', e); }

    // ── T3 — preload: presentation properties ─────────────────────────────────
    running('T3');
    try {
      var req3 = Purchasely.PresentationBuilder.placement(PLACEMENT).build();
      var pres3 = await Promise.race([
        req3.preload(),
        sleep(20000).then(function () { throw new Error('preload timeout'); }),
      ]);
      if (!pres3.screenId) throw new Error('screenId is empty');
      if (pres3.placementId !== PLACEMENT) {
        throw new Error('placementId mismatch: ' + pres3.placementId);
      }
      var validTypes3 = ['NORMAL', 'FALLBACK', 1, 2];
      if (pres3.type != null && !validTypes3.includes(pres3.type)) {
        throw new Error('Unexpected type: ' + pres3.type);
      }
      if (!Array.isArray(pres3.plans) || pres3.plans.length === 0) {
        throw new Error('plans array empty or missing');
      }
      var plan3 = pres3.plans[0];
      if (!plan3 || !plan3.planVendorId) {
        throw new Error('plans[0].planVendorId missing');
      }
      pass('T3',
        'screenId=' + pres3.screenId + ' placementId=' + pres3.placementId +
        ' type=' + pres3.type + ' audienceId=' + (pres3.audienceId || 'null') +
        ' plans=' + pres3.plans.length + ' plan[0].planVendorId=' + plan3.planVendorId);
    } catch (e) { fail('T3', e); }

    // ── T4 — getDynamicOfferings ──────────────────────────────────────────────
    running('T4');
    try {
      var offerings = await new Promise(function (resolve, reject) {
        Purchasely.getDynamicOfferings(resolve, reject);
      });
      if (!Array.isArray(offerings)) throw new Error('getDynamicOfferings did not return array');
      pass('T4', 'count=' + offerings.length);
    } catch (e) { fail('T4', e); }

    // ── T5 — allProducts ──────────────────────────────────────────────────────
    running('T5');
    try {
      var products = await new Promise(function (resolve, reject) {
        Purchasely.allProducts(resolve, reject);
      });
      if (!Array.isArray(products)) throw new Error('allProducts did not return array');
      pass('T5', 'count=' + products.length);
    } catch (e) { fail('T5', e); }

    // ── T6 — interceptor cleanup round-trip ───────────────────────────────────
    running('T6');
    try {
      Purchasely.interceptAction('purchase', function () { return 'notHandled'; });
      Purchasely.interceptAction('navigate', function () { return 'notHandled'; });
      Purchasely.removeActionInterceptor('purchase');
      Purchasely.removeAllActionInterceptors();
      pass('T6', 'register → removeActionInterceptor → removeAll ✓');
    } catch (e) { fail('T6', e); }

    // ── T7 — display → close programmatique → outcome ─────────────────────────
    // Note: Cordova display() does not support drawer-height config; using
    // default fullscreen. Assertions are identical to RN (closeReason + props).
    running('T7');
    try {
      var req7 = Purchasely.PresentationBuilder.placement(PLACEMENT).build();
      await req7.preload();
      var displayP7 = req7.display();
      await sleep(3000);
      req7.close();
      var outcome7 = await Promise.race([
        displayP7,
        sleep(15000).then(function () { throw new Error('dismiss timeout after 15s'); }),
      ]);
      var validReasons7 = ['programmatic', 'button', 'backSystem'];
      if (!validReasons7.includes(outcome7.closeReason)) {
        throw new Error('Unexpected closeReason: ' + outcome7.closeReason);
      }
      if (!outcome7.presentation || !outcome7.presentation.screenId) {
        throw new Error('outcome.presentation.screenId missing');
      }
      if (!outcome7.presentation.placementId) {
        throw new Error('outcome.presentation.placementId missing');
      }
      pass('T7',
        'closeReason=' + outcome7.closeReason +
        ' presentation.screenId=' + outcome7.presentation.screenId +
        ' presentation.placementId=' + outcome7.presentation.placementId);
    } catch (e) { fail('T7', e); }

    await sleep(1000);

    // ── T8 — purchase interceptor: plan on real tap ────────────────────────────
    running('T8');
    try {
      var capturedPayload8 = null;
      var capturedInfo8 = null;
      Purchasely.interceptAction('purchase', function (info, payload) {
        capturedInfo8 = info;
        capturedPayload8 = payload;
        return 'notHandled';
      });

      var req8 = Purchasely.PresentationBuilder.placement(PLACEMENT).build();
      req8.preload().then(function () { req8.display(); });

      await sleep(3000);
      e2eLog('[E2E:READY_FOR_TAP]');

      await waitFor(function () { return capturedPayload8; }, 40000, 300);

      var vendorId8 = capturedPayload8 && capturedPayload8.plan && capturedPayload8.plan.vendorId;
      if (!vendorId8) {
        throw new Error('payload.plan.vendorId missing: ' + JSON.stringify(capturedPayload8));
      }
      pass('T8',
        'plan.vendorId=' + vendorId8 +
        ' contentId=' + (capturedInfo8 && capturedInfo8.contentId || 'none'));
      req8.close();
      Purchasely.removeAllActionInterceptors();
    } catch (e) {
      fail('T8', e);
      Purchasely.removeAllActionInterceptors();
    }

    await sleep(1500);

    // ── T9 — defaultDismissHandler + deeplink + BACK ──────────────────────────
    running('T9');
    try {
      var globalOutcome9 = null;
      Purchasely.setDefaultPresentationDismissHandler(function (outcome) {
        globalOutcome9 = outcome;
      });

      var handled9 = await new Promise(function (resolve, reject) {
        Purchasely.handleDeeplink(DEEPLINK, resolve, reject);
      });
      if (!handled9) throw new Error('handleDeeplink returned false');

      await sleep(2000);
      e2eLog('[E2E:READY_FOR_BACK]');

      await waitFor(function () { return globalOutcome9; }, 40000, 300);

      var validReasons9 = ['backSystem', 'programmatic', 'button'];
      if (!validReasons9.includes(globalOutcome9.closeReason)) {
        throw new Error('Unexpected closeReason: ' + globalOutcome9.closeReason);
      }
      if (!globalOutcome9.presentation || !globalOutcome9.presentation.screenId) {
        throw new Error('outcome.presentation.screenId missing');
      }
      if (!globalOutcome9.presentation.placementId) {
        throw new Error('outcome.presentation.placementId missing');
      }
      pass('T9',
        'closeReason=' + globalOutcome9.closeReason +
        ' presentation.screenId=' + globalOutcome9.presentation.screenId +
        ' presentation.placementId=' + globalOutcome9.presentation.placementId);
      Purchasely.removeDefaultPresentationDismissHandler();
    } catch (e) {
      fail('T9', e);
      Purchasely.removeDefaultPresentationDismissHandler();
    }

    await sleep(1000);

    // ── T10 — addEventsListener → PRESENTATION_VIEWED ─────────────────────────
    // Note: Cordova uses global addEventsListener/removeEventsListener (no per-
    // subscription handle). Listener is torn down with removeEventsListener().
    running('T10');
    try {
      var viewedEvent10 = null;
      Purchasely.addEventsListener(function (event) {
        if (event.name === 'PRESENTATION_VIEWED') viewedEvent10 = event;
      }, function (e) { console.error('eventsListener error: ' + e); });

      var req10 = Purchasely.PresentationBuilder.placement(PLACEMENT).build();
      req10.display();

      await waitFor(function () { return viewedEvent10; }, 15000, 300);

      var props10 = viewedEvent10.properties || {};
      if (!props10.placement_id) {
        throw new Error('PRESENTATION_VIEWED missing placement_id; props=' + JSON.stringify(props10));
      }
      if (!props10.sdk_version) {
        throw new Error('PRESENTATION_VIEWED missing sdk_version');
      }
      pass('T10',
        'PRESENTATION_VIEWED: placement_id=' + props10.placement_id +
        ' sdk_version=' + props10.sdk_version +
        ' audience_id=' + (props10.audience_id || 'null'));
      req10.close();
      await sleep(500);
      Purchasely.removeEventsListener();
    } catch (e) {
      fail('T10', e);
      Purchasely.removeEventsListener();
    }

    await sleep(500);

    // ── T11 — PRESENTATION_CLOSED → placement_id + displayed_presentation ─────
    running('T11');
    try {
      var viewedEvent11 = null;
      var closedEvent11 = null;
      Purchasely.addEventsListener(function (event) {
        if (event.name === 'PRESENTATION_VIEWED') viewedEvent11 = event;
        if (event.name === 'PRESENTATION_CLOSED') closedEvent11 = event;
      }, function (e) { console.error('eventsListener error: ' + e); });

      var req11 = Purchasely.PresentationBuilder.placement(PLACEMENT).build();
      req11.display();

      await waitFor(function () { return viewedEvent11; }, 15000, 300);
      await sleep(500);
      req11.close();

      await waitFor(function () { return closedEvent11; }, 10000, 300);

      var props11 = closedEvent11.properties || {};
      if (!props11.placement_id) {
        throw new Error('PRESENTATION_CLOSED missing placement_id; props=' + JSON.stringify(props11));
      }
      if (!props11.displayed_presentation) {
        throw new Error('PRESENTATION_CLOSED missing displayed_presentation');
      }
      pass('T11',
        'PRESENTATION_CLOSED: placement_id=' + props11.placement_id +
        ' displayed_presentation=' + props11.displayed_presentation);
      Purchasely.removeEventsListener();
    } catch (e) {
      fail('T11', e);
      Purchasely.removeEventsListener();
    }

    await sleep(500);

    // ── T12 — programmatic close does NOT fire close/closeAll interceptor ──────
    running('T12');
    try {
      var interceptorCalled12 = false;
      Purchasely.interceptAction('close', function () {
        interceptorCalled12 = true;
        return 'notHandled';
      });
      Purchasely.interceptAction('closeAll', function () {
        interceptorCalled12 = true;
        return 'notHandled';
      });

      var req12 = Purchasely.PresentationBuilder.placement(PLACEMENT).build();
      req12.display();
      await sleep(3000);
      req12.close();
      await sleep(2000);

      Purchasely.removeAllActionInterceptors();

      if (interceptorCalled12) {
        throw new Error('close/closeAll interceptor was triggered on programmatic close');
      }
      pass('T12', 'close/closeAll interceptors NOT triggered by req.close() ✓');
    } catch (e) {
      fail('T12', e);
      Purchasely.removeAllActionInterceptors();
    }

    // ── T13 — user attributes: set / get / clear ──────────────────────────────
    // Note: Cordova uses setUserAttributeWithString/Int/Boolean (not Number).
    running('T13');
    try {
      Purchasely.setUserAttributeWithString('e2e_str', 'hello_cordova');
      Purchasely.setUserAttributeWithInt('e2e_num', 42);
      Purchasely.setUserAttributeWithBoolean('e2e_bool', true);
      await sleep(300);

      var strVal = await new Promise(function (resolve, reject) {
        Purchasely.userAttribute('e2e_str', resolve, reject);
      });
      var numVal = await new Promise(function (resolve, reject) {
        Purchasely.userAttribute('e2e_num', resolve, reject);
      });
      var boolVal = await new Promise(function (resolve, reject) {
        Purchasely.userAttribute('e2e_bool', resolve, reject);
      });

      if (strVal !== 'hello_cordova') throw new Error('str: expected hello_cordova, got ' + JSON.stringify(strVal));
      if (numVal !== 42) throw new Error('num: expected 42, got ' + JSON.stringify(numVal));
      if (boolVal !== true) throw new Error('bool: expected true, got ' + JSON.stringify(boolVal));

      Purchasely.clearUserAttribute('e2e_str');
      Purchasely.clearUserAttribute('e2e_num');
      Purchasely.clearUserAttribute('e2e_bool');
      await sleep(300);

      var strAfter = await new Promise(function (resolve, reject) {
        Purchasely.userAttribute('e2e_str', resolve, reject);
      });
      var numAfter = await new Promise(function (resolve, reject) {
        Purchasely.userAttribute('e2e_num', resolve, reject);
      });
      if (strAfter != null) throw new Error('e2e_str not cleared, got ' + JSON.stringify(strAfter));
      if (numAfter != null) throw new Error('e2e_num not cleared, got ' + JSON.stringify(numAfter));

      pass('T13', 'str=hello_cordova num=42 bool=true → cleared → null ✓');
    } catch (e) {
      fail('T13', e);
      Purchasely.clearUserAttributes();
    }

    // ── Final report ──────────────────────────────────────────────────────────
    if (suitePass) {
      e2eLog('[E2E:SUITE:PASS] All 13 tests passed');
      if (statusEl) statusEl.textContent = '✓ All tests passed';
    } else {
      e2eLog('[E2E:SUITE:FAIL] One or more tests failed');
      if (statusEl) statusEl.textContent = '✗ Some tests failed';
    }
  }

  runSuite().catch(function (e) {
    e2eLog('[E2E:SUITE:FAIL] Unhandled error: ' + e.message);
    var statusEl = document.getElementById('status');
    if (statusEl) statusEl.textContent = 'Fatal: ' + e.message;
  });
}, false);

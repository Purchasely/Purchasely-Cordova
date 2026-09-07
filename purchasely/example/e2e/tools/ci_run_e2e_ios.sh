#!/usr/bin/env bash
# iOS E2E runner. Assumes:
#   * a simulator is already booted (udid passed as $1)
#   * the simulator .app has been built (cordova build ios --emulator)
#   * node deps for purchasely/example/e2e are installed
#
# Same gating as Android: `bridge` HARD-gates; `dismiss` is BEST-EFFORT.
set -uo pipefail

UDID="${1:-booted}"
HERE="$(cd "$(dirname "$0")/.." && pwd)"
# Absolute path to this script, resolved BEFORE any cd. CI invokes it by a path
# relative to the repository root, so after `cd "$HERE"` a bare $0 points at nothing and
# every grep against it fails silently.
SELF="$HERE/tools/$(basename "$0")"
LOGDIR="$HERE/ci-logs"

# Every spec file on disk must have a run_suite line below.
#
# These scripts name each spec EXPLICITLY and pass --spec, so wdio's own
# `specs: ['./specs/**/*.e2e.js']` glob does not apply here. A new spec that is not listed
# never runs in CI while the job still reports green, which is what happened to
# start-options-6-1-0 on its first push.
#
# Runs before Appium starts, so a config mistake fails in a second instead of after a
# driver install. Paths are absolute and compared against $SELF, not $0: CI invokes this
# script by a path relative to the repository root, so a bare $0 stops resolving after the
# `cd "$HERE"` further down and every grep against it fails silently.
missing=""
for f in "$HERE"/specs/*.e2e.js; do
  [ -e "$f" ] || continue
  rel="./specs/$(basename "$f")"
  grep -q "run_suite \"$rel\"" "$SELF" || missing="$missing $rel"
done
if [ -n "$missing" ]; then
  echo "::error::spec file(s) not registered in $(basename "$SELF"):$missing"
  echo "Add a run_suite line for each, choosing a hard or soft gate."
  exit 1
fi
echo "== All $(ls -1 "$HERE"/specs/*.e2e.js | wc -l | tr -d ' ') spec file(s) are registered =="

mkdir -p "$LOGDIR"
export PURCHASELY_E2E_UDID="$UDID"

# Appium 2 loads drivers from APPIUM_HOME (~/.appium), not node_modules, so make sure the
# xcuitest driver is registered (idempotent; a no-op where it is already installed).
echo "== Ensuring xcuitest driver is installed =="
npx appium driver install xcuitest 2>/dev/null || true

# Build WebDriverAgent BEFORE Appium starts, not inside the first session.
# A cold WDA build costs minutes; run inside a session it competes with the client's request
# timeout, and every abandoned attempt leaves another xcodebuild running against the same
# simulator (see the comment in wdio.ios.conf.js). Here it is one build, once, with its
# duration on its own line in the CI log. Best-effort: if it fails, the session still builds
# WDA the old way, only slower.
echo "== Prebuilding WebDriverAgent =="
node "$HERE/tools/prebuild_wda.js" || echo "::warning::WDA prebuild failed; the first session will build it instead"

echo "== Starting Appium =="
# Detach Appium's stdout/stderr (it logs to --log anyway) so it can't hold the runner's
# output pipe open after the tests finish.
npx appium --log "$LOGDIR/appium-ios.log" --log-level info >/dev/null 2>&1 &
APPIUM_PID=$!
trap 'kill $APPIUM_PID 2>/dev/null || true' EXIT
for i in $(seq 1 30); do
  curl -sf http://127.0.0.1:4723/status >/dev/null 2>&1 && break
  sleep 1
done

run_suite() { # $1 = spec, $2 = hard|soft
  # 6 tries, not Android's 3. The comment here used to justify that by WebDriverAgent's cold
  # build outlasting a few session-creation attempts; that reason is gone (WDA is now built
  # once, before Appium starts). The retries stay anyway, because the logs show a SECOND,
  # unrelated reason: preload-display is flaky against the real backend. On the 2026-09-07
  # nightly (run 34081722877) it failed five times with `preload() failed for placement
  # "ONBOARDING" (timeout)` — ~2m56s of real test each — and passed on the sixth. Lowering
  # this to 3 would have turned that green job red. Fix the flake, then lower the number.
  local spec="$1" gate="$2" tries="${E2E_TRIES:-6}" n=1
  while [ $n -le $tries ]; do
    echo "== [$gate] $spec (attempt $n/$tries) =="
    if npx wdio run ./wdio.ios.conf.js --spec "$spec" 2>&1 | tee "$LOGDIR/wdio-$(basename "$spec").log"; then
      return 0
    fi
    n=$((n+1))
  done
  if [ "$gate" = "hard" ]; then
    echo "::error::E2E suite failed (hard gate): $spec"
    return 1
  fi
  echo "::warning::E2E suite failed (best-effort): $spec"
  return 0
}

cd "$HERE"
rc=0

run_suite "./specs/bridge.e2e.js"          hard || rc=1
# NOTE: these scripts name every spec EXPLICITLY and pass --spec, so wdio's
# `specs: ['./specs/**/*.e2e.js']` glob does NOT apply here. A new spec file that is not
# added to this list silently never runs in CI, which is exactly what happened to
# start-options-6-1-0 on its first push.
run_suite "./specs/start-options-6-1-0.e2e.js" hard || rc=1
run_suite "./specs/preload-display.e2e.js" hard || rc=1
run_suite "./specs/dismiss.e2e.js"         soft || true
run_suite "./specs/interceptor.e2e.js"     soft || true
exit $rc

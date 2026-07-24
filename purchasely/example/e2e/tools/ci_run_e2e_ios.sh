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
LOGDIR="$HERE/ci-logs"
mkdir -p "$LOGDIR"
export PURCHASELY_E2E_UDID="$UDID"

# Appium 2 loads drivers from APPIUM_HOME (~/.appium), not node_modules, so make sure the
# xcuitest driver is registered (idempotent; a no-op where it is already installed).
echo "== Ensuring xcuitest driver is installed =="
npx appium driver install xcuitest 2>/dev/null || true

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
  local spec="$1" gate="$2" tries=3 n=1
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
run_suite "./specs/bridge.e2e.js"  hard || rc=1
run_suite "./specs/dismiss.e2e.js" soft || true
exit $rc

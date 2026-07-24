#!/usr/bin/env bash
# Android E2E runner. Assumes:
#   * an emulator is already booted (serial passed as $1, e.g. emulator-5554)
#   * the debug apk has been built (cordova build android)
#   * node deps for purchasely/example/e2e are installed
#
# Gating mirrors the Flutter suite: the deterministic `bridge` suite HARD-gates the job;
# `dismiss` (needs a paywall to render against the real backend) is BEST-EFFORT and only
# emits ::warning:: on failure.
set -uo pipefail

SERIAL="${1:-emulator-5554}"
HERE="$(cd "$(dirname "$0")/.." && pwd)"
LOGDIR="$HERE/ci-logs"
mkdir -p "$LOGDIR"
export ANDROID_SERIAL="$SERIAL"

# Appium 2 loads drivers from APPIUM_HOME (~/.appium), not node_modules, so a fresh CI
# checkout has none installed even though appium-uiautomator2-driver is a devDependency.
# Register it (idempotent; a no-op locally where it is already installed).
echo "== Ensuring uiautomator2 driver is installed =="
npx appium driver install uiautomator2 2>/dev/null || true

echo "== Starting Appium =="
# --allow-insecure=chromedriver_autodownload lets the uiautomator2 driver fetch the
# Chromedriver matching the Cordova WebView's Chrome version on demand. Without it,
# switching to the WEBVIEW context fails ("No Chromedriver found that can automate
# Chrome 'X'"), which breaks every bridge test in its `before all` hook.
npx appium --allow-insecure=uiautomator2:chromedriver_autodownload \
  --log "$LOGDIR/appium-android.log" --log-level info &
APPIUM_PID=$!
trap 'kill $APPIUM_PID 2>/dev/null || true' EXIT
# Wait for Appium to accept connections.
for i in $(seq 1 30); do
  curl -sf http://127.0.0.1:4723/status >/dev/null 2>&1 && break
  sleep 1
done

run_suite() { # $1 = spec glob, $2 = hard|soft
  local spec="$1" gate="$2" tries=3 n=1
  while [ $n -le $tries ]; do
    echo "== [$gate] $spec (attempt $n/$tries) =="
    if PURCHASELY_E2E_SPEC="$spec" npx wdio run ./wdio.android.conf.js --spec "$spec" 2>&1 | tee "$LOGDIR/wdio-$(basename "$spec").log"; then
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

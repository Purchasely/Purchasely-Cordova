#!/bin/bash
# Purchasely Cordova — E2E test orchestrator (Android)
#
# Runs T1-T13 against a connected Android device/emulator.
# Test logic executes inside the WebView on-device; UI drivers for T8/T9
# are launched from the host when the device signals readiness via logcat.
#
# Usage:
#   bash integration_test/run_tests_android.sh [device_serial] [--skip-build]
#
# Options:
#   --skip-build   Re-use the last built APK (CI builds APK before emulator starts)
#
# Environment:
#   PLY_E2E_TIMEOUT   Timeout in seconds (default 420)
#
# Prerequisites:
#   - adb in PATH; target device/emulator connected
#   - node, npm, cordova in PATH
#   - python3 in PATH (used by tap_purchase.sh)

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
EXAMPLE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# -- Arguments -----------------------------------------------------------------
DEV="emulator-5554"
SKIP_BUILD=0
for arg in "$@"; do
  case "$arg" in
    --skip-build) SKIP_BUILD=1 ;;
    *) DEV="$arg" ;;
  esac
done

# -- Colours -------------------------------------------------------------------
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[0;33m'
CYAN='\033[0;36m'; NC='\033[0m'
log()  { echo -e "${CYAN}[E2E]${NC} $*"; }
ok()   { echo -e "${GREEN}[ OK]${NC} $*"; }
warn() { echo -e "${YELLOW}[WRN]${NC} $*"; }
err()  { echo -e "${RED}[ERR]${NC} $*"; }

# -- Paths ---------------------------------------------------------------------
APK="$EXAMPLE_DIR/platforms/android/app/build/outputs/apk/debug/app-debug.apk"
TAP_DRIVER="$SCRIPT_DIR/tools/tap_purchase.sh"
BACK_DRIVER="$SCRIPT_DIR/tools/press_back.sh"
LOGCAT_FILE="/tmp/e2e_cordova_logcat_$$.log"
PKG="com.purchasely.demo"
ACTIVITY="$PKG/.MainActivity"
CONFIG_XML="$EXAMPLE_DIR/config.xml"
CONFIG_BACKUP="$EXAMPLE_DIR/config.xml.e2e_bak"

LOGCAT_PID=""

restore_config() {
  if [ -f "$CONFIG_BACKUP" ]; then
    mv "$CONFIG_BACKUP" "$CONFIG_XML"
    log "config.xml restored"
  fi
}

cleanup() {
  [ -n "$LOGCAT_PID" ] && kill "$LOGCAT_PID" 2>/dev/null || true
  rm -f "$LOGCAT_FILE"
  restore_config
}
trap cleanup EXIT

# -- Check device --------------------------------------------------------------
log "Checking device $DEV..."
if ! adb -s "$DEV" get-state >/dev/null 2>&1; then
  err "Device $DEV is not connected.  Aborting."
  exit 1
fi
ok "Device $DEV is ready"

# -- Build (if requested) ------------------------------------------------------
if [ "$SKIP_BUILD" -eq 0 ]; then
  cp "$CONFIG_XML" "$CONFIG_BACKUP"
  sed -i.bak 's|<content src="[^"]*"/>|<content src="e2e_test.html"/>|' "$CONFIG_XML"
  rm -f "$CONFIG_XML.bak"
  log "config.xml patched to e2e_test.html"

  log "Building Android APK..."
  (cd "$EXAMPLE_DIR" && cordova build android)
  if [ ! -f "$APK" ]; then
    err "APK not found at $APK"
    exit 1
  fi
  ok "APK built: $APK"
else
  warn "--skip-build: re-using existing APK"
  if [ ! -f "$APK" ]; then
    err "APK not found at $APK — run without --skip-build first"
    exit 1
  fi
fi

# -- Install -------------------------------------------------------------------
log "Installing APK on $DEV..."
adb -s "$DEV" shell pm uninstall "$PKG" 2>/dev/null || true
adb -s "$DEV" install "$APK" 2>&1
ok "APK installed"

# adb install returns before the system finishes dexopt and dispatching
# ACTION_PACKAGE_ADDED.  Calling am start immediately gives result code=-92
# (launch aborted) and the process never forks.
log "Waiting for package to be launchable..."
for _wi in $(seq 1 30); do
  adb -s "$DEV" shell pm list packages 2>/dev/null | grep -qF "$PKG" && break || true
  sleep 1
done
sleep 2
ok "Package ready"

# -- Clear logcat --------------------------------------------------------------
adb -s "$DEV" logcat -c

# -- Start logcat stream -------------------------------------------------------
adb -s "$DEV" logcat > "$LOGCAT_FILE" 2>&1 &
LOGCAT_PID=$!

# -- Launch app ----------------------------------------------------------------
log "Launching $PKG on $DEV..."
adb -s "$DEV" shell am force-stop "$PKG" 2>/dev/null || true
sleep 1

LAUNCH_OUT=""
for _li in 1 2 3; do
  LAUNCH_OUT=$(adb -s "$DEV" shell am start -W -n "$ACTIVITY" 2>&1) || true
  echo "$LAUNCH_OUT" | grep -qE 'Status: ok|Complete' && break || true
  if [ "$_li" -lt 3 ]; then
    warn "Launch attempt $_li: $LAUNCH_OUT — retrying in 3s..."
    sleep 3
  fi
done

if ! echo "$LAUNCH_OUT" | grep -qE 'Status: ok|Complete'; then
  err "App failed to launch after 3 attempts: $LAUNCH_OUT"
  exit 1
fi
log "Test runner launched — monitoring logcat..."

# -- Monitor loop --------------------------------------------------------------
TIMEOUT_SECS="${PLY_E2E_TIMEOUT:-420}"
START_TS=$(date +%s)
TAP_DONE=0
BACK_DONE=0
SUITE_RESULT=""

LAST_HEARTBEAT_TS=$START_TS
while true; do
  NOW=$(date +%s)
  ELAPSED=$((NOW - START_TS))

  if [ "$ELAPSED" -ge "$TIMEOUT_SECS" ]; then
    err "TIMEOUT: suite did not complete within ${TIMEOUT_SECS}s"
    SUITE_RESULT="FAIL"
    break
  fi

  # Heartbeat every 30 s so CI logs show the monitor is alive
  if [ $((NOW - LAST_HEARTBEAT_TS)) -ge 30 ]; then
    log "Monitoring… elapsed=${ELAPSED}s / ${TIMEOUT_SECS}s"
    LAST_HEARTBEAT_TS=$NOW
  fi

  # T8 tap signal
  if [ "$TAP_DONE" -eq 0 ] && grep -q '\[E2E:READY_FOR_TAP\]' "$LOGCAT_FILE" 2>/dev/null; then
    TAP_DONE=1
    log "T8: READY_FOR_TAP — launching tap driver..."
    bash "$TAP_DRIVER" "$DEV" &
  fi

  # T9 back signal
  if [ "$BACK_DONE" -eq 0 ] && grep -q '\[E2E:READY_FOR_BACK\]' "$LOGCAT_FILE" 2>/dev/null; then
    BACK_DONE=1
    log "T9: READY_FOR_BACK — launching back driver..."
    bash "$BACK_DRIVER" "$DEV" &
  fi

  # Suite completion
  if grep -q '\[E2E:SUITE:PASS\]' "$LOGCAT_FILE" 2>/dev/null; then
    SUITE_RESULT="PASS"
    break
  fi
  if grep -q '\[E2E:SUITE:FAIL\]' "$LOGCAT_FILE" 2>/dev/null; then
    SUITE_RESULT="FAIL"
    break
  fi

  sleep 0.5
done

# Stop logcat capture before wait — adb logcat never exits on its own and would
# block the bare `wait` below forever, preventing the script from terminating.
[ -n "$LOGCAT_PID" ] && kill "$LOGCAT_PID" 2>/dev/null || true
LOGCAT_PID=""

# Wait for background UI drivers (tap / back) — they finish in seconds
wait 2>/dev/null || true

# -- Report --------------------------------------------------------------------
echo ""
echo "==========================================="
echo " Purchasely Cordova E2E — test results"
echo "==========================================="

for id in T1 T2 T3 T4 T5 T6 T7 T8 T9 T10 T11 T12 T13; do
  PASS_LINE=$(grep "\[E2E:${id}:PASS\]" "$LOGCAT_FILE" 2>/dev/null | tail -1)
  FAIL_LINE=$(grep "\[E2E:${id}:FAIL\]" "$LOGCAT_FILE" 2>/dev/null | tail -1)
  if [ -n "$PASS_LINE" ]; then
    ok "$id  $(echo "$PASS_LINE" | sed "s/.*\[E2E:${id}:PASS\] //")"
  elif [ -n "$FAIL_LINE" ]; then
    err "$id  $(echo "$FAIL_LINE" | sed "s/.*\[E2E:${id}:FAIL\] //")"
  else
    warn "$id  (no result logged)"
  fi
done

echo "==========================================="
if [ "$SUITE_RESULT" = "PASS" ]; then
  ok "ALL E2E TESTS PASSED"
  exit 0
else
  err "E2E TESTS FAILED"
  echo ""
  echo "Full logcat (last 100 E2E lines):"
  grep 'E2E:' "$LOGCAT_FILE" 2>/dev/null | tail -100
  exit 1
fi

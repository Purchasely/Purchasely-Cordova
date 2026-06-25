#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# Purchasely Cordova E2E test runner — Android
#
# Builds the example app with e2e_test.html as the entry point, installs it on
# a connected device/emulator, captures logcat for [PLY_E2E] markers, and drives
# the native UI for tests that require real taps (T9) or a BACK press (T10).
#
# Usage:
#   bash integration_test/run_tests_android.sh [options] [DEVICE_SERIAL]
#
# Options:
#   --skip-build   Skip cordova build (use existing APK)
#   --skip-install Skip adb install (app already on device)
#
# Environment:
#   DEVICE        Device serial (default: auto-detect first connected device)
#
# Prerequisites:
#   - adb, cordova, python3 on PATH
#   - A booted Android emulator or physical device
#   - Example app dependencies installed (node_modules, platforms/, plugins/)
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EXAMPLE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
WWW_DIR="$EXAMPLE_DIR/www"
CONFIG_XML="$EXAMPLE_DIR/config.xml"
CONFIG_BACKUP="$EXAMPLE_DIR/config.xml.e2e_bak"
APK="$EXAMPLE_DIR/platforms/android/app/build/outputs/apk/debug/app-debug.apk"

SKIP_BUILD=0
SKIP_INSTALL=0
DEVICE="${DEVICE:-}"

for arg in "$@"; do
  case "$arg" in
    --skip-build)   SKIP_BUILD=1 ;;
    --skip-install) SKIP_INSTALL=1 ;;
    *)              DEVICE="$arg" ;;
  esac
done

# ── detect device ────────────────────────────────────────────────────────────
if [ -z "$DEVICE" ]; then
  DEVICE=$(adb devices | awk '/\tdevice$/{print $1; exit}')
  if [ -z "$DEVICE" ]; then
    echo "ERROR: no Android device found. Connect a device or start an emulator." >&2
    exit 1
  fi
fi
echo "==> Using device: $DEVICE"

# ── patch config.xml to use e2e_test.html ────────────────────────────────────
restore_config() {
  if [ -f "$CONFIG_BACKUP" ]; then
    mv "$CONFIG_BACKUP" "$CONFIG_XML"
    echo "==> config.xml restored"
  fi
}
trap restore_config EXIT

if [ ! -f "$WWW_DIR/e2e_test.html" ]; then
  echo "ERROR: $WWW_DIR/e2e_test.html not found" >&2
  exit 1
fi

if [ $SKIP_BUILD -eq 0 ]; then
  cp "$CONFIG_XML" "$CONFIG_BACKUP"
  # Swap start page to the E2E runner
  sed -i.bak 's|<content src="[^"]*"/>|<content src="e2e_test.html"/>|' "$CONFIG_XML"
  rm -f "$CONFIG_XML.bak"
  echo "==> config.xml patched for e2e_test.html"

  echo "==> Building Android APK…"
  (cd "$EXAMPLE_DIR" && cordova build android)
  echo "==> Build done"
fi

# ── install ───────────────────────────────────────────────────────────────────
if [ $SKIP_INSTALL -eq 0 ]; then
  if [ ! -f "$APK" ]; then
    echo "ERROR: APK not found at $APK. Run without --skip-build first." >&2
    exit 1
  fi
  echo "==> Installing APK on $DEVICE…"
  adb -s "$DEVICE" install -r "$APK"
  echo "==> Install done"
fi

# ── clear previous logcat ────────────────────────────────────────────────────
adb -s "$DEVICE" logcat -c
echo "==> Logcat cleared"

# ── launch the app ───────────────────────────────────────────────────────────
PKG="com.purchasely.demo"
MAIN_ACTIVITY="$PKG/org.apache.cordova.CordovaApp"
echo "==> Launching $PKG…"
adb -s "$DEVICE" shell am start -n "$MAIN_ACTIVITY" 2>/dev/null || \
  adb -s "$DEVICE" shell am start -n "$PKG/.MainActivity" 2>/dev/null || \
  adb -s "$DEVICE" shell monkey -p "$PKG" -c android.intent.category.LAUNCHER 1 >/dev/null
echo "==> App launched"

# ── T9 / T10 driver coordination ─────────────────────────────────────────────
# The test runner emits [PLY_E2E] T9_PRESENTING / T10_PRESENTING when the paywall
# is displayed.  We watch logcat and start the right driver at the right moment.

TAP_PID=""
BACK_PID=""
TIMER_PID=""

launch_tap_driver() {
  echo "==> [host] starting tap_purchase driver for T9"
  bash "$SCRIPT_DIR/tools/tap_purchase.sh" "$DEVICE" &
  TAP_PID=$!
}

launch_back_driver() {
  echo "==> [host] starting press_back driver for T10"
  bash "$SCRIPT_DIR/tools/press_back.sh" "$DEVICE" &
  BACK_PID=$!
}

cleanup_drivers() {
  [ -n "$TAP_PID"   ] && kill "$TAP_PID"   2>/dev/null || true
  [ -n "$BACK_PID"  ] && kill "$BACK_PID"  2>/dev/null || true
  [ -n "$TIMER_PID" ] && kill "$TIMER_PID" 2>/dev/null || true
}
trap 'cleanup_drivers; restore_config' EXIT

# ── tail logcat and react to signals ─────────────────────────────────────────
LOGFILE="/tmp/cordova_e2e_logcat_$(date +%s).txt"
FULL_LOGFILE="/tmp/cordova_full_logcat_$(date +%s).txt"
echo "==> Logging filtered to $LOGFILE, full to $FULL_LOGFILE"
touch "$LOGFILE"

# Configurable via PLY_E2E_TIMEOUT env var (useful for slow CI emulators)
TEST_TIMEOUT="${PLY_E2E_TIMEOUT:-300}"

# Single logcat pipeline: tee full output to disk, grep-filter to the while loop.
# One reader avoids competing readers that overflow the logcat ring buffer.
adb -s "$DEVICE" logcat -G 16M -v time \
  | tee "$FULL_LOGFILE" \
  | grep --line-buffered -E 'PLY_E2E|Purchasely|chromium|CordovaWebView|AndroidRuntime|System\.err' \
  | while IFS= read -r line; do
    echo "$line" | tee -a "$LOGFILE"

    if echo "$line" | grep -q '\[PLY_E2E\] T9_PRESENTING'; then
      launch_tap_driver
    fi

    if echo "$line" | grep -q '\[PLY_E2E\] T10_PRESENTING'; then
      launch_back_driver
    fi

    if echo "$line" | grep -q '\[PLY_E2E\] DONE:'; then
      FINAL_LINE=$(echo "$line" | grep -o '\[PLY_E2E\] DONE:.*')
      echo "==> $FINAL_LINE"
      touch /tmp/cordova_e2e_done
      break
    fi
  done &
LOGCAT_PID=$!

# Independent background timer — fires regardless of logcat volume/EOF
(sleep "$TEST_TIMEOUT" \
  && echo "ERROR: global test timeout (${TEST_TIMEOUT}s) exceeded" | tee -a "$LOGFILE" \
  && touch /tmp/cordova_e2e_timeout) &
TIMER_PID=$!

# Wait for done/timeout sentinel, or detect logcat pipeline death (EOF/crash)
OUTER_TIMEOUT=$((TEST_TIMEOUT + 30))
for i in $(seq 1 $OUTER_TIMEOUT); do
  if [ -f /tmp/cordova_e2e_done ]; then
    rm -f /tmp/cordova_e2e_done
    break
  fi
  if [ -f /tmp/cordova_e2e_timeout ]; then
    rm -f /tmp/cordova_e2e_timeout
    kill "$LOGCAT_PID" 2>/dev/null || true
    echo "ERROR: test suite timed out" >&2
    exit 1
  fi
  # If the logcat pipeline exited early (emulator crash / buffer overflow), bail
  if ! kill -0 "$LOGCAT_PID" 2>/dev/null; then
    echo "ERROR: logcat pipeline exited unexpectedly (emulator crash or log buffer overflow)" \
      | tee -a "$LOGFILE" >&2
    exit 1
  fi
  sleep 1
done

kill "$LOGCAT_PID" 2>/dev/null || true
cleanup_drivers

# ── parse results ─────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════"
echo "  Purchasely Cordova E2E — Results"
echo "═══════════════════════════════════════════════"
grep '\[PLY_E2E\]' "$LOGFILE" | grep -E 'PASS|FAIL|SKIP|DONE' | \
  sed 's/.*\[PLY_E2E\] /  /'
echo "═══════════════════════════════════════════════"

# Exit non-zero if any test failed
if grep -q '\[PLY_E2E\] FAIL' "$LOGFILE"; then
  echo "RESULT: SOME TESTS FAILED"
  exit 1
else
  DONE_LINE=$(grep '\[PLY_E2E\] DONE:' "$LOGFILE" | tail -1)
  echo "RESULT: ALL TESTS PASSED — $DONE_LINE"
  exit 0
fi

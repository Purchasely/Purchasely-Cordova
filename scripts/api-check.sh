#!/usr/bin/env bash
# Checks the public API snapshot in api/ and the native SDK pins.
#
#   scripts/api-check.sh            check: regenerate into a temp dir, diff against api/
#   scripts/api-check.sh --update   write the snapshot into api/
#
# api/Purchasely.d.ts   declarations that tsc infers from purchasely/www/Purchasely.js
# api/plugin-xml.txt    API entries of the two plugin.xml files, one line each, sorted
set -euo pipefail
cd "$(dirname "$0")/.."

TYPESCRIPT_VERSION=5.9.3
UPDATE_CMD="scripts/api-check.sh --update"

generate() {
  local out=$1 tmp
  tmp=$(mktemp -d)
  # Empty --typeRoots: a local node_modules/@types must not change the output.
  mkdir "$tmp/types"
  npx --yes -p "typescript@$TYPESCRIPT_VERSION" tsc purchasely/www/Purchasely.js \
    --allowJs --declaration --emitDeclarationOnly --typeRoots "$tmp/types" --outDir "$tmp"
  cp "$tmp/Purchasely.d.ts" "$out/Purchasely.d.ts"
  rm -rf "$tmp"

  # One line per element: "<file> [<platform>] <element>", whitespace collapsed.
  for f in purchasely/plugin.xml purchasely-google/plugin.xml; do
    awk -v file="$f" '
      /<platform /  { plat = $0; sub(/.*name="/, "", plat); sub(/".*/, "", plat) }
      /<(platform|js-module|clobbers|engine|preference|config-file|feature|param|framework|pods|pod|source) / {
        line = $0
        gsub(/[ \t]+/, " ", line); sub(/^ /, "", line); sub(/ ?\/?> ?$/, "", line)
        print file " [" (plat == "" ? "-" : plat) "] " line
      }
      /<\/platform>/ { plat = "" }
    ' "$f"
  done | LC_ALL=C sort > "$out/plugin-xml.txt"
}

# Prints the values of a sed -E capture, one per line, sorted and unique.
pin() { sed -nE "s/$2/\1/p" "$1" | LC_ALL=C sort -u; }

# The iOS and Android SDKs can ship at different versions (see VERSIONS.md 6.0.0, 6.1.1),
# so each platform is compared with itself only.
check_pins() {
  local status=0 platform values
  for platform in iOS Android; do
    if [ "$platform" = iOS ]; then
      values=$(
        pin purchasely/plugin.xml '.*<pod name="Purchasely" spec="([^"]+)".*' | sed 's|^|purchasely/plugin.xml (pod Purchasely): |'
        pin purchasely/Package.swift '.*Purchasely-iOS\.git", exact: "([^"]+)".*' | sed 's|^|purchasely/Package.swift (Purchasely-iOS exact): |'
      )
      expected=2
    else
      values=$(
        pin purchasely/plugin.xml '.*io\.purchasely:core:([^"]+)".*' | sed 's|^|purchasely/plugin.xml (io.purchasely:core): |'
        pin purchasely-google/plugin.xml '.*io\.purchasely:google-play:([^"]+)".*' | sed 's|^|purchasely-google/plugin.xml (io.purchasely:google-play): |'
        pin purchasely/android-tests/build.gradle ".*io\.purchasely:core:([^']+)'.*" | sed 's|^|purchasely/android-tests/build.gradle (io.purchasely:core): |'
      )
      expected=3
    fi
    if [ "$(printf '%s\n' "$values" | grep -c .)" -ne "$expected" ] ||
       [ "$(printf '%s\n' "$values" | sed 's/.*: //' | sort -u | wc -l)" -ne 1 ]; then
      echo "::error::The $platform native SDK pins differ or one is missing. Expected $expected pins at one version:"
      printf '%s\n' "$values"
      status=1
    else
      echo "OK: the $platform native SDK pins are all $(printf '%s\n' "$values" | head -1 | sed 's/.*: //')"
    fi
  done
  return $status
}

status=0
if [ "${1:-}" = "--update" ]; then
  mkdir -p api
  generate api
  echo "Wrote api/Purchasely.d.ts and api/plugin-xml.txt."
else
  tmp=$(mktemp -d)
  generate "$tmp"
  if diff -ru api "$tmp"; then
    echo "OK: the public API matches api/"
  else
    echo "::error::The public API differs from api/ (diff above: - is api/, + is the code). If the change is intended, run '$UPDATE_CMD' and commit api/."
    status=1
  fi
  rm -rf "$tmp"
fi
check_pins || status=1
exit $status

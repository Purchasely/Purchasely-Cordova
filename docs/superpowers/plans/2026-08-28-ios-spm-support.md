# iOS SPM support alongside CocoaPods

**Created:** 2026-08-28
**Completed:** 2026-08-28

## Problem

Capacitor 8 defaults to Swift Package Manager. Its SPM path never reads `<podspec>`, so a
Capacitor 8 app scaffolded with the default package manager got the plugin sources with
**no Purchasely SDK linked at all**, silently. Found while building the Capacitor
regression sample (PR #67).

## Mechanism

The Capacitor CLI reads one hook: a `package` attribute on the ios `<platform>` element.
With it set, the CLI uses a `Package.swift` shipped at the plugin root instead of
generating a stub (`@capacitor/cli`, `dist/ios/update.js:83`), and wires it into
`CapApp-SPM/Package.swift` (`dist/util/spm.js:110-112`, `:164`). No plugin.xml element
becomes a remote `.package(url:)` on the generated path, so this attribute is the only
door.

It is Apache's mechanism, not a Capacitor extension, so Cordova iOS 8 reads it too. That
is why `nospm="true"` is required on the pod: without it Cordova iOS 8 installs the pod
**and** the SPM package and links Purchasely twice. Capacitor ignores `nospm` entirely
(no occurrence in `@capacitor/cli/dist`), so its CocoaPods mode still gets the pod.

## Verification

All four host configurations built and, where noted, run on a simulator.

| Config | Path taken | Build | `CDVPurchasely` linked | `Purchasely.framework` |
|---|---|---|---|---|
| Capacitor 8, SPM (default) | SPM | pass | yes | embedded |
| Capacitor 8, CocoaPods | pod `Purchasely (= 6.0.0)` | pass | yes | via pod |
| Cordova iOS 8.1.1 | SPM, no pod in Podfile | pass | yes | embedded |
| Cordova iOS 7.1.1 | pod `Purchasely, 6.0.0` | pass | yes | via pod |

Runtime, Capacitor 8 SPM: `To Native Cordova -> Purchasely start`, then
`5 products declared: PURCHASELY_PLUS, ...`.

Runtime, Cordova iOS 8.1.1: `5 products declared: ...` and a resolved anonymous user id.

## Two traps found while building it

1. **The Capacitor CLI rewrites `Package.swift` by string replacement.** It replaces the
   first lowercase `apache`, every `cordova-ios`, then pins the version between the
   rewritten URL and the next `)`. A comment mentioning either token above the dependency
   silently retargets the URL to a repository that does not exist, and the plugin then
   builds with no SDK. Hit this exactly once; the manifest header now documents it without
   using the literals.

2. **Deployment target.** `.iOS(.v15)` fails Cordova iOS 8 outright: its aggregate
   `CordovaPlugins` target is 13.0, and a package declaring more errors with "requires
   minimum platform version 15.0 ... but this target supports 13.0". Lowered to `.v13`.
   The Purchasely xcframework is built for iOS 13.4, so that floor still applies at link
   time exactly as it does through the podspec.

Also worth knowing: npm installs a `file:` dependency as a symlink, so `npx cap sync` in a
locally-linked sample rewrites the plugin's `Package.swift` **in the repository**. Check
`git status` after syncing a local sample.

## Behaviour change to be aware of

Cordova iOS 8 consumers switch from CocoaPods to SPM. `purchasely/example` pins
`cordova-ios: 8.1.1`, so the Cordova sample switches too. Cordova iOS 7 and earlier, and
Capacitor in CocoaPods mode, are unchanged.

// swift-tools-version:5.9
//
// Swift Package Manager manifest for the iOS plugin.
//
// `plugin.xml` marks the ios platform with package="swift", which makes two hosts read
// this file instead of building the plugin through CocoaPods:
//
//   * Cordova iOS 8 and later (Apache's own mechanism)
//   * Capacitor in SPM mode, which is the Capacitor 8 default
//
// Capacitor is the reason this exists. Its SPM path never reads <podspec>, so before this
// manifest a Capacitor 8 app scaffolded with the default package manager linked the plugin
// with no Purchasely SDK behind it at all, silently.
//
// The <podspec> block stays in plugin.xml for CocoaPods consumers: Cordova iOS 7 and
// earlier, and Capacitor in CocoaPods mode. Its pod carries nospm="true" so Cordova iOS 8
// does not install the pod AND this package and link Purchasely twice.
//
// KEEP THE FIRST DEPENDENCY EXACTLY AS WRITTEN, AND ADD NO PROSE ABOVE IT.
// The Capacitor CLI rewrites this file in place on every sync
// (@capacitor/cli, dist/ios/update.js:83-89). It rewrites the first occurrence of the
// Apache org slug, every occurrence of the upstream repository slug, and then pins the
// version by replacing everything between the rewritten URL and the next ")". Both slugs
// are lowercase and hyphenated, and both first appear in the Cordova dependency below.
// Writing either one in a comment above that line silently retargets the URL to a
// repository that does not exist, and the plugin then builds with no SDK. The rewrite is
// idempotent, and this comment is deliberately written without those two literals.
//
// Note for local development: npm installs a `file:` dependency as a symlink, so a
// `npx cap sync` in a sample app that consumes this plugin by path rewrites THIS file in
// the repository, not a copy. Check `git status` after syncing a local sample.
//
// The package and product names must equal the npm package id: the Capacitor CLI hardcodes
// `plugin.id` on both sides of the generated dependency (dist/util/spm.js:110-112, :164).

import PackageDescription

let package = Package(
    name: "@purchasely/cordova-plugin-purchasely",
    // 13.0, not higher: Cordova iOS 8 builds its aggregate CordovaPlugins target at 13.0,
    // and a package declaring more fails the build outright ("requires minimum platform
    // version 15.0 ... but this target supports 13.0"). The Purchasely xcframework itself
    // is built for iOS 13.4, so that floor still applies at link time, exactly as it does
    // through the podspec.
    platforms: [.iOS(.v13)],
    products: [
        .library(
            name: "@purchasely/cordova-plugin-purchasely",
            targets: ["PurchaselyCordovaPlugin"]
        )
    ],
    dependencies: [
        .package(url: "https://github.com/apache/cordova-ios.git", from: "8.0.0"),
        // exact, not `from:`. `from: "6.0.0"` permits any 6.x, so a fresh resolve already
        // picked up 6.0.1 in CI while the podspec pins 6.0.0 and VERSIONS.md documents
        // 6.0.0 for this plugin release. That made the linked SDK depend on install time
        // and let the two integration paths drift apart. Bump this with the podspec.
        .package(url: "https://github.com/Purchasely/Purchasely-iOS.git", exact: "6.0.0")
    ],
    targets: [
        .target(
            name: "PurchaselyCordovaPlugin",
            dependencies: [
                .product(name: "Cordova", package: "cordova-ios"),
                .product(name: "Purchasely", package: "Purchasely-iOS")
            ],
            path: "src/ios",
            publicHeadersPath: ".",
            cSettings: [
                // The Hybrid/ type-marshalling headers are imported unqualified from the
                // sources next to them, so their directory has to be on the search path.
                .headerSearchPath("Hybrid")
            ]
        )
    ]
)

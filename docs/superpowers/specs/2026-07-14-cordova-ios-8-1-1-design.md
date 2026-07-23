# cordova-ios 8.1.1 Validation Design

**Scope:** Cordova SDK only; branch targets `feat/migration-v6`.

The example and CI will use an exact `cordova-ios@8.1.1` installation rather than a range or `latest`. CI will use the lockfile, build an iOS release configuration, and produce an unsigned archive of the generated workspace. The existing JavaScript unit tests and Android validation remain intact.

Presentation, close, purchase, restore, JavaScript callbacks, and background/foreground behavior require a configured StoreKit/runtime environment. They will be verified with an explicit manual matrix rather than being represented as build-only CI coverage. Existing CocoaPods linkage remains unchanged.

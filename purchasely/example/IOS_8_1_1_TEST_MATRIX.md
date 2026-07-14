# cordova-ios 8.1.1 Manual Test Matrix

Run this matrix on a physical iOS device or a StoreKit-configured simulator after:

```bash
cd purchasely/example
./ios.sh
cordova run ios --device
```

Use a Purchasely project with a presentation, a purchasable product, and a restorable
purchase. Capture the app logs and the callback payloads for every row.

| Scenario | Steps | Expected result |
| --- | --- | --- |
| Presentation | Trigger the sample presentation. | The configured presentation is displayed using the requested transition. |
| Purchase | Select a product and complete the StoreKit purchase. | The StoreKit sheet completes, the purchase callback receives the Purchasely outcome, and the active entitlement is updated. |
| Restore | Use the sample restore action with a previously purchased account. | The restore callback completes and the restored entitlement is available. |
| Close | Dismiss the presentation through its close control and, separately, through the system back/dismiss gesture when enabled. | The close callback fires once per dismissal with the matching close reason; the final presentation outcome is delivered. |
| JavaScript callbacks | Repeat presentation, purchase, restore, and close while logging every success, failure, presented, and close-requested callback. | Each callback is received on the JavaScript bridge with its expected payload and no duplicate terminal callback. |
| Background and foreground | Show a presentation or StoreKit sheet, send the app to the background, then return it to the foreground. | The app remains responsive, the visible flow resumes or completes according to StoreKit, and no callback is lost or duplicated. |

This matrix is runtime validation only. The CI job verifies deterministic installation,
CocoaPods workspace build, and an unsigned archive; it cannot validate StoreKit or
backend-configured presentation behavior.

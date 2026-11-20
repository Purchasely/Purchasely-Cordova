import Foundation
import Purchasely

extension PLYPlan {
    var asDictionary: [String: Any] {
        var body: [String: Any] = [
            "vendorId": vendorId,
            "hasIntroductoryPrice": hasIntroductoryPrice,
            "type": type.rawValue
        ]

        if hasIntroductoryPrice, let introAmount, introAmount.intValue == 0 {
            body["hasFreeTrial"] = true
            body.removeValue(forKey: "hasIntroductoryPrice")
        }
        if let name { body["name"] = name }
        if let productId = appleProductId { body["productId"] = productId }
        if let price = localizedFullPrice(language: nil) { body["price"] = price }
        if let amount { body["amount"] = amount }
        if let localizedAmount = localizedPrice(language: nil) { body["localizedAmount"] = localizedAmount }
        if let introAmount { body["introAmount"] = introAmount }
        if let currencyCode { body["currencyCode"] = currencyCode }
        if let currencySymbol { body["currencySymbol"] = currencySymbol }
        if let period = localizedPeriod(language: nil) { body["period"] = period }
        if let introPrice = localizedFullIntroductoryPrice(language: nil) { body["introPrice"] = introPrice }
        if let introDuration = localizedIntroductoryDuration(language: nil) { body["introDuration"] = introDuration }
        if let introPeriod = localizedIntroductoryPeriod(language: nil) { body["introPeriod"] = introPeriod }

        if !commitmentInfo.isEmpty {
            body["commitmentInfo"] = commitmentInfo.map { info in
                [
                    "billingPlanType": info.billingPlanType.rawValue,
                    "billingPrice": info.billingPrice,
                    "billingPeriod": info.billingPeriod,
                    "totalPrice": info.totalPrice,
                    "totalPeriod": info.totalPeriod,
                    "totalDuration": info.totalDuration
                ] as [String: Any]
            }
        }
        return body
    }
}

import Foundation
import Purchasely

extension PLYSubscription {
    var asDictionary: [String: Any] {
        var result: [String: Any] = [
            "plan": plan.asDictionary,
            "product": product.asDictionary,
            "subscriptionSource": subscriptionSource.rawValue
        ]
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ssZ"
        if let nextRenewalDate { result["nextRenewalDate"] = formatter.string(from: nextRenewalDate) }
        if let cancelledDate { result["cancelledDate"] = formatter.string(from: cancelledDate) }
        if let progress = commitmentProgress {
            result["commitmentProgress"] = [
                "billingPeriodNumber": progress.billingPeriodNumber,
                "totalBillingPeriods": progress.totalBillingPeriods,
                "commitmentExpiresDate": formatter.string(from: progress.commitmentExpiresDate),
                "commitmentPrice": progress.commitmentPrice
            ]
        }
        return result
    }
}

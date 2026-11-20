import Foundation
import Purchasely

extension PLYPresentationPlan {
    var asDictionary: [String: Any] {
        var body: [String: Any] = [:]
        if let offerId { body["offerId"] = offerId }
        if let storeProductId { body["storeProductId"] = storeProductId }
        if let planVendorId { body["planVendorId"] = planVendorId }
        return body
    }
}

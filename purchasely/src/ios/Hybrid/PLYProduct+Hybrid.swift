import Foundation
import Purchasely

extension PLYProduct {
    var asDictionary: [String: Any] {
        var body: [String: Any] = [
            "vendorId": vendorId,
            "plans": plans.map { $0.asDictionary }
        ]
        if let name { body["name"] = name }
        return body
    }
}

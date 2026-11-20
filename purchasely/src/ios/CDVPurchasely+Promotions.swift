import Foundation
#if canImport(Cordova)
import Cordova
#endif
import Purchasely

extension CDVPurchasely {
    @objc(signPromotionalOffer:)
    func signPromotionalOffer(_ command: CDVInvokedUrlCommand) {
        let storeProductId = command.argument(at: 0) as! String
        let storeOfferId = command.argument(at: 1) as! String

        DispatchQueue.main.async {
            guard #available(iOS 12.2, *) else {
                self.failure(command, message: "This functionality is unavailable before iOS 12.2")
                return
            }

            Purchasely.signPromotionalOffer(storeProductId: storeProductId, storeOfferId: storeOfferId) { signature in
                self.success(command, dictionary: self.resultSignature(for: signature))
            } failure: { error in
                self.failure(command, message: error.localizedDescription)
            }
        }
    }

    @objc(signPromotionalOfferWithToken:)
    func signPromotionalOfferWithToken(_ command: CDVInvokedUrlCommand) {
        let tokenArgument = command.argument(at: 2)
        var token: UUID?
        if let tokenArgument, !(tokenArgument is NSNull) {
            guard let canonicalToken = Self.canonicalUUID(from: tokenArgument) else {
                failure(command, message: "purchaseContextToken must be a UUID string or null")
                return
            }
            token = canonicalToken as UUID
        }
        guard let storeProductId = command.argument(at: 0) as? String,
              let storeOfferId = command.argument(at: 1) as? String else {
            failure(command, message: "storeProductId and storeOfferId are required")
            return
        }

        DispatchQueue.main.async {
            guard #available(iOS 12.2, *) else {
                self.failure(command, message: "This functionality is unavailable before iOS 12.2")
                return
            }

            Purchasely.signPromotionalOffer(
                storeProductId: storeProductId,
                storeOfferId: storeOfferId,
                purchaseContextToken: token
            ) { signature, signedToken in
                var result = self.resultSignature(for: signature)
                result["purchaseContextToken"] = signedToken.uuidString.lowercased()
                self.success(command, dictionary: result)
            } failure: { error in
                self.failure(command, message: error.localizedDescription)
            }
        }
    }

    @objc(isEligibleForIntroOffer:)
    func isEligibleForIntroOffer(_ command: CDVInvokedUrlCommand) {
        let planVendorId = command.argument(at: 0) as! String
        Purchasely.plan(with: planVendorId) { plan in
            plan.isUserEligibleForIntroductoryOffer { isEligible in
                self.success(command, bool: isEligible)
            }
        } failure: { error in
            self.failure(command, message: error?.localizedDescription ?? "")
        }
    }

    private func resultSignature(for signature: PLYOfferSignature) -> [String: Any] {
        [
            "planVendorId": signature.planVendorId,
            "identifier": signature.identifier,
            "signature": signature.signature,
            "keyIdentifier": signature.keyIdentifier,
            "nonce": signature.nonce.uuidString,
            "timestamp": signature.timestamp
        ]
    }
}

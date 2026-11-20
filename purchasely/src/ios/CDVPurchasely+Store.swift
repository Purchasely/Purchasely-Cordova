import Foundation
#if canImport(Cordova)
import Cordova
#endif
import Purchasely

extension CDVPurchasely {
    @objc(restoreAllProducts:)
    func restoreAllProducts(_ command: CDVInvokedUrlCommand) {
        Purchasely.restoreAllProducts {
            self.success(command)
        } failure: { error in
            self.failure(command, message: error.localizedDescription)
        }
    }

    @objc(silentRestoreAllProducts:)
    func silentRestoreAllProducts(_ command: CDVInvokedUrlCommand) {
        Purchasely.synchronize {
            self.success(command)
        } failure: { error in
            self.failure(command, message: error.localizedDescription)
        }
    }

    @objc(synchronize:)
    func synchronize(_ command: CDVInvokedUrlCommand) {
        Purchasely.synchronize {
            self.success(command, bool: true)
        } failure: { error in
            self.failure(command, message: error.localizedDescription)
        }
    }

    @objc(purchasedSubscription:)
    func purchasedSubscription(_ command: CDVInvokedUrlCommand) {
        purchasedCommand = command
        NotificationCenter.default.removeObserver(self, name: Notification.Name("ply_purchasedSubscription"), object: nil)
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(reloadContent(_:)),
            name: Notification.Name("ply_purchasedSubscription"),
            object: nil
        )
    }

    @objc(allProducts:)
    func allProducts(_ command: CDVInvokedUrlCommand) {
        Purchasely.allProducts { products in
            let result = products.map { $0.asDictionary }
            self.success(command, array: result)
        } failure: { error in
            self.failure(command, message: error?.localizedDescription ?? "")
        }
    }

    @objc(productWithIdentifier:)
    func productWithIdentifier(_ command: CDVInvokedUrlCommand) {
        let vendorId = command.argument(at: 0) as! String
        Purchasely.product(with: vendorId) { product in
            self.success(command, dictionary: product.asDictionary)
        } failure: { error in
            self.failure(command, message: error?.localizedDescription ?? "")
        }
    }

    @objc(planWithIdentifier:)
    func planWithIdentifier(_ command: CDVInvokedUrlCommand) {
        let vendorId = command.argument(at: 0) as! String
        Purchasely.plan(with: vendorId) { plan in
            self.success(command, dictionary: plan.asDictionary)
        } failure: { error in
            self.failure(command, message: error?.localizedDescription ?? "")
        }
    }

    @objc(userSubscriptions:)
    func userSubscriptions(_ command: CDVInvokedUrlCommand) {
        let invalidateCache = (command.argument(at: 0) as? NSNumber)?.boolValue ?? false
        Purchasely.userSubscriptions(invalidateCache) { subscriptions in
            let result = subscriptions?.map { $0.asDictionary } ?? []
            self.success(command, array: result)
        } failure: { error in
            self.failure(command, message: error.localizedDescription)
        }
    }

    @objc(userSubscriptionsHistory:)
    func userSubscriptionsHistory(_ command: CDVInvokedUrlCommand) {
        let invalidateCache = (command.argument(at: 0) as? NSNumber)?.boolValue ?? false
        Purchasely.userSubscriptionsHistory(invalidateCache) { subscriptions in
            let result = subscriptions?.map { $0.asDictionary } ?? []
            self.success(command, array: result)
        } failure: { error in
            self.failure(command, message: error.localizedDescription)
        }
    }

    @objc(purchaseWithPlanVendorId:)
    func purchaseWithPlanVendorId(_ command: CDVInvokedUrlCommand) {
        let planVendorId = command.argument(at: 0) as! String
        let offerId = command.argument(at: 1) as? String
        let contentId = command.argument(at: 2) as? String

        Purchasely.plan(with: planVendorId) { plan in
            let purchaseSucceeded: () -> Void = {
                self.success(command, dictionary: plan.asDictionary)
            }
            let purchaseFailed: (Error) -> Void = { error in
                self.failure(command, message: error.localizedDescription)
            }

            if #available(iOS 12.2, *) {
                let storeOfferId = plan.promoOffers.first(where: { $0.vendorId == offerId })?.storeOfferId
                if let storeOfferId {
                    Purchasely.purchaseWithPromotionalOffer(
                        plan: plan,
                        contentId: contentId,
                        storeOfferId: storeOfferId,
                        success: purchaseSucceeded,
                        failure: purchaseFailed
                    )
                } else {
                    Purchasely.purchase(plan: plan, contentId: contentId, success: purchaseSucceeded, failure: purchaseFailed)
                }
            } else {
                Purchasely.purchase(plan: plan, contentId: contentId, success: purchaseSucceeded, failure: purchaseFailed)
            }
        } failure: { error in
            self.failure(command, message: error?.localizedDescription ?? "")
        }
    }
}

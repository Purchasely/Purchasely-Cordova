import Foundation
#if canImport(Cordova)
import Cordova
#endif
import Purchasely

extension CDVPurchasely: PLYEventDelegate, PLYWebRedemptionDelegate, PLYUserSubscriptionStatusDelegate {
    public func eventTriggered(_ event: PLYEvent, properties: [String: Any]?) {
        guard let command = eventCommand else { return }

        var body: [String: Any] = ["name": NSString.fromPLYEvent(event)]
        if let properties {
            body["properties"] = properties
        }

        send(CDVPluginResult(status: CDVCommandStatus_OK, messageAs: body), callbackId: command.callbackId, keepCallback: true)
    }

    public func webRedemptionCompleted(result: PLYWebRedemptionResult) {
        deliverWebRedemption {
            Self.webRedemptionBody(
                withSuccess: result.isSuccess,
                hasContext: result.context != nil,
                subscription: result.context?.subscription?.asDictionary,
                replay: result.replay,
                errorCode: result.errorCode,
                errorMessage: result.errorMessage
            ) as NSDictionary
        }
    }

    @objc(deliverWebRedemption:)
    func deliverWebRedemption(_ makeBody: @escaping @convention(block) () -> NSDictionary) {
        guard let command = webRedemptionCommand else { return }
        let body = makeBody() as! [String: Any]
        send(CDVPluginResult(status: CDVCommandStatus_OK, messageAs: body), callbackId: command.callbackId, keepCallback: true)
    }

    public func userSubscriptionStatusUpdated(_ status: PLYUserSubscriptionStatus) {
        guard let command = userSubscriptionStatusCommand else { return }

        let body = Self.userSubscriptionStatusBody(
            withIsActive: status.isActive,
            reason: status.reason,
            subscription: status.subscription?.asDictionary
        )
        send(CDVPluginResult(status: CDVCommandStatus_OK, messageAs: body), callbackId: command.callbackId, keepCallback: true)
    }

    @objc(reloadContent:)
    func reloadContent(_ notification: Notification) {
        guard let command = purchasedCommand else { return }

        send(CDVPluginResult(status: CDVCommandStatus_OK), callbackId: command.callbackId, keepCallback: true)
    }
}

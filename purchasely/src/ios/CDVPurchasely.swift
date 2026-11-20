import Foundation
import CoreFoundation
import UIKit
#if canImport(Cordova)
import Cordova
#endif
import Purchasely

@objc public enum CDVPurchaselyProxyOption: Int {
    case absent = 0
    case clear
    case set
    case invalid
}

/// Cordova's iOS plugin entry point. The Objective-C runtime name and explicit action
/// selectors are part of the JavaScript bridge contract.
@objc(CDVPurchasely)
public class CDVPurchasely: CDVPlugin {
    @objc var currentPresentation: (any PLYPresentation)?

    // Cordova callback commands are retained only while their JS streams are live.
    @objc var purchasedCommand: CDVInvokedUrlCommand?
    @objc var eventCommand: CDVInvokedUrlCommand?
    @objc var attributeCommand: CDVInvokedUrlCommand?
    @objc var webRedemptionCommand: CDVInvokedUrlCommand?
    @objc var userSubscriptionStatusCommand: CDVInvokedUrlCommand?
    @objc var purchaseResolve: CDVInvokedUrlCommand?

    @objc var presentationsLoaded = NSMutableDictionary()
    @objc var actionInterceptorCallbackIds = NSMutableDictionary()
    @objc var pendingInterceptCompletions = NSMutableDictionary()
    @objc var interceptorInvocationCounter: UInt = 0

    public override func pluginInitialize() {
        super.pluginInitialize()
        presentationsLoaded.removeAllObjects()
        actionInterceptorCallbackIds.removeAllObjects()
        pendingInterceptCompletions.removeAllObjects()
    }

    public override func onReset() {
        eventCommand = nil
        attributeCommand = nil
        webRedemptionCommand = nil
        userSubscriptionStatusCommand = nil
        purchasedCommand = nil
        super.onReset()
    }

    func send(_ result: CDVPluginResult?, callbackId: String?, keepCallback: Bool? = nil) {
        guard let result, let callbackId else { return }
        if let keepCallback { result.setKeepCallbackAs(keepCallback) }
        commandDelegate?.send(result, callbackId: callbackId)
    }

    func success(_ command: CDVInvokedUrlCommand) {
        send(CDVPluginResult(status: .ok), callbackId: command.callbackId)
    }

    func success(_ command: CDVInvokedUrlCommand, bool value: Bool) {
        send(CDVPluginResult(status: .ok, messageAs: value), callbackId: command.callbackId)
    }

    func success(_ command: CDVInvokedUrlCommand, string value: String) {
        send(CDVPluginResult(status: .ok, messageAs: value), callbackId: command.callbackId)
    }

    func success(_ command: CDVInvokedUrlCommand, array value: [Any]) {
        send(CDVPluginResult(status: .ok, messageAs: value), callbackId: command.callbackId)
    }

    func success(_ command: CDVInvokedUrlCommand, dictionary value: [String: Any]) {
        send(CDVPluginResult(status: .ok, messageAs: value), callbackId: command.callbackId)
    }

    func failure(_ command: CDVInvokedUrlCommand, message: String) {
        send(CDVPluginResult(status: .error, messageAs: message), callbackId: command.callbackId)
    }

    func failure(_ command: CDVInvokedUrlCommand, dictionary value: [String: Any]) {
        send(CDVPluginResult(status: .error, messageAs: value), callbackId: command.callbackId)
    }

    func failure(_ command: CDVInvokedUrlCommand, array value: [Any]) {
        send(CDVPluginResult(status: .error, messageAs: value), callbackId: command.callbackId)
    }

    func oneShot(_ command: CDVInvokedUrlCommand, result: CDVPluginResult?) {
        send(result, callbackId: command.callbackId, keepCallback: false)
    }

    func noResult(_ command: CDVInvokedUrlCommand) {
        send(CDVPluginResult(status: .noResult), callbackId: command.callbackId, keepCallback: false)
    }

    func success(_ command: CDVInvokedUrlCommand, value: Any) {
        let result: CDVPluginResult?
        if let value = value as? String {
            result = CDVPluginResult(status: .ok, messageAs: value)
        } else if let value = value as? [String: Any] {
            result = CDVPluginResult(status: .ok, messageAs: value)
        } else if let value = value as? [Any] {
            result = CDVPluginResult(status: .ok, messageAs: value)
        } else if let value = value as? NSNumber {
            if CFGetTypeID(value) == CFBooleanGetTypeID() {
                result = CDVPluginResult(status: .ok, messageAs: value.boolValue)
            } else if ["f", "d"].contains(String(cString: value.objCType)) {
                result = CDVPluginResult(status: .ok, messageAs: value.doubleValue)
            } else {
                result = CDVPluginResult(status: .ok, messageAs: value.intValue)
            }
        } else {
            result = nil
        }
        oneShot(command, result: result)
    }

    @objc(proxyOptionFor:url:)
    public class func proxyOption(for value: Any?, url outURL: AutoreleasingUnsafeMutablePointer<NSURL?>?) -> CDVPurchaselyProxyOption {
        if let outURL { outURL.pointee = nil }
        guard let value else { return .absent }
        if value is NSNull { return .clear }
        guard let text = value as? String, let url = URL(string: text) else { return .invalid }
        if let outURL { outURL.pointee = url as NSURL }
        return .set
    }

    @objc(webRedemptionBodyWithSuccess:hasContext:subscription:replay:errorCode:errorMessage:)
    public class func webRedemptionBody(
        withSuccess isSuccess: Bool,
        hasContext: Bool,
        subscription: [String: Any]?,
        replay: Bool,
        errorCode: String?,
        errorMessage: String?
    ) -> [String: Any] {
        let context: Any = hasContext ? ["subscription": subscription ?? NSNull()] as [String: Any] : NSNull()
        return [
            "isSuccess": isSuccess,
            "context": context,
            "replay": replay,
            "errorCode": errorCode ?? NSNull(),
            "errorMessage": errorMessage ?? NSNull()
        ]
    }

    @objc(userSubscriptionStatusBodyWithIsActive:reason:subscription:)
    public class func userSubscriptionStatusBody(
        withIsActive isActive: Bool,
        reason: PLYUserSubscriptionStatusReason,
        subscription: [String: Any]?
    ) -> [String: Any] {
        let wireReason: String?
        switch reason {
        case .purchased: wireReason = "PURCHASED"
        case .restored: wireReason = "RESTORED"
        case .expired: wireReason = "EXPIRED"
        case .webRedeemed: wireReason = "WEB_REDEEMED"
        case .none: wireReason = nil
        @unknown default: wireReason = nil
        }
        return [
            "isActive": isActive,
            "reason": wireReason ?? NSNull(),
            "subscription": subscription ?? NSNull()
        ]
    }

    @objc(canonicalUUIDFromString:)
    public class func canonicalUUID(from value: Any?) -> NSUUID? {
        guard let value = value as? String,
              let uuid = UUID(uuidString: value),
              uuid.uuidString.caseInsensitiveCompare(value) == .orderedSame else { return nil }
        return uuid as NSUUID
    }

    @objc(start:)
    public func start(_ command: CDVInvokedUrlCommand) {
        guard let options = command.argument(at: 0) as? [String: Any] else {
            failure(command, message: "start requires an options object")
            return
        }
        guard let apiKey = options["apiKey"] as? String, !apiKey.isEmpty else {
            failure(command, message: "apiKey is required")
            return
        }

        var builder = Purchasely.apiKey(apiKey).appTechnology(.cordova)
        if let sdkVersion = options["sdkVersion"] as? String {
            builder = builder.sdkBridgeVersion(sdkVersion)
        }
        if let appUserId = options["appUserId"] as? String, !appUserId.isEmpty {
            builder = builder.appUserId(appUserId)
        }
        let mode: PLYRunningMode = (options["runningMode"] as? String)?.lowercased() == "full" ? .full : .observer
        builder = builder.runningMode(mode)
        if let logLevel = options["logLevel"] as? NSNumber {
            builder = builder.logLevel(PLYLogger.PLYLogLevel(rawValue: logLevel.intValue) ?? .info)
        }

        let storeKit1 = (options["storeKit1"] as? NSNumber)?.boolValue == true
            || (options["storekitVersion"] as? String) == "storeKit1"
        builder = builder.storekitSettings(storeKit1 ? .storeKit1 : .storeKit2)
        if let allow = options["allowDeeplink"] as? NSNumber { builder = builder.allowDeeplink(allow.boolValue) }
        if let allow = options["allowCampaigns"] as? NSNumber { builder = builder.allowCampaigns(allow.boolValue) }

        if let anonymousUserId = options["anonymousUserId"] as? String {
            if let uuid = UUID(uuidString: anonymousUserId), uuid.uuidString.lowercased() == anonymousUserId.lowercased() {
                builder = builder.appAnonymousUserId(uuid, override: (options["anonymousUserIdOverride"] as? NSNumber)?.boolValue ?? false)
            } else {
                NSLog("[Purchasely] `anonymousUserId` must be a canonical UUID string, for example \"3f2504e0-4f89-11d3-9a0c-0305e82c3301\". Received a %lu-character value. The anonymous user id is not applied.", anonymousUserId.utf16.count)
            }
        }

        var proxyURL: NSURL?
        switch Self.proxyOption(for: options["proxy"], url: &proxyURL) {
        case .absent: break
        case .clear: builder = builder.proxy(api: nil)
        case .set: builder = builder.proxy(api: proxyURL as URL?)
        case .invalid:
            NSLog("[Purchasely] `proxy` must be an https base URL, for example \"https://svc.purchasely.io\", or null to clear the proxy. Received \"%@\". The proxy is not applied.", String(describing: options["proxy"] ?? "nil"))
        @unknown default: break
        }

        let appHandlesRedemptionAlert = (options["appHandlesRedemptionAlert"] as? NSNumber)?.boolValue ?? false
        builder = builder.webRedemptionDelegate(self, appHandlesRedemptionAlert: appHandlesRedemptionAlert)
        if let deeplink = options["deeplink"] as? String, !deeplink.isEmpty, let url = URL(string: deeplink) {
            builder = builder.handleDeeplink(url)
        }
        builder.start(initialized: { error in
            if let error { self.failure(command, message: error.localizedDescription) }
            else { self.success(command, bool: true) }
        })
    }

    @objc(setLogLevel:)
    public func setLogLevel(_ command: CDVInvokedUrlCommand) {
        guard let level = command.argument(at: 0) as? NSNumber else { return }
        Purchasely.setLogLevel(PLYLogger.PLYLogLevel(rawValue: level.intValue) ?? .info)
    }

    @objc(userLogin:)
    public func userLogin(_ command: CDVInvokedUrlCommand) {
        guard let userId = command.argument(at: 0) as? String else {
            success(command, bool: false)
            return
        }
        Purchasely.userLogin(with: userId) { [weak self] refresh in
            self?.success(command, bool: refresh)
        }
    }

    @objc(userLogout:)
    public func userLogout(_ command: CDVInvokedUrlCommand) {
        let clear = (command.argument(at: 0) as? NSNumber)?.boolValue ?? true
        Purchasely.userLogout(clear)
    }

    @objc(allowDeeplink:)
    public func allowDeeplink(_ command: CDVInvokedUrlCommand) {
        guard let value = command.argument(at: 0) as? NSNumber else { return }
        Purchasely.allowDeeplink(value.boolValue)
    }

    @objc(allowCampaigns:)
    public func allowCampaigns(_ command: CDVInvokedUrlCommand) {
        guard let value = command.argument(at: 0) as? NSNumber else { return }
        Purchasely.allowCampaigns(value.boolValue)
    }

    @objc(setThemeMode:)
    public func setThemeMode(_ command: CDVInvokedUrlCommand) {
        guard let mode = command.argument(at: 0) as? NSNumber,
              let value = Purchasely.PLYThemeMode(rawValue: mode.intValue) else { return }
        Purchasely.setThemeMode(value)
    }

    @objc(getAnonymousUserId:)
    public func getAnonymousUserId(_ command: CDVInvokedUrlCommand) {
        success(command, string: Purchasely.anonymousUserId)
    }

    @objc(isAnonymous:)
    public func isAnonymous(_ command: CDVInvokedUrlCommand) {
        success(command, bool: Purchasely.isAnonymous())
    }

    @objc(setLanguage:)
    public func setLanguage(_ command: CDVInvokedUrlCommand) {
        guard let language = command.argument(at: 0) as? String else { return }
        Purchasely.setLanguage(from: Locale(identifier: language))
    }

    @objc(handleDeeplink:)
    public func handleDeeplink(_ command: CDVInvokedUrlCommand) {
        guard let deeplink = command.argument(at: 0) as? String,
              let url = URL(string: deeplink) else {
            success(command, bool: false)
            return
        }
        success(command, bool: Purchasely.handleDeeplink(url))
    }

    @objc(setAttribute:)
    public func setAttribute(_ command: CDVInvokedUrlCommand) {
        guard let attributeNumber = command.argument(at: 0) as? NSNumber,
              let value = command.argument(at: 1) as? String,
              let attribute = Purchasely.PLYAttribute(rawValue: attributeNumber.intValue) else { return }
        Purchasely.setAttribute(attribute, value: value)
    }

    private func processingLegalBasis(_ command: CDVInvokedUrlCommand) -> PLYDataProcessingLegalBasis {
        (command.argument(at: 2) as? String) == "ESSENTIAL" ? .essential : .optional
    }

    @objc(emit:)
    public func emit(_ command: CDVInvokedUrlCommand) {
        guard let name = command.argument(at: 0) as? String, !name.isEmpty else {
            failure(command, message: "name is required")
            return
        }
        let properties = command.argument(at: 1) as? [String: Any] ?? [:]
        emitNative(name: name, properties: properties)
        success(command)
    }

    @objc dynamic func emitNative(name: String, properties: [String: Any]) {
        Purchasely.emit(name: name, properties: properties)
    }

    @objc dynamic func revokeConsentNative(_ purposes: NSSet) {
        Purchasely.revokeDataProcessingConsent(for: purposes as! Set<PLYDataProcessingPurpose>)
    }

    @objc(setUserAttributeWithString:)
    public func setUserAttributeWithString(_ command: CDVInvokedUrlCommand) {
        guard let key = command.argument(at: 0) as? String,
              let value = command.argument(at: 1) as? String else { return }
        Purchasely.setUserAttribute(withStringValue: value, forKey: key, processingLegalBasis: processingLegalBasis(command))
    }

    @objc(setUserAttributeWithBoolean:)
    public func setUserAttributeWithBoolean(_ command: CDVInvokedUrlCommand) {
        guard let key = command.argument(at: 0) as? String,
              let value = command.argument(at: 1) as? NSNumber else { return }
        Purchasely.setUserAttribute(withBoolValue: value.boolValue, forKey: key, processingLegalBasis: processingLegalBasis(command))
    }

    @objc(setUserAttributeWithInt:)
    public func setUserAttributeWithInt(_ command: CDVInvokedUrlCommand) {
        guard let key = command.argument(at: 0) as? String,
              let value = command.argument(at: 1) as? NSNumber else { return }
        Purchasely.setUserAttribute(withIntValue: Int(value.int32Value), forKey: key, processingLegalBasis: processingLegalBasis(command))
    }

    @objc(setUserAttributeWithDouble:)
    public func setUserAttributeWithDouble(_ command: CDVInvokedUrlCommand) {
        guard let key = command.argument(at: 0) as? String,
              let value = command.argument(at: 1) as? NSNumber else { return }
        Purchasely.setUserAttribute(withDoubleValue: value.doubleValue, forKey: key, processingLegalBasis: processingLegalBasis(command))
    }

    @objc(setUserAttributeWithDate:)
    public func setUserAttributeWithDate(_ command: CDVInvokedUrlCommand) {
        guard let key = command.argument(at: 0) as? String,
              let value = command.argument(at: 1) as? String else { return }
        let formatter = DateFormatter()
        formatter.timeZone = TimeZone(identifier: "GMT")
        formatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"
        guard let date = formatter.date(from: value) else {
            NSLog("[Purchasely] Cannot save date attribute %@", key)
            return
        }
        Purchasely.setUserAttribute(withDateValue: date, forKey: key, processingLegalBasis: processingLegalBasis(command))
    }

    @objc(setUserAttributeWithStringArray:)
    public func setUserAttributeWithStringArray(_ command: CDVInvokedUrlCommand) {
        guard let key = command.argument(at: 0) as? String,
              let values = command.argument(at: 1) as? [String] else { return }
        Purchasely.setUserAttribute(withStringArray: values, forKey: key, processingLegalBasis: processingLegalBasis(command))
    }

    @objc(setUserAttributeWithBooleanArray:)
    public func setUserAttributeWithBooleanArray(_ command: CDVInvokedUrlCommand) {
        guard let key = command.argument(at: 0) as? String,
              let values = command.argument(at: 1) as? [NSNumber] else { return }
        Purchasely.setUserAttribute(withBoolArray: values.map(\.boolValue), forKey: key, processingLegalBasis: processingLegalBasis(command))
    }

    @objc(setUserAttributeWithIntArray:)
    public func setUserAttributeWithIntArray(_ command: CDVInvokedUrlCommand) {
        guard let key = command.argument(at: 0) as? String,
              let values = command.argument(at: 1) as? [NSNumber] else { return }
        Purchasely.setUserAttribute(withIntArray: values.map { Int($0.int32Value) }, forKey: key, processingLegalBasis: processingLegalBasis(command))
    }

    @objc(setUserAttributeWithDoubleArray:)
    public func setUserAttributeWithDoubleArray(_ command: CDVInvokedUrlCommand) {
        guard let key = command.argument(at: 0) as? String,
              let values = command.argument(at: 1) as? [NSNumber] else { return }
        Purchasely.setUserAttribute(withDoubleArray: values.map(\.doubleValue), forKey: key, processingLegalBasis: processingLegalBasis(command))
    }

    @objc(incrementUserAttribute:)
    public func incrementUserAttribute(_ command: CDVInvokedUrlCommand) {
        guard let key = command.argument(at: 0) as? String else { return }
        let value = (command.argument(at: 1) as? NSNumber)?.intValue ?? 1
        Purchasely.incrementUserAttribute(withKey: key, value: value)
    }

    @objc(decrementUserAttribute:)
    public func decrementUserAttribute(_ command: CDVInvokedUrlCommand) {
        guard let key = command.argument(at: 0) as? String else { return }
        let value = (command.argument(at: 1) as? NSNumber)?.intValue ?? 1
        Purchasely.decrementUserAttribute(withKey: key, value: value)
    }

    private func cordovaDateValue(_ value: Any?) -> Any? {
        guard let value = value as? Date else { return value }
        let formatter = DateFormatter()
        formatter.timeZone = TimeZone(identifier: "GMT")
        formatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"
        return formatter.string(from: value)
    }

    @objc(userAttributeValueForKey:) dynamic func userAttributeValue(for key: String) -> Any? {
        Purchasely.getUserAttribute(for: key)
    }

    @objc(builtInAttributeValueForKey:) dynamic func builtInAttributeValue(for key: String) -> Any? {
        Purchasely.getBuiltInAttribute(with: key)
    }

    @objc(userAttribute:)
    public func userAttribute(_ command: CDVInvokedUrlCommand) {
        guard let key = command.argument(at: 0) as? String,
              let value = cordovaDateValue(userAttributeValue(for: key)) else {
            failure(command, message: "Cannot get user attribute")
            return
        }
        success(command, value: value)
    }

    @objc(userAttributes:)
    public func userAttributes(_ command: CDVInvokedUrlCommand) {
        let values = Purchasely.userAttributes.compactMapValues { cordovaDateValue($0) }
        success(command, dictionary: values)
    }

    @objc(clearUserAttribute:)
    public func clearUserAttribute(_ command: CDVInvokedUrlCommand) {
        guard let key = command.argument(at: 0) as? String else { return }
        Purchasely.clearUserAttribute(forKey: key)
    }

    @objc(clearUserAttributes:)
    public func clearUserAttributes(_ command: CDVInvokedUrlCommand) { Purchasely.clearUserAttributes() }

    @objc(clearBuiltInAttributes:)
    public func clearBuiltInAttributes(_ command: CDVInvokedUrlCommand) { Purchasely.clearBuiltInAttributes() }

    @objc(getBuiltInAttributes:)
    public func getBuiltInAttributes(_ command: CDVInvokedUrlCommand) {
        let values = Purchasely.getBuiltInAttributes().compactMapValues { cordovaDateValue($0) }
        success(command, dictionary: values)
    }

    @objc(getBuiltInAttribute:)
    public func getBuiltInAttribute(_ command: CDVInvokedUrlCommand) {
        guard let key = command.argument(at: 0) as? String else { return }
        guard let value = cordovaDateValue(builtInAttributeValue(for: key)) else {
            success(command)
            return
        }
        success(command, value: value)
    }

    @objc(addEventsListener:)
    public func addEventsListener(_ command: CDVInvokedUrlCommand) {
        Purchasely.setEventDelegate(self)
        eventCommand = command
    }

    @objc(removeEventsListener:)
    public func removeEventsListener(_ command: CDVInvokedUrlCommand) { eventCommand = nil }

    @objc(releaseCallbackStream:)
    func releaseCallbackStream(_ command: CDVInvokedUrlCommand?) {
        guard let command else { return }
        noResult(command)
    }

    @objc(addWebRedemptionListener:)
    public func addWebRedemptionListener(_ command: CDVInvokedUrlCommand) {
        releaseCallbackStream(webRedemptionCommand)
        webRedemptionCommand = command
    }

    @objc(removeWebRedemptionListener:)
    public func removeWebRedemptionListener(_ command: CDVInvokedUrlCommand) {
        releaseCallbackStream(webRedemptionCommand)
        webRedemptionCommand = nil
        success(command, bool: true)
    }

    @objc(addUserSubscriptionStatusListener:)
    public func addUserSubscriptionStatusListener(_ command: CDVInvokedUrlCommand) {
        releaseCallbackStream(userSubscriptionStatusCommand)
        userSubscriptionStatusCommand = command
        Purchasely.removeUserSubscriptionStatusDelegate(self)
        Purchasely.addUserSubscriptionStatusDelegate(self)
    }

    @objc(removeUserSubscriptionStatusListener:)
    public func removeUserSubscriptionStatusListener(_ command: CDVInvokedUrlCommand) {
        Purchasely.removeUserSubscriptionStatusDelegate(self)
        releaseCallbackStream(userSubscriptionStatusCommand)
        userSubscriptionStatusCommand = nil
        success(command, bool: true)
    }

    @objc(addUserAttributeListener:)
    public func addUserAttributeListener(_ command: CDVInvokedUrlCommand) {
        Purchasely.setUserAttributeDelegate(self)
        attributeCommand = command
    }

    @objc(removeUserAttributeListener:)
    public func removeUserAttributeListener(_ command: CDVInvokedUrlCommand) { attributeCommand = nil }

    @objc(removeDefaultPresentationDismissHandler:)
    public func removeDefaultPresentationDismissHandler(_ command: CDVInvokedUrlCommand) {
        Purchasely.setDefaultPresentationDismissHandler(nil)
    }

    @objc(closePresentation:)
    public func closePresentation(_ command: CDVInvokedUrlCommand) {
        DispatchQueue.main.async {
            Purchasely.closeAllScreens()
            self.currentPresentation = nil
        }
    }

    @objc(closeAllScreens:)
    public func closeAllScreens(_ command: CDVInvokedUrlCommand) {
        DispatchQueue.main.async {
            Purchasely.closeAllScreens()
            self.currentPresentation = nil
            self.success(command)
        }
    }

    @objc(backPresentation:)
    public func backPresentation(_ command: CDVInvokedUrlCommand) {
        DispatchQueue.main.async { self.currentPresentation?.back() }
    }

    @objc(userDidConsumeSubscriptionContent:)
    public func userDidConsumeSubscriptionContent(_ command: CDVInvokedUrlCommand) {
        Purchasely.userDidConsumeSubscriptionContent()
    }

    @objc(setDynamicOffering:)
    public func setDynamicOffering(_ command: CDVInvokedUrlCommand) {
        guard let reference = command.argument(at: 0) as? String,
              let planVendorId = command.argument(at: 1) as? String else { return }
        let offerVendorId = command.argument(at: 2) as? String
        let billingPlanType = PLYBillingPlanType(rawValue: (command.argument(at: 3) as? NSNumber)?.intValue ?? 0) ?? .unspecified
        Purchasely.setDynamicOffering(
            reference: reference,
            planVendorId: planVendorId,
            offerVendorId: offerVendorId,
            billingPlanType: billingPlanType
        ) { [weak self] success in self?.success(command, bool: success) }
    }

    @objc(getDynamicOfferings:)
    public func getDynamicOfferings(_ command: CDVInvokedUrlCommand) {
        Purchasely.getDynamicOfferings { [weak self] offerings in
            let result: [[String: Any]] = offerings.map { offering in
                [
                    "reference": offering.reference,
                    "planVendorId": offering.planId,
                    "offerVendorId": offering.offerId ?? NSNull()
                ]
            }
            self?.success(command, array: result)
        }
    }

    @objc(removeDynamicOffering:)
    public func removeDynamicOffering(_ command: CDVInvokedUrlCommand) {
        if let reference = command.argument(at: 0) as? String {
            Purchasely.removeDynamicOffering(reference: reference)
        }
    }

    @objc(clearDynamicOfferings:)
    public func clearDynamicOfferings(_ command: CDVInvokedUrlCommand) { Purchasely.clearDynamicOfferings() }

    @objc(setDebugMode:)
    public func setDebugMode(_ command: CDVInvokedUrlCommand) {
        let enabled = (command.argument(at: 0) as? NSNumber)?.boolValue ?? false
        Purchasely.setDebugMode(enabled: enabled)
    }

    @objc(revokeDataProcessingConsent:)
    public func revokeDataProcessingConsent(_ command: CDVInvokedUrlCommand) {
        let values = command.argument(at: 0) as? [String] ?? []
        var purposes = Set<PLYDataProcessingPurpose>()
        for value in values {
            switch value {
            case "ALL_NON_ESSENTIALS": purposes.insert(.allNonEssentials)
            case "ANALYTICS": purposes.insert(.analytics)
            case "IDENTIFIED_ANALYTICS": purposes.insert(.identifiedAnalytics)
            case "CAMPAIGNS": purposes.insert(.campaigns)
            case "PERSONALIZATION": purposes.insert(.personalization)
            case "THIRD_PARTY_INTEGRATIONS": purposes.insert(.thirdPartyIntegrations)
            case "REFUND_HANDLING": purposes.insert(.refundHandling)
            case "SUPPORT_INVESTIGATION": purposes.insert(.supportInvestigation)
            default: break
            }
        }
        revokeConsentNative(NSSet(array: Array(purposes)))
    }

    private func withLoadedPresentation(
        _ command: CDVInvokedUrlCommand,
        action: String,
        call: @escaping (any PLYPresentation) -> Void
    ) {
        let dictionary = command.argument(at: 0) as? [String: Any]
        let fetchId = dictionary?["fetchId"] as? String
        DispatchQueue.main.async {
            guard let fetchId, let presentation = self.presentationsLoaded[fetchId] as? any PLYPresentation else {
                self.failure(command, dictionary: [
                    "code": "ARG_INVALID",
                    "message": "\(action): no loaded presentation, pass a presentation returned by preload()"
                ])
                return
            }
            call(presentation)
            self.success(command)
        }
    }

    func resultDictionaryForFetchPresentation(_ presentation: (any PLYPresentation)?) -> [String: Any] {
        guard let presentation else { return [:] }
        var result: [String: Any] = [
            "id": presentation.screenId,
            "screenId": presentation.screenId,
            "height": presentation.height,
            "type": presentation.type.rawValue,
            "plans": presentation.plans.map(\.asDictionary)
        ]
        if let value = presentation.placementId { result["placementId"] = value }
        if let value = presentation.audienceId { result["audienceId"] = value }
        if let value = presentation.abTestId { result["abTestId"] = value }
        if let value = presentation.abTestVariantId { result["abTestVariantId"] = value }
        if let value = presentation.campaignId { result["campaignId"] = value }
        if let value = presentation.flowId { result["flowId"] = value }
        result["language"] = presentation.language
        return result
    }

    func resultDictionaryForOutcome(_ outcome: PLYPresentationOutcome) -> [String: Any] {
        let result: Int
        var body: [String: Any]
        switch outcome.purchaseResult {
        case .purchased:
            result = 0
            body = ["purchaseResult": "purchased"]
        case .cancelled:
            result = 1
            body = ["purchaseResult": "cancelled"]
        case .restored:
            result = 2
            body = ["purchaseResult": "restored"]
        case .none:
            result = 1
            body = [:]
        @unknown default:
            result = 1
            body = [:]
        }
        body["result"] = result
        if let plan = outcome.plan { body["plan"] = plan.asDictionary }
        switch outcome.closeReason {
        case .button: body["closeReason"] = "button"
        case .interactiveDismiss: body["closeReason"] = "back_system"
        case .programmatic: body["closeReason"] = "programmatic"
        case .none: break
        @unknown default: break
        }
        if let error = outcome.error { body["error"] = error.localizedDescription }
        if let presentation = outcome.presentation {
            body["presentation"] = resultDictionaryForFetchPresentation(presentation)
        }
        return body
    }

    @objc(findPresentationLoadedFor:)
    func findPresentationLoaded(for fetchId: String?) -> (any PLYPresentation)? {
        guard let fetchId else { return nil }
        return presentationsLoaded[fetchId] as? any PLYPresentation
    }

    @objc(setDefaultPresentationDismissHandler:)
    public func setDefaultPresentationDismissHandler(_ command: CDVInvokedUrlCommand) {
        Purchasely.setDefaultPresentationDismissHandler { outcome in
            let result = CDVPluginResult(status: .ok, messageAs: self.resultDictionaryForOutcome(outcome))
            self.send(result, callbackId: command.callbackId, keepCallback: true)
        }
    }

    @objc(exposed:)
    public func exposed(_ command: CDVInvokedUrlCommand) {
        withLoadedPresentation(command, action: "exposed") { $0.exposed() }
    }

    @objc(clientPresentationDisplayed:)
    public func clientPresentationDisplayed(_ command: CDVInvokedUrlCommand) {
        withLoadedPresentation(command, action: "clientPresentationDisplayed") {
            Purchasely.clientPresentationDisplayed(with: $0)
        }
    }

    @objc(clientPresentationClosed:)
    public func clientPresentationClosed(_ command: CDVInvokedUrlCommand) {
        withLoadedPresentation(command, action: "clientPresentationClosed") {
            Purchasely.clientPresentationClosed(with: $0)
        }
    }

    private func displayMode(from transition: Any?) -> PLYTransition? {
        let map = transition as? [String: Any]
        let type = map?["type"] as? String ?? transition as? String
        guard let type else { return nil }
        let dismissible = (map?["dismissible"] as? NSNumber)?.boolValue ?? true
        let heightInfo = map?["height"] as? [String: Any]
        let height = (heightInfo?["type"] as? String) == "percentage"
            ? heightInfo?["value"] as? NSNumber
            : nil
        var colors: PLYColors?
        if let hex = map?["backgroundColor"] as? String,
           let color = UIColor.plyFromHex(hex) {
            colors = PLYColors(lightColor: color, darkColor: color)
        }
        switch type {
        case "fullScreen": return .fullScreen
        case "modal": return .modal(dismissible: dismissible)
        case "push": return .push
        case "inlinePaywall": return .inlinePaywall
        case "drawer": return PLYTransition(type: .drawer, heightPercentage: height, backgroundColors: colors, dismissible: dismissible)
        case "popin": return PLYTransition(type: .popin, heightPercentage: height, backgroundColors: colors, dismissible: dismissible)
        default: return nil
        }
    }

    private func display(
        with builder: PLYPresentationBuilder,
        contentId: String?,
        transition: Any?,
        command: CDVInvokedUrlCommand
    ) {
        if let contentId { builder.contentId(contentId) }
        if let map = transition as? [String: Any],
           let background = map["backgroundColor"] as? String,
           let color = UIColor.plyFromHex(background) {
            builder.backgroundColor(color)
        }
        let callbackId = command.callbackId
        builder.onPresented { [weak self] presentation, error in
            guard let self else { return }
            self.presentationDidPresent(presentation, error: error, callbackId: callbackId)
        }
        builder.onCloseRequested { [weak self] in
            guard let self else { return }
            let result = CDVPluginResult(status: .ok, messageAs: ["event": "closeRequested"])
            self.send(result, callbackId: callbackId, keepCallback: true)
        }
        builder.onDismissed { [weak self] outcome in
            guard let self else { return }
            self.currentPresentation = nil
            self.success(command, dictionary: self.resultDictionaryForOutcome(outcome))
        }
        let request = builder.build()
        request.display(transition: displayMode(from: transition), completion: nil)
    }

    @objc(presentationDidPresent:error:callbackId:)
    func presentationDidPresent(_ presentation: (any PLYPresentation)?, error: Error?, callbackId: String?) {
        currentPresentation = presentation
        var body: [String: Any] = ["event": "presented"]
        if let presentation { body["presentation"] = resultDictionaryForFetchPresentation(presentation) }
        if let error { body["error"] = error.localizedDescription }
        let result = CDVPluginResult(status: .ok, messageAs: body)
        send(result, callbackId: callbackId, keepCallback: true)
    }

    @objc(presentPresentationWithIdentifier:)
    public func presentPresentationWithIdentifier(_ command: CDVInvokedUrlCommand) {
        guard let presentationId = command.argument(at: 0) as? String else {
            failure(command, message: "presentationId is required")
            return
        }
        let contentId = command.argument(at: 1) as? String
        let transition = command.argument(at: 2)
        DispatchQueue.main.async {
            self.display(with: .forScreenId(presentationId), contentId: contentId, transition: transition, command: command)
        }
    }

    @objc(presentPresentationForPlacement:)
    public func presentPresentationForPlacement(_ command: CDVInvokedUrlCommand) {
        guard let placementId = command.argument(at: 0) as? String else {
            failure(command, message: "placementId is required")
            return
        }
        let contentId = command.argument(at: 1) as? String
        let transition = command.argument(at: 2)
        DispatchQueue.main.async {
            self.display(with: .forPlacementId(placementId), contentId: contentId, transition: transition, command: command)
        }
    }

    @objc(presentPresentationForDefault:)
    public func presentPresentationForDefault(_ command: CDVInvokedUrlCommand) {
        let contentId = command.argument(at: 0) as? String
        let transition = command.argument(at: 1)
        DispatchQueue.main.async {
            self.display(with: PLYPresentationBuilder(), contentId: contentId, transition: transition, command: command)
        }
    }

    @objc(fetchPresentation:)
    public func fetchPresentation(_ command: CDVInvokedUrlCommand) {
        let placementId = command.argument(at: 0) as? String
        let presentationId = command.argument(at: 1) as? String
        let contentId = command.argument(at: 2) as? String
        DispatchQueue.main.async {
            let builder: PLYPresentationBuilder
            if let placementId { builder = .forPlacementId(placementId) }
            else if let presentationId { builder = .forScreenId(presentationId) }
            else { builder = PLYPresentationBuilder() }
            if let contentId { builder.contentId(contentId) }
            builder.build().preload { presentation, error in
                if let error {
                    self.failure(command, message: error.localizedDescription)
                } else if let presentation {
                    let fetchId = UUID().uuidString
                    self.presentationsLoaded[fetchId] = presentation
                    var body = self.resultDictionaryForFetchPresentation(presentation)
                    body["fetchId"] = fetchId
                    self.success(command, dictionary: body)
                } else {
                    self.failure(command, message: "Presentation preload completed without a presentation and without an error")
                }
            }
        }
    }

    @objc(presentPresentation:)
    public func presentPresentation(_ command: CDVInvokedUrlCommand) {
        guard let presentationInfo = command.argument(at: 0) as? [String: Any] else {
            failure(command, message: "Presentation cannot be null")
            return
        }
        let transition = command.argument(at: 1)
        let loadingBackgroundColor = command.argument(at: 2) as? String
        purchaseResolve = command
        DispatchQueue.main.async {
            let fetchId = presentationInfo["fetchId"] as? String
            guard let fetchId, let presentation = self.presentationsLoaded[fetchId] as? any PLYPresentation else {
                self.failure(command, message: "Presentation not loaded")
                return
            }
            let noScreen = presentation.type == .deactivated || presentation.type == .client
            if presentation.controller == nil && !noScreen {
                self.failure(command, message: "Presentation not loaded")
                return
            }
            if !noScreen { self.presentationsLoaded.removeObject(forKey: fetchId) }
            if let hex = loadingBackgroundColor,
               let color = UIColor.plyFromHex(hex) {
                presentation.controller?.view.backgroundColor = color
            }
            let callbackId = command.callbackId
            presentation.onPresented = { [weak self] resultPresentation, error in
                guard let self else { return }
                var body: [String: Any] = ["event": "presented"]
                if let resultPresentation { body["presentation"] = self.resultDictionaryForFetchPresentation(resultPresentation) }
                if let error { body["error"] = error.localizedDescription }
                let result = CDVPluginResult(status: .ok, messageAs: body)
                self.send(result, callbackId: callbackId, keepCallback: true)
            }
            presentation.onCloseRequested = { [weak self] in
                guard let self else { return }
                let result = CDVPluginResult(status: .ok, messageAs: ["event": "closeRequested"])
                self.send(result, callbackId: callbackId, keepCallback: true)
            }
            presentation.onDismissed = { [weak self] outcome in
                guard let self else { return }
                if !noScreen { self.currentPresentation = nil }
                self.success(command, dictionary: self.resultDictionaryForOutcome(outcome))
            }
            if !noScreen { self.currentPresentation = presentation }
            presentation.display(from: nil, transitionType: self.displayMode(from: transition))
        }
    }

    private func presentationAction(for kind: String) -> PLYPresentationAction? {
        switch kind {
        case "login": return .login
        case "purchase": return .purchase
        case "close": return .close
        case "close_all": return .closeAll
        case "restore": return .restore
        case "navigate": return .navigate
        case "promo_code": return .promoCode
        case "open_presentation": return .openPresentation
        case "open_placement": return .openPlacement
        case "web_checkout": return .webCheckout
        default: return nil
        }
    }

    private func interceptorActionName(_ action: PLYPresentationAction) -> String {
        switch action {
        case .login: return "login"
        case .purchase: return "purchase"
        case .close: return "close"
        case .closeAll: return "close_all"
        case .restore: return "restore"
        case .navigate: return "navigate"
        case .promoCode: return "promo_code"
        case .openPresentation: return "open_presentation"
        case .openPlacement: return "open_placement"
        case .webCheckout: return "web_checkout"
        @unknown default: return "unknown"
        }
    }

    private func interceptorEvent(
        action: PLYPresentationAction,
        parameters: PLYPresentationActionParameters?,
        info: PLYInterceptorInfo
    ) -> [String: Any] {
        var event: [String: Any] = ["action": interceptorActionName(action)]
        var infoBody: [String: Any] = [:]
        if let contentId = info.contentId { infoBody["contentId"] = contentId }
        if let presentation = info.presentation {
            infoBody["presentationId"] = presentation.screenId
            if let value = presentation.placementId { infoBody["placementId"] = value }
            if let value = presentation.abTestId { infoBody["abTestId"] = value }
            if let value = presentation.abTestVariantId { infoBody["abTestVariantId"] = value }
        }
        event["info"] = infoBody

        if let parameters {
            var parameterBody: [String: Any] = [:]
            if let value = parameters.url { parameterBody["url"] = value.absoluteString }
            if let value = parameters.plan { parameterBody["plan"] = value.asDictionary }
            if let value = parameters.title { parameterBody["title"] = value }
            if let value = parameters.presentation { parameterBody["presentation"] = value }
            if let value = parameters.placement { parameterBody["placementId"] = value }
            if let offer = parameters.promoOffer {
                parameterBody["offer"] = ["vendorId": offer.vendorId, "storeOfferId": offer.storeOfferId]
            }
            switch parameters.webCheckoutProvider {
            case .stripe: parameterBody["webCheckoutProvider"] = "stripe"
            case .other: parameterBody["webCheckoutProvider"] = "other"
            case .none: parameterBody["webCheckoutProvider"] = "none"
            @unknown default: parameterBody["webCheckoutProvider"] = "unknown"
            }
            if let value = parameters.queryParameterKey { parameterBody["queryParameterKey"] = value }
            if let value = parameters.clientReferenceId { parameterBody["clientReferenceId"] = value }
            event["parameters"] = parameterBody
        }
        return event
    }

    @objc(registerActionInterceptor:)
    public func registerActionInterceptor(_ command: CDVInvokedUrlCommand) {
        guard let kind = command.argument(at: 0) as? String,
              let action = presentationAction(for: kind) else {
            NSLog("[Purchasely] unknown interceptor kind: %@", String(describing: command.argument(at: 0)))
            return
        }
        actionInterceptorCallbackIds[kind] = command.callbackId
        Purchasely.interceptAction(action) { [weak self] info, parameters, completion in
            guard let self,
                  let callbackId = self.actionInterceptorCallbackIds[kind] as? String else {
                completion(.notHandled)
                return
            }
            self.interceptorInvocationCounter += 1
            let invocationId = "\(kind)#\(self.interceptorInvocationCounter)"
            self.pendingInterceptCompletions[invocationId] = completion
            var event = self.interceptorEvent(action: action, parameters: parameters, info: info)
            event["callbackId"] = invocationId
            let result = CDVPluginResult(status: .ok, messageAs: event)
            self.send(result, callbackId: callbackId, keepCallback: true)
        }
    }

    @objc(unregisterActionInterceptor:)
    public func unregisterActionInterceptor(_ command: CDVInvokedUrlCommand) {
        guard let kind = command.argument(at: 0) as? String,
              let action = presentationAction(for: kind) else { return }
        actionInterceptorCallbackIds.removeObject(forKey: kind)
        Purchasely.removeActionInterceptor(action)
    }

    @objc(completeActionInterceptor:)
    public func completeActionInterceptor(_ command: CDVInvokedUrlCommand) {
        guard let invocationId = command.argument(at: 0) as? String,
              let completion = pendingInterceptCompletions[invocationId] as? (PLYInterceptResult) -> Void else { return }
        pendingInterceptCompletions.removeObject(forKey: invocationId)
        let resultString = command.argument(at: 1) as? String
        let result: PLYInterceptResult = switch resultString {
        case "success": .success
        case "failed": .failed
        default: .notHandled
        }
        completion(result)
    }
}

import Foundation
#if canImport(Cordova)
import Cordova
#endif
import Purchasely

extension CDVPurchasely: PLYUserAttributeDelegate {
    public func onUserAttributeSet(key: String, type: PLYUserAttributeType, value: Any?, source: PLYUserAttributeSource) {
        guard let command = attributeCommand else { return }
        let body = dictionaryFromUserAttribute(key: key, type: type, value: value, source: source)
        send(CDVPluginResult(status: CDVCommandStatus_OK, messageAs: body), callbackId: command.callbackId, keepCallback: true)
    }

    public func onUserAttributeRemoved(key: String, source: PLYUserAttributeSource) {
        guard let command = attributeCommand else { return }
        let body: [String: Any] = [
            "action": "remove",
            "key": key,
            "source": source.cordovaWireValue
        ]
        send(CDVPluginResult(status: CDVCommandStatus_OK, messageAs: body), callbackId: command.callbackId, keepCallback: true)
    }

    private func dictionaryFromUserAttribute(
        key: String,
        type: PLYUserAttributeType,
        value: Any?,
        source: PLYUserAttributeSource
    ) -> [String: Any] {
        var body: [String: Any] = [
            "action": "add",
            "key": key,
            "type": type.cordovaWireValue,
            "source": source.cordovaWireValue
        ]

        guard let value else { return body }
        switch type {
        case .string:
            if let value = value as? String { body["value"] = value }
        case .bool:
            if let value = value as? NSNumber { body["value"] = value.boolValue }
        case .int:
            if let value = value as? NSNumber { body["value"] = value.intValue }
        case .double:
            if let value = value as? NSNumber { body["value"] = value.doubleValue }
        case .date:
            if let value = value as? NSDate { body["value"] = value.description }
        case .stringArray, .intArray, .doubleArray, .boolArray:
            if let value = value as? [Any] { body["value"] = value }
        case .dictionary:
            if let value = value as? [AnyHashable: Any] { body["value"] = value }
        case .unknown:
            body["value"] = "unknown"
        @unknown default:
            body["value"] = "unknown"
        }
        return body
    }
}

private extension PLYUserAttributeType {
    var cordovaWireValue: String {
        switch self {
        case .string: return "string"
        case .bool: return "bool"
        case .int: return "int"
        case .double: return "double"
        case .date: return "date"
        case .stringArray: return "stringArray"
        case .intArray: return "intArray"
        case .doubleArray: return "doubleArray"
        case .boolArray: return "boolArray"
        case .dictionary: return "dictionary"
        case .unknown: return "unknown"
        @unknown default: return "invalid"
        }
    }
}

private extension PLYUserAttributeSource {
    var cordovaWireValue: String {
        switch self {
        case .purchasely: return "purchasely"
        case .client: return "client"
        @unknown default: return "unknown"
        }
    }
}

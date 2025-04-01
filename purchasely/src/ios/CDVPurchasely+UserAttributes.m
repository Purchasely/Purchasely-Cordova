//
//  CDVPurchasely+UserAttributes.m
//  Purchasely Cordova Plugin
//
//  Created by Florian HUET on 26/03/2025.
//

#import <Purchasely/Purchasely-Swift.h>
#import "CDVPurchasely+UserAttributes.h"
#import "Purchasely_Hybrid.h"

@implementation CDVPurchasely (UserAttributes)


- (void)onUserAttributeSetWithKey:(NSString * _Nonnull)key
                             type:(enum PLYUserAttributeType)type
                            value:(id _Nullable)value
                           source:(enum PLYUserAttributeSource)source {
    NSDictionary *attributeDic = [self dictionaryFromUserAttributeWithKey:key type:type value:value source:source];
    
    CDVPluginResult* pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsDictionary:attributeDic];
    
    [pluginResult setKeepCallbackAsBool:YES];
    [self.commandDelegate sendPluginResult:pluginResult callbackId:self.attributeCommand.callbackId];
}

- (void)onUserAttributeRemovedWithKey:(NSString * _Nonnull)key
                               source:(enum PLYUserAttributeSource)source {
    NSString *sourceString = [PLYUserAttributeSourceHelper stringFromUserAttributeSource:source];
    
    NSMutableDictionary<NSString *, id> *attributeDic = [@{
        @"action": @"remove",
        @"key": key,
        @"source": sourceString
    } mutableCopy];
    
    CDVPluginResult* pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsDictionary:attributeDic];
    
    [pluginResult setKeepCallbackAsBool:YES];
    [self.commandDelegate sendPluginResult:pluginResult callbackId:self.attributeCommand.callbackId];
}

- (NSDictionary<NSString *, id> *)dictionaryFromUserAttributeWithKey:(NSString * _Nonnull)key
                                                                type:(enum PLYUserAttributeType)type
                                                               value:(id _Nullable)value
                                                              source:(enum PLYUserAttributeSource)source {
    NSString *typeString = [PLYUserAttributeTypeHelper stringFromUserAttributeType:type];
    NSString *sourceString = [PLYUserAttributeSourceHelper stringFromUserAttributeSource:source];

    NSMutableDictionary<NSString *, id> *attributeDic = [@{
        @"action": @"add",
        @"key": key,
        @"type": typeString,
        @"source": sourceString
    } mutableCopy];

    if (value) {
        switch (type) {
            case PLYUserAttributeTypeString:
                if ([value isKindOfClass:[NSString class]]) {
                    attributeDic[@"value"] = value;
                }
                break;
            case PLYUserAttributeTypeBool:
                if ([value isKindOfClass:[NSNumber class]]) {
                    attributeDic[@"value"] = @([(NSNumber *)value boolValue]);
                }
                break;
            case PLYUserAttributeTypeInt:
                if ([value isKindOfClass:[NSNumber class]]) {
                    attributeDic[@"value"] = @([(NSNumber *)value intValue]);
                }
                break;
            case PLYUserAttributeTypeDouble:
                if ([value isKindOfClass:[NSNumber class]]) {
                    attributeDic[@"value"] = @([(NSNumber *)value doubleValue]);
                }
                break;
            case PLYUserAttributeTypeDate:
                if ([value isKindOfClass:[NSDate class]]) {
                    attributeDic[@"value"] = [(NSDate *)value description]; // Convert to string
                }
                break;
            case PLYUserAttributeTypeStringArray:
                if ([value isKindOfClass:[NSArray class]]) {
                    attributeDic[@"value"] = value; // Ensure it's an NSArray of NSString
                }
                break;
            case PLYUserAttributeTypeIntArray:
            case PLYUserAttributeTypeDoubleArray:
            case PLYUserAttributeTypeBoolArray:
                if ([value isKindOfClass:[NSArray class]]) {
                    attributeDic[@"value"] = value; // Ensure it's an NSArray of NSNumber
                }
                break;
            case PLYUserAttributeTypeDictionary:
                if ([value isKindOfClass:[NSDictionary class]]) {
                    attributeDic[@"value"] = value; // Ensure it's an NSDictionary
                }
                break;
            default:
                attributeDic[@"value"] = @"unknown";
                break;
        }
    }

    return [attributeDic copy];
}


@end

@implementation PLYUserAttributeTypeHelper

+ (NSString *_Nullable)stringFromUserAttributeType:(PLYUserAttributeType)type {
    switch (type) {
        case PLYUserAttributeTypeString: return @"string";
        case PLYUserAttributeTypeBool: return @"bool";
        case PLYUserAttributeTypeInt: return @"int";
        case PLYUserAttributeTypeDouble: return @"double";
        case PLYUserAttributeTypeDate: return @"date";
        case PLYUserAttributeTypeStringArray: return @"stringArray";
        case PLYUserAttributeTypeIntArray: return @"intArray";
        case PLYUserAttributeTypeDoubleArray: return @"doubleArray";
        case PLYUserAttributeTypeBoolArray: return @"boolArray";
        case PLYUserAttributeTypeDictionary: return @"dictionary";
        case PLYUserAttributeTypeUnknown: return @"unknown";
        default: return @"invalid";
    }
}

@end

@implementation PLYUserAttributeSourceHelper

+ (NSString *_Nullable)stringFromUserAttributeSource:(PLYUserAttributeSource)source {
    switch (source) {
        case PLYUserAttributeSourcePurchasely: return @"purchasely";
        case PLYUserAttributeSourceClient: return @"client";
        default: return @"unknown";
    }
}

@end

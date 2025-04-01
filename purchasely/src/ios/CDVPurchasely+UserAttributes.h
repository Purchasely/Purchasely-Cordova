//
//  CDVPurchasely+UserAttributes.h
//  Purchasely Cordova Plugin
//
//  Created by Florian HUET on 26/03/2025.
//

#import <Cordova/CDVPlugin.h>
#import "CDVPurchasely.h"

@interface CDVPurchasely (UserAttributes) {

}

- (void)onUserAttributeSetWithKey:(NSString * _Nonnull)key
                             type:(enum PLYUserAttributeType)type
                            value:(id _Nullable)value
                           source:(enum PLYUserAttributeSource)source;

- (void)onUserAttributeRemovedWithKey:(NSString * _Nonnull)key
                               source:(enum PLYUserAttributeSource)source;

@end

@interface PLYUserAttributeTypeHelper : NSObject

+ (NSString *_Nullable)stringFromUserAttributeType:(PLYUserAttributeType)type;

@end

@interface PLYUserAttributeSourceHelper : NSObject

+ (NSString *_Nullable)stringFromUserAttributeSource:(PLYUserAttributeSource)source;

@end

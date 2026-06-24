//
//  CDVPurchasely.h
//  Purchasely Cordova Plugin
//
//  Created by Jean-François GRANG on 15/07/2021.
//

#import <Cordova/CDVPlugin.h>
#import <Purchasely/Purchasely-Swift.h>

@interface CDVPurchasely<PLYEventDelegate, PLYUserAttributeDelegate> : CDVPlugin {
}

@property (nonatomic, retain) UIViewController* presentedPresentationViewController;

@property CDVInvokedUrlCommand* purchasedCommand;
@property CDVInvokedUrlCommand* eventCommand;
@property CDVInvokedUrlCommand* attributeCommand;

/// callbackId of the kept-alive `setDefaultPresentationDismissHandler` command.
@property (nonatomic, copy) NSString* defaultDismissCallbackId;

- (void)start:(CDVInvokedUrlCommand*)command;
- (void)setLogLevel:(CDVInvokedUrlCommand*)command;
- (void)userLogin:(CDVInvokedUrlCommand*)command;
- (void)userLogout:(CDVInvokedUrlCommand*)command;
- (void)setAttribute:(CDVInvokedUrlCommand*)command;
- (void)getAnonymousUserId:(CDVInvokedUrlCommand*)command;
- (void)allowDeeplink:(CDVInvokedUrlCommand*)command;

// v6 builder API — presentation lifecycle
- (void)applyStartOptions:(CDVInvokedUrlCommand*)command;
- (void)preloadPresentation:(CDVInvokedUrlCommand*)command;
- (void)displayPresentation:(CDVInvokedUrlCommand*)command;
- (void)closePresentation:(CDVInvokedUrlCommand*)command;
- (void)goBackToPreviousScreen:(CDVInvokedUrlCommand*)command;
- (void)setDefaultPresentationDismissHandler:(CDVInvokedUrlCommand*)command;
- (void)removeDefaultPresentationDismissHandler:(CDVInvokedUrlCommand*)command;

// v6 per-action interceptors
- (void)registerActionInterceptor:(CDVInvokedUrlCommand*)command;
- (void)unregisterActionInterceptor:(CDVInvokedUrlCommand*)command;
- (void)completeActionInterceptor:(CDVInvokedUrlCommand*)command;

- (void)purchaseWithPlanVendorId:(CDVInvokedUrlCommand*)command;
- (void)restoreAllProducts:(CDVInvokedUrlCommand*)command;
- (void)silentRestoreAllProducts:(CDVInvokedUrlCommand*)command;
- (void)synchronize:(CDVInvokedUrlCommand*)command;
- (void)purchasedSubscription:(CDVInvokedUrlCommand*)command;
- (void)allProducts:(CDVInvokedUrlCommand*)command;
- (void)productWithIdentifier:(CDVInvokedUrlCommand*)command;
- (void)planWithIdentifier:(CDVInvokedUrlCommand*)command;
- (void)userSubscriptions:(CDVInvokedUrlCommand*)command;
- (void)userSubscriptionsHistory:(CDVInvokedUrlCommand*)command;
- (void)addEventsListener:(CDVInvokedUrlCommand*)command;
- (void)removeEventsListener:(CDVInvokedUrlCommand*)command;
- (void)handleDeeplink:(CDVInvokedUrlCommand*)command;
- (void)userDidConsumeSubscriptionContent:(CDVInvokedUrlCommand*)command;
- (void)setUserAttributeWithStringArray:(CDVInvokedUrlCommand*)command;
- (void)setUserAttributeWithIntArray:(CDVInvokedUrlCommand*)command;
- (void)setUserAttributeWithDoubleArray:(CDVInvokedUrlCommand*)command;
- (void)setUserAttributeWithBooleanArray:(CDVInvokedUrlCommand*)command;
- (void)setUserAttributeWithString:(CDVInvokedUrlCommand*)command;
- (void)setUserAttributeWithBoolean:(CDVInvokedUrlCommand*)command;
- (void)setUserAttributeWithInt:(CDVInvokedUrlCommand*)command;
- (void)setUserAttributeWithDouble:(CDVInvokedUrlCommand*)command;
- (void)setUserAttributeWithDate:(CDVInvokedUrlCommand*)command;
- (void)userAttribute:(CDVInvokedUrlCommand*)command;
- (void)clearUserAttribute:(CDVInvokedUrlCommand*)command;
- (void)clearUserAttributes:(CDVInvokedUrlCommand*)command;
- (void)clearBuiltInAttributes:(CDVInvokedUrlCommand*)command;
- (void)signPromotionalOffer:(CDVInvokedUrlCommand*)command;
- (void)isEligibleForIntroOffer:(CDVInvokedUrlCommand*)command;
- (void)setThemeMode:(CDVInvokedUrlCommand*)command;
- (void)addUserAttributeListener:(CDVInvokedUrlCommand*)command;

@end

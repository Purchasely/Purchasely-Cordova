//
//  CDVPurchasely.h
//  Purchasely Cordova Plugin
//
//  Created by Jean-François GRANG on 15/07/2021.
//

#import <Cordova/CDVPlugin.h>
#import <Purchasely/Purchasely-Swift.h>

// Protocol conformance (PLYEventDelegate / PLYUserAttributeDelegate) is declared on the
// CDVPurchasely (Events) and (UserAttributes) categories, which implement the delegate methods.
@interface CDVPurchasely : CDVPlugin {
}

// The presentation currently displayed (v6 uses id<PLYPresentation> for close()/back()).
@property (nonatomic, strong) id<PLYPresentation> currentPresentation;

@property CDVInvokedUrlCommand* purchasedCommand;
@property CDVInvokedUrlCommand* eventCommand;
@property CDVInvokedUrlCommand* attributeCommand;

@property (nonatomic) NSMutableArray<id<PLYPresentation>> *presentationsLoaded;

@property (nonatomic) CDVInvokedUrlCommand* purchaseResolve;

@property CDVInvokedUrlCommand* paywallActionInterceptorCommand;
// v6: interceptor completion takes a PLYInterceptResult (was void(^)(BOOL) in v5).
@property (nonatomic, copy) void (^interceptorCompletion)(enum PLYInterceptResult result);

- (void)start:(CDVInvokedUrlCommand*)command;
- (void)setLogLevel:(CDVInvokedUrlCommand*)command;
- (void)userLogin:(CDVInvokedUrlCommand*)command;
- (void)userLogout:(CDVInvokedUrlCommand*)command;
- (void)setAttribute:(CDVInvokedUrlCommand*)command;
- (void)getAnonymousUserId:(CDVInvokedUrlCommand*)command;
- (void)allowDeeplink:(CDVInvokedUrlCommand*)command;
- (void)allowCampaigns:(CDVInvokedUrlCommand*)command;
- (void)handleDeeplink:(CDVInvokedUrlCommand*)command;
- (void)setDefaultPresentationDismissHandler:(CDVInvokedUrlCommand*)command;
- (void)presentPresentationWithIdentifier:(CDVInvokedUrlCommand*)command;
- (void)presentPresentationForPlacement:(CDVInvokedUrlCommand*)command;
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
- (void)setPaywallActionInterceptor:(CDVInvokedUrlCommand*)command;
- (void)onProcessAction:(CDVInvokedUrlCommand*)command;
- (void)closePresentation:(CDVInvokedUrlCommand*)command;
- (void)backPresentation:(CDVInvokedUrlCommand*)command;
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
- (void)fetchPresentation:(CDVInvokedUrlCommand*)command;
- (void)presentPresentation:(CDVInvokedUrlCommand*)command;
- (void)signPromotionalOffer:(CDVInvokedUrlCommand*)command;
- (void)isEligibleForIntroOffer:(CDVInvokedUrlCommand*)command;
- (void)setThemeMode:(CDVInvokedUrlCommand*)command;
- (void)addUserAttributeListener:(CDVInvokedUrlCommand*)command;

@end

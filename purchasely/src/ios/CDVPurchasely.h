//
//  CDVPurchasely.h
//  Purchasely Cordova Plugin
//
//  Created by Jean-François GRANG on 15/07/2021.
//

#import <Cordova/CDVPlugin.h>
#import <Purchasely/Purchasely-Swift.h>

@interface CDVPurchasely<PLYEventDelegate> : CDVPlugin {
}

@property (nonatomic, retain) UIViewController* presentedPresentationViewController;

@property CDVInvokedUrlCommand* purchasedCommand;
@property CDVInvokedUrlCommand* eventCommand;

@property (nonatomic) NSMutableArray<PLYPresentation *> *presentationsLoaded;
@property (nonatomic, assign) Boolean shouldReopenPaywall;

@property (nonatomic) CDVInvokedUrlCommand* purchaseResolve;

@property CDVInvokedUrlCommand* paywallActionInterceptorCommand;
@property void (^onProcessActionHandler)(BOOL proceed);

- (void)start:(CDVInvokedUrlCommand*)command;
- (void)setLogLevel:(CDVInvokedUrlCommand*)command;
- (void)userLogin:(CDVInvokedUrlCommand*)command;
- (void)userLogout:(CDVInvokedUrlCommand*)command;
- (void)setAttribute:(CDVInvokedUrlCommand*)command;
- (void)getAnonymousUserId:(CDVInvokedUrlCommand*)command;
- (void)readyToOpenDeeplink:(CDVInvokedUrlCommand*)command;
- (void)setDefaultPresentationResultHandler:(CDVInvokedUrlCommand*)command;
- (void)presentPresentationWithIdentifier:(CDVInvokedUrlCommand*)command;
- (void)presentPresentationForPlacement:(CDVInvokedUrlCommand*)command;
- (void)presentPlanWithIdentifier:(CDVInvokedUrlCommand*)command;
- (void)presentProductWithIdentifier:(CDVInvokedUrlCommand*)command;
- (void)presentSubscriptions:(CDVInvokedUrlCommand*)command;
- (void)purchaseWithPlanVendorId:(CDVInvokedUrlCommand*)command;
- (void)restoreAllProducts:(CDVInvokedUrlCommand*)command;
- (void)silentRestoreAllProducts:(CDVInvokedUrlCommand*)command;
- (void)synchronize:(CDVInvokedUrlCommand*)command;
- (void)purchasedSubscription:(CDVInvokedUrlCommand*)command;
- (void)allProducts:(CDVInvokedUrlCommand*)command;
- (void)productWithIdentifier:(CDVInvokedUrlCommand*)command;
- (void)planWithIdentifier:(CDVInvokedUrlCommand*)command;
- (void)userSubscriptions:(CDVInvokedUrlCommand*)command;
- (void)addEventsListener:(CDVInvokedUrlCommand*)command;
- (void)removeEventsListener:(CDVInvokedUrlCommand*)command;
- (void)isDeeplinkHandled:(CDVInvokedUrlCommand*)command;
- (void)setPaywallActionInterceptor:(CDVInvokedUrlCommand*)command;
- (void)onProcessAction:(CDVInvokedUrlCommand*)command;
- (void)closePresentation:(CDVInvokedUrlCommand*)command;
- (void)hidePresentation:(CDVInvokedUrlCommand*)command;
- (void)showPresentation:(CDVInvokedUrlCommand*)command;
- (void)userDidConsumeSubscriptionContent:(CDVInvokedUrlCommand*)command;
- (void)setUserAttributeWithString:(CDVInvokedUrlCommand*)command;
- (void)setUserAttributeWithBoolean:(CDVInvokedUrlCommand*)command;
- (void)setUserAttributeWithInt:(CDVInvokedUrlCommand*)command;
- (void)setUserAttributeWithDate:(CDVInvokedUrlCommand*)command;
- (void)userAttribute:(CDVInvokedUrlCommand*)command;
- (void)clearUserAttribute:(CDVInvokedUrlCommand*)command;
- (void)clearUserAttributes:(CDVInvokedUrlCommand*)command;
- (void)fetchPresentation:(CDVInvokedUrlCommand*)command;
- (void)presentPresentation:(CDVInvokedUrlCommand*)command;
- (void)signPromotionalOffer:(CDVInvokedUrlCommand*)command;
- (void)isEligibleForIntroOffer:(CDVInvokedUrlCommand*)command;
- (void)setThemeMode:(CDVInvokedUrlCommand*)command;

@end

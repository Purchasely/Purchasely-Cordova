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

@property CDVInvokedUrlCommand* loginTappedCommand;
@property void (^loginClosedHandler)(BOOL loggedIn);

@property CDVInvokedUrlCommand* authorizePurchaseCommand;
@property void (^authorizePurchaseHandler)(BOOL authorizePurchase);

- (void)startWithAPIKey:(CDVInvokedUrlCommand*)command;
- (void)setLogLevel:(CDVInvokedUrlCommand*)command;
- (void)userLogin:(CDVInvokedUrlCommand*)command;
- (void)userLogout:(CDVInvokedUrlCommand*)command;
- (void)setAttribute:(CDVInvokedUrlCommand*)command;
- (void)getAnonymousUserId:(CDVInvokedUrlCommand*)command;
- (void)isReadyToPurchase:(CDVInvokedUrlCommand*)command;
- (void)setDefaultPresentationResultHandler:(CDVInvokedUrlCommand*)command;
- (void)presentPresentationWithIdentifier:(CDVInvokedUrlCommand*)command;
- (void)presentPlanWithIdentifier:(CDVInvokedUrlCommand*)command;
- (void)presentProductWithIdentifier:(CDVInvokedUrlCommand*)command;
- (void)presentSubscriptions:(CDVInvokedUrlCommand*)command;
- (void)purchaseWithPlanVendorId:(CDVInvokedUrlCommand*)command;
- (void)restoreAllProducts:(CDVInvokedUrlCommand*)command;
- (void)purchasedSubscription:(CDVInvokedUrlCommand*)command;
- (void)allProducts:(CDVInvokedUrlCommand*)command;
- (void)productWithIdentifier:(CDVInvokedUrlCommand*)command;
- (void)planWithIdentifier:(CDVInvokedUrlCommand*)command;
- (void)userSubscriptions:(CDVInvokedUrlCommand*)command;
- (void)addEventsListener:(CDVInvokedUrlCommand*)command;
- (void)removeEventsListener:(CDVInvokedUrlCommand*)command;
- (void)handle:(CDVInvokedUrlCommand*)command;
- (void)close:(CDVInvokedUrlCommand*)command;
- (void)setLoginTappedHandler:(CDVInvokedUrlCommand*)command;
- (void)onUserLoggedIn:(CDVInvokedUrlCommand*)command;
- (void)setConfirmPurchaseHandler:(CDVInvokedUrlCommand*)command;
- (void)processToPayment:(CDVInvokedUrlCommand*)command;


@end

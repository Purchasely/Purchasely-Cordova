//
//  CDVPurchasely.m
//  Purchasely Cordova Plugin
//
//  Created by Jean-François GRANG on 15/07/2021.
//

#import "CDVPurchasely.h"
#import "Purchasely_Hybrid.h"
#import "CDVPurchasely+Events.h"

@implementation CDVPurchasely

- (void)startWithAPIKey:(CDVInvokedUrlCommand*)command {
	NSString *apiKey = [command argumentAtIndex:0];
	NSString *userId = [command argumentAtIndex:2];
	NSInteger logLevel = [[command argumentAtIndex:3] intValue];
	BOOL observerMode = [[command argumentAtIndex:4] boolValue];

	[Purchasely startWithAPIKey:apiKey appUserId:userId observerMode:observerMode eventDelegate:nil uiDelegate:nil confirmPurchaseHandler:nil logLevel:logLevel];
	[Purchasely setAppTechnology:PLYAppTechnologyCordova];
}

- (void)setLogLevel:(CDVInvokedUrlCommand*)command {
	NSInteger logLevel = [[command argumentAtIndex:0] intValue];
	[Purchasely setLogLevel:logLevel];
}

- (void)userLogin:(CDVInvokedUrlCommand*)command {
	NSString *userId = [command argumentAtIndex:0];
	[Purchasely userLoginWith:userId shouldRefresh:^(BOOL refresh) {
		[self successFor:command resultBool:refresh];
	}];
}

- (void)userLogout:(CDVInvokedUrlCommand*)command {
	[Purchasely userLogout];
}

- (void)setAttribute:(CDVInvokedUrlCommand*)command {
	NSInteger attribute = [[command argumentAtIndex:0] intValue];
	NSString *value = [command argumentAtIndex:1];

	[Purchasely setAttribute:attribute value:value];
}

- (void)getAnonymousUserId:(CDVInvokedUrlCommand*)command {
	NSString *anonymousId = [Purchasely anonymousUserId];
	[self successFor:command resultString:anonymousId];
}

- (void)isReadyToPurchase:(CDVInvokedUrlCommand*)command {
	BOOL isReadyToPurchase = [[command argumentAtIndex:0] boolValue];
	[Purchasely isReadyToPurchase: isReadyToPurchase];
}

- (void)setDefaultPresentationResultHandler:(CDVInvokedUrlCommand*)command {
	[Purchasely setDefaultPresentationResultHandler:^(enum PLYProductViewControllerResult result, PLYPlan * _Nullable plan) {
		NSDictionary *resultDict = [self resultDictionaryForPresentationController:result plan:plan];

		CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsDictionary:resultDict];
		[pluginResult setKeepCallbackAsBool:YES];
		[self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
	}];
}

- (void)presentPresentationWithIdentifier:(CDVInvokedUrlCommand*)command {
	NSString *presentationVendorId = [command argumentAtIndex:0];

	UIViewController *ctrl = [Purchasely presentationControllerWith:presentationVendorId completion:^(enum PLYProductViewControllerResult result, PLYPlan * _Nullable plan) {
		NSDictionary *resultDict = [self resultDictionaryForPresentationController:result plan:plan];
		[self successFor:command resultDict:resultDict];
	}];

	UINavigationController *navCtrl = [[UINavigationController alloc] initWithRootViewController:ctrl];
	[navCtrl.navigationBar setTranslucent:YES];
	[navCtrl.navigationBar setBackgroundImage:[UIImage new] forBarMetrics:UIBarMetricsDefault];
	[navCtrl.navigationBar setShadowImage: [UIImage new]];
	[navCtrl.navigationBar setTintColor: [UIColor whiteColor]];

	[Purchasely showController:navCtrl type: PLYUIControllerTypeProductPage];
}

- (void)presentPlanWithIdentifier:(CDVInvokedUrlCommand*)command {
	NSString *planVendorId = [command argumentAtIndex:0];
	NSString *presentationVendorId = [command argumentAtIndex:1];

	UIViewController *ctrl = [Purchasely planControllerFor:planVendorId with:presentationVendorId completion:^(enum PLYProductViewControllerResult result, PLYPlan * _Nullable plan) {
		NSDictionary *resultDict = [self resultDictionaryForPresentationController:result plan:plan];
		[self successFor:command resultDict:resultDict];
	}];

	UINavigationController *navCtrl = [[UINavigationController alloc] initWithRootViewController:ctrl];
	[navCtrl.navigationBar setTranslucent:YES];
	[navCtrl.navigationBar setBackgroundImage:[UIImage new] forBarMetrics:UIBarMetricsDefault];
	[navCtrl.navigationBar setShadowImage: [UIImage new]];
	[navCtrl.navigationBar setTintColor: [UIColor whiteColor]];

	[Purchasely showController:navCtrl type: PLYUIControllerTypeProductPage];
}

- (void)presentProductWithIdentifier:(CDVInvokedUrlCommand*)command {
	NSString *productVendorId = [command argumentAtIndex:0];
	NSString *presentationVendorId = [command argumentAtIndex:1];

	UIViewController *ctrl = [Purchasely productControllerFor:productVendorId with:presentationVendorId completion:^(enum PLYProductViewControllerResult result, PLYPlan * _Nullable plan) {
		NSDictionary *resultDict = [self resultDictionaryForPresentationController:result plan:plan];
		[self successFor:command resultDict:resultDict];
	}];

	UINavigationController *navCtrl = [[UINavigationController alloc] initWithRootViewController:ctrl];
	[navCtrl.navigationBar setTranslucent:YES];
	[navCtrl.navigationBar setBackgroundImage:[UIImage new] forBarMetrics:UIBarMetricsDefault];
	[navCtrl.navigationBar setShadowImage: [UIImage new]];
	[navCtrl.navigationBar setTintColor: [UIColor whiteColor]];

	[Purchasely showController:navCtrl type: PLYUIControllerTypeProductPage];
}

- (void)presentSubscriptions:(CDVInvokedUrlCommand*)command {
	UIViewController *ctrl = [Purchasely subscriptionsController];
	UINavigationController *navCtrl = [[UINavigationController alloc] initWithRootViewController:ctrl];
	ctrl.navigationItem.leftBarButtonItem = [[UIBarButtonItem alloc] initWithBarButtonSystemItem: UIBarButtonSystemItemDone target:navCtrl action:@selector(close)];

	[Purchasely showController:navCtrl type: PLYUIControllerTypeSubscriptionList];
}

- (void)purchaseWithPlanVendorId:(CDVInvokedUrlCommand*)command {
	NSString *planVendorId = [command argumentAtIndex:0];

	[Purchasely planWith:planVendorId
				 success:^(PLYPlan * _Nonnull plan) {
		[Purchasely purchaseWithPlan:plan
							 success:^{
			[self successFor:command resultDict: plan.asDictionary];
		}
							 failure:^(NSError * _Nonnull error) {
			[self failureFor:command resultString: error.localizedDescription];
		}];
	}
				 failure:^(NSError * _Nullable error) {
		[self failureFor:command resultString: error.localizedDescription];
	}];
}

- (void)restoreAllProducts:(CDVInvokedUrlCommand*)command {
	[Purchasely restoreAllProductsWithSuccess:^{
		[self successFor:command];
	} failure:^(NSError * _Nonnull error) {
		[self failureFor:command resultString:error.localizedDescription];
	}];
}

- (void)purchasedSubscription:(CDVInvokedUrlCommand*)command {
	self.purchasedCommand = command;
	[[NSNotificationCenter defaultCenter] addObserver:self
											 selector:@selector(reloadContent:)
												 name: @"ply_purchasedSubscription"
											   object:nil];
}

- (void)productWithIdentifier:(CDVInvokedUrlCommand*)command {
	NSString *productVendorId = [command argumentAtIndex:0];

	[Purchasely productWith:productVendorId
					success:^(PLYProduct * _Nonnull product) {
		[self successFor:command resultDict:product.asDictionary];
	}
					failure:^(NSError * _Nullable error) {
		[self failureFor:command resultString:error.localizedDescription];
	}];
}

- (void)planWithIdentifier:(CDVInvokedUrlCommand*)command {
	NSString *planVendorId = [command argumentAtIndex:0];

	[Purchasely planWith:planVendorId
				 success:^(PLYPlan * _Nonnull plan) {
		[self successFor:command resultDict:plan.asDictionary];
	}
				 failure:^(NSError * _Nullable error) {
		[self failureFor:command resultString:error.localizedDescription];
	}];
}

- (void)userSubscriptions:(CDVInvokedUrlCommand*)command {
	[Purchasely userSubscriptionsWithSuccess:^(NSArray<PLYSubscription *> * _Nullable subscriptions) {
		NSMutableArray *result = [NSMutableArray new];
		for (PLYSubscription *subscription in subscriptions) {
			[result addObject:subscription.asDictionary];
		}
		[self successFor:command resultArray:result];
	}
									 failure:^(NSError * _Nonnull error) {
		[self failureFor:command resultString:error.localizedDescription];
	}];
}

- (void)addEventsListener:(CDVInvokedUrlCommand*)command {
	[Purchasely setEventDelegate:self];
	self.eventCommand = command;
}

- (void)removeEventsListener:(CDVInvokedUrlCommand*)command {
	[Purchasely setEventDelegate:nil];
	self.eventCommand = nil;
}

- (void)handle:(CDVInvokedUrlCommand*)command {
	NSString *deeplinkString = [command argumentAtIndex:0];
	NSURL *deeplink = [NSURL URLWithString:deeplinkString];

	if (deeplink != nil) {
		BOOL result = [Purchasely handleWithDeeplink:deeplink];
		[self successFor:command resultBool:result];
	} else {
		[self successFor:command resultBool:NO];
	}
}

- (void)close:(CDVInvokedUrlCommand*)command {
}

- (void)setLoginTappedHandler:(CDVInvokedUrlCommand*)command {
	self.loginTappedCommand = command;
	[Purchasely setLoginTappedHandler:^(UIViewController * _Nonnull controller, void (^ _Nonnull closedHandler)(BOOL)) {
		self.loginClosedHandler = closedHandler;

		CDVPluginResult* result = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
		[result setKeepCallbackAsBool:YES];
		[self.commandDelegate sendPluginResult:result callbackId:self.loginTappedCommand.callbackId];
	}];
}

- (void)onUserLoggedIn:(CDVInvokedUrlCommand*)command {
	BOOL userDidLogin = [[command argumentAtIndex:0] boolValue];

	self.loginClosedHandler(userDidLogin);
}

- (void)setConfirmPurchaseHandler:(CDVInvokedUrlCommand*)command {
	self.authorizePurchaseCommand = command;
	[Purchasely setConfimPurchaseHandler:^(UIViewController * _Nonnull controller, void (^ _Nonnull authorizePurchaseHandler)(BOOL)) {
		self.authorizePurchaseHandler = authorizePurchaseHandler;

		CDVPluginResult* result = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
		[result setKeepCallbackAsBool:YES];
		[self.commandDelegate sendPluginResult:result callbackId:self.authorizePurchaseCommand.callbackId];
	}];
}

- (void)processToPayment:(CDVInvokedUrlCommand*)command {
	BOOL processToPayment = [[command argumentAtIndex:0] boolValue];

	self.authorizePurchaseHandler(processToPayment);
}

// Helpers

- (NSDictionary<NSString *, NSObject *> *) resultDictionaryForPresentationController:(PLYProductViewControllerResult)result plan:(PLYPlan * _Nullable)plan {
	NSMutableDictionary<NSString *, NSObject *> *productViewResult = [NSMutableDictionary new];
	int resultString;

	switch (result) {
		case PLYProductViewControllerResultPurchased:
			resultString = PLYProductViewControllerResultPurchased;
			break;
		case PLYProductViewControllerResultRestored:
			resultString = PLYProductViewControllerResultRestored;
			break;
		case PLYProductViewControllerResultCancelled:
			resultString = PLYProductViewControllerResultCancelled;
			break;
	}

	[productViewResult setObject:[NSNumber numberWithInt:resultString] forKey:@"result"];

	if (plan != nil) {
		[productViewResult setObject:[plan asDictionary] forKey:@"plan"];
	}
	return productViewResult;
}

- (void)successFor:(CDVInvokedUrlCommand *)command {
	CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
	[self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
}

- (void)successFor:(CDVInvokedUrlCommand *)command resultBool:(BOOL)resultBool {
	CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsBool:resultBool];
	[self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
}

- (void)successFor:(CDVInvokedUrlCommand *)command resultString:(NSString *)resultString {
	CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsString:resultString];
	[self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
}

- (void)failureFor:(CDVInvokedUrlCommand *)command resultString:(NSString *)resultString {
	CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:resultString];
	[self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
}

- (void)successFor:(CDVInvokedUrlCommand *)command resultArray:(NSArray *)resultArray {
	CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsArray:resultArray];
	[self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
}

- (void)failureFor:(CDVInvokedUrlCommand *)command resultArray:(NSArray *)resultArray {
	CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsArray:resultArray];
	[self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
}

- (void)successFor:(CDVInvokedUrlCommand *)command resultDict:(NSDictionary *)resultDict {
	CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsDictionary:resultDict];
	[self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
}

- (void)failureFor:(CDVInvokedUrlCommand *)command resultDict:(NSDictionary *)resultDict {
	CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsDictionary:resultDict];
	[self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
}


@end

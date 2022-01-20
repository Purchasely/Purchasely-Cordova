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
	NSInteger runningMode = [[command argumentAtIndex:4] intValue];

	[Purchasely setAppTechnology:PLYAppTechnologyCordova];
    [Purchasely startWithAPIKey:apiKey appUserId:userId runningMode:runningMode eventDelegate:nil uiDelegate:nil paywallActionsInterceptor:nil logLevel:logLevel initialized:^(BOOL initialized, NSError * _Nullable error) {
        if (error != nil) {
            [self failureFor:command resultString: error.localizedDescription];
        } else {
            [self successFor:command resultBool:initialized];
        }
    }];
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
    NSString *contentId = [command argumentAtIndex:1];
    BOOL isFullscreen = [[command argumentAtIndex:2] boolValue];

    UIViewController *ctrl = [Purchasely presentationControllerWith:presentationVendorId contentId:contentId loaded:nil completion:^(enum PLYProductViewControllerResult result, PLYPlan * _Nullable plan) {
        NSDictionary *resultDict = [self resultDictionaryForPresentationController:result plan:plan];
        [self successFor:command resultDict:resultDict];
    }];

    if (ctrl != nil) {
        UINavigationController *navCtrl = [[UINavigationController alloc] initWithRootViewController:ctrl];
        [navCtrl.navigationBar setTranslucent:YES];
        [navCtrl.navigationBar setBackgroundImage:[UIImage new] forBarMetrics:UIBarMetricsDefault];
        [navCtrl.navigationBar setShadowImage: [UIImage new]];
        [navCtrl.navigationBar setTintColor: [UIColor whiteColor]];

        self.presentedPresentationViewController = navCtrl;
        
        if (isFullscreen) {
            navCtrl.modalPresentationStyle = UIModalPresentationFullScreen;
        }
        [Purchasely showController:navCtrl type: PLYUIControllerTypeProductPage];
    }
}

- (void)presentPlanWithIdentifier:(CDVInvokedUrlCommand*)command {
	NSString *planVendorId = [command argumentAtIndex:0];
	NSString *presentationVendorId = [command argumentAtIndex:1];
    NSString *contentId = [command argumentAtIndex:2];
    BOOL isFullscreen = [[command argumentAtIndex:3] boolValue];
    
    UIViewController *ctrl = [Purchasely planControllerFor:planVendorId with:presentationVendorId contentId:contentId loaded:nil completion:^(enum PLYProductViewControllerResult result, PLYPlan * _Nullable plan) {
		NSDictionary *resultDict = [self resultDictionaryForPresentationController:result plan:plan];
		[self successFor:command resultDict:resultDict];
	}];

    if (ctrl != nil) {
        UINavigationController *navCtrl = [[UINavigationController alloc] initWithRootViewController:ctrl];
        [navCtrl.navigationBar setTranslucent:YES];
        [navCtrl.navigationBar setBackgroundImage:[UIImage new] forBarMetrics:UIBarMetricsDefault];
        [navCtrl.navigationBar setShadowImage: [UIImage new]];
        [navCtrl.navigationBar setTintColor: [UIColor whiteColor]];
        
        self.presentedPresentationViewController = navCtrl;
        
        if (isFullscreen) {
            navCtrl.modalPresentationStyle = UIModalPresentationFullScreen;
        }
        [Purchasely showController:navCtrl type: PLYUIControllerTypeProductPage];
    }
}

- (void)presentProductWithIdentifier:(CDVInvokedUrlCommand*)command {
	NSString *productVendorId = [command argumentAtIndex:0];
	NSString *presentationVendorId = [command argumentAtIndex:1];
    NSString *contentId = [command argumentAtIndex:2];
    BOOL isFullscreen = [[command argumentAtIndex:3] boolValue];
    
    UIViewController *ctrl = [Purchasely productControllerFor:productVendorId with:presentationVendorId contentId:contentId loaded:nil completion:^(enum PLYProductViewControllerResult result, PLYPlan * _Nullable plan) {
		NSDictionary *resultDict = [self resultDictionaryForPresentationController:result plan:plan];
		[self successFor:command resultDict:resultDict];
	}];

    if (ctrl != nil) {
        UINavigationController *navCtrl = [[UINavigationController alloc] initWithRootViewController:ctrl];
        [navCtrl.navigationBar setTranslucent:YES];
        [navCtrl.navigationBar setBackgroundImage:[UIImage new] forBarMetrics:UIBarMetricsDefault];
        [navCtrl.navigationBar setShadowImage: [UIImage new]];
        [navCtrl.navigationBar setTintColor: [UIColor whiteColor]];
        
        self.presentedPresentationViewController = navCtrl;
        
        if (isFullscreen) {
            navCtrl.modalPresentationStyle = UIModalPresentationFullScreen;
        }
        [Purchasely showController:navCtrl type: PLYUIControllerTypeProductPage];
    }
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

- (void)silentRestoreAllProducts:(CDVInvokedUrlCommand*)command {
	[Purchasely silentRestoreAllProductsWithSuccess:^{
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

- (void)allProducts:(CDVInvokedUrlCommand*)command {
	[Purchasely allProductsWithSuccess:^(NSArray<PLYProduct *> * _Nonnull products) {
		NSMutableArray *productsArray = [NSMutableArray array];

		for (PLYProduct *product in products) {
			if (product != nil) {
				[productsArray addObject: product.asDictionary];
			}
		}

		[self successFor:command resultArray:productsArray];
	} failure:^(NSError * _Nullable error) {
		[self failureFor:command resultString:error.localizedDescription];
	}];
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

- (void)setLanguage:(CDVInvokedUrlCommand*)command {
	NSString *language = [command argumentAtIndex:0];
	NSLocale *locale = [NSLocale localeWithLocaleIdentifier:language];
	[Purchasely setLanguageFrom:locale];
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

- (NSDictionary<NSString *, NSObject *> *) resultDictionaryForActionInterceptor:(PLYPresentationAction) action
                                                                     parameters: (PLYPresentationActionParameters * _Nullable) params
                                                              presentationInfos: (PLYPresentationInfo * _Nullable) infos {
    NSMutableDictionary<NSString *, NSObject *> *actionInterceptorResult = [NSMutableDictionary new];

    NSString* actionString;

    switch (action) {
        case PLYPresentationActionLogin:
            actionString = @"login";
            break;
        case PLYPresentationActionPurchase:
            actionString = @"purchase";
            break;
        case PLYPresentationActionClose:
            actionString = @"close";
            break;
        case PLYPresentationActionRestore:
            actionString = @"restore";
            break;
        case PLYPresentationActionNavigate:
            actionString = @"navigate";
            break;
        case PLYPresentationActionPromoCode:
            actionString = @"promo_code";
            break;
        case PLYPresentationActionOpenPresentation:
            actionString = @"open_presentation";
            break;
    }

    [actionInterceptorResult setObject:actionString forKey:@"action"];

    if (infos != nil) {
        NSMutableDictionary<NSString *, NSObject *> *infosResult = [NSMutableDictionary new];
        if (infos.contentId != nil) {
            [infosResult setObject:infos.contentId forKey:@"contentId"];
        }
        if (infos.presentationId != nil) {
            [infosResult setObject:infos.presentationId forKey:@"presentationId"];
        }
        [actionInterceptorResult setObject:infosResult forKey:@"info"];
    }
    if (params != nil) {
        NSMutableDictionary<NSString *, NSObject *> *paramsResult = [NSMutableDictionary new];
        if (params.url != nil) {
            [paramsResult setObject:params.url.absoluteString forKey:@"url"];
        }
        if (params.plan != nil) {
            [paramsResult setObject:[params.plan asDictionary] forKey:@"plan"];
        }
        if (params.title != nil) {
            [paramsResult setObject:params.title forKey:@"title"];
        }
        if (params.presentation != nil) {
            [paramsResult setObject:params.presentation forKey:@"presentation"];
        }
        [actionInterceptorResult setObject:paramsResult forKey:@"parameters"];
    }
    
    return actionInterceptorResult;
}

- (void)setPaywallActionInterceptor:(CDVInvokedUrlCommand*)command {
    self.paywallActionInterceptorCommand = command;
    [Purchasely setPaywallActionsInterceptor:^(enum PLYPresentationAction action, PLYPresentationActionParameters * _Nullable parameters, PLYPresentationInfo * _Nullable infos, void (^ _Nonnull onProcessActionHandler)(BOOL)) {
        self.onProcessActionHandler = onProcessActionHandler;
        NSDictionary *resultDict = [self resultDictionaryForActionInterceptor:action parameters:parameters presentationInfos:infos];

        CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsDictionary:resultDict];
        [pluginResult setKeepCallbackAsBool:YES];
        [self.commandDelegate sendPluginResult:pluginResult callbackId:self.paywallActionInterceptorCommand.callbackId];

    }];
}

- (void)onProcessAction:(CDVInvokedUrlCommand*)command {
    BOOL processAction = [[command argumentAtIndex:0] boolValue];
    if (self.onProcessActionHandler != nil) {
        self.onProcessActionHandler(processAction);
    }
}

- (void)closePaywall:(CDVInvokedUrlCommand*)command {
    if (self.presentedPresentationViewController != nil) {
        dispatch_async(dispatch_get_main_queue(), ^{
            [self.presentedPresentationViewController dismissViewControllerAnimated:true completion:^{
                self.presentedPresentationViewController = nil;
            }];
        });
    }
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

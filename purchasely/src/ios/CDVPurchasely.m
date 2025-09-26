//
//  CDVPurchasely.m
//  Purchasely Cordova Plugin
//
//  Created by Jean-François GRANG on 15/07/2021.
//

#import "CDVPurchasely.h"
#import "Purchasely_Hybrid.h"
#import "CDVPurchasely+Events.h"
#import "UIColor+PLYHelper.h"

@implementation CDVPurchasely

- (instancetype)init {
    self = [super init];

    self.presentationsLoaded = [NSMutableArray new];
    self.shouldReopenPaywall = NO;

    return self;
}

- (void)start:(CDVInvokedUrlCommand*)command {
    NSString *apiKey = [command argumentAtIndex:0];
    BOOL storeKit1 = [[command argumentAtIndex:2] boolValue];
    NSString *userId = [command argumentAtIndex:3];
    NSInteger logLevel = [[command argumentAtIndex:4] intValue];
    NSInteger runningMode = [[command argumentAtIndex:5] intValue];
    NSString *purchaselySdkVersion = [command argumentAtIndex:6];

    [Purchasely setSdkBridgeVersion:purchaselySdkVersion];

    [Purchasely setAppTechnology:PLYAppTechnologyCordova];

    [Purchasely startWithAPIKey:apiKey
                      appUserId:userId
                    runningMode:runningMode
                    paywallActionsInterceptor:nil
               storekitSettings: storeKit1 ? [StorekitSettings storeKit1] : [StorekitSettings storeKit2]
                       logLevel:logLevel
                    initialized:^(BOOL initialized, NSError * _Nullable error) {

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
    [Purchasely userLogout:YES];
}

- (void)setThemeMode:(CDVInvokedUrlCommand *)command {
    NSInteger mode = [[command argumentAtIndex:0] intValue];

    [Purchasely setThemeMode:(enum PLYThemeMode) mode];
}

- (void)setAttribute:(CDVInvokedUrlCommand*)command {
    NSNumber *attributeNumber = [command argumentAtIndex:0];
    NSString *value = [command argumentAtIndex:1];

    if (attributeNumber == nil || value == nil) {
        return;
    }

    NSInteger rawAttribute = [attributeNumber integerValue];
    PLYAttribute *attribute = nil;

    switch (rawAttribute) {
        case CordovaPLYAttributeFirebaseAppInstanceId:
            attribute = PLYAttributeFirebaseAppInstanceId;
            break;
        case CordovaPLYAttributeAirshipChannelId:
            attribute = PLYAttributeAirshipChannelId;
            break;
        case CordovaPLYAttributeAirshipUserId:
            attribute = PLYAttributeAirshipUserId;
            break;
        case CordovaPLYAttributeBatchInstallationId:
            attribute = PLYAttributeBatchInstallationId;
            break;
        case CordovaPLYAttributeAdjustId:
            attribute = PLYAttributeAdjustId;
            break;
        case CordovaPLYAttributeAppsflyerId:
            attribute = PLYAttributeAppsflyerId;
            break;
        case CordovaPLYAttributeMixpanelDistinctId:
            attribute = PLYAttributeMixpanelDistinctId;
            break;
        case CordovaPLYAttributeCleverTapId:
            attribute = PLYAttributeClevertapId;
            break;
        case CordovaPLYAttributeSendinblueUserEmail:
            attribute = PLYAttributeSendinblueUserEmail;
            break;
        case CordovaPLYAttributeIterableUserEmail:
            attribute = PLYAttributeIterableUserEmail;
            break;
        case CordovaPLYAttributeIterableUserId:
            attribute = PLYAttributeIterableUserId;
            break;
        case CordovaPLYAttributeAtInternetIdClient:
            attribute = PLYAttributeAtInternetIdClient;
            break;
        case CordovaPLYAttributeMParticleUserId:
            attribute = PLYAttributeMParticleUserId;
            break;
        case CordovaPLYAttributeCustomerioUserId:
            attribute = PLYAttributeCustomerioUserId;
            break;
        case CordovaPLYAttributeCustomerioUserEmail:
            attribute = PLYAttributeCustomerioUserEmail;
            break;
        case CordovaPLYAttributeBranchUserDeveloperIdentity:
            attribute = PLYAttributeBranchUserDeveloperIdentity;
            break;
        case CordovaPLYAttributeAmplitudeUserId:
            attribute = PLYAttributeAmplitudeUserId;
            break;
        case CordovaPLYAttributeAmplitudeDeviceId:
            attribute = PLYAttributeAmplitudeDeviceId;
            break;
        case CordovaPLYAttributeMoengageUniqueId:
            attribute = PLYAttributeMoengageUniqueId;
            break;
        case CordovaPLYAttributeOneSignalExternalId:
            attribute = PLYAttributeOneSignalExternalId;
            break;
        case CordovaPLYAttributeBatchCustomUserId:
            attribute = PLYAttributeBatchCustomUserId;
            break;
    }


    if (attribute == nil) {
        return;
    }

    [Purchasely setAttribute:attribute value:value];
}

- (void)getAnonymousUserId:(CDVInvokedUrlCommand*)command {
    NSString *anonymousId = [Purchasely anonymousUserId];
    [self successFor:command resultString:anonymousId];
}

- (void)readyToOpenDeeplink:(CDVInvokedUrlCommand*)command {
    BOOL isReadyToPurchase = [[command argumentAtIndex:0] boolValue];
    [Purchasely readyToOpenDeeplink: isReadyToPurchase];
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
        [Purchasely showController:navCtrl type: PLYUIControllerTypeProductPage from:nil];
    }
}

- (void)presentPresentationForPlacement:(CDVInvokedUrlCommand*)command {
    NSString *placementVendorId = [command argumentAtIndex:0];
    NSString *contentId = [command argumentAtIndex:1];
    BOOL isFullscreen = [[command argumentAtIndex:2] boolValue];

    UIViewController *ctrl = [Purchasely presentationControllerFor:placementVendorId contentId:contentId loaded:nil completion:^(enum PLYProductViewControllerResult result, PLYPlan * _Nullable plan) {
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
        [Purchasely showController:navCtrl type: PLYUIControllerTypeProductPage from:nil];
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
        [Purchasely showController:navCtrl type: PLYUIControllerTypeProductPage from:nil];
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
        [Purchasely showController:navCtrl type: PLYUIControllerTypeProductPage from:nil];
    }
}

- (void)presentSubscriptions:(CDVInvokedUrlCommand*)command {
    UIViewController *ctrl = [Purchasely subscriptionsController];
    UINavigationController *navCtrl = [[UINavigationController alloc] initWithRootViewController:ctrl];
    ctrl.navigationItem.leftBarButtonItem = [[UIBarButtonItem alloc] initWithBarButtonSystemItem: UIBarButtonSystemItemDone target:navCtrl action:@selector(close)];

    [Purchasely showController:navCtrl type: PLYUIControllerTypeSubscriptionList from:nil];
}

- (void)purchaseWithPlanVendorId:(CDVInvokedUrlCommand*)command {
    NSString *planVendorId = [command argumentAtIndex:0];
    NSString *offerId = [command argumentAtIndex:1];
    NSString *contentId = [command argumentAtIndex:2];

    [Purchasely planWith:planVendorId
                 success:^(PLYPlan * _Nonnull plan) {

        if (@available(iOS 12.2, macOS 12.0, tvOS 15.0, watchOS 8.0, *)) {

            NSString *storeOfferId = nil;
            for (PLYPromoOffer *promoOffer in plan.promoOffers) {
                if ([promoOffer.vendorId isEqualToString:offerId]) {
                    storeOfferId = promoOffer.storeOfferId;
                    break;
                }
            }

            if (storeOfferId) {
                [Purchasely purchaseWithPromotionalOfferWithPlan:plan
                                                       contentId:contentId
                                                    storeOfferId:storeOfferId
                                                         success:^{
                    [self successFor:command resultDict: plan.asDictionary];
                } failure:^(NSError * _Nonnull error) {
                    [self failureFor:command resultString: error.localizedDescription];
                }];
            } else {
                [Purchasely purchaseWithPlan:plan
                                   contentId:contentId
                                     success:^{
                    [self successFor:command resultDict: plan.asDictionary];
                } failure:^(NSError * _Nonnull error) {
                    [self failureFor:command resultString: error.localizedDescription];
                }];
            }
        } else {
            [Purchasely purchaseWithPlan:plan
                               contentId:contentId
                                 success:^{
                [self successFor:command resultDict: plan.asDictionary];
            } failure:^(NSError * _Nonnull error) {
                [self failureFor:command resultString: error.localizedDescription];
            }];
        }
    } failure:^(NSError * _Nullable error) {
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
    [Purchasely synchronizeWithSuccess:^{
        [self successFor:command];
    } failure:^(NSError * _Nonnull error) {
        [self failureFor:command resultString:error.localizedDescription];
    }];
}

- (void)synchronize:(CDVInvokedUrlCommand*)command {
    [Purchasely synchronizeWithSuccess:^{
    } failure:^(NSError * _Nonnull error) {
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
    [Purchasely userSubscriptions:false
                          success:^(NSArray<PLYSubscription *> * _Nullable subscriptions) {
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

- (void)userSubscriptionsHistory:(CDVInvokedUrlCommand*)command {
    [Purchasely userSubscriptionsHistory:false
                          success:^(NSArray<PLYSubscription *> * _Nullable subscriptions) {
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

- (void)removeUserAttributeListener:(CDVInvokedUrlCommand*)command {
    [Purchasely setUserAttributeDelegate:nil];
    self.attributeCommand = nil;
}

- (void)addUserAttributeListener:(CDVInvokedUrlCommand*)command {
    [Purchasely setUserAttributeDelegate:self];
    self.attributeCommand = command;
}

- (void)isDeeplinkHandled:(CDVInvokedUrlCommand*)command {
    NSString *deeplinkString = [command argumentAtIndex:0];
    NSURL *deeplink = [NSURL URLWithString:deeplinkString];

    if (deeplink != nil) {
        BOOL result = [Purchasely isDeeplinkHandledWithDeeplink:deeplink];
        [self successFor:command resultBool:result];
    } else {
        [self successFor:command resultBool:NO];
    }
}

- (void)setLanguage:(CDVInvokedUrlCommand*)command {
    NSString *language = [command argumentAtIndex:0];
    NSLocale *locale = [NSLocale localeWithLocaleIdentifier:language];
    [Purchasely setLanguageFrom:locale];
}

- (void)signPromotionalOffer:(CDVInvokedUrlCommand*)command {
    NSString *storeProductId = [command argumentAtIndex:0];
    NSString *storeOfferId = [command argumentAtIndex:1];

    dispatch_async(dispatch_get_main_queue(), ^{
        if (@available(iOS 12.2, *)) {
            [Purchasely signPromotionalOfferWithStoreProductId:storeProductId storeOfferId:storeOfferId success:^(PLYOfferSignature * _Nonnull signature) {
                NSDictionary* result = [self resultSignatureForSignPromoOffer:signature];
                [self successFor:command resultBool:result];
            } failure:^(NSError * _Nullable error) {
                [self failureFor:command resultString:error.localizedDescription];
            }];
        } else {
            [self failureFor:command resultString:@"This fonctionality is unavailable before ios 12.2"];
        }
    });
}

- (void)isEligibleForIntroOffer:(CDVInvokedUrlCommand*)command {
    NSString *planVendorId = [command argumentAtIndex:0];

    [Purchasely planWith:planVendorId
                 success:^(PLYPlan * _Nonnull plan) {
        [plan isUserEligibleForIntroductoryOfferWithCompletion:^(BOOL isEligible) {
            [self successFor:command resultBool:isEligible];
        }];
    } failure:^(NSError * _Nullable error) {
        [self failureFor:command resultString:error.localizedDescription];
    }];
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
        case PLYPresentationActionCloseAll:
            actionString = @"close_all";
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
        case PLYPresentationActionOpenPlacement:
            actionString = @"open_placement";
            break;
        case PLYPresentationActionWebCheckout:
            actionString = @"web_checkout";
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
        if (infos.placementId != nil) {
            [infosResult setObject:infos.placementId forKey:@"placementId"];
        }
        if (infos.abTestId != nil) {
            [infosResult setObject:infos.abTestId forKey:@"abTestId"];
        }
        if (infos.abTestVariantId != nil) {
            [infosResult setObject:infos.abTestVariantId forKey:@"abTestVariantId"];
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
        if (params.promoOffer != nil) {
            NSMutableDictionary<NSString *, NSObject *> *promoOffer = [NSMutableDictionary new];
            [promoOffer setObject:params.promoOffer.vendorId forKey:@"vendorId"];
            [promoOffer setObject:params.promoOffer.storeOfferId forKey:@"storeOfferId"];
            [paramsResult setObject:promoOffer forKey:@"offer"];
        }
        NSString *webCheckoutProviderString = PLYWebCheckoutProviderToString(params.webCheckoutProvider);
        [paramsResult setObject:webCheckoutProviderString forKey:@"webCheckoutProvider"];
        if (params.queryParameterKey != nil) {
            [paramsResult setObject:params.queryParameterKey forKey:@"queryParameterKey"];
        }
        if (params.clientReferenceId != nil) {
            [paramsResult setObject:params.clientReferenceId forKey:@"clientReferenceId"];
        }
        [actionInterceptorResult setObject:paramsResult forKey:@"parameters"];
    }
    
    return actionInterceptorResult;
}

static NSString * PLYWebCheckoutProviderToString(PLYWebCheckoutProvider provider) {
    switch (provider) {
        case PLYWebCheckoutProviderStripe:
            return @"stripe";
        case PLYWebCheckoutProviderOther:
            return @"other";
        default:
            return @"unknown";
    }
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

- (void)closePresentation:(CDVInvokedUrlCommand*)command {
    if (self.presentedPresentationViewController != nil) {
        dispatch_async(dispatch_get_main_queue(), ^{
            [self.presentedPresentationViewController dismissViewControllerAnimated:true completion:^{
                self.presentedPresentationViewController = nil;
                self.shouldReopenPaywall = NO;
            }];
        });
    }
}

- (void)hidePresentation:(CDVInvokedUrlCommand*)command {
    if (self.presentedPresentationViewController != nil) {
        dispatch_async(dispatch_get_main_queue(), ^{
            [self.presentedPresentationViewController dismissViewControllerAnimated:true completion:^{ }];
            self.shouldReopenPaywall = YES;
        });
    }
}

- (void)showPresentation:(CDVInvokedUrlCommand*)command {
    dispatch_async(dispatch_get_main_queue(), ^{
        if (self.presentedPresentationViewController && self.shouldReopenPaywall) {
            dispatch_after(dispatch_time(DISPATCH_TIME_NOW, 0.5 * NSEC_PER_SEC), dispatch_get_main_queue(), ^{
                self.shouldReopenPaywall = NO;
                [Purchasely showController:self.presentedPresentationViewController type:PLYUIControllerTypeProductPage from:nil];
            });
        }
    });
}

- (void)userDidConsumeSubscriptionContent:(CDVInvokedUrlCommand*)command {
    [Purchasely userDidConsumeSubscriptionContent];
}

- (void)setUserAttributeWithStringArray:(CDVInvokedUrlCommand*)command {
    NSString *key = [command argumentAtIndex:0];
    NSArray<NSString *> *array = [command argumentAtIndex:1];
    NSString *processingLegalBasisBasisArg = [command argumentAtIndex:2];
    
    NSInteger processingLegalBasis = PLYDataProcessingLegalBasisOptional;
    
    if ([processingLegalBasisBasisArg isEqualToString:@"ESSENTIAL"]) {
        processingLegalBasis = PLYDataProcessingLegalBasisEssential;
    }

    [Purchasely setUserAttributeWithStringArray:array forKey:key processingLegalBasis:processingLegalBasis];
}

- (void)setUserAttributeWithBooleanArray:(CDVInvokedUrlCommand*)command {
    NSString *key = [command argumentAtIndex:0];
    NSArray *values = [command argumentAtIndex:1];
    NSString *processingLegalBasisBasisArg = [command argumentAtIndex:2];

    NSMutableArray<NSNumber *> *boolArray = [NSMutableArray array];
    for (id value in values) {
        [boolArray addObject:@([value boolValue])];
    }
    
    NSInteger processingLegalBasis = PLYDataProcessingLegalBasisOptional;
    
    if ([processingLegalBasisBasisArg isEqualToString:@"ESSENTIAL"]) {
        processingLegalBasis = PLYDataProcessingLegalBasisEssential;
    }

    [Purchasely setUserAttributeWithBoolArray:boolArray forKey:key processingLegalBasis:processingLegalBasis];
}

- (void)setUserAttributeWithIntArray:(CDVInvokedUrlCommand*)command {
    NSString *key = [command argumentAtIndex:0];
    NSArray *values = [command argumentAtIndex:1];
    NSString *processingLegalBasisBasisArg = [command argumentAtIndex:2];

    NSMutableArray<NSNumber *> *intArray = [NSMutableArray array];
    for (id val in values) {
        [intArray addObject:@([val intValue])];
    }
    
    NSInteger processingLegalBasis = PLYDataProcessingLegalBasisOptional;
    
    if ([processingLegalBasisBasisArg isEqualToString:@"ESSENTIAL"]) {
        processingLegalBasis = PLYDataProcessingLegalBasisEssential;
    }

    [Purchasely setUserAttributeWithIntArray:intArray forKey:key processingLegalBasis:processingLegalBasis];
}

- (void)setUserAttributeWithDoubleArray:(CDVInvokedUrlCommand*)command {
    NSString *key = [command argumentAtIndex:0];
    NSArray *values = [command argumentAtIndex:1];
    NSString *processingLegalBasisBasisArg = [command argumentAtIndex:2];

    NSMutableArray<NSNumber *> *doubleArray = [NSMutableArray array];
    for (id val in values) {
        [doubleArray addObject:@([val doubleValue])];
    }
    
    NSInteger processingLegalBasis = PLYDataProcessingLegalBasisOptional;
    
    if ([processingLegalBasisBasisArg isEqualToString:@"ESSENTIAL"]) {
        processingLegalBasis = PLYDataProcessingLegalBasisEssential;
    }

    [Purchasely setUserAttributeWithDoubleArray:doubleArray forKey:key processingLegalBasis:processingLegalBasis];
}

- (void)setUserAttributeWithString:(CDVInvokedUrlCommand*)command {
    NSString *key = [command argumentAtIndex:0];
    NSString *value = [command argumentAtIndex:1];
    NSString *processingLegalBasisBasisArg = [command argumentAtIndex:2];
    
    NSInteger processingLegalBasis = PLYDataProcessingLegalBasisOptional;
    
    if ([processingLegalBasisBasisArg isEqualToString:@"ESSENTIAL"]) {
        processingLegalBasis = PLYDataProcessingLegalBasisEssential;
    }

    [Purchasely setUserAttributeWithStringValue:value forKey:key processingLegalBasis:processingLegalBasis];
}

- (void)setUserAttributeWithBoolean:(CDVInvokedUrlCommand*)command {
    NSString *key = [command argumentAtIndex:0];
    BOOL value = [[command argumentAtIndex:1] boolValue];
    NSString *processingLegalBasisBasisArg = [command argumentAtIndex:2];
    
    NSInteger processingLegalBasis = PLYDataProcessingLegalBasisOptional;
    
    if ([processingLegalBasisBasisArg isEqualToString:@"ESSENTIAL"]) {
        processingLegalBasis = PLYDataProcessingLegalBasisEssential;
    }

    [Purchasely setUserAttributeWithBoolValue:value forKey:key processingLegalBasis:processingLegalBasis];
}

- (void)setUserAttributeWithInt:(CDVInvokedUrlCommand*)command {
    NSString *key = [command argumentAtIndex:0];
    NSInteger value = [[command argumentAtIndex:1] intValue];
    NSString *processingLegalBasisBasisArg = [command argumentAtIndex:2];
    
    NSInteger processingLegalBasis = PLYDataProcessingLegalBasisOptional;
    
    if ([processingLegalBasisBasisArg isEqualToString:@"ESSENTIAL"]) {
        processingLegalBasis = PLYDataProcessingLegalBasisEssential;
    }

    [Purchasely setUserAttributeWithIntValue:value forKey:key processingLegalBasis:processingLegalBasis];
}

- (void)setUserAttributeWithDouble:(CDVInvokedUrlCommand*)command {
    NSString *key = [command argumentAtIndex:0];
    double value = [[command argumentAtIndex:1] doubleValue];
    NSString *processingLegalBasisBasisArg = [command argumentAtIndex:2];
    
    NSInteger processingLegalBasis = PLYDataProcessingLegalBasisOptional;
    
    if ([processingLegalBasisBasisArg isEqualToString:@"ESSENTIAL"]) {
        processingLegalBasis = PLYDataProcessingLegalBasisEssential;
    }

    [Purchasely setUserAttributeWithDoubleValue:value forKey:key processingLegalBasis:processingLegalBasis];
}

- (void)setUserAttributeWithDate:(CDVInvokedUrlCommand*)command {
    NSString *key = [command argumentAtIndex:0];
    NSString *value = [command argumentAtIndex:1];
    NSString *processingLegalBasisBasisArg = [command argumentAtIndex:2];

    NSDateFormatter * dateFormatter = [NSDateFormatter new];
    dateFormatter.timeZone = [NSTimeZone timeZoneWithName:@"GMT"];
    [dateFormatter setDateFormat:@"yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"];
    NSDate *date = [dateFormatter dateFromString:value];
    
    NSInteger processingLegalBasis = PLYDataProcessingLegalBasisOptional;
    
    if ([processingLegalBasisBasisArg isEqualToString:@"ESSENTIAL"]) {
        processingLegalBasis = PLYDataProcessingLegalBasisEssential;
    }

    if (date != nil) {
        [Purchasely setUserAttributeWithDateValue:date forKey:key processingLegalBasis:processingLegalBasis];
    } else {
        NSLog(@"[Purchasely] Cannot save date attribute %@", key);
    }
}

- (void)userAttribute:(CDVInvokedUrlCommand*)command {
    NSString *key = [command argumentAtIndex:0];

    id _Nullable result = [self getUserAttributeValueForCordova:[Purchasely getUserAttributeFor:key]];
    if (result != nil) {
        [self successFor:command resultDict:result];
    } else {
        [self failureFor:command resultString:@"Cannot get user attribute"];
    }
}

- (id _Nullable) getUserAttributeValueForCordova:(id _Nullable) value {
    if ([value isKindOfClass:[NSDate class]]) {
        NSDateFormatter * dateFormatter = [NSDateFormatter new];
        dateFormatter.timeZone = [NSTimeZone timeZoneWithName:@"GMT"];
        [dateFormatter setDateFormat:@"yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"];
        NSString *dateStr = [dateFormatter stringFromDate:value];
        return dateStr;
    }

    return value;
}

- (void)clearUserAttribute:(CDVInvokedUrlCommand*)command {
    NSString *key = [command argumentAtIndex:0];
    [Purchasely clearUserAttributeForKey:key];
}

- (void)clearUserAttributes:(CDVInvokedUrlCommand*)command {
    [Purchasely clearUserAttributes];
}

- (void)clearBuiltInAttributes:(CDVInvokedUrlCommand*)command {
    [Purchasely clearBuiltInAttributes];
}

- (void)fetchPresentation:(CDVInvokedUrlCommand*)command {
    NSString *placementId = [command argumentAtIndex:0];
    NSString *presentationId = [command argumentAtIndex:1];
    NSString *contentId = [command argumentAtIndex:2];

    dispatch_async(dispatch_get_main_queue(), ^{
           if (placementId != nil) {
               [Purchasely fetchPresentationFor:placementId contentId: contentId fetchCompletion:^(PLYPresentation * _Nullable presentation, NSError * _Nullable error) {
                   if (error != nil) {
                       [self failureFor:command resultString: error.localizedDescription];
                   } else if (presentation != nil) {
                       [self.presentationsLoaded addObject:presentation];
                       [self successFor:command resultDict:[self resultDictionaryForFetchPresentation:presentation]];
                   }
               } completion:^(enum PLYProductViewControllerResult result, PLYPlan * _Nullable plan) {
                   if (self.purchaseResolve != nil){
                       [self successFor:self.purchaseResolve resultDict:[self resultDictionaryForPresentationController:result plan:plan]];
                   }
               } loadedCompletion:nil];
           } else {
               [Purchasely fetchPresentationWith:presentationId contentId: contentId fetchCompletion:^(PLYPresentation * _Nullable presentation, NSError * _Nullable error) {
                   if (error != nil) {
                       [self failureFor:command resultString: error.localizedDescription];
                   } else if (presentation != nil) {
                       [self.presentationsLoaded addObject:presentation];
                       [self successFor:command resultDict:[self resultDictionaryForFetchPresentation:presentation]];
                   }
               } completion:^(enum PLYProductViewControllerResult result, PLYPlan * _Nullable plan) {
                   if (self.purchaseResolve != nil) {
                       [self successFor:self.purchaseResolve resultDict:[self resultDictionaryForPresentationController:result plan:plan]];
                   }
               } loadedCompletion:nil];
           }
       });
}

- (void)presentPresentation:(CDVInvokedUrlCommand *)command {
    NSDictionary<NSString *, id> *presentationDictionary = [command argumentAtIndex:0];
    BOOL isFullscreen = [[command argumentAtIndex:1] boolValue];
    NSString *loadingBackgroundColor = [command argumentAtIndex:2];

    if (presentationDictionary == nil) {
            [self failureFor:command resultString: @"Presentation cannot be null"];
            return;
        }

        self.purchaseResolve = command;

        dispatch_async(dispatch_get_main_queue(), ^{

            PLYPresentation *presentationLoaded = [self findPresentationLoadedFor:(NSString *)[presentationDictionary objectForKey:@"id"]];

            if (presentationLoaded == nil || presentationLoaded.controller == nil) {
                [self failureFor:command resultString: @"Presentation not loaded"];
                return;
            }

            [self.presentationsLoaded removeObjectAtIndex:[self findIndexPresentationLoadedFor:(NSString *)[presentationDictionary objectForKey:@"id"]]];

            if (presentationLoaded.controller != nil) {
                if (loadingBackgroundColor != nil) {
                    UIColor *backColor = [UIColor ply_fromHex:loadingBackgroundColor];
                    if (backColor != nil) {
                        [presentationLoaded.controller.view setBackgroundColor:backColor];
                    }
                }

                if (isFullscreen) {
                    presentationLoaded.controller.modalPresentationStyle = UIModalPresentationFullScreen;
                }

                self.shouldReopenPaywall = NO;

                [Purchasely closeDisplayedPresentation];
                self.presentedPresentationViewController = presentationLoaded.controller;
                dispatch_after(dispatch_time(DISPATCH_TIME_NOW, 0.5 * NSEC_PER_SEC), dispatch_get_main_queue(), ^{
                    if (presentationLoaded.isFlow) {
                        [presentationLoaded displayFrom:nil];
                    } else {
                        [Purchasely showController:presentationLoaded.controller type: PLYUIControllerTypeProductPage from:nil];
                    }
                });
            }
        });
}

- (void) revokeDataProcessingConsent:(CDVInvokedUrlCommand *)command {
    NSArray *values = [command argumentAtIndex:0];
    NSMutableSet<PLYDataProcessingPurpose *> *purposesSet = [NSMutableSet set];

    for (id val in values) {
        NSString *string = val;
        if ([string isEqualToString:@"ALL_NON_ESSENTIALS"]) {
            purposesSet = [NSMutableSet setWithObject:[PLYDataProcessingPurpose allNonEssentials]];
            break;
        } else if ([string isEqualToString:@"ANALYTICS"]) {
            [purposesSet addObject:[PLYDataProcessingPurpose analytics]];
        } else if ([string isEqualToString:@"IDENTIFIED_ANALYTICS"]) {
            [purposesSet addObject:[PLYDataProcessingPurpose identifiedAnalytics]];
        } else if ([string isEqualToString:@"CAMPAIGNS"]) {
            [purposesSet addObject:[PLYDataProcessingPurpose campaigns]];
        } else if ([string isEqualToString:@"PERSONALIZATION"]) {
            [purposesSet addObject:[PLYDataProcessingPurpose personalization]];
        } else if ([string isEqualToString:@"THIRD_PARTY_INTEGRATIONS"]) {
            [purposesSet addObject:[PLYDataProcessingPurpose thirdPartyIntegrations]];
        }
    }
    [Purchasely revokeDataProcessingConsentFor: purposesSet];
}

- (PLYPresentation *) findPresentationLoadedFor:(NSString * _Nullable) presentationId {
    for (PLYPresentation *presentationLoaded in self.presentationsLoaded) {
        if ([presentationLoaded.id isEqualToString: presentationId]) {
            return presentationLoaded;
        }
    }
    return nil;
}

- (NSInteger) findIndexPresentationLoadedFor:(NSString * _Nullable) presentationId {
    NSInteger index = 0;
    for (PLYPresentation *presentationLoaded in self.presentationsLoaded) {
        if ([presentationLoaded.id isEqualToString: presentationId]) {
            return index;
        }
        index++;
    }
    return -1;
}

- (NSDictionary *)resultSignatureForSignPromoOffer:(PLYOfferSignature * _Nullable) signature  {
    NSMutableDictionary<NSString *, NSObject *> *dict = [NSMutableDictionary new];

    [dict setObject:signature.planVendorId forKey:@"planVendorId"];
    [dict setObject:signature.identifier forKey:@"identifier"];
    [dict setObject:signature.signature forKey:@"signature"];
    [dict setObject:signature.keyIdentifier forKey:@"keyIdentifier"];

    NSString *nonceString = [signature.nonce UUIDString];
    NSObject *nonce = (NSObject *)nonceString;
    if (nonce != nil) {
        [dict setObject:nonce forKey:@"nonce"];
    }

    NSNumber *timestamp = [NSNumber numberWithDouble:signature.timestamp];
    if (timestamp != nil) {
        [dict setObject:timestamp forKey:@"timestamp"];
    }

    return dict;
}

- (NSDictionary<NSString *, NSObject *> *) resultDictionaryForFetchPresentation:(PLYPresentation * _Nullable) presentation {
    NSMutableDictionary<NSString *, NSObject *> *presentationResult = [NSMutableDictionary new];

    // TODO: fill all parameters.
    if (presentation != nil) {

        if (presentation.id != nil) {
            [presentationResult setObject:presentation.id forKey:@"id"];
        }

        if (presentation.placementId != nil) {
            [presentationResult setObject:presentation.placementId forKey:@"placementId"];
        }

        if (presentation.audienceId != nil) {
            [presentationResult setObject:presentation.audienceId forKey:@"audienceId"];
        }

        if (presentation.abTestId != nil) {
            [presentationResult setObject:presentation.abTestId forKey:@"abTestId"];
        }

        if (presentation.abTestVariantId != nil) {
            [presentationResult setObject:presentation.abTestVariantId forKey:@"abTestVariantId"];
        }

        if (presentation.language != nil) {
            [presentationResult setObject:presentation.language forKey:@"language"];
        }

        if (presentation.plans != nil) {
            NSMutableArray *plans = [NSMutableArray new];

            for (PLYPresentationPlan *plan in presentation.plans) {
                [plans addObject:plan.asDictionary];
            }
            [presentationResult setObject:plans forKey:@"plans"];
        }

        /*if (presentation.metadata != nil) {

            NSDictionary<NSString *,id> *rawMetadata = [presentation.metadata getRawMetadata];
            NSMutableDictionary<NSString *,id> *resultDict = [NSMutableDictionary dictionary];

            dispatch_group_t group = dispatch_group_create();
            dispatch_queue_t queue = dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0);
            dispatch_semaphore_t semaphore = dispatch_semaphore_create(0);

            for (NSString *key in rawMetadata)  {
                id value = rawMetadata[key];

                if ([value isKindOfClass: [NSString class]]) {
                    dispatch_group_enter(group); // Enter the dispatch group before making the async call
                    [presentation.metadata getStringWith:key completion:^(NSString * _Nullable result) {
                        [resultDict setObject:result forKey:key];
                        dispatch_group_leave(group); // Leave the dispatch group after the async call is completed
                    }];
                } else {
                    [resultDict setObject:value forKey:key];
                }
            }

            dispatch_group_notify(group, queue, ^{
                // Code to execute after all async calls are completed
                [presentationResult setObject:resultDict forKey:@"metadata"];
                dispatch_semaphore_signal(semaphore);
            });

            // Wait until all async calls are completed
            dispatch_semaphore_wait(semaphore, DISPATCH_TIME_FOREVER);
        }*/

        int resultString;

        switch (presentation.type) {
            case PLYPresentationTypeNormal:
                resultString = PLYPresentationTypeNormal;
                break;
            case PLYPresentationTypeClient:
                resultString = PLYPresentationTypeClient;
                break;
            case PLYPresentationTypeFallback:
                resultString = PLYPresentationTypeFallback;
                break;
            case PLYPresentationTypeDeactivated:
                resultString = PLYPresentationTypeDeactivated;
                break;
        }

        [presentationResult setObject:[NSNumber numberWithInt:resultString] forKey:@"type"];

    }

    return presentationResult;
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


// WARNING: This enum must be strictly identical to the one in the JS side (Purchasely.js).
typedef NS_ENUM(NSInteger, CordovaPLYAttribute) {
    CordovaPLYAttributeFirebaseAppInstanceId,
    CordovaPLYAttributeAirshipChannelId,
    CordovaPLYAttributeAirshipUserId,
    CordovaPLYAttributeBatchInstallationId,
    CordovaPLYAttributeAdjustId,
    CordovaPLYAttributeAppsflyerId,
    CordovaPLYAttributeMixpanelDistinctId,
    CordovaPLYAttributeCleverTapId,
    CordovaPLYAttributeSendinblueUserEmail,
    CordovaPLYAttributeIterableUserEmail,
    CordovaPLYAttributeIterableUserId,
    CordovaPLYAttributeAtInternetIdClient,
    CordovaPLYAttributeMParticleUserId,
    CordovaPLYAttributeCustomerioUserId,
    CordovaPLYAttributeCustomerioUserEmail,
    CordovaPLYAttributeBranchUserDeveloperIdentity,
    CordovaPLYAttributeAmplitudeUserId,
    CordovaPLYAttributeAmplitudeDeviceId,
    CordovaPLYAttributeMoengageUniqueId,
    CordovaPLYAttributeOneSignalExternalId,
    CordovaPLYAttributeBatchCustomUserId
};

@end

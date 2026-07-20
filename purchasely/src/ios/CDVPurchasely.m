//
//  CDVPurchasely.m
//  Purchasely Cordova Plugin
//
//  Created by Jean-François GRANG on 15/07/2021.
//

#import "CDVPurchasely.h"
#import "Purchasely_Hybrid.h"
#import "CDVPurchasely+Events.h"
#import "CDVPurchasely+UserAttributes.h"
#import "UIColor+PLYHelper.h"

@implementation CDVPurchasely

- (instancetype)init {
    self = [super init];

    self.presentationsLoaded = [NSMutableArray new];
    self.actionInterceptorCallbackIds = [NSMutableDictionary new];
    self.pendingInterceptCompletions = [NSMutableDictionary new];

    return self;
}

- (void)start:(CDVInvokedUrlCommand*)command {
    // v6: a single options dictionary (see the JS↔native contract), no longer positional args.
    NSDictionary *opts = [command argumentAtIndex:0];
    if (![opts isKindOfClass:[NSDictionary class]]) {
        [self failureFor:command resultString:@"start requires an options object"];
        return;
    }

    NSString *apiKey = opts[@"apiKey"];
    if (![apiKey isKindOfClass:[NSString class]] || apiKey.length == 0) {
        [self failureFor:command resultString:@"apiKey is required"];
        return;
    }

    PurchaselyBuilder *builder = [Purchasely apiKey:apiKey];
    builder = [builder appTechnology:PLYAppTechnologyCordova];

    NSString *sdkVersion = opts[@"sdkVersion"];
    if ([sdkVersion isKindOfClass:[NSString class]]) {
        builder = [builder sdkBridgeVersion:sdkVersion];
    }

    NSString *appUserId = opts[@"appUserId"];
    if ([appUserId isKindOfClass:[NSString class]] && appUserId.length > 0) {
        builder = [builder appUserId:appUserId];
    }

    // runningMode is a string ("observer"/"full"), mapped by NAME (iOS enum: observer=2, full=3).
    NSString *runningMode = opts[@"runningMode"];
    enum PLYRunningMode mode = PLYRunningModeObserver;
    if ([runningMode isKindOfClass:[NSString class]] && [runningMode.lowercaseString isEqualToString:@"full"]) {
        mode = PLYRunningModeFull;
    }
    builder = [builder runningMode:mode];

    NSNumber *logLevel = opts[@"logLevel"];
    if ([logLevel isKindOfClass:[NSNumber class]]) {
        builder = [builder logLevel:(enum PLYLogLevel)logLevel.integerValue];
    }

    // StoreKit selection (iOS): storeKit1 bool OR storekitVersion == "storeKit1" forces StoreKit 1.
    BOOL storeKit1 = NO;
    NSNumber *storeKit1Num = opts[@"storeKit1"];
    if ([storeKit1Num isKindOfClass:[NSNumber class]]) {
        storeKit1 = storeKit1Num.boolValue;
    }
    NSString *storekitVersion = opts[@"storekitVersion"];
    if ([storekitVersion isKindOfClass:[NSString class]] && [storekitVersion isEqualToString:@"storeKit1"]) {
        storeKit1 = YES;
    }
    builder = [builder storekitSettings: storeKit1 ? [StorekitSettings storeKit1] : [StorekitSettings storeKit2]];

    NSNumber *allowDeeplink = opts[@"allowDeeplink"];
    if ([allowDeeplink isKindOfClass:[NSNumber class]]) {
        builder = [builder allowDeeplink:allowDeeplink.boolValue];
    }

    NSNumber *allowCampaigns = opts[@"allowCampaigns"];
    if ([allowCampaigns isKindOfClass:[NSNumber class]]) {
        builder = [builder allowCampaigns:allowCampaigns.boolValue];
    }

    // Cold-start deeplink URL captured at launch (handled automatically once start completes).
    NSString *deeplink = opts[@"deeplink"];
    if ([deeplink isKindOfClass:[NSString class]] && deeplink.length > 0) {
        NSURL *url = [NSURL URLWithString:deeplink];
        if (url != nil) {
            builder = [builder handleDeeplink:url];
        }
    }

    [builder startWithInitialized:^(NSError * _Nullable error) {
        if (error != nil) {
            [self failureFor:command resultString: error.localizedDescription];
        } else {
            [self successFor:command resultBool:YES];
        }
    }];
}

- (void)setLogLevel:(CDVInvokedUrlCommand*)command {
    NSInteger logLevel = [[command argumentAtIndex:0] intValue];
    [Purchasely setLogLevel:logLevel];
}

- (void)userLogin:(CDVInvokedUrlCommand*)command {
    NSString *userId = [command argumentAtIndex:0];
    // CDV-W-08: userLoginWith:appUserId: is _Nonnull; align with Android's guard instead of
    // forwarding nil into the native call.
    if (![userId isKindOfClass:[NSString class]]) {
        [self successFor:command resultBool:NO];
        return;
    }
    [Purchasely userLoginWith:userId shouldRefresh:^(BOOL refresh) {
        [self successFor:command resultBool:refresh];
    }];
}

- (void)userLogout:(CDVInvokedUrlCommand*)command {
    // PAR-30: clearUserAttributes defaults to true (matches the JS-side default).
    NSNumber *clearUserAttributes = [command argumentAtIndex:0];
    BOOL clear = [clearUserAttributes isKindOfClass:[NSNumber class]] ? clearUserAttributes.boolValue : YES;
    [Purchasely userLogout:clear];
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
    PLYAttribute attribute = PLYAttributeFirebaseAppInstanceId;
    BOOL attributeFound = YES;

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
        case CordovaPLYAttributeOneSignalUserId:
            attribute = PLYAttributeOneSignalUserId;
            break;
        default:
            attributeFound = NO;
            break;
    }


    if (!attributeFound) {
        return;
    }

    [Purchasely setAttribute:attribute value:value];
}

- (void)getAnonymousUserId:(CDVInvokedUrlCommand*)command {
    NSString *anonymousId = [Purchasely anonymousUserId];
    [self successFor:command resultString:anonymousId];
}

// REC-12 / PAR-04
- (void)isAnonymous:(CDVInvokedUrlCommand*)command {
    [self successFor:command resultBool:[Purchasely isAnonymous]];
}

- (void)allowDeeplink:(CDVInvokedUrlCommand*)command {
    BOOL allow = [[command argumentAtIndex:0] boolValue];
    [Purchasely allowDeeplink: allow];
}

- (void)allowCampaigns:(CDVInvokedUrlCommand*)command {
    BOOL allow = [[command argumentAtIndex:0] boolValue];
    [Purchasely allowCampaigns: allow];
}

- (void)setDefaultPresentationDismissHandler:(CDVInvokedUrlCommand*)command {
    [Purchasely setDefaultPresentationDismissHandler:^(PLYPresentationOutcome * _Nonnull outcome) {
        NSDictionary *resultDict = [self resultDictionaryForOutcome:outcome];

        CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsDictionary:resultDict];
        [pluginResult setKeepCallbackAsBool:YES];
        [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
    }];
}

// v6: stop receiving default (campaign/deeplink) presentation dismiss outcomes.
- (void)removeDefaultPresentationDismissHandler:(CDVInvokedUrlCommand*)command {
    [Purchasely setDefaultPresentationDismissHandler:nil];
}

// v6: wire a builder's presentation lifecycle onto a single Cordova callback.
// onPresented / onCloseRequested stream keep-alive envelopes ({ event: ... });
// onDismissed delivers the final outcome (no `event` key) and ends the callback.
// Must run on the main queue (UIKit). `transition` is the JS transition object.
- (void)displayWithBuilder:(PLYPresentationBuilder *)builder
                 contentId:(NSString *)contentId
                transition:(id)transition
                   command:(CDVInvokedUrlCommand *)command {
    if ([contentId isKindOfClass:[NSString class]]) {
        builder = [builder contentId:contentId];
    }
    if ([transition isKindOfClass:[NSDictionary class]]) {
        NSString *bgHex = ((NSDictionary *)transition)[@"backgroundColor"];
        if ([bgHex isKindOfClass:[NSString class]]) {
            UIColor *bg = [UIColor ply_fromHex:bgHex];
            if (bg != nil) { builder = [builder backgroundColor:bg]; }
        }
    }

    __weak CDVPurchasely *weakSelf = self;
    NSString *callbackId = command.callbackId;
    builder = [builder onPresented:^(id<PLYPresentation> _Nullable presentation, NSError * _Nullable error) {
        CDVPurchasely *strongSelf = weakSelf; if (strongSelf == nil) return;
        strongSelf.currentPresentation = presentation;
        NSMutableDictionary *env = [NSMutableDictionary new];
        env[@"event"] = @"presented";
        if (presentation != nil) { env[@"presentation"] = [strongSelf resultDictionaryForFetchPresentation:presentation]; }
        if (error != nil) { env[@"error"] = error.localizedDescription; }
        CDVPluginResult *r = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsDictionary:env];
        [r setKeepCallbackAsBool:YES];
        [strongSelf.commandDelegate sendPluginResult:r callbackId:callbackId];
    }];
    builder = [builder onCloseRequested:^{
        CDVPurchasely *strongSelf = weakSelf; if (strongSelf == nil) return;
        CDVPluginResult *r = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsDictionary:@{@"event": @"closeRequested"}];
        [r setKeepCallbackAsBool:YES];
        [strongSelf.commandDelegate sendPluginResult:r callbackId:callbackId];
    }];
    builder = [builder onDismissed:^(PLYPresentationOutcome * _Nonnull outcome) {
        CDVPurchasely *strongSelf = weakSelf; if (strongSelf == nil) return;
        strongSelf.currentPresentation = nil;
        [strongSelf successFor:command resultDict:[strongSelf resultDictionaryForOutcome:outcome]];
    }];

    id<PLYPresentationRequest> request = [builder build];
    [request displayWithTransition:[self displayModeFromTransition:transition] completion:nil];
}

- (void)presentPresentationWithIdentifier:(CDVInvokedUrlCommand*)command {
    NSString *presentationVendorId = [command argumentAtIndex:0];
    NSString *contentId = [command argumentAtIndex:1];
    id transition = [command argumentAtIndex:2];

    if (![presentationVendorId isKindOfClass:[NSString class]]) {
        [self failureFor:command resultString:@"presentationId is required"];
        return;
    }

    dispatch_async(dispatch_get_main_queue(), ^{
        [self displayWithBuilder:[PLYPresentationBuilder forScreenId:presentationVendorId] contentId:contentId transition:transition command:command];
    });
}

- (void)presentPresentationForPlacement:(CDVInvokedUrlCommand*)command {
    NSString *placementVendorId = [command argumentAtIndex:0];
    NSString *contentId = [command argumentAtIndex:1];
    id transition = [command argumentAtIndex:2];

    if (![placementVendorId isKindOfClass:[NSString class]]) {
        [self failureFor:command resultString:@"placementId is required"];
        return;
    }

    dispatch_async(dispatch_get_main_queue(), ^{
        [self displayWithBuilder:[PLYPresentationBuilder forPlacementId:placementVendorId] contentId:contentId transition:transition command:command];
    });
}

// v6: present the default (audience-targeted) presentation — no placement/screen id.
- (void)presentPresentationForDefault:(CDVInvokedUrlCommand*)command {
    NSString *contentId = [command argumentAtIndex:0];
    id transition = [command argumentAtIndex:1];

    dispatch_async(dispatch_get_main_queue(), ^{
        [self displayWithBuilder:[[PLYPresentationBuilder alloc] init] contentId:contentId transition:transition command:command];
    });
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
        [self successFor:command resultBool:YES];
    } failure:^(NSError * _Nonnull error) {
        [self failureFor:command resultString:error.localizedDescription];
    }];
}

- (void)purchasedSubscription:(CDVInvokedUrlCommand*)command {
    self.purchasedCommand = command;
    // CDV-W-14: a repeat JS call (re-subscribe/hot reload) must not stack observers, or a
    // single purchase/restoration fires reloadContent: once per accumulated registration.
    [[NSNotificationCenter defaultCenter] removeObserver:self
                                                     name: @"ply_purchasedSubscription"
                                                   object:nil];
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
    // PAR-29: invalidateCache defaults to false.
    NSNumber *invalidateCache = [command argumentAtIndex:0];
    BOOL invalidate = [invalidateCache isKindOfClass:[NSNumber class]] ? invalidateCache.boolValue : NO;
    [Purchasely userSubscriptions:invalidate
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
    // PAR-29: invalidateCache defaults to false.
    NSNumber *invalidateCache = [command argumentAtIndex:0];
    BOOL invalidate = [invalidateCache isKindOfClass:[NSNumber class]] ? invalidateCache.boolValue : NO;
    [Purchasely userSubscriptionsHistory:invalidate
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
    // v6 `setEventDelegate:` is _Nonnull (no native unregister). The delegate stays
    // registered; clearing eventCommand makes `eventTriggered:` a no-op.
    self.eventCommand = nil;
}

- (void)removeUserAttributeListener:(CDVInvokedUrlCommand*)command {
    // v6 `setUserAttributeDelegate:` is _Nonnull (no native unregister). Clearing
    // attributeCommand makes the user-attribute callbacks a no-op.
    self.attributeCommand = nil;
}

- (void)addUserAttributeListener:(CDVInvokedUrlCommand*)command {
    [Purchasely setUserAttributeDelegate:self];
    self.attributeCommand = command;
}

- (void)handleDeeplink:(CDVInvokedUrlCommand*)command {
    NSString *deeplinkString = [command argumentAtIndex:0];
    NSURL *deeplink = [NSURL URLWithString:deeplinkString];

    if (deeplink != nil) {
        BOOL result = [Purchasely handleDeeplink:deeplink];
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
                // CDV-W-02: was resultBool: (an NSDictionary implicitly truncated to a bare
                // BOOL), discarding the whole signature payload. resultDict: is the matching
                // overload (declared below) for this NSDictionary result.
                [self successFor:command resultDict:result];
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

// PAR-05: Dynamic Offerings. Payload keys (reference/planVendorId/offerVendorId) match the
// Cordova JS↔native contract (not the native SDK's own planId/offerId property names).
- (void)setDynamicOffering:(CDVInvokedUrlCommand*)command {
    NSString *reference = [command argumentAtIndex:0];
    NSString *planVendorId = [command argumentAtIndex:1];
    NSString *offerVendorId = [command argumentAtIndex:2];
    if (![offerVendorId isKindOfClass:[NSString class]]) {
        offerVendorId = nil;
    }
    // iOS 26.4+ Apple commitment billing plan type (0 unspecified / 1 upFront / 2 monthly);
    // JS defaults it to unspecified when omitted (see Purchasely.BillingPlanType).
    PLYBillingPlanType billingPlanType = [[command argumentAtIndex:3 withDefault:@(PLYBillingPlanTypeUnspecified)] integerValue];

    [Purchasely setDynamicOfferingWithReference:reference
                                    planVendorId:planVendorId
                                   offerVendorId:offerVendorId
                                 billingPlanType:billingPlanType
                                      completion:^(BOOL success) {
        [self successFor:command resultBool:success];
    }];
}

- (void)getDynamicOfferings:(CDVInvokedUrlCommand*)command {
    [Purchasely getDynamicOfferingsWithCompletion:^(NSArray<PLYOffering *> * _Nonnull offerings) {
        NSMutableArray *result = [NSMutableArray new];
        for (PLYOffering *offering in offerings) {
            NSMutableDictionary<NSString *, id> *dict = [NSMutableDictionary new];
            dict[@"reference"] = offering.reference;
            dict[@"planVendorId"] = offering.planId;
            dict[@"offerVendorId"] = offering.offerId ?: [NSNull null];
            [result addObject:dict];
        }
        [self successFor:command resultArray:result];
    }];
}

- (void)removeDynamicOffering:(CDVInvokedUrlCommand*)command {
    NSString *reference = [command argumentAtIndex:0];
    if ([reference isKindOfClass:[NSString class]]) {
        [Purchasely removeDynamicOfferingWithReference:reference];
    }
}

- (void)clearDynamicOfferings:(CDVInvokedUrlCommand*)command {
    [Purchasely clearDynamicOfferings];
}

// Helpers

// v6: builds a PLYTransition from the JS transition object (see normalizeTransition):
//   { type, dismissible?, height?: { type: 'pixel'|'percentage', value }, backgroundColor? }
// (a bare mode string is also tolerated). Objective-C only exposes percentage height for
// drawer/popin (pixel height and popin width are Swift-only in the SDK), so those honor a
// percentage height + dismissible + background colors; other dimensions are ignored.
// Returns nil for an unknown/absent value so the backend-defined default is honored.
- (PLYTransition * _Nullable) displayModeFromTransition:(id) transition {
    NSDictionary *map = [transition isKindOfClass:[NSDictionary class]] ? transition : nil;
    NSString *type = map != nil ? map[@"type"] : ([transition isKindOfClass:[NSString class]] ? transition : nil);
    if (![type isKindOfClass:[NSString class]]) {
        return nil;
    }

    BOOL dismissible = YES;
    if ([map[@"dismissible"] isKindOfClass:[NSNumber class]]) {
        dismissible = [map[@"dismissible"] boolValue];
    }

    // Percentage height only (ObjC-accessible). Pixel height / popin width are not
    // exposed to Objective-C by the SDK; a percentage value is expected in 0.0–1.0.
    NSNumber *heightPercentage = nil;
    NSDictionary *height = map[@"height"];
    if ([height isKindOfClass:[NSDictionary class]] &&
        [height[@"type"] isEqual:@"percentage"] &&
        [height[@"value"] isKindOfClass:[NSNumber class]]) {
        heightPercentage = height[@"value"];
    }

    PLYColors *backgroundColors = nil;
    NSString *bgHex = map[@"backgroundColor"];
    if ([bgHex isKindOfClass:[NSString class]]) {
        UIColor *c = [UIColor ply_fromHex:bgHex];
        if (c != nil) {
            backgroundColors = [[PLYColors alloc] initWithLightColor:c darkColor:c];
        }
    }

    if ([type isEqualToString:@"fullScreen"]) {
        return [PLYTransition fullScreen];
    } else if ([type isEqualToString:@"modal"]) {
        return [PLYTransition modalWithDismissible:dismissible];
    } else if ([type isEqualToString:@"push"]) {
        return [PLYTransition push];
    } else if ([type isEqualToString:@"inlinePaywall"]) {
        return [PLYTransition inlinePaywall];
    } else if ([type isEqualToString:@"drawer"]) {
        return [[PLYTransition alloc] initWithType:PLYTransitionTypeDrawer heightPercentage:heightPercentage backgroundColors:backgroundColors dismissible:dismissible];
    } else if ([type isEqualToString:@"popin"]) {
        return [[PLYTransition alloc] initWithType:PLYTransitionTypePopin heightPercentage:heightPercentage backgroundColors:backgroundColors dismissible:dismissible];
    }
    return nil;
}

// v6: the dismiss outcome now arrives as a PLYPresentationOutcome (replaces the
// (PLYProductViewControllerResult, PLYPlan) pair). Serialized per the JS↔native contract.
- (NSDictionary<NSString *, NSObject *> *) resultDictionaryForOutcome:(PLYPresentationOutcome * _Nonnull)outcome {
    NSMutableDictionary<NSString *, NSObject *> *dict = [NSMutableDictionary new];

    // Map the v6 PLYPurchaseResult (cancelled=0, purchased=1, restored=2, none=3) to the
    // JS PurchaseResult enum (PURCHASED=0, CANCELLED=1, RESTORED=2) for back-compat.
    int result;
    switch (outcome.purchaseResult) {
        case PLYPurchaseResultPurchased:
            result = 0;
            break;
        case PLYPurchaseResultCancelled:
            result = 1;
            break;
        case PLYPurchaseResultRestored:
            result = 2;
            break;
        case PLYPurchaseResultNone:
            // TODO(v6-verify): PLYPurchaseResultNone (no purchase action) has no JS PurchaseResult
            // equivalent; mapped to CANCELLED(1). closeReason still conveys the precise reason.
            result = 1;
            break;
    }
    [dict setObject:[NSNumber numberWithInt:result] forKey:@"result"];

    // v6: also expose the string purchaseResult (matches the Flutter outcome contract);
    // omitted for PLYPurchaseResultNone (no purchase action).
    NSString *purchaseResultString = nil;
    switch (outcome.purchaseResult) {
        case PLYPurchaseResultPurchased: purchaseResultString = @"purchased"; break;
        case PLYPurchaseResultCancelled: purchaseResultString = @"cancelled"; break;
        case PLYPurchaseResultRestored:  purchaseResultString = @"restored"; break;
        case PLYPurchaseResultNone:      break;
    }
    if (purchaseResultString != nil) {
        [dict setObject:purchaseResultString forKey:@"purchaseResult"];
    }

    if (outcome.plan != nil) {
        [dict setObject:[outcome.plan asDictionary] forKey:@"plan"];
    }

    // closeReason strings match the JS Purchasely.CloseReason enum, aligned with the
    // native PLYCloseReason wire contract shared with Flutter (button / back_system /
    // programmatic). iOS's interactive (swipe) dismiss maps onto `back_system`; a close
    // with no dismiss reason (PLYCloseReasonNone, e.g. after a purchase) omits the key,
    // mirroring the null closeReason the Flutter bridge reports on iOS.
    NSString *closeReason = nil;
    switch (outcome.closeReason) {
        case PLYCloseReasonButton:
            closeReason = @"button";
            break;
        case PLYCloseReasonInteractiveDismiss:
            closeReason = @"back_system";
            break;
        case PLYCloseReasonProgrammatic:
            closeReason = @"programmatic";
            break;
        case PLYCloseReasonNone:
            break;
    }
    if (closeReason != nil) {
        [dict setObject:closeReason forKey:@"closeReason"];
    }

    if (outcome.error != nil) {
        [dict setObject:outcome.error.localizedDescription forKey:@"error"];
    }

    if (outcome.presentation != nil) {
        [dict setObject:[self resultDictionaryForFetchPresentation:outcome.presentation] forKey:@"presentation"];
    }

    return dict;
}

- (NSDictionary<NSString *, NSObject *> *) resultDictionaryForActionInterceptor:(PLYPresentationAction) action
                                                                     parameters: (PLYPresentationActionParameters * _Nullable) params
                                                                            info: (PLYInterceptorInfo * _Nullable) info {
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

    // v6: PLYPresentationInfo was replaced by PLYInterceptorInfo. The flat id fields
    // (presentationId/placementId/abTestId/…) are now accessed through info.presentation.
    if (info != nil) {
        NSMutableDictionary<NSString *, NSObject *> *infosResult = [NSMutableDictionary new];
        if (info.contentId != nil) {
            [infosResult setObject:info.contentId forKey:@"contentId"];
        }
        id<PLYPresentation> presentation = info.presentation;
        if (presentation != nil) {
            if (presentation.screenId != nil) {
                [infosResult setObject:presentation.screenId forKey:@"presentationId"];
            }
            if (presentation.placementId != nil) {
                [infosResult setObject:presentation.placementId forKey:@"placementId"];
            }
            if (presentation.abTestId != nil) {
                [infosResult setObject:presentation.abTestId forKey:@"abTestId"];
            }
            if (presentation.abTestVariantId != nil) {
                [infosResult setObject:presentation.abTestVariantId forKey:@"abTestVariantId"];
            }
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
        if (params.placement != nil) {
            [paramsResult setObject:params.placement forKey:@"placementId"];
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
        case PLYWebCheckoutProviderNone:
            return @"none";
        default:
            return @"unknown";
    }
}

// Maps a JS action-kind string (see Purchasely.PresentationAction) to a PLYPresentationAction.
// Returns NO for an unknown kind.
static BOOL PLYPresentationActionFromString(NSString *kind, PLYPresentationAction *out) {
    static NSDictionary<NSString *, NSNumber *> *map;
    static dispatch_once_t once;
    dispatch_once(&once, ^{
        map = @{
            @"login": @(PLYPresentationActionLogin),
            @"purchase": @(PLYPresentationActionPurchase),
            @"close": @(PLYPresentationActionClose),
            @"close_all": @(PLYPresentationActionCloseAll),
            @"restore": @(PLYPresentationActionRestore),
            @"navigate": @(PLYPresentationActionNavigate),
            @"promo_code": @(PLYPresentationActionPromoCode),
            @"open_presentation": @(PLYPresentationActionOpenPresentation),
            @"open_placement": @(PLYPresentationActionOpenPlacement),
            @"web_checkout": @(PLYPresentationActionWebCheckout),
        };
    });
    NSNumber *value = [kind isKindOfClass:[NSString class]] ? map[kind] : nil;
    if (value == nil) return NO;
    if (out != NULL) *out = (PLYPresentationAction)value.integerValue;
    return YES;
}

// v6: register a JS handler for a single action kind. Each intercept emits an
// event carrying a unique `callbackId`; JS replies via completeActionInterceptor.
- (void)registerActionInterceptor:(CDVInvokedUrlCommand*)command {
    NSString *kind = [command argumentAtIndex:0];
    PLYPresentationAction action;
    if (!PLYPresentationActionFromString(kind, &action)) {
        NSLog(@"[Purchasely] unknown interceptor kind: %@", kind);
        return;
    }
    self.actionInterceptorCallbackIds[kind] = command.callbackId;

    __weak CDVPurchasely *weakSelf = self;
    [Purchasely interceptAction:action handler:^(PLYInterceptorInfo * _Nonnull info, PLYPresentationActionParameters * _Nullable params, void (^ _Nonnull completion)(enum PLYInterceptResult)) {
        CDVPurchasely *strongSelf = weakSelf;
        if (strongSelf == nil) { completion(PLYInterceptResultNotHandled); return; }

        NSString *callbackId = strongSelf.actionInterceptorCallbackIds[kind];
        if (callbackId == nil) { completion(PLYInterceptResultNotHandled); return; }

        // Unique id per intercepted invocation so concurrent intercepts resolve independently.
        NSString *invocationId = [NSString stringWithFormat:@"%@#%lu", kind, (unsigned long)(++strongSelf.interceptorInvocationCounter)];
        // Copy the escaping completion onto the heap before stashing (the dictionary retains but
        // does not copy; the old single-slot property was declared `copy`).
        strongSelf.pendingInterceptCompletions[invocationId] = [completion copy];

        NSMutableDictionary *event = [[strongSelf resultDictionaryForActionInterceptor:action parameters:params info:info] mutableCopy];
        event[@"callbackId"] = invocationId;

        CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsDictionary:event];
        [pluginResult setKeepCallbackAsBool:YES];
        [strongSelf.commandDelegate sendPluginResult:pluginResult callbackId:callbackId];
    }];
}

// v6: stop intercepting a single action kind.
- (void)unregisterActionInterceptor:(CDVInvokedUrlCommand*)command {
    NSString *kind = [command argumentAtIndex:0];
    PLYPresentationAction action;
    if (!PLYPresentationActionFromString(kind, &action)) return;
    [self.actionInterceptorCallbackIds removeObjectForKey:kind];
    [Purchasely removeActionInterceptor:action];
}

// v6: JS reports how an intercepted action was handled, keyed by the invocation
// id carried on the intercept event. Result is "success"/"failed"/"notHandled".
- (void)completeActionInterceptor:(CDVInvokedUrlCommand*)command {
    NSString *invocationId = [command argumentAtIndex:0];
    NSString *resultString = [command argumentAtIndex:1];
    if (![invocationId isKindOfClass:[NSString class]]) return;

    void (^completion)(enum PLYInterceptResult) = self.pendingInterceptCompletions[invocationId];
    if (completion == nil) return;
    [self.pendingInterceptCompletions removeObjectForKey:invocationId];

    enum PLYInterceptResult result = PLYInterceptResultNotHandled;
    if ([resultString isEqualToString:@"success"]) {
        result = PLYInterceptResultSuccess;
    } else if ([resultString isEqualToString:@"failed"]) {
        result = PLYInterceptResultFailed;
    }
    completion(result);
}

// PAR-19: closeAllScreens is the canonical native action; closePresentation is kept as a
// separate (deprecated, fire-and-forget) action since existing native `close` behavior is
// preserved as-is, while closeAllScreens additionally reports success/error to JS.
- (void)closePresentation:(CDVInvokedUrlCommand*)command {
    dispatch_async(dispatch_get_main_queue(), ^{
        [Purchasely closeAllScreens];
        self.currentPresentation = nil;
    });
}

- (void)closeAllScreens:(CDVInvokedUrlCommand*)command {
    dispatch_async(dispatch_get_main_queue(), ^{
        [Purchasely closeAllScreens];
        self.currentPresentation = nil;
        [self successFor:command];
    });
}

- (void)backPresentation:(CDVInvokedUrlCommand*)command {
    dispatch_async(dispatch_get_main_queue(), ^{
        if (self.currentPresentation != nil) {
            [self.currentPresentation back];
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

// REC-12 / PAR-03: bulk read, same per-value conversion as the single-key read above.
- (void)userAttributes:(CDVInvokedUrlCommand*)command {
    NSMutableDictionary<NSString *, id> *result = [NSMutableDictionary new];
    NSDictionary<NSString *, id> *attributes = [Purchasely userAttributes];
    for (NSString *key in attributes) {
        id value = [self getUserAttributeValueForCordova:attributes[key]];
        if (value != nil) {
            result[key] = value;
        }
    }
    [self successFor:command resultDict:result];
}

// REC-12 / PAR-02
- (void)incrementUserAttribute:(CDVInvokedUrlCommand*)command {
    NSString *key = [command argumentAtIndex:0];
    NSNumber *valueNumber = [command argumentAtIndex:1];
    NSInteger value = [valueNumber isKindOfClass:[NSNumber class]] ? valueNumber.integerValue : 1;
    [Purchasely incrementUserAttributeWithKey:key value:value];
}

- (void)decrementUserAttribute:(CDVInvokedUrlCommand*)command {
    NSString *key = [command argumentAtIndex:0];
    NSNumber *valueNumber = [command argumentAtIndex:1];
    NSInteger value = [valueNumber isKindOfClass:[NSNumber class]] ? valueNumber.integerValue : 1;
    [Purchasely decrementUserAttributeWithKey:key value:value];
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

// PAR-07
- (void)getBuiltInAttributes:(CDVInvokedUrlCommand*)command {
    NSMutableDictionary<NSString *, id> *result = [NSMutableDictionary new];
    NSDictionary<NSString *, id> *attributes = [Purchasely getBuiltInAttributes];
    for (NSString *key in attributes) {
        id value = [self getUserAttributeValueForCordova:attributes[key]];
        if (value != nil) {
            result[key] = value;
        }
    }
    [self successFor:command resultDict:result];
}

- (void)getBuiltInAttribute:(CDVInvokedUrlCommand*)command {
    NSString *key = [command argumentAtIndex:0];
    id _Nullable result = [self getUserAttributeValueForCordova:[Purchasely getBuiltInAttributeWith:key]];
    if (result != nil) {
        [self successFor:command resultDict:result];
    } else {
        // No attribute for this key: resolve success with no value (undefined in JS),
        // matching Android's nullable Any? return.
        [self successFor:command];
    }
}

- (void)fetchPresentation:(CDVInvokedUrlCommand*)command {
    NSString *placementId = [command argumentAtIndex:0];
    NSString *presentationId = [command argumentAtIndex:1];
    NSString *contentId = [command argumentAtIndex:2];

    dispatch_async(dispatch_get_main_queue(), ^{
        PLYPresentationBuilder *builder;
        if ([placementId isKindOfClass:[NSString class]]) {
            builder = [PLYPresentationBuilder forPlacementId:placementId];
        } else if ([presentationId isKindOfClass:[NSString class]]) {
            builder = [PLYPresentationBuilder forScreenId:presentationId];
        } else {
            // Neither id provided → the default (audience-targeted) presentation.
            builder = [[PLYPresentationBuilder alloc] init];
        }

        if ([contentId isKindOfClass:[NSString class]]) {
            builder = [builder contentId:contentId];
        }

        // v6: build a request and preload it (fetch without display). The purchase/dismiss
        // outcome now flows through the later presentPresentation: display, not fetch.
        id<PLYPresentationRequest> request = [builder build];
        [request preloadWithCompletion:^(id<PLYPresentation> _Nullable presentation, NSError * _Nullable error) {
            if (error != nil) {
                [self failureFor:command resultString: error.localizedDescription];
            } else if (presentation != nil) {
                [self.presentationsLoaded addObject:presentation];
                [self successFor:command resultDict:[self resultDictionaryForFetchPresentation:presentation]];
            }
        }];
    });
}

- (void)presentPresentation:(CDVInvokedUrlCommand *)command {
    NSDictionary<NSString *, id> *presentationDictionary = [command argumentAtIndex:0];
    id transition = [command argumentAtIndex:1];
    NSString *loadingBackgroundColor = [command argumentAtIndex:2];

    if (presentationDictionary == nil) {
        [self failureFor:command resultString: @"Presentation cannot be null"];
        return;
    }

    self.purchaseResolve = command;

    dispatch_async(dispatch_get_main_queue(), ^{
        NSString *presentationId = (NSString *)[presentationDictionary objectForKey:@"id"];
        id<PLYPresentation> presentationLoaded = [self findPresentationLoadedFor:presentationId];

        if (presentationLoaded == nil || presentationLoaded.controller == nil) {
            [self failureFor:command resultString: @"Presentation not loaded"];
            return;
        }

        NSInteger index = [self findIndexPresentationLoadedFor:presentationId];
        if (index >= 0) {
            [self.presentationsLoaded removeObjectAtIndex:index];
        }

        if (loadingBackgroundColor != nil) {
            UIColor *backColor = [UIColor ply_fromHex:loadingBackgroundColor];
            if (backColor != nil) {
                [presentationLoaded.controller.view setBackgroundColor:backColor];
            }
        }

        // Stream the presentation lifecycle to this command (keep-alive envelopes for
        // presented/closeRequested, final outcome on dismiss).
        __weak CDVPurchasely *weakSelf = self;
        NSString *callbackId = command.callbackId;
        presentationLoaded.onPresented = ^(id<PLYPresentation> _Nullable presentation, NSError * _Nullable error) {
            CDVPurchasely *strongSelf = weakSelf; if (strongSelf == nil) return;
            NSMutableDictionary *env = [NSMutableDictionary new];
            env[@"event"] = @"presented";
            if (presentation != nil) { env[@"presentation"] = [strongSelf resultDictionaryForFetchPresentation:presentation]; }
            if (error != nil) { env[@"error"] = error.localizedDescription; }
            CDVPluginResult *r = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsDictionary:env];
            [r setKeepCallbackAsBool:YES];
            [strongSelf.commandDelegate sendPluginResult:r callbackId:callbackId];
        };
        presentationLoaded.onCloseRequested = ^{
            CDVPurchasely *strongSelf = weakSelf; if (strongSelf == nil) return;
            CDVPluginResult *r = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsDictionary:@{@"event": @"closeRequested"}];
            [r setKeepCallbackAsBool:YES];
            [strongSelf.commandDelegate sendPluginResult:r callbackId:callbackId];
        };
        presentationLoaded.onDismissed = ^(PLYPresentationOutcome * _Nonnull outcome) {
            CDVPurchasely *strongSelf = weakSelf; if (strongSelf == nil) return;
            strongSelf.currentPresentation = nil;
            [strongSelf successFor:command resultDict:[strongSelf resultDictionaryForOutcome:outcome]];
        };

        self.currentPresentation = presentationLoaded;
        [presentationLoaded displayFrom:nil transitionType:[self displayModeFromTransition:transition]];
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

- (void)setDebugMode:(CDVInvokedUrlCommand*)command {
    BOOL enabled = [[command argumentAtIndex:0] boolValue];
    [Purchasely setDebugModeWithEnabled: enabled];
}

- (id<PLYPresentation>) findPresentationLoadedFor:(NSString * _Nullable) presentationId {
    for (id<PLYPresentation> presentationLoaded in self.presentationsLoaded) {
        if ([presentationLoaded.screenId isEqualToString: presentationId]) {
            return presentationLoaded;
        }
    }
    return nil;
}

- (NSInteger) findIndexPresentationLoadedFor:(NSString * _Nullable) presentationId {
    NSInteger index = 0;
    for (id<PLYPresentation> presentationLoaded in self.presentationsLoaded) {
        if ([presentationLoaded.screenId isEqualToString: presentationId]) {
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

- (NSDictionary<NSString *, NSObject *> *) resultDictionaryForFetchPresentation:(id<PLYPresentation> _Nullable) presentation {
    NSMutableDictionary<NSString *, NSObject *> *presentationResult = [NSMutableDictionary new];

    if (presentation != nil) {

        if (presentation.screenId != nil) {
            // `screenId` is the sole authoritative, public presentation identifier (matches
            // Android's presentationToMap() key, so shared JS reads either platform the same
            // way). `id` is kept ONLY as a private/internal re-display lookup key --
            // findPresentationLoadedFor:/findIndexPresentationLoadedFor: key off it, and on
            // this platform it always equals screenId (iOS has no separate synthetic fetch
            // handle, unlike Android's `fetchId`) -- it is NOT a documented public field; the
            // JS bridge normalizes with `screenId ?? id` tolerance and never surfaces `id`.
            [presentationResult setObject:presentation.screenId forKey:@"id"];
            [presentationResult setObject:presentation.screenId forKey:@"screenId"];
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

        // New in v6: campaignId, flowId, height.
        if (presentation.campaignId != nil) {
            [presentationResult setObject:presentation.campaignId forKey:@"campaignId"];
        }

        if (presentation.flowId != nil) {
            [presentationResult setObject:presentation.flowId forKey:@"flowId"];
        }

        [presentationResult setObject:[NSNumber numberWithInteger:presentation.height] forKey:@"height"];

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


// WARNING: This enum must be strictly identical (same declaration order) to the one in
// the JS side (Purchasely.js) and Android's CordovaPLYAttribute enum class.
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
    CordovaPLYAttributeBatchCustomUserId,
    CordovaPLYAttributeOneSignalUserId
};

@end

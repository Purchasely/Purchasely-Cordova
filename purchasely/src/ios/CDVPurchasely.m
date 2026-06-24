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

// v6: `setDefaultPresentationDismissHandler:` (block: PLYPresentationOutcome) was
// renamed from `setDefaultPresentationResultHandler:` in iOS PR #652. The pod we
// build against (6.0.0-rc.1) may predate that rename, so forward-declare it here.
// The call site is guarded with `respondsToSelector:`. // gated by iOS PR #652
@interface Purchasely (PLYDefaultDismissHandler)
+ (void)setDefaultPresentationDismissHandler:(void (^)(PLYPresentationOutcome *outcome))handler;
@end

#pragma mark - internal state (shared across presentation methods)

/// requestId → captured PLYPresentation (so we can replay it in events).
static NSMutableDictionary<NSString *, id<PLYPresentation>> *kPresentationsByRequest;
/// callbackId (UUID string) → kept-alive CDVInvokedUrlCommand callbackId string for display/preload.
static NSMutableDictionary<NSString *, NSString *> *kCallbacksByRequest;
/// callbackId → completion block to call once JS replies with an InterceptResult.
static NSMutableDictionary<NSString *, void (^)(NSString *)> *kInterceptorCallbacks;
/// kind → BOOL : tracks which interceptor kinds JS has registered.
static NSMutableSet<NSString *> *kInterceptorKinds;
/// Serialises every access to the mutable collections above.
static NSObject *kPresentationStateLock;

static void ensurePresentationState(void) {
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        kPresentationsByRequest = [NSMutableDictionary new];
        kCallbacksByRequest = [NSMutableDictionary new];
        kInterceptorCallbacks = [NSMutableDictionary new];
        kInterceptorKinds = [NSMutableSet new];
        kPresentationStateLock = [NSObject new];
    });
}

#pragma mark - static helpers (mirrors PurchaselyRN.m verbatim)

/// Map a `PLYCloseReason` to the cross-platform wire string.
/// iOS interactive dismiss (swipe-down / nav pop) → `backSystem` (RN parity).
static NSString *closeReasonToString(PLYCloseReason reason) {
    switch (reason) {
        case PLYCloseReasonButton:             return @"button";
        case PLYCloseReasonInteractiveDismiss: return @"backSystem"; // RN parity
        case PLYCloseReasonProgrammatic:       return @"programmatic";
        default:                               return nil;           // PLYCloseReasonNone
    }
}

/// Convert a `PLYPurchaseResult` to the ordinal JS expects.
/// `none` carries no purchase outcome → nil (omitted from the event dict).
static NSNumber *purchaseResultOrdinal(PLYPurchaseResult result) {
    switch (result) {
        case PLYPurchaseResultPurchased: return @(0);
        case PLYPurchaseResultCancelled: return @(1);
        case PLYPurchaseResultRestored:  return @(2);
        default:                         return nil; // PLYPurchaseResultNone
    }
}

/// Map a `PLYPresentationAction` to its string kind (mirrors Android bridge).
static NSString *stringFromPresentationAction(PLYPresentationAction action) {
    switch (action) {
        case PLYPresentationActionLogin:            return @"login";
        case PLYPresentationActionPurchase:         return @"purchase";
        case PLYPresentationActionClose:            return @"close";
        case PLYPresentationActionCloseAll:         return @"closeAll";
        case PLYPresentationActionRestore:          return @"restore";
        case PLYPresentationActionNavigate:         return @"navigate";
        case PLYPresentationActionPromoCode:        return @"promoCode";
        case PLYPresentationActionOpenPresentation: return @"openPresentation";
        case PLYPresentationActionOpenPlacement:    return @"openPlacement";
        case PLYPresentationActionWebCheckout:      return @"webCheckout";
    }
    return @"unknown";
}

static BOOL presentationActionFromString(NSString *kind, PLYPresentationAction *action) {
    if ([kind isEqualToString:@"login"])            { *action = PLYPresentationActionLogin;            return YES; }
    if ([kind isEqualToString:@"purchase"])         { *action = PLYPresentationActionPurchase;         return YES; }
    if ([kind isEqualToString:@"close"])            { *action = PLYPresentationActionClose;            return YES; }
    if ([kind isEqualToString:@"closeAll"])         { *action = PLYPresentationActionCloseAll;         return YES; }
    if ([kind isEqualToString:@"restore"])          { *action = PLYPresentationActionRestore;          return YES; }
    if ([kind isEqualToString:@"navigate"])         { *action = PLYPresentationActionNavigate;         return YES; }
    if ([kind isEqualToString:@"promoCode"])        { *action = PLYPresentationActionPromoCode;        return YES; }
    if ([kind isEqualToString:@"openPresentation"]) { *action = PLYPresentationActionOpenPresentation; return YES; }
    if ([kind isEqualToString:@"openPlacement"])    { *action = PLYPresentationActionOpenPlacement;    return YES; }
    if ([kind isEqualToString:@"webCheckout"])      { *action = PLYPresentationActionWebCheckout;      return YES; }
    return NO;
}

/// String representation of `PLYWebCheckoutProvider` for the JS payload.
static NSString *stringFromWebCheckoutProvider(PLYWebCheckoutProvider provider) {
    switch (provider) {
        case PLYWebCheckoutProviderStripe: return @"stripe";
        case PLYWebCheckoutProviderOther:  return @"other";
        default:                           return @"unknown";
    }
}

/// Convert a `PLYPresentation` to the cross-platform map.
/// Maps `presentation.id` → both `screenId` and `id` (P1.1 parity with RN).
static NSDictionary *presentationToMap(id<PLYPresentation> presentation) {
    if (presentation == nil) { return nil; }
    NSMutableDictionary *map = [NSMutableDictionary new];
    if (presentation.id != nil) {
        map[@"screenId"] = presentation.id;
        map[@"id"]       = presentation.id;
    }
    if (presentation.placementId != nil)     { map[@"placementId"]     = presentation.placementId; }
    if (presentation.audienceId != nil)      { map[@"audienceId"]      = presentation.audienceId; }
    if (presentation.abTestId != nil)        { map[@"abTestId"]        = presentation.abTestId; }
    if (presentation.abTestVariantId != nil) { map[@"abTestVariantId"] = presentation.abTestVariantId; }
    if (presentation.language != nil)        { map[@"language"]        = presentation.language; }
    map[@"type"]   = @(presentation.type);
    map[@"height"] = @(presentation.height);
    if (presentation.plans != nil) {
        NSMutableArray *plans = [NSMutableArray new];
        for (PLYPresentationPlan *plan in presentation.plans) {
            [plans addObject:plan.asDictionary];
        }
        map[@"plans"] = plans;
    }
    if (presentation.metadata != nil) {
        map[@"metadata"] = [presentation.metadata getRawMetadata];
    }
    return map;
}

/// Wrap an `NSError` into the `PresentationError` shape.
static NSDictionary *presentationErrorToMap(NSError *error) {
    if (error == nil) { return nil; }
    return @{
        @"code":    @(error.code),
        @"domain":  error.domain ?: @"",
        @"message": error.localizedDescription ?: @"Unknown error",
    };
}

/// Build a `PLYPresentationBuilder` from the cross-platform builder payload.
/// `placementId` wins over `presentationId` (screenId) wins over default.
static PLYPresentationBuilder *presentationBuilderFor(NSString *placementId,
                                                      NSString *presentationId,
                                                      NSString *contentId,
                                                      BOOL isDefault) {
    PLYPresentationBuilder *builder = nil;
    if (placementId != nil) {
        builder = [PLYPresentationBuilder forPlacementId:placementId];
    } else if (presentationId != nil) {
        builder = [PLYPresentationBuilder forScreenId:presentationId];
    } else if (isDefault) {
        builder = [[PLYPresentationBuilder alloc] init];
    }
    if (builder != nil && contentId != nil) {
        [builder contentId:contentId];
    }
    return builder;
}

@implementation CDVPurchasely

- (instancetype)init {
    self = [super init];

    return self;
}

#pragma mark - transport helper (kept-alive emit)

/// Emit `dict` on the kept-alive Cordova callback identified by `callbackId`.
- (void)emitOn:(NSString *)callbackId dict:(NSDictionary *)dict {
    if (callbackId == nil) { return; }
    CDVPluginResult *result = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsDictionary:dict];
    [result setKeepCallbackAsBool:YES];
    [self.commandDelegate sendPluginResult:result callbackId:callbackId];
}

#pragma mark - payload parsing

- (void)extractPresentationTargets:(NSDictionary *)payload
                       toPlacement:(NSString * __autoreleasing *)placementId
                    toPresentation:(NSString * __autoreleasing *)presentationId
                       toContentId:(NSString * __autoreleasing *)contentId
                       toIsDefault:(BOOL *)isDefault {
    id p = payload[@"placementId"];
    if (p != nil && p != [NSNull null]) { *placementId = p; }
    id s = payload[@"presentationId"];
    if (s != nil && s != [NSNull null]) { *presentationId = s; }
    id c = payload[@"contentId"];
    if (c != nil && c != [NSNull null]) { *contentId = c; }
    id d = payload[@"isDefault"];
    if ([d isKindOfClass:[NSNumber class]]) { *isDefault = [d boolValue]; }
}

#pragma mark - start

- (void)start:(CDVInvokedUrlCommand*)command {
    NSString *apiKey = [command argumentAtIndex:0];
    BOOL storeKit1 = [[command argumentAtIndex:2] boolValue];
    NSString *userId = [command argumentAtIndex:3];
    NSInteger logLevel = [[command argumentAtIndex:4] intValue];
    NSInteger runningMode = [[command argumentAtIndex:5] intValue];
    NSString *purchaselySdkVersion = [command argumentAtIndex:6];

    // SDK v6: fluent PurchaselyBuilder chain.
    PurchaselyBuilder *builder = [Purchasely apiKey:apiKey];
    [builder appUserId:userId];
    [builder runningMode:runningMode];
    [builder storekitSettings: storeKit1 ? [StorekitSettings storeKit1] : [StorekitSettings storeKit2]];
    [builder logLevel:logLevel];
    [builder appTechnology:PLYAppTechnologyCordova];
    [builder sdkBridgeVersion:purchaselySdkVersion];
    [builder startWithInitialized:^(NSError * _Nullable error) {
        if (error != nil) {
            [self failureFor:command resultString: error.localizedDescription];
        } else {
            [self successFor:command resultBool:YES];
        }
    }];
}

#pragma mark - applyStartOptions

- (void)applyStartOptions:(CDVInvokedUrlCommand*)command {
    NSDictionary *options = [command argumentAtIndex:0];
    if (![options isKindOfClass:[NSDictionary class]]) { return; }
    id allowDeeplink = options[@"allowDeeplink"];
    if ([allowDeeplink isKindOfClass:[NSNumber class]]) {
        dispatch_async(dispatch_get_main_queue(), ^{
            [Purchasely allowDeeplink:[allowDeeplink boolValue]];
        });
    }
    // `allowCampaigns` is honored on Android via the consent manager; on iOS
    // the equivalent is not yet exposed publicly — JS clients receive the value
    // but iOS does not yet act on it.
    id allowCampaigns = options[@"allowCampaigns"];
    if ([allowCampaigns isKindOfClass:[NSNumber class]] && ![allowCampaigns boolValue]) {
        NSLog(@"[Purchasely] allowCampaigns(false) is not bridged on iOS yet");
    }
}

#pragma mark - preloadPresentation

- (void)preloadPresentation:(CDVInvokedUrlCommand*)command {
    ensurePresentationState();

    NSString *requestId = [command argumentAtIndex:0];
    NSDictionary *payload = [command argumentAtIndex:1];

    NSString *placementId = nil, *presentationId = nil, *contentId = nil;
    BOOL isDefault = NO;
    [self extractPresentationTargets:payload
                         toPlacement:&placementId
                      toPresentation:&presentationId
                         toContentId:&contentId
                         toIsDefault:&isDefault];

    // Store the kept-alive callbackId so we can emit events for this requestId.
    @synchronized (kPresentationStateLock) {
        kCallbacksByRequest[requestId] = command.callbackId;
    }

    __weak CDVPurchasely *weakSelf = self;
    void (^onFetchCompletion)(id<PLYPresentation> _Nullable, NSError * _Nullable) =
    ^(id<PLYPresentation> _Nullable presentation, NSError * _Nullable error) {
        CDVPurchasely *strongSelf = weakSelf;
        if (!strongSelf) { return; }

        NSMutableDictionary *event = [NSMutableDictionary new];
        event[@"type"]      = @"loaded";
        event[@"requestId"] = requestId;
        if (presentation != nil) {
            event[@"presentation"] = presentationToMap(presentation);
            @synchronized (kPresentationStateLock) {
                kPresentationsByRequest[requestId] = presentation;
            }
        }
        if (error != nil) {
            event[@"error"] = presentationErrorToMap(error);
        }
        NSString *cbId = nil;
        @synchronized (kPresentationStateLock) {
            cbId = kCallbacksByRequest[requestId];
        }
        [strongSelf emitOn:cbId dict:event];
    };

    dispatch_async(dispatch_get_main_queue(), ^{
        PLYPresentationBuilder *builder = presentationBuilderFor(placementId, presentationId, contentId, isDefault);
        if (builder == nil) {
            NSError *error = [NSError errorWithDomain:@"io.purchasely.presentation"
                                                 code:400
                                             userInfo:@{NSLocalizedDescriptionKey: @"No placementId or screenId provided"}];
            onFetchCompletion(nil, error);
            return;
        }
        id<PLYPresentationRequest> request = [builder build];
        [request preloadWithCompletion:onFetchCompletion];
    });
}

#pragma mark - displayPresentation

- (void)displayPresentation:(CDVInvokedUrlCommand*)command {
    ensurePresentationState();

    NSString *requestId   = [command argumentAtIndex:0];
    NSDictionary *payload    = [command argumentAtIndex:1];
    NSDictionary *transition = [command argumentAtIndex:2];

    NSString *placementId = nil, *presentationId = nil, *contentId = nil;
    BOOL isDefault = NO;
    [self extractPresentationTargets:payload
                         toPlacement:&placementId
                      toPresentation:&presentationId
                         toContentId:&contentId
                         toIsDefault:&isDefault];

    // Store kept-alive callbackId for this request.
    @synchronized (kPresentationStateLock) {
        kCallbacksByRequest[requestId] = command.callbackId;
    }

    __weak CDVPurchasely *weakSelf = self;
    __block id<PLYPresentation> capturedPresentation = nil;
    __block PLYPurchaseResult   capturedResult       = PLYPurchaseResultCancelled;
    __block PLYPlan             *capturedPlan        = nil;
    __block BOOL                hasPurchaseOutcome   = NO;
    __block PLYCloseReason      capturedCloseReason  = PLYCloseReasonNone;

    void (^emitDismissed)(NSError * _Nullable) = ^(NSError * _Nullable error) {
        CDVPurchasely *strongSelf = weakSelf;
        if (!strongSelf) { return; }
        NSMutableDictionary *body = [NSMutableDictionary new];
        body[@"type"]      = @"dismissed";
        body[@"requestId"] = requestId;
        if (capturedPresentation != nil) {
            body[@"presentation"] = presentationToMap(capturedPresentation);
        }
        if (hasPurchaseOutcome) {
            NSNumber *ordinal = purchaseResultOrdinal(capturedResult);
            if (ordinal != nil) { body[@"purchaseResult"] = ordinal; }
            if (capturedPlan != nil) { body[@"plan"] = [capturedPlan asDictionary]; }
        }
        if (error != nil) {
            body[@"error"] = presentationErrorToMap(error);
        } else {
            // Exclusion rule: only surface closeReason when there is no error.
            NSString *reason = closeReasonToString(capturedCloseReason);
            if (reason != nil) { body[@"closeReason"] = reason; }
        }
        NSString *cbId = nil;
        @synchronized (kPresentationStateLock) {
            cbId = kCallbacksByRequest[requestId];
            [kPresentationsByRequest removeObjectForKey:requestId];
            [kCallbacksByRequest removeObjectForKey:requestId];
        }
        [strongSelf emitOn:cbId dict:body];
    };

    void (^onFetchCompletion)(id<PLYPresentation> _Nullable, NSError * _Nullable) =
    ^(id<PLYPresentation> _Nullable presentation, NSError * _Nullable error) {
        CDVPurchasely *strongSelf = weakSelf;
        if (!strongSelf) { return; }

        NSString *cbId = nil;
        @synchronized (kPresentationStateLock) {
            cbId = kCallbacksByRequest[requestId];
        }

        // Emit `loaded`.
        NSMutableDictionary *loaded = [NSMutableDictionary new];
        loaded[@"type"]      = @"loaded";
        loaded[@"requestId"] = requestId;
        if (presentation != nil) { loaded[@"presentation"] = presentationToMap(presentation); }
        if (error != nil)        { loaded[@"error"]        = presentationErrorToMap(error); }
        [strongSelf emitOn:cbId dict:loaded];

        if (error != nil) {
            // P0.4: synthesize an onPresented(null, error).
            NSMutableDictionary *presented = [NSMutableDictionary new];
            presented[@"type"]      = @"presented";
            presented[@"requestId"] = requestId;
            presented[@"error"]     = presentationErrorToMap(error);
            [strongSelf emitOn:cbId dict:presented];
            emitDismissed(error);
            return;
        }

        if (presentation == nil) {
            NSError *missing = [NSError errorWithDomain:@"io.purchasely.presentation"
                                                   code:404
                                               userInfo:@{NSLocalizedDescriptionKey: @"Presentation not found"}];
            NSMutableDictionary *presented = [NSMutableDictionary new];
            presented[@"type"]      = @"presented";
            presented[@"requestId"] = requestId;
            presented[@"error"]     = presentationErrorToMap(missing);
            [strongSelf emitOn:cbId dict:presented];
            emitDismissed(missing);
            return;
        }

        capturedPresentation = presentation;
        @synchronized (kPresentationStateLock) {
            kPresentationsByRequest[requestId] = presentation;
        }

        // Emit `presented`.
        NSMutableDictionary *presented = [NSMutableDictionary new];
        presented[@"type"]         = @"presented";
        presented[@"requestId"]    = requestId;
        presented[@"presentation"] = presentationToMap(presentation);
        [strongSelf emitOn:cbId dict:presented];

        UIViewController *controller = presentation.controller;
        if (controller == nil) {
            NSError *err = [NSError errorWithDomain:@"io.purchasely.presentation"
                                               code:500
                                           userInfo:@{NSLocalizedDescriptionKey: @"Presentation has no controller"}];
            emitDismissed(err);
            return;
        }

        // Apply the transition `dismissible` flag if provided.
        if ([transition isKindOfClass:[NSDictionary class]]) {
            id dismissible = transition[@"dismissible"];
            if ([dismissible isKindOfClass:[NSNumber class]]) {
                controller.modalInPresentation = ![dismissible boolValue];
            }
        }

        strongSelf.presentedPresentationViewController = controller;
        [Purchasely showController:controller type:PLYUIControllerTypeProductPage from:nil];
    };

    // v6: dismiss outcome is delivered through the builder's `onDismissed` handler.
    void (^onDismissed)(PLYPresentationOutcome *) = ^(PLYPresentationOutcome *outcome) {
        capturedResult      = outcome.purchaseResult;
        capturedPlan        = outcome.plan;
        hasPurchaseOutcome  = YES;
        capturedCloseReason = outcome.closeReason;
        if (outcome.presentation != nil) {
            capturedPresentation = outcome.presentation;
        }
        emitDismissed(outcome.error);
    };

    dispatch_async(dispatch_get_main_queue(), ^{
        PLYPresentationBuilder *builder = presentationBuilderFor(placementId, presentationId, contentId, isDefault);
        if (builder == nil) {
            NSError *error = [NSError errorWithDomain:@"io.purchasely.presentation"
                                                 code:400
                                             userInfo:@{NSLocalizedDescriptionKey: @"No placementId or screenId provided"}];
            onFetchCompletion(nil, error);
            return;
        }
        [builder onDismissed:onDismissed];
        id<PLYPresentationRequest> request = [builder build];
        [request preloadWithCompletion:onFetchCompletion];
    });
}

#pragma mark - closePresentation / goBackToPreviousScreen

- (void)closePresentation:(CDVInvokedUrlCommand*)command {
    ensurePresentationState();
    NSString *requestId = [command argumentAtIndex:0];
    dispatch_async(dispatch_get_main_queue(), ^{
        // Notify JS so the host app can react before the native dismissal happens.
        NSString *cbId = nil;
        @synchronized (kPresentationStateLock) {
            cbId = kCallbacksByRequest[requestId];
        }
        [self emitOn:cbId dict:@{ @"type": @"closeRequested", @"requestId": requestId ?: @"" }];

        id<PLYPresentation> presentation = nil;
        @synchronized (kPresentationStateLock) {
            presentation = kPresentationsByRequest[requestId];
        }
        self.presentedPresentationViewController = nil;
        if (presentation != nil) {
            [presentation close];
        } else {
            [Purchasely closeAllScreens];
        }
        @synchronized (kPresentationStateLock) {
            [kPresentationsByRequest removeObjectForKey:requestId];
        }
    });
}

- (void)goBackToPreviousScreen:(CDVInvokedUrlCommand*)command {
    // The iOS SDK does not expose a `back()` primitive on the presentation
    // controller. Bridge contract says: noop with a warn (mirrors RN).
    NSString *requestId = [command argumentAtIndex:0];
    NSLog(@"[Purchasely] goBackToPreviousScreen(%@) is not yet bridged on iOS", requestId);
}

#pragma mark - setDefaultPresentationDismissHandler / removeDefaultPresentationDismissHandler

// Global handler for presentations the app did NOT instantiate itself
// (campaigns, deeplinks, Promoted In-App Purchases). v6 renamed the native
// `setDefaultPresentationResultHandler:` → `setDefaultPresentationDismissHandler:`.
// The single call below will NOT compile until iOS PR #652 ships. // gated by iOS PR #652
- (void)setDefaultPresentationDismissHandler:(CDVInvokedUrlCommand*)command {
    ensurePresentationState();
    self.defaultDismissCallbackId = command.callbackId;

    __weak CDVPurchasely *weakSelf = self;
    void (^handler)(PLYPresentationOutcome *) = ^(PLYPresentationOutcome *outcome) {
        CDVPurchasely *strongSelf = weakSelf;
        if (!strongSelf) { return; }

        NSMutableDictionary *body = [NSMutableDictionary new];
        // `presentation` is always populated for this handler.
        if (outcome.presentation != nil) {
            body[@"presentation"] = presentationToMap(outcome.presentation);
        }
        NSNumber *ordinal = purchaseResultOrdinal(outcome.purchaseResult);
        if (ordinal != nil) { body[@"purchaseResult"] = ordinal; }
        if (outcome.plan != nil) { body[@"plan"] = [outcome.plan asDictionary]; }
        NSString *closeReason = closeReasonToString(outcome.closeReason);
        if (closeReason != nil) { body[@"closeReason"] = closeReason; }
        if (outcome.error != nil) { body[@"error"] = presentationErrorToMap(outcome.error); }

        [strongSelf emitOn:strongSelf.defaultDismissCallbackId dict:body];
    };

    dispatch_async(dispatch_get_main_queue(), ^{
        // Prefer the v6 API when available; fall back to the v5 API in SDK builds
        // that predate the v6 rename (iOS PR #652). // gated by iOS PR #652
        if ([Purchasely respondsToSelector:@selector(setDefaultPresentationDismissHandler:)]) {
            [Purchasely setDefaultPresentationDismissHandler:handler];
        } else if ([Purchasely respondsToSelector:@selector(setDefaultPresentationResultHandler:)]) {
            [Purchasely setDefaultPresentationResultHandler:^(enum PLYProductViewControllerResult result,
                                                               PLYPlan * _Nullable plan) {
                CDVPurchasely *strongSelf = weakSelf;
                if (!strongSelf) { return; }
                NSMutableDictionary *body = [NSMutableDictionary new];
                body[@"purchaseResult"] = @(result);
                if (plan != nil) { body[@"plan"] = [plan asDictionary]; }
                [strongSelf emitOn:strongSelf.defaultDismissCallbackId dict:body];
            }];
        } else {
            NSLog(@"[Purchasely] setDefaultPresentationDismissHandler unavailable; global dismiss handler disabled.");
        }
    });
}

- (void)removeDefaultPresentationDismissHandler:(CDVInvokedUrlCommand*)command {
    self.defaultDismissCallbackId = nil;
    // No native API to de-register; setting nil block effectively silences it.
}

#pragma mark - per-action interceptors

- (void)registerActionInterceptor:(CDVInvokedUrlCommand*)command {
    ensurePresentationState();
    NSString *kind = [command argumentAtIndex:0];

    PLYPresentationAction nativeAction;
    if (!presentationActionFromString(kind, &nativeAction)) {
        NSLog(@"[Purchasely] unknown interceptor kind: %@", kind);
        return;
    }

    @synchronized (kPresentationStateLock) {
        [kInterceptorKinds addObject:kind];
    }

    // Store the kept-alive callbackId so the interceptor block can emit events.
    NSString *interceptCallbackId = command.callbackId;

    dispatch_async(dispatch_get_main_queue(), ^{
        __weak CDVPurchasely *weakSelf = self;
        [Purchasely interceptAction:nativeAction
                             handler:^(PLYInterceptorInfo * _Nonnull infos,
                                       PLYPresentationActionParameters * _Nullable params,
                                       void (^ _Nonnull completion)(PLYInterceptResult)) {
            CDVPurchasely *strongSelf = weakSelf;
            if (!strongSelf) {
                completion(PLYInterceptResultNotHandled);
                return;
            }

            NSString *callbackId = [[NSUUID UUID] UUIDString];
            @synchronized (kPresentationStateLock) {
                kInterceptorCallbacks[callbackId] = ^(NSString *result) {
                    if ([result isEqualToString:@"success"]) {
                        completion(PLYInterceptResultSuccess);
                    } else if ([result isEqualToString:@"failed"]) {
                        completion(PLYInterceptResultFailed);
                    } else {
                        completion(PLYInterceptResultNotHandled);
                    }
                };
            }

            // Build info dict.
            NSMutableDictionary *info = [NSMutableDictionary new];
            if (infos.contentId != nil) { info[@"contentId"] = infos.contentId; }
            if (infos.presentation != nil) { info[@"presentation"] = presentationToMap(infos.presentation); }

            // Build action-specific payload.
            NSMutableDictionary *payloadOut = [NSMutableDictionary new];
            if (params != nil) {
                switch (nativeAction) {
                    case PLYPresentationActionNavigate: {
                        payloadOut[@"url"] = params.url.absoluteString ?: @"";
                        if (params.title != nil) { payloadOut[@"title"] = params.title; }
                        break;
                    }
                    case PLYPresentationActionPurchase: {
                        if (params.plan != nil) { payloadOut[@"plan"] = [params.plan asDictionary]; }
                        if (params.promoOffer != nil) {
                            NSMutableDictionary *offer = [NSMutableDictionary new];
                            if (params.promoOffer.vendorId != nil)    { offer[@"vendorId"]    = params.promoOffer.vendorId; }
                            if (params.promoOffer.storeOfferId != nil) { offer[@"storeOfferId"] = params.promoOffer.storeOfferId; }
                            payloadOut[@"offer"] = offer;
                        }
                        break;
                    }
                    case PLYPresentationActionClose:
                    case PLYPresentationActionCloseAll: {
                        payloadOut[@"closeReason"] = @"button";
                        break;
                    }
                    case PLYPresentationActionOpenPresentation: {
                        if (params.presentation != nil) { payloadOut[@"presentationId"] = params.presentation; }
                        break;
                    }
                    case PLYPresentationActionOpenPlacement: {
                        if (params.placement != nil) { payloadOut[@"placementId"] = params.placement; }
                        break;
                    }
                    case PLYPresentationActionWebCheckout: {
                        payloadOut[@"url"] = params.url.absoluteString ?: @"";
                        if (params.clientReferenceId != nil)  { payloadOut[@"clientReferenceId"]  = params.clientReferenceId; }
                        if (params.queryParameterKey != nil)  { payloadOut[@"queryParameterKey"]  = params.queryParameterKey; }
                        payloadOut[@"webCheckoutProvider"] = stringFromWebCheckoutProvider(params.webCheckoutProvider);
                        break;
                    }
                    default:
                        break;
                }
            }

            NSMutableDictionary *event = [NSMutableDictionary new];
            event[@"callbackId"] = callbackId;
            event[@"kind"]       = kind;
            event[@"info"]       = info;
            event[@"payload"]    = payloadOut;
            [strongSelf emitOn:interceptCallbackId dict:event];
        }];
    });
}

- (void)unregisterActionInterceptor:(CDVInvokedUrlCommand*)command {
    ensurePresentationState();
    NSString *kind = [command argumentAtIndex:0];

    PLYPresentationAction nativeAction;
    if (!presentationActionFromString(kind, &nativeAction)) {
        NSLog(@"[Purchasely] unknown interceptor kind: %@", kind);
        return;
    }

    @synchronized (kPresentationStateLock) {
        [kInterceptorKinds removeObject:kind];
    }

    dispatch_async(dispatch_get_main_queue(), ^{
        [Purchasely removeActionInterceptor:nativeAction];
    });
}

- (void)completeActionInterceptor:(CDVInvokedUrlCommand*)command {
    ensurePresentationState();
    NSString *callbackId = [command argumentAtIndex:0];
    NSString *result     = [command argumentAtIndex:1];

    void (^cb)(NSString *) = nil;
    @synchronized (kPresentationStateLock) {
        cb = kInterceptorCallbacks[callbackId];
        if (cb != nil) {
            [kInterceptorCallbacks removeObjectForKey:callbackId];
        }
    }
    // Invoke outside the lock — the callback re-enters the SDK's action handler.
    if (cb != nil) {
        cb(result);
    }
}

#pragma mark - remove interceptors / closeAllScreens / dynamic offerings

- (void)removeActionInterceptor:(CDVInvokedUrlCommand*)command {
    [self unregisterActionInterceptor:command];
    [self successFor:command];
}

- (void)removeAllActionInterceptors:(CDVInvokedUrlCommand*)command {
    ensurePresentationState();
    NSArray *kinds = nil;
    @synchronized (kPresentationStateLock) {
        kinds = [kInterceptorKinds allObjects];
        [kInterceptorKinds removeAllObjects];
    }
    dispatch_async(dispatch_get_main_queue(), ^{
        for (NSString *kind in kinds) {
            PLYPresentationAction nativeAction;
            if (presentationActionFromString(kind, &nativeAction)) {
                [Purchasely removeActionInterceptor:nativeAction];
            }
        }
    });
    [self successFor:command];
}

- (void)closeAllScreens:(CDVInvokedUrlCommand*)command {
    dispatch_async(dispatch_get_main_queue(), ^{
        [Purchasely closeAllScreens];
        [self successFor:command];
    });
}

- (void)getDynamicOfferings:(CDVInvokedUrlCommand*)command {
    [self successFor:command resultArray:@[]];
}

- (void)setDynamicOffering:(CDVInvokedUrlCommand*)command {
    [self successFor:command];
}

- (void)removeDynamicOffering:(CDVInvokedUrlCommand*)command {
    [self successFor:command];
}

- (void)clearDynamicOfferings:(CDVInvokedUrlCommand*)command {
    [self successFor:command];
}


#pragma mark - other methods

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

    if (attributeNumber == nil || value == nil) { return; }

    NSInteger rawAttribute = [attributeNumber integerValue];
    PLYAttribute *attribute = nil;

    switch (rawAttribute) {
        case CordovaPLYAttributeFirebaseAppInstanceId:    attribute = PLYAttributeFirebaseAppInstanceId;    break;
        case CordovaPLYAttributeAirshipChannelId:         attribute = PLYAttributeAirshipChannelId;         break;
        case CordovaPLYAttributeAirshipUserId:            attribute = PLYAttributeAirshipUserId;            break;
        case CordovaPLYAttributeBatchInstallationId:      attribute = PLYAttributeBatchInstallationId;      break;
        case CordovaPLYAttributeAdjustId:                 attribute = PLYAttributeAdjustId;                 break;
        case CordovaPLYAttributeAppsflyerId:              attribute = PLYAttributeAppsflyerId;              break;
        case CordovaPLYAttributeMixpanelDistinctId:       attribute = PLYAttributeMixpanelDistinctId;       break;
        case CordovaPLYAttributeCleverTapId:              attribute = PLYAttributeClevertapId;              break;
        case CordovaPLYAttributeSendinblueUserEmail:      attribute = PLYAttributeSendinblueUserEmail;      break;
        case CordovaPLYAttributeIterableUserEmail:        attribute = PLYAttributeIterableUserEmail;        break;
        case CordovaPLYAttributeIterableUserId:           attribute = PLYAttributeIterableUserId;           break;
        case CordovaPLYAttributeAtInternetIdClient:       attribute = PLYAttributeAtInternetIdClient;       break;
        case CordovaPLYAttributeMParticleUserId:          attribute = PLYAttributeMParticleUserId;          break;
        case CordovaPLYAttributeCustomerioUserId:         attribute = PLYAttributeCustomerioUserId;         break;
        case CordovaPLYAttributeCustomerioUserEmail:      attribute = PLYAttributeCustomerioUserEmail;      break;
        case CordovaPLYAttributeBranchUserDeveloperIdentity: attribute = PLYAttributeBranchUserDeveloperIdentity; break;
        case CordovaPLYAttributeAmplitudeUserId:          attribute = PLYAttributeAmplitudeUserId;          break;
        case CordovaPLYAttributeAmplitudeDeviceId:        attribute = PLYAttributeAmplitudeDeviceId;        break;
        case CordovaPLYAttributeMoengageUniqueId:         attribute = PLYAttributeMoengageUniqueId;         break;
        case CordovaPLYAttributeOneSignalExternalId:      attribute = PLYAttributeOneSignalExternalId;      break;
        case CordovaPLYAttributeBatchCustomUserId:        attribute = PLYAttributeBatchCustomUserId;        break;
    }

    if (attribute == nil) { return; }
    [Purchasely setAttribute:attribute value:value];
}

- (void)getAnonymousUserId:(CDVInvokedUrlCommand*)command {
    NSString *anonymousId = [Purchasely anonymousUserId];
    [self successFor:command resultString:anonymousId];
}

- (void)allowDeeplink:(CDVInvokedUrlCommand*)command {
    BOOL allow = [[command argumentAtIndex:0] boolValue];
    [Purchasely allowDeeplink: allow];
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
    NSString *storeOfferId   = [command argumentAtIndex:1];

    dispatch_async(dispatch_get_main_queue(), ^{
        if (@available(iOS 12.2, *)) {
            [Purchasely signPromotionalOfferWithStoreProductId:storeProductId storeOfferId:storeOfferId success:^(PLYOfferSignature * _Nonnull signature) {
                NSDictionary* result = [self resultSignatureForSignPromoOffer:signature];
                [self successFor:command resultDict:result];
            } failure:^(NSError * _Nullable error) {
                [self failureFor:command resultString:error.localizedDescription];
            }];
        } else {
            [self failureFor:command resultString:@"This functionality is unavailable before iOS 12.2"];
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

- (void)userDidConsumeSubscriptionContent:(CDVInvokedUrlCommand*)command {
    [Purchasely userDidConsumeSubscriptionContent];
}

#pragma mark - user attributes

- (PLYDataProcessingLegalBasis)legalBasisFromArg:(NSString *)arg {
    if ([arg isEqualToString:@"ESSENTIAL"]) { return PLYDataProcessingLegalBasisEssential; }
    return PLYDataProcessingLegalBasisOptional;
}

- (void)setUserAttributeWithStringArray:(CDVInvokedUrlCommand*)command {
    NSString *key   = [command argumentAtIndex:0];
    NSArray<NSString *> *array = [command argumentAtIndex:1];
    PLYDataProcessingLegalBasis lb = [self legalBasisFromArg:[command argumentAtIndex:2]];
    [Purchasely setUserAttributeWithStringArray:array forKey:key processingLegalBasis:lb];
}

- (void)setUserAttributeWithBooleanArray:(CDVInvokedUrlCommand*)command {
    NSString *key   = [command argumentAtIndex:0];
    NSArray *values = [command argumentAtIndex:1];
    PLYDataProcessingLegalBasis lb = [self legalBasisFromArg:[command argumentAtIndex:2]];
    NSMutableArray<NSNumber *> *boolArray = [NSMutableArray array];
    for (id value in values) { [boolArray addObject:@([value boolValue])]; }
    [Purchasely setUserAttributeWithBoolArray:boolArray forKey:key processingLegalBasis:lb];
}

- (void)setUserAttributeWithIntArray:(CDVInvokedUrlCommand*)command {
    NSString *key   = [command argumentAtIndex:0];
    NSArray *values = [command argumentAtIndex:1];
    PLYDataProcessingLegalBasis lb = [self legalBasisFromArg:[command argumentAtIndex:2]];
    NSMutableArray<NSNumber *> *intArray = [NSMutableArray array];
    for (id val in values) { [intArray addObject:@([val intValue])]; }
    [Purchasely setUserAttributeWithIntArray:intArray forKey:key processingLegalBasis:lb];
}

- (void)setUserAttributeWithDoubleArray:(CDVInvokedUrlCommand*)command {
    NSString *key   = [command argumentAtIndex:0];
    NSArray *values = [command argumentAtIndex:1];
    PLYDataProcessingLegalBasis lb = [self legalBasisFromArg:[command argumentAtIndex:2]];
    NSMutableArray<NSNumber *> *doubleArray = [NSMutableArray array];
    for (id val in values) { [doubleArray addObject:@([val doubleValue])]; }
    [Purchasely setUserAttributeWithDoubleArray:doubleArray forKey:key processingLegalBasis:lb];
}

- (void)setUserAttributeWithString:(CDVInvokedUrlCommand*)command {
    NSString *key   = [command argumentAtIndex:0];
    NSString *value = [command argumentAtIndex:1];
    PLYDataProcessingLegalBasis lb = [self legalBasisFromArg:[command argumentAtIndex:2]];
    [Purchasely setUserAttributeWithStringValue:value forKey:key processingLegalBasis:lb];
}

- (void)setUserAttributeWithBoolean:(CDVInvokedUrlCommand*)command {
    NSString *key = [command argumentAtIndex:0];
    BOOL value    = [[command argumentAtIndex:1] boolValue];
    PLYDataProcessingLegalBasis lb = [self legalBasisFromArg:[command argumentAtIndex:2]];
    [Purchasely setUserAttributeWithBoolValue:value forKey:key processingLegalBasis:lb];
}

- (void)setUserAttributeWithInt:(CDVInvokedUrlCommand*)command {
    NSString *key   = [command argumentAtIndex:0];
    NSInteger value = [[command argumentAtIndex:1] intValue];
    PLYDataProcessingLegalBasis lb = [self legalBasisFromArg:[command argumentAtIndex:2]];
    [Purchasely setUserAttributeWithIntValue:value forKey:key processingLegalBasis:lb];
}

- (void)setUserAttributeWithDouble:(CDVInvokedUrlCommand*)command {
    NSString *key = [command argumentAtIndex:0];
    double value  = [[command argumentAtIndex:1] doubleValue];
    PLYDataProcessingLegalBasis lb = [self legalBasisFromArg:[command argumentAtIndex:2]];
    [Purchasely setUserAttributeWithDoubleValue:value forKey:key processingLegalBasis:lb];
}

- (void)setUserAttributeWithDate:(CDVInvokedUrlCommand*)command {
    NSString *key   = [command argumentAtIndex:0];
    NSString *value = [command argumentAtIndex:1];
    PLYDataProcessingLegalBasis lb = [self legalBasisFromArg:[command argumentAtIndex:2]];

    NSDateFormatter *dateFormatter = [NSDateFormatter new];
    dateFormatter.timeZone = [NSTimeZone timeZoneWithName:@"GMT"];
    [dateFormatter setDateFormat:@"yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"];
    NSDate *date = [dateFormatter dateFromString:value];

    if (date != nil) {
        [Purchasely setUserAttributeWithDateValue:date forKey:key processingLegalBasis:lb];
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
        NSDateFormatter *dateFormatter = [NSDateFormatter new];
        dateFormatter.timeZone = [NSTimeZone timeZoneWithName:@"GMT"];
        [dateFormatter setDateFormat:@"yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"];
        return [dateFormatter stringFromDate:value];
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

#pragma mark - helpers

- (NSDictionary *)resultSignatureForSignPromoOffer:(PLYOfferSignature * _Nullable) signature  {
    NSMutableDictionary<NSString *, NSObject *> *dict = [NSMutableDictionary new];
    [dict setObject:signature.planVendorId forKey:@"planVendorId"];
    [dict setObject:signature.identifier forKey:@"identifier"];
    [dict setObject:signature.signature forKey:@"signature"];
    [dict setObject:signature.keyIdentifier forKey:@"keyIdentifier"];
    NSString *nonceString = [signature.nonce UUIDString];
    if (nonceString != nil) { [dict setObject:nonceString forKey:@"nonce"]; }
    NSNumber *timestamp = [NSNumber numberWithDouble:signature.timestamp];
    if (timestamp != nil) { [dict setObject:timestamp forKey:@"timestamp"]; }
    return dict;
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

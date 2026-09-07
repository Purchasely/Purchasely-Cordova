//
//  CDVPurchasely.h
//  Purchasely Cordova Plugin
//
//  Created by Jean-François GRANG on 15/07/2021.
//

#import <Cordova/CDVPlugin.h>
#import <Purchasely/Purchasely-Swift.h>

/// How the `proxy` start option resolves. Purchasely 6.1.0.
///
/// The three JS states are NOT interchangeable, and a fourth case exists for a value the
/// bridge cannot convert. `proxyWithApi:` takes an `NSURL *_Nullable`, where nil means
/// CLEAR, so an unconvertible string must skip the modifier rather than pass nil: passing
/// nil would silently disable a proxy the app explicitly asked for, because of a typo.
typedef NS_ENUM(NSInteger, CDVPurchaselyProxyOption) {
    /// The key is absent. Make no native call: leave the current setting untouched.
    CDVPurchaselyProxyOptionAbsent = 0,
    /// The key is present and null. Call `proxyWithApi:nil` to clear the proxy.
    CDVPurchaselyProxyOptionClear,
    /// The key holds a convertible string. Call `proxyWithApi:` with the URL.
    CDVPurchaselyProxyOptionSet,
    /// The key holds a string `NSURL` cannot convert. Log and make no native call.
    CDVPurchaselyProxyOptionInvalid
};

// Protocol conformance (PLYEventDelegate / PLYUserAttributeDelegate) is declared on the
// CDVPurchasely (Events) and (UserAttributes) categories, which implement the delegate methods.
@interface CDVPurchasely : CDVPlugin {
}

/// Resolve the `proxy` start option to one of the four cases above.
///
/// Pure, and exposed so a unit test drives the real bridge logic instead of a copy. `value`
/// is the raw option, so `nil` for an absent key and `NSNull` for an explicit JS null.
/// `outUrl` receives the URL only for `CDVPurchaselyProxyOptionSet`.
+ (CDVPurchaselyProxyOption)proxyOptionFor:(id _Nullable)value url:(NSURL * _Nullable * _Nullable)outUrl;

/// Build the flat 5-key body a settled Web2App redemption reports to JS.
///
/// Takes primitives rather than a `PLYWebRedemptionResult`, because that class declares
/// `init` unavailable and a test cannot construct one. `hasContext` is separate from
/// `subscription` on purpose: a present context carrying no subscription is NOT the same as
/// no context at all, and both must stay expressible.
///
/// Exposed so the XCTest target asserts the real shape the delegate emits, rather than a
/// copy of it. Matches the React Native bridge's seam of the same name.
+ (NSDictionary<NSString *, id> * _Nonnull)webRedemptionBodyWithSuccess:(BOOL)isSuccess
                                                             hasContext:(BOOL)hasContext
                                                           subscription:(NSDictionary * _Nullable)subscription
                                                                 replay:(BOOL)replay
                                                              errorCode:(NSString * _Nullable)errorCode
                                                           errorMessage:(NSString * _Nullable)errorMessage;

/// Parse a canonical UUID string, or return nil.
///
/// JS has no UUID type, so an anonymous user id crosses the bridge as a string. Exposed so
/// a unit test can pin the cross-platform contract: this refuses the lenient short form
/// (`"1-2-3-4-5"`) that Android's `UUID.fromString` accepts, which is why the Android
/// bridge adds a round-trip check.
+ (NSUUID * _Nullable)canonicalUUIDFromString:(id _Nullable)value;

// The presentation currently displayed (v6 uses id<PLYPresentation> for close()/back()).
@property (nonatomic, strong) id<PLYPresentation> currentPresentation;

@property CDVInvokedUrlCommand* purchasedCommand;
@property CDVInvokedUrlCommand* eventCommand;
@property CDVInvokedUrlCommand* attributeCommand;

// Purchasely 6.1.0. The command `addWebRedemptionListener` recorded, or nil. The
// PLYWebRedemptionDelegate is registered on the builder chain in `start:` (the native SDK
// has no runtime setter), so this is the only switch: nil makes
// `webRedemptionCompletedWithResult:` a no-op.
@property CDVInvokedUrlCommand* webRedemptionCommand;

@property (nonatomic) NSMutableArray<id<PLYPresentation>> *presentationsLoaded;

@property (nonatomic) CDVInvokedUrlCommand* purchaseResolve;

// v6 per-action interceptor state. Each registered action kind keeps its own
// Cordova callbackId (to emit intercept events); each intercepted invocation
// stashes its PLYInterceptResult completion under a unique id so concurrent
// intercepts resolve independently (was a single stashed completion before).
@property (nonatomic, strong) NSMutableDictionary<NSString *, NSString *> *actionInterceptorCallbackIds;
@property (nonatomic, strong) NSMutableDictionary<NSString *, void (^)(enum PLYInterceptResult)> *pendingInterceptCompletions;
@property (nonatomic) NSUInteger interceptorInvocationCounter;

- (void)start:(CDVInvokedUrlCommand*)command;
- (void)setLogLevel:(CDVInvokedUrlCommand*)command;
- (void)userLogin:(CDVInvokedUrlCommand*)command;
- (void)userLogout:(CDVInvokedUrlCommand*)command;
- (void)setAttribute:(CDVInvokedUrlCommand*)command;
- (void)getAnonymousUserId:(CDVInvokedUrlCommand*)command;
- (void)isAnonymous:(CDVInvokedUrlCommand*)command;
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
- (void)releaseCallbackStream:(CDVInvokedUrlCommand * _Nullable)command;
- (void)addWebRedemptionListener:(CDVInvokedUrlCommand*)command;
- (void)removeWebRedemptionListener:(CDVInvokedUrlCommand*)command;
- (void)registerActionInterceptor:(CDVInvokedUrlCommand*)command;
- (void)unregisterActionInterceptor:(CDVInvokedUrlCommand*)command;
- (void)completeActionInterceptor:(CDVInvokedUrlCommand*)command;
- (void)closePresentation:(CDVInvokedUrlCommand*)command;
- (void)closeAllScreens:(CDVInvokedUrlCommand*)command;
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
- (void)userAttributes:(CDVInvokedUrlCommand*)command;
- (void)incrementUserAttribute:(CDVInvokedUrlCommand*)command;
- (void)decrementUserAttribute:(CDVInvokedUrlCommand*)command;
- (void)clearUserAttribute:(CDVInvokedUrlCommand*)command;
- (void)clearUserAttributes:(CDVInvokedUrlCommand*)command;
- (void)clearBuiltInAttributes:(CDVInvokedUrlCommand*)command;
- (void)getBuiltInAttributes:(CDVInvokedUrlCommand*)command;
- (void)getBuiltInAttribute:(CDVInvokedUrlCommand*)command;
- (void)fetchPresentation:(CDVInvokedUrlCommand*)command;
- (void)presentPresentation:(CDVInvokedUrlCommand*)command;
- (void)signPromotionalOffer:(CDVInvokedUrlCommand*)command;
- (void)isEligibleForIntroOffer:(CDVInvokedUrlCommand*)command;
- (void)setThemeMode:(CDVInvokedUrlCommand*)command;
- (void)addUserAttributeListener:(CDVInvokedUrlCommand*)command;
- (void)setDynamicOffering:(CDVInvokedUrlCommand*)command;
- (void)getDynamicOfferings:(CDVInvokedUrlCommand*)command;
- (void)removeDynamicOffering:(CDVInvokedUrlCommand*)command;
- (void)clearDynamicOfferings:(CDVInvokedUrlCommand*)command;

@end

//
//  CDVPurchaselyLifecycleTests.m
//  Regression cover for the nil-collections bug (support conversation ad73ac28, PR #66).
//
//  CDVPurchasely used to allocate its mutable collections in an -init override. A
//  subclass -init override runs only if the host calls [self init]:
//
//    | Host                       | -initWithWebViewEngine: | -init override runs |
//    |----------------------------|-------------------------|---------------------|
//    | cordova-ios 5.1.1 - 6.3.0  | [super init]            | No                  |
//    | cordova-ios 7.0.0+         | [self init]             | Yes                 |
//    | Capacitor 6, 7, 8, main    | [super init]            | No                  |
//
//  [super init] from inside CDVPlugin dispatches to NSObject, which never reaches the
//  subclass. On those hosts the collections stayed nil, and a write into a nil
//  NSMutableDictionary/NSMutableArray is a silent no-op: no crash, no warning, no log.
//  Every interceptor callbackId and every preloaded presentation was dropped.
//
//  These tests instantiate the plugin through the exact Capacitor path and assert the
//  state both exists and retains a write. They are offline: no network, no store, no
//  SDK start, no simulator UI.
//

#import <XCTest/XCTest.h>
#import <WebKit/WebKit.h>
#import "CDVPurchasely.h"

/// Records what the bridge hands to Cordova.
///
/// The SDK's own behaviour is out of scope for these tests; the bridge boundary is not.
/// Only -sendPluginResult:callbackId: does anything, the rest satisfies the protocol.
@interface CDVFakeCommandDelegate : NSObject <CDVCommandDelegate>
@property (nonatomic, strong) NSMutableArray<CDVPluginResult *> *results;
@property (nonatomic, strong) NSMutableArray<NSString *> *callbackIds;
@end

@implementation CDVFakeCommandDelegate
@synthesize urlTransformer;

- (instancetype)init {
    self = [super init];
    if (self) {
        _results = [NSMutableArray new];
        _callbackIds = [NSMutableArray new];
    }
    return self;
}

- (void)sendPluginResult:(CDVPluginResult *)result callbackId:(NSString *)callbackId {
    [self.results addObject:result];
    [self.callbackIds addObject:callbackId ?: @""];
}

- (NSDictionary *)settings { return @{}; }
- (NSString *)pathForResource:(NSString *)resourcepath { return nil; }
- (id)getCommandInstance:(NSString *)pluginName { return nil; }
- (void)evalJs:(NSString *)js {}
- (void)evalJs:(NSString *)js scheduledOnRunLoop:(BOOL)scheduledOnRunLoop {}
- (void)evalJsHelper2:(NSString *)js {}
- (void)runInBackground:(void (^)(void))block { if (block) block(); }
@end

@interface CDVPurchaselyLifecycleTests : XCTestCase
@end

@implementation CDVPurchaselyLifecycleTests

// Build the plugin the way Capacitor's CDVPluginManager does: alloc +
// initWithWebViewEngine: (whose [super init] skips any subclass -init), then
// pluginInitialize once the host has assigned viewController/webView/commandDelegate.
// See ios/CapacitorCordova/CapacitorCordova/Classes/Public/CDVPluginManager.m:58-65.
- (CDVPurchasely *)pluginBuiltTheCapacitorWay {
    WKWebView *webView = [[WKWebView alloc] initWithFrame:CGRectZero];
    CDVPurchasely *plugin = [[CDVPurchasely alloc] initWithWebViewEngine:webView];
    [plugin pluginInitialize];
    return plugin;
}

- (void)testCollectionsAreAllocatedOnTheCapacitorInitPath {
    CDVPurchasely *plugin = [self pluginBuiltTheCapacitorWay];

    XCTAssertNotNil(plugin.presentationsLoaded,
                    @"presentationsLoaded is nil: preload() drops the presentation and "
                    @"display() then fails with \"Presentation not loaded\".");
    XCTAssertNotNil(plugin.actionInterceptorCallbackIds,
                    @"actionInterceptorCallbackIds is nil: registerActionInterceptor "
                    @"drops its callbackId and every intercepted action completes "
                    @".notHandled without reaching JS.");
    XCTAssertNotNil(plugin.pendingInterceptCompletions,
                    @"pendingInterceptCompletions is nil: completeActionInterceptor can "
                    @"never resolve an intercepted action.");
}

// The assertion above is necessary but not sufficient on its own: the failure mode here
// is a silent no-op write, so assert the collections actually retain what is put in
// them. This is the mechanism the bug exploited, stated directly.
- (void)testInterceptorCallbackIdSurvivesAWrite {
    CDVPurchasely *plugin = [self pluginBuiltTheCapacitorWay];

    plugin.actionInterceptorCallbackIds[@"purchase"] = @"callback-1";

    XCTAssertEqualObjects(plugin.actionInterceptorCallbackIds[@"purchase"], @"callback-1",
                          @"The interceptor callbackId did not survive the write. A "
                          @"subscript write into a nil dictionary is discarded silently.");
}

- (void)testPreloadedPresentationSurvivesAWrite {
    CDVPurchasely *plugin = [self pluginBuiltTheCapacitorWay];

    // Any object stands in for a presentation here: the bug is in the container, not in
    // what it holds, and building a real PLYPresentation would need a started SDK.
    [plugin.presentationsLoaded addObject:[NSObject new]];

    XCTAssertEqual(plugin.presentationsLoaded.count, (NSUInteger)1,
                   @"The preloaded presentation did not survive addObject:. Sending "
                   @"addObject: to a nil array is discarded silently.");
}

#pragma mark - Web2App redemption (6.1.0)

// `start:` registers the plugin as the PLYWebRedemptionDelegate on the builder chain
// (`webRedemptionDelegate:appHandlesRedemptionAlert:`), so it must conform. The conformance
// is declared on the (Events) category, which is easy to lose in a header edit and which
// the compiler does not catch: passing a non-conforming object there is a warning, not an
// error, and the redemption outcome then reaches nobody.
- (void)testPluginConformsToWebRedemptionDelegate {
    CDVPurchasely *plugin = [self pluginBuiltTheCapacitorWay];

    XCTAssertTrue([plugin conformsToProtocol:@protocol(PLYWebRedemptionDelegate)],
                  @"CDVPurchasely should conform to PLYWebRedemptionDelegate.");
    // Swift `webRedemptionCompleted(result:)` bridges to this selector.
    XCTAssertTrue([plugin respondsToSelector:@selector(webRedemptionCompletedWithResult:)],
                  @"The web redemption delegate callback should be implemented.");
}

// The two JS actions are dispatched by selector name, so a rename breaks the bridge with
// no compile error: Cordova answers "Invalid action" at runtime instead.
- (void)testWebRedemptionListenerActionsAreBridged {
    CDVPurchasely *plugin = [self pluginBuiltTheCapacitorWay];

    XCTAssertTrue([plugin respondsToSelector:@selector(addWebRedemptionListener:)],
                  @"addWebRedemptionListener: should be reachable from the bridge.");
    XCTAssertTrue([plugin respondsToSelector:@selector(removeWebRedemptionListener:)],
                  @"removeWebRedemptionListener: should be reachable from the bridge.");
}

// The delegate is registered unconditionally at start(), so the outcome callback runs even
// when JS added no listener. It must return early rather than send a plugin result on a nil
// callbackId.
- (void)testRedemptionOutcomeIsANoOpWithNoListener {
    CDVPurchasely *plugin = [self pluginBuiltTheCapacitorWay];

    XCTAssertNil(plugin.webRedemptionCommand,
                 @"No listener is recorded before addWebRedemptionListener runs.");
    // Called through the protocol: the implementation lives on the (Events) category, whose
    // header the test target does not compile. A nil result would crash a callback that
    // dereferenced it before the nil-command guard, which is the ordering this asserts.
    id<PLYWebRedemptionDelegate> delegate = (id<PLYWebRedemptionDelegate>)plugin;
    XCTAssertNoThrow([delegate webRedemptionCompletedWithResult:(PLYWebRedemptionResult * _Nonnull)nil],
                     @"The redemption callback should return early when no listener is recorded.");
}

#pragma mark - proxy: the three states (6.1.0)

// Both natives treat null as "clear the proxy and return to api.purchasely.io", which is
// a supported operation and not an error. The bridge therefore has to keep three states
// apart, plus a fourth case for a value NSURL cannot convert.
//
// These drive +proxyOptionFor:url:, the same resolver -start: switches on, so they cover
// the shipped logic rather than a copy of it.

- (void)testProxyAbsentKeyMakesNoNativeCall {
    NSURL *url = [NSURL URLWithString:@"https://sentinel.example"];

    // A missing key reads as nil out of an NSDictionary.
    CDVPurchaselyProxyOption option = [CDVPurchasely proxyOptionFor:nil url:&url];

    XCTAssertEqual(option, CDVPurchaselyProxyOptionAbsent,
                   @"An absent key must leave the current setting untouched. Resolving it "
                   @"as Clear would turn every start into an implicit clear.");
    XCTAssertNil(url, @"The resolver must clear outUrl before it returns.");
}

- (void)testProxyExplicitNullClears {
    // A JS null crosses JSON as NSNull, never as nil.
    CDVPurchaselyProxyOption option = [CDVPurchasely proxyOptionFor:[NSNull null] url:NULL];

    XCTAssertEqual(option, CDVPurchaselyProxyOptionClear,
                   @"An explicit null must resolve as Clear. Resolving it as Absent makes "
                   @"a requested clear silently do nothing.");
}

- (void)testProxyUrlStringResolvesToSet {
    NSURL *url = nil;

    CDVPurchaselyProxyOption option = [CDVPurchasely proxyOptionFor:@"https://svc.purchasely.io"
                                                                url:&url];

    XCTAssertEqual(option, CDVPurchaselyProxyOptionSet);
    XCTAssertEqualObjects(url.absoluteString, @"https://svc.purchasely.io");
}

// The distinction the whole change exists for, asserted against itself rather than as two
// separate expectations that could both drift the same way.
- (void)testProxyAbsentAndClearAreDifferentOutcomes {
    CDVPurchaselyProxyOption absent = [CDVPurchasely proxyOptionFor:nil url:NULL];
    CDVPurchaselyProxyOption clear = [CDVPurchasely proxyOptionFor:[NSNull null] url:NULL];

    XCTAssertNotEqual(absent, clear,
                      @"Absent and Clear must not collapse into one outcome.");
}

// THE TRAP. proxyWithApi: takes an NSURL *_Nullable where nil means CLEAR, not "ignore
// this value". So an unconvertible string must skip the modifier: passing nil would
// silently disable a proxy the app explicitly asked for, because of a typo.
- (void)testProxyUnconvertibleStringIsInvalidAndNotAClear {
    NSURL *url = [NSURL URLWithString:@"https://sentinel.example"];

    // A bare space is not a legal URL character, so NSURL returns nil for this string.
    CDVPurchaselyProxyOption option = [CDVPurchasely proxyOptionFor:@"ht tp://nope" url:&url];

    XCTAssertEqual(option, CDVPurchaselyProxyOptionInvalid,
                   @"A string NSURL cannot convert must resolve as Invalid, so -start: "
                   @"skips the modifier.");
    XCTAssertNotEqual(option, CDVPurchaselyProxyOptionClear,
                      @"Invalid must never resolve as Clear: a typo would then disable a "
                      @"proxy the app asked for.");
    XCTAssertNil(url, @"Invalid must not hand back a URL.");
}

- (void)testProxyNonStringIsInvalid {
    XCTAssertEqual([CDVPurchasely proxyOptionFor:@42 url:NULL], CDVPurchaselyProxyOptionInvalid);
    XCTAssertEqual([CDVPurchasely proxyOptionFor:@[@"x"] url:NULL], CDVPurchaselyProxyOptionInvalid);
}

// The bridge deliberately does NOT check the scheme, the host, a query, a fragment or
// credentials. Each native SDK refuses those with an error log and keeps the production
// host, and it drops a trailing slash. Re-checking here would diverge from that contract.
- (void)testProxyDoesNotValidateTheSchemeOrHost {
    NSURL *url = nil;

    XCTAssertEqual([CDVPurchasely proxyOptionFor:@"http://insecure.example" url:&url],
                   CDVPurchaselyProxyOptionSet,
                   @"An http value converts, so the bridge forwards it and the SDK refuses it.");

    XCTAssertEqual([CDVPurchasely proxyOptionFor:@"https://svc.purchasely.io/?a=b#c" url:&url],
                   CDVPurchaselyProxyOptionSet,
                   @"A query and a fragment convert, so the SDK is the one that refuses them.");
}

#pragma mark - anonymous user id (6.1.0)

- (void)testCanonicalUUIDAcceptsACanonicalString {
    NSUUID *parsed = [CDVPurchasely canonicalUUIDFromString:@"3f2504e0-4f89-11d3-9a0c-0305e82c3301"];

    XCTAssertNotNil(parsed);
    XCTAssertEqualObjects(parsed.UUIDString.lowercaseString,
                          @"3f2504e0-4f89-11d3-9a0c-0305e82c3301");
}

- (void)testCanonicalUUIDAcceptsAnUppercaseString {
    XCTAssertNotNil([CDVPurchasely canonicalUUIDFromString:@"3F2504E0-4F89-11D3-9A0C-0305E82C3301"]);
}

// This is the case that forces the Android bridge to add a round-trip check:
// UUID.fromString accepts this short form, NSUUID does not. Pinning the iOS side here is
// what makes "canonical" mean the same thing on both platforms.
- (void)testCanonicalUUIDRefusesTheLenientShortForm {
    XCTAssertNil([CDVPurchasely canonicalUUIDFromString:@"1-2-3-4-5"],
                 @"NSUUID refuses the short form, so Android must refuse it too.");
}

- (void)testCanonicalUUIDRefusesANonUuid {
    XCTAssertNil([CDVPurchasely canonicalUUIDFromString:@"not-a-uuid"]);
    XCTAssertNil([CDVPurchasely canonicalUUIDFromString:@""]);
    XCTAssertNil([CDVPurchasely canonicalUUIDFromString:@"3f2504e0-4f89-11d3-9a0c"]);
}

- (void)testCanonicalUUIDRefusesANonString {
    XCTAssertNil([CDVPurchasely canonicalUUIDFromString:nil]);
    XCTAssertNil([CDVPurchasely canonicalUUIDFromString:[NSNull null]]);
    XCTAssertNil([CDVPurchasely canonicalUUIDFromString:@42]);
}
#pragma mark - teardown: no stale callback commands

// Cordova calls -onReset when the WebView navigates, which invalidates every callbackId
// the previous page handed over. Without clearing them the stored commands stay live and
// every listener callback afterwards is sent to a dead callbackId.
//
// The redemption case is the one that matters most. `webRedemptionDelegate:` is fixed on
// the builder at -start: and -start: cannot run twice, so the SDK keeps calling this
// object for the whole process lifetime. -webRedemptionCompletedWithResult: reads
// webRedemptionCommand at fire time, which is what lets a reloaded page re-register and
// keep working; clearing is what makes the window in between a clean no-op.
- (void)testOnResetClearsEveryStoredCommand {
    CDVPurchasely *plugin = [self pluginBuiltTheCapacitorWay];
    plugin.eventCommand = (CDVInvokedUrlCommand *)[NSObject new];
    plugin.attributeCommand = (CDVInvokedUrlCommand *)[NSObject new];
    plugin.webRedemptionCommand = (CDVInvokedUrlCommand *)[NSObject new];
    plugin.purchasedCommand = (CDVInvokedUrlCommand *)[NSObject new];

    [plugin onReset];

    XCTAssertNil(plugin.eventCommand);
    XCTAssertNil(plugin.attributeCommand);
    XCTAssertNil(plugin.webRedemptionCommand,
                 @"a surviving handle sends the next redemption outcome to a dead callbackId");
    XCTAssertNil(plugin.purchasedCommand);
}

// The delegate stays registered for the process lifetime, so the callback runs after a
// reload too. With the command cleared it must be a no-op rather than a send on a dead id.
- (void)testRedemptionOutcomeIsANoOpAfterAReset {
    CDVPurchasely *plugin = [self pluginBuiltTheCapacitorWay];
    plugin.webRedemptionCommand = (CDVInvokedUrlCommand *)[NSObject new];

    [plugin onReset];

    id<PLYWebRedemptionDelegate> delegate = (id<PLYWebRedemptionDelegate>)plugin;
    XCTAssertNoThrow([delegate webRedemptionCompletedWithResult:(PLYWebRedemptionResult * _Nonnull)nil],
                     @"the redemption callback must return early once the command is cleared");
}
#pragma mark - the redemption body's five-key contract (6.1.0)

// Every key is present on both branches, so one JS listener reads one shape whether the
// redemption was granted or refused. Absence is NSNull, never a missing key: a missing key
// reaches JS as `undefined` instead of `null`, which silently changes what the listener can
// rely on.
//
// These drive +webRedemptionBodyWithSuccess:..., the same builder the delegate uses.
// PLYWebRedemptionResult declares `init` unavailable, so a test cannot construct one, which
// is why the builder takes primitives.
- (void)assertWebRedemptionShape:(NSDictionary *)body {
    XCTAssertEqual(body.count, (NSUInteger)5, @"the body must always carry exactly five keys");
    for (NSString *key in @[@"isSuccess", @"context", @"replay", @"errorCode", @"errorMessage"]) {
        XCTAssertNotNil(body[key], @"%@ must be present", key);
    }
}

- (void)testRedemptionBodySuccessWithNoContext {
    NSDictionary *body = [CDVPurchasely webRedemptionBodyWithSuccess:YES
                                                          hasContext:NO
                                                        subscription:nil
                                                              replay:NO
                                                           errorCode:nil
                                                        errorMessage:nil];

    [self assertWebRedemptionShape:body];
    XCTAssertEqualObjects(body[@"isSuccess"], @YES);
    XCTAssertEqualObjects(body[@"context"], [NSNull null],
                          @"no context at all must be NSNull, not an empty dictionary");
    XCTAssertEqualObjects(body[@"replay"], @NO);
    XCTAssertEqualObjects(body[@"errorCode"], [NSNull null]);
    XCTAssertEqualObjects(body[@"errorMessage"], [NSNull null]);
}

// A present context holding no subscription is NOT the same as no context. Both levels stay
// separately nullable, matching the Android bridge.
- (void)testRedemptionBodyKeepsAPresentContextWithNoSubscription {
    NSDictionary *body = [CDVPurchasely webRedemptionBodyWithSuccess:YES
                                                          hasContext:YES
                                                        subscription:nil
                                                              replay:NO
                                                           errorCode:nil
                                                        errorMessage:nil];

    [self assertWebRedemptionShape:body];
    NSDictionary *context = body[@"context"];
    XCTAssertTrue([context isKindOfClass:[NSDictionary class]],
                  @"a present context must be a dictionary, not NSNull");
    XCTAssertNotNil(context[@"subscription"], @"the subscription key must be present");
    XCTAssertEqualObjects(context[@"subscription"], [NSNull null],
                          @"and hold NSNull, not be missing");
}

- (void)testRedemptionBodyCarriesAPresentSubscription {
    NSDictionary *body = [CDVPurchasely webRedemptionBodyWithSuccess:YES
                                                          hasContext:YES
                                                        subscription:@{ @"plan": @{ @"vendorId": @"monthly" } }
                                                              replay:NO
                                                           errorCode:nil
                                                        errorMessage:nil];

    [self assertWebRedemptionShape:body];
    XCTAssertEqualObjects(body[@"context"][@"subscription"][@"plan"][@"vendorId"], @"monthly");
}

- (void)testRedemptionBodyReportsAReplayedToken {
    NSDictionary *body = [CDVPurchasely webRedemptionBodyWithSuccess:YES
                                                          hasContext:NO
                                                        subscription:nil
                                                              replay:YES
                                                           errorCode:nil
                                                        errorMessage:nil];

    XCTAssertEqualObjects(body[@"replay"], @YES);
}

// A failure still reports replay and context, so the shape never changes between branches.
- (void)testRedemptionBodyFailureKeepsTheShapeStable {
    NSDictionary *body = [CDVPurchasely webRedemptionBodyWithSuccess:NO
                                                          hasContext:NO
                                                        subscription:nil
                                                              replay:NO
                                                           errorCode:@"EXPIRED_REDEMPTION_TOKEN"
                                                        errorMessage:@"Redemption link has expired."];

    [self assertWebRedemptionShape:body];
    XCTAssertEqualObjects(body[@"isSuccess"], @NO);
    XCTAssertEqualObjects(body[@"context"], [NSNull null]);
    XCTAssertEqualObjects(body[@"replay"], @NO);
    XCTAssertEqualObjects(body[@"errorCode"], @"EXPIRED_REDEMPTION_TOKEN");
    XCTAssertEqualObjects(body[@"errorMessage"], @"Redemption link has expired.");
}

// A transport or parsing failure never reached the server, so it carries no code.
- (void)testRedemptionBodyFailureWithNoErrorCode {
    NSDictionary *body = [CDVPurchasely webRedemptionBodyWithSuccess:NO
                                                          hasContext:NO
                                                        subscription:nil
                                                              replay:NO
                                                           errorCode:nil
                                                        errorMessage:@"Network error"];

    [self assertWebRedemptionShape:body];
    XCTAssertEqualObjects(body[@"errorCode"], [NSNull null]);
    XCTAssertEqualObjects(body[@"errorMessage"], @"Network error");
}
#pragma mark - callback streams (6.1.0)

// Everything below drives the real bridge with a FAKE command delegate. The SDK's own
// behaviour is out of scope; what matters is what the bridge hands to Cordova.
//
// `commandDelegate` is a weak property, so the test holds the fake itself.

- (CDVInvokedUrlCommand *)commandWithId:(NSString *)callbackId {
    return [[CDVInvokedUrlCommand alloc] initWithArguments:@[]
                                               callbackId:callbackId
                                                className:@"CDVPurchasely"
                                               methodName:@"test"];
}

// A listener's stream must be CLOSED when it is replaced or removed, or its JavaScript
// closure stays in cordova.callbacks until the WebView reloads. NO_RESULT with
// keepCallback NO is cordova.js's documented way to free it without invoking the callbacks.
- (void)testReleaseCallbackStreamSendsATerminalNoResult {
    CDVPurchasely *plugin = [self pluginBuiltTheCapacitorWay];
    CDVFakeCommandDelegate *delegate = [CDVFakeCommandDelegate new];
    plugin.commandDelegate = delegate;

    [plugin releaseCallbackStream:[self commandWithId:@"cb-1"]];

    XCTAssertEqual(delegate.results.count, (NSUInteger)1);
    XCTAssertEqualObjects(delegate.callbackIds.firstObject, @"cb-1");
    XCTAssertEqualObjects(delegate.results.firstObject.status, @(CDVCommandStatus_NO_RESULT),
                          @"NO_RESULT frees the entry without invoking success or error");
    XCTAssertEqualObjects(delegate.results.firstObject.keepCallback, @NO,
                          @"keepCallback must be NO, or the entry is never deleted");
}

- (void)testReleaseCallbackStreamIgnoresNil {
    CDVPurchasely *plugin = [self pluginBuiltTheCapacitorWay];
    CDVFakeCommandDelegate *delegate = [CDVFakeCommandDelegate new];
    plugin.commandDelegate = delegate;

    [plugin releaseCallbackStream:nil];

    XCTAssertEqual(delegate.results.count, (NSUInteger)0);
}

- (void)testRegisteringTwiceClosesTheStreamItReplaces {
    CDVPurchasely *plugin = [self pluginBuiltTheCapacitorWay];
    CDVFakeCommandDelegate *delegate = [CDVFakeCommandDelegate new];
    plugin.commandDelegate = delegate;

    [plugin addWebRedemptionListener:[self commandWithId:@"first"]];
    [plugin addWebRedemptionListener:[self commandWithId:@"second"]];

    XCTAssertEqual(delegate.results.count, (NSUInteger)1,
                   @"exactly the replaced listener is closed");
    XCTAssertEqualObjects(delegate.callbackIds.firstObject, @"first");
    XCTAssertEqualObjects(delegate.results.firstObject.keepCallback, @NO);
    XCTAssertEqualObjects(plugin.webRedemptionCommand.callbackId, @"second",
                          @"the replacement is the live one");
}

- (void)testRemovingClosesTheStreamAndAcknowledgesTheCommand {
    CDVPurchasely *plugin = [self pluginBuiltTheCapacitorWay];
    CDVFakeCommandDelegate *delegate = [CDVFakeCommandDelegate new];
    plugin.commandDelegate = delegate;

    [plugin addWebRedemptionListener:[self commandWithId:@"listener"]];
    [plugin removeWebRedemptionListener:[self commandWithId:@"remove"]];

    XCTAssertNil(plugin.webRedemptionCommand);
    XCTAssertEqual(delegate.results.count, (NSUInteger)2);
    // The listener's stream is closed...
    XCTAssertEqualObjects(delegate.callbackIds[0], @"listener");
    XCTAssertEqualObjects(delegate.results[0].status, @(CDVCommandStatus_NO_RESULT));
    // ...and the remove answers, so ITS OWN callbackId is freed too.
    XCTAssertEqualObjects(delegate.callbackIds[1], @"remove");
    XCTAssertEqualObjects(delegate.results[1].status, @(CDVCommandStatus_OK));
    XCTAssertEqualObjects(delegate.results[1].keepCallback, @NO);
}

- (void)testRemovingWithNoListenerStillAcknowledges {
    CDVPurchasely *plugin = [self pluginBuiltTheCapacitorWay];
    CDVFakeCommandDelegate *delegate = [CDVFakeCommandDelegate new];
    plugin.commandDelegate = delegate;

    [plugin removeWebRedemptionListener:[self commandWithId:@"remove"]];

    XCTAssertEqual(delegate.results.count, (NSUInteger)1);
    XCTAssertEqualObjects(delegate.callbackIds.firstObject, @"remove");
    XCTAssertEqualObjects(delegate.results.firstObject.status, @(CDVCommandStatus_OK));
}
@end

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
@end

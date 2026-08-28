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

@end

//
//  CDVPurchasely+Events.m
//  Purchasely Cordova Plugin
//
//  Created by Jean-François GRANG on 15/07/2021.
//

#import <Purchasely/Purchasely-Swift.h>
#import "CDVPurchasely+Events.h"
#import "Purchasely_Hybrid.h"

@implementation CDVPurchasely (Events)

- (void)eventTriggered:(enum PLYEvent)event properties:(NSDictionary<NSString *, id> * _Nullable)properties {
	if (self.eventCommand) {
		// CDV-W-01: properties is _Nullable; inserting nil into an ObjC dictionary LITERAL
		// throws NSInvalidArgumentException. Build it mutably and only set the key when non-nil.
		NSMutableDictionary<NSString *, id> *eventDict = [NSMutableDictionary new];
		[eventDict setObject:[NSString fromPLYEvent:event] forKey:@"name"];
		if (properties != nil) {
			[eventDict setObject:properties forKey:@"properties"];
		}
		CDVPluginResult* pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsDictionary:eventDict];

		[pluginResult setKeepCallbackAsBool:YES];
		[self.commandDelegate sendPluginResult:pluginResult callbackId:self.eventCommand.callbackId];
	}
}

/// `PLYWebRedemptionDelegate`. The SDK calls this on the main thread, once per settled
/// redemption, on success and on failure alike, and always after the matching
/// REDEMPTION_CONSUMED / REDEMPTION_FAILED event reached the event delegate.
///
/// Mapped to the flat 5-key shape the Android bridge emits, so one JS listener drives both
/// platforms. `context` and `context.subscription` stay separately nullable: a success can
/// carry no context at all, and a present context can carry no subscription.
///
/// `errorMessage` can hold the backend's masked email hint for an expired link. The
/// REDEMPTION_FAILED event drops that hint on purpose; this channel keeps it, so the app
/// can tell the user where the fresh link went.
- (void)webRedemptionCompletedWithResult:(PLYWebRedemptionResult * _Nonnull)result {
	if (self.webRedemptionCommand == nil) {
		return;
	}

	id context = [NSNull null];
	if (result.context != nil) {
		PLYSubscription *subscription = result.context.subscription;
		context = @{ @"subscription": subscription != nil ? subscription.asDictionary : [NSNull null] };
	}

	NSDictionary<NSString *, id> *body = @{
		@"isSuccess":    @(result.isSuccess),
		@"context":      context,
		@"replay":       @(result.replay),
		@"errorCode":    result.errorCode ?: [NSNull null],
		@"errorMessage": result.errorMessage ?: [NSNull null]
	};

	CDVPluginResult* pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsDictionary:body];
	[pluginResult setKeepCallbackAsBool:YES];
	[self.commandDelegate sendPluginResult:pluginResult callbackId:self.webRedemptionCommand.callbackId];
}

- (void)reloadContent: (NSNotification *)aNotification {
	if (self.purchasedCommand) {
		CDVPluginResult* pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
		[pluginResult setKeepCallbackAsBool:YES];
		[self.commandDelegate sendPluginResult:pluginResult callbackId:self.purchasedCommand.callbackId];
	}
}

@end

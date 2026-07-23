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

- (void)reloadContent: (NSNotification *)aNotification {
	if (self.purchasedCommand) {
		CDVPluginResult* pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
		[pluginResult setKeepCallbackAsBool:YES];
		[self.commandDelegate sendPluginResult:pluginResult callbackId:self.purchasedCommand.callbackId];
	}
}

@end

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
	NSDictionary<NSString *, id> *eventDict = @{@"name": [NSString fromPLYEvent:event], @"properties": properties};
	CDVPluginResult* pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsDictionary:eventDict];

	[pluginResult setKeepCallbackAsBool:YES];
	[self.commandDelegate sendPluginResult:pluginResult callbackId:self.eventCommand.callbackId];
}

@end

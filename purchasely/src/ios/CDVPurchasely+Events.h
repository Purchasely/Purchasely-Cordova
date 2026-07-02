//
//  CDVPurchasely+Events.h
//  Purchasely Cordova Plugin
//
//  Created by Jean-François GRANG on 15/07/2021.
//

#import <Cordova/CDVPlugin.h>
#import "CDVPurchasely.h"

@interface CDVPurchasely (Events) <PLYEventDelegate> {

}

- (void)reloadContent: (NSNotification *)aNotification;

@end

//
//  PLYSubscription+Hybrid.m
//  reactTutorialApp
//
//  Created by Jean-François GRANG on 27/12/2020.
//

#import "PLYSubscription+Hybrid.h"
#import "Purchasely_Hybrid.h"

@implementation PLYSubscription (Hybrid)

- (NSDictionary *)asDictionary {
	NSMutableDictionary<NSString *, NSObject *> *dict = [NSMutableDictionary new];

	[dict setObject:self.plan.asDictionary forKey:@"plan"];
	[dict setObject:self.product.asDictionary forKey:@"product"];
	[dict setObject:[NSNumber numberWithInt:self.subscriptionSource] forKey:@"subscriptionSource"];

	NSDateFormatter *dateFormat = [[NSDateFormatter alloc] init];
    [dateFormat setDateFormat:@"yyyy-MM-dd'T'HH:mm:ssZ"];
    
	if (self.nextRenewalDate != nil) {
		[dict setObject:[dateFormat stringFromDate:self.nextRenewalDate] forKey:@"nextRenewalDate"];
	}

	if (self.cancelledDate != nil) {
		[dict setObject:[dateFormat stringFromDate:self.cancelledDate] forKey:@"cancelledDate"];
	}

	// Commitment progress (iOS 26.4+ monthly commitment, e.g. billing period 3 of 12).
	// Apple-only and nil for every non-committed subscription, so the key is omitted then.
	// Mirrors PLYSubscription.commitmentProgress: PLYCommitmentProgress?
	PLYCommitmentProgress *commitmentProgress = self.commitmentProgress;
	if (commitmentProgress != nil) {
		[dict setObject:@{
			@"billingPeriodNumber":   @(commitmentProgress.billingPeriodNumber),
			@"totalBillingPeriods":   @(commitmentProgress.totalBillingPeriods),
			@"commitmentExpiresDate": [dateFormat stringFromDate:commitmentProgress.commitmentExpiresDate],
			@"commitmentPrice":       commitmentProgress.commitmentPrice
		} forKey:@"commitmentProgress"];
	}

	return dict;
}

@end

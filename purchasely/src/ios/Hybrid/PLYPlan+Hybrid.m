//
//  PLYPlan+Hybrid.m
//  reactTutorialApp
//
//  Created by Jean-François GRANG on 27/12/2020.
//

#import "PLYPlan+Hybrid.h"

@implementation PLYPlan (Hybrid)

- (NSDictionary *)asDictionary {
	NSMutableDictionary<NSString *, NSObject *> *dict = [NSMutableDictionary new];

	[dict setObject:self.vendorId forKey:@"vendorId"];
	[dict setObject:@(self.hasIntroductoryPrice) forKey:@"hasIntroductoryPrice"];
	[dict setObject:@([self type]) forKey:@"type"];

	if (self.hasIntroductoryPrice && [[self introAmount] intValue] == 0) {
		[dict setObject:@(YES) forKey:@"hasFreeTrial"];
		[dict removeObjectForKey:@"hasIntroductoryPrice"];
	}

	if (self.name != nil) {
		[dict setObject:self.name forKey:@"name"];
	}

    if (self.appleProductId != nil) {
        [dict setObject:self.appleProductId forKey:@"productId"];
    }

	NSString *price = [self localizedFullPriceWithLanguage:nil];
	if (price != nil) {
		[dict setObject:price forKey:@"price"];
	}

	NSDecimalNumber *amount = [self amount];
	if (amount != nil) {
		[dict setObject:amount forKey:@"amount"];
	}
    
    NSString *localizedAmount = [self localizedPriceWithLanguage:nil];
    if (localizedAmount != nil) {
        [dict setObject:localizedAmount forKey:@"localizedAmount"];
    }

	NSDecimalNumber *introAmount = [self introAmount];
	if (introAmount != nil) {
		[dict setObject:introAmount forKey:@"introAmount"];
	}

	NSString *currencyCode = [self currencyCode];
	if (currencyCode != nil) {
		[dict setObject:currencyCode forKey:@"currencyCode"];
	}

	NSString *currencySymbol = [self currencySymbol];
	if (currencySymbol != nil) {
		[dict setObject:currencySymbol forKey:@"currencySymbol"];
	}

	NSString *period = [self localizedPeriodWithLanguage:nil];
	if (period != nil) {
		[dict setObject:period forKey:@"period"];
	}

	NSString *introPrice = [self localizedFullIntroductoryPriceWithLanguage:nil];
	if (introPrice != nil) {
		[dict setObject:introPrice forKey:@"introPrice"];
	}

	NSString *introDuration = [self localizedIntroductoryDurationWithLanguage:nil];
	if (introDuration != nil) {
		[dict setObject:introDuration forKey:@"introDuration"];
	}

	NSString *introPeriod = [self localizedIntroductoryPeriodWithLanguage:nil];
	if (introPeriod != nil) {
		[dict setObject:introPeriod forKey:@"introPeriod"];
	}

	// Commitment installment details (iOS 26.4+ multi-period commitments, e.g. "monthly
	// subscription with 12-month commitment"). Apple-only: the array is empty for every other
	// plan, so the key is omitted then. Mirrors PLYPlan.commitmentInfo: [PLYCommitmentInfo].
	NSArray<PLYCommitmentInfo *> *commitmentInfo = self.commitmentInfo;
	if (commitmentInfo.count > 0) {
		NSMutableArray<NSDictionary *> *commitmentArray = [NSMutableArray new];
		for (PLYCommitmentInfo *info in commitmentInfo) {
			[commitmentArray addObject:@{
				@"billingPlanType": @(info.billingPlanType),
				@"billingPrice":    info.billingPrice,
				@"billingPeriod":   info.billingPeriod,
				@"totalPrice":      info.totalPrice,
				@"totalPeriod":     info.totalPeriod,
				@"totalDuration":   @(info.totalDuration)
			}];
		}
		[dict setObject:commitmentArray forKey:@"commitmentInfo"];
	}

	return dict;
}

@end

/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

function safeStringify(obj, space = 2) {
  const seen = new WeakSet();
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular Reference]';
      }
      seen.add(value);
    }
    return value;
  }, space);
}

// Wait for the deviceready event before using any of Cordova's device APIs.
// See https://cordova.apache.org/docs/en/latest/cordova/events/events.html#deviceready
document.addEventListener('deviceready', onDeviceReady, false);

function onDeviceReady() {
	// Cordova is now initialized. Have fun!

	console.log('Running cordova-' + cordova.platformId + '@' + cordova.version);
	document.getElementById('deviceready').classList.add('ready');

	Purchasely.start(
		{
			apiKey: 'fcb39be4-2ba4-4db7-bde3-2a5a1e20745d',
			stores: [Purchasely.Store.google],
			storeKit1: false,
			logLevel: Purchasely.LogLevel.DEBUG,
			runningMode: Purchasely.RunningMode.full
		},
		(isConfigured) => {
			if(isConfigured) onPurchaselySdkReady();
		},
		(error) => {
			console.log(error);
		});

	Purchasely.setDebugMode(true);

	Purchasely.setLanguage('en');

	document.getElementById("openPresentation").addEventListener("click", openPresentation);
	document.getElementById("fetchPresentation").addEventListener("click", fetchPresentation);
	document.getElementById("backPresentation").addEventListener("click", backPresentation);
	document.getElementById("closePresentation").addEventListener("click", closePresentation);
	document.getElementById("purchaseWithPlanVendorId").addEventListener("click", purchaseWithPlanVendorId);
	document.getElementById("restore").addEventListener("click", restore);
	document.getElementById("silentRestore").addEventListener("click", silentRestore);
	document.getElementById("processToPayment").addEventListener("click", processToPayment);
	document.getElementById("openDeeplink").addEventListener("click", openDeeplink);

}

function onPurchaselySdkReady() {
	Purchasely.allProducts( products => {
		console.log("Products " + products.length);
		console.log("First product name: " + products[0].name);
	}, (error) => {
		console.log(error);
	});

	Purchasely.getAnonymousUserId(id => { console.log("Purchasely anonymous Id:" + id) });

	Purchasely.addEventsListener((event) => {
		console.log("Event Name " + event.name);
		console.log(safeStringify(event.properties));
		console.log(safeStringify(event));
	}, (error) => {
		console.log(error);
	});

	Purchasely.addUserAttributeListener((attribute) => {
		if (attribute.action == Purchasely.UserAttributeAction.ADD) {
			console.log("ADD Attribute: " + attribute.key)
			console.log("ADD Attribute: " + attribute.value)
			console.log("ADD Attribute: " + attribute.source)
			console.log("ADD Attribute: " + attribute.type)
		} else if (attribute.action == Purchasely.UserAttributeAction.REMOVE) {
			console.log("REMOVE Attribute: " + attribute.key)
			console.log("REMOVE Attribute: " + attribute.source)
		}

	}, (error) => {
		console.log("Error: " + error)
	})

	Purchasely.purchasedSubscription(() => {
		console.log("Purchased performed, reload content to unlock.");
	});

	Purchasely.userLogin('test_cordova', refresh => {
		console.log("User logged, refresh needed ? " + refresh);
	});

	Purchasely.userLogout();

	Purchasely.setLogLevel(Purchasely.LogLevel.DEBUG);

	Purchasely.setAttribute(Purchasely.Attribute.FIREBASE_APP_INSTANCE_ID, "firebase_instance_id");
	Purchasely.setAttribute(Purchasely.Attribute.AIRSHIP_CHANNEL_ID, "airship_channel_id");
	Purchasely.setAttribute(Purchasely.Attribute.AIRSHIP_USER_ID, "airship_user_id");
	Purchasely.setAttribute(Purchasely.Attribute.BATCH_INSTALLATION_ID, "batch_installation_id");
	Purchasely.setAttribute(Purchasely.Attribute.ADJUST_ID, "adjust_id");
	Purchasely.setAttribute(Purchasely.Attribute.APPSFLYER_ID, "appsflyer_id");
	Purchasely.setAttribute(Purchasely.Attribute.MIXPANEL_DISTINCT_ID, "mixpanel_distinct_id");
	Purchasely.setAttribute(Purchasely.Attribute.CLEVER_TAP_ID, "clever_tap_id");
	Purchasely.setAttribute(Purchasely.Attribute.SENDINBLUE_USER_EMAIL, "sendinblue_user_email");
	Purchasely.setAttribute(Purchasely.Attribute.ITERABLE_USER_EMAIL, "iterable_user_email");
	Purchasely.setAttribute(Purchasely.Attribute.ITERABLE_USER_ID, "iterable_user_id");
	Purchasely.setAttribute(Purchasely.Attribute.AT_INTERNET_ID_CLIENT, "at_internet_id_client");
	Purchasely.setAttribute(Purchasely.Attribute.MPARTICLE_USER_ID, "mparticle_user_id");
	Purchasely.setAttribute(Purchasely.Attribute.CUSTOMERIO_USER_ID, "customerio_user_id");
	Purchasely.setAttribute(Purchasely.Attribute.CUSTOMERIO_USER_EMAIL, "customerio_user_email");
	Purchasely.setAttribute(Purchasely.Attribute.BRANCH_USER_DEVELOPER_IDENTITY, "branch_user_developer_identity");
	Purchasely.setAttribute(Purchasely.Attribute.AMPLITUDE_USER_ID, "amplitude_user_id");
	Purchasely.setAttribute(Purchasely.Attribute.AMPLITUDE_DEVICE_ID, "amplitude_device_id");
	Purchasely.setAttribute(Purchasely.Attribute.MOENGAGE_UNIQUE_ID, "moengage_unique_id");
	Purchasely.setAttribute(Purchasely.Attribute.ONESIGNAL_EXTERNAL_ID, "onesignal_external_id");
	Purchasely.setAttribute(Purchasely.Attribute.BATCH_CUSTOM_USER_ID, "batch_custom_user_id");
	Purchasely.setAttribute(Purchasely.Attribute.BATCH_INSTALLATION_ID, "testBatch1");

	Purchasely.allowDeeplink(true);

	Purchasely.planWithIdentifier('PURCHASELY_PLUS_MONTHLY', (plan) => {
		console.log(' ==> Plan');
		console.log(plan.vendorId);
		console.log(plan.productId);
		console.log(plan.name);
		console.log(plan.price);
		console.log(plan.amount);
		console.log(plan.period);
		console.log(plan.hasIntroductoryPrice);
		console.log(plan.introPrice);
		console.log(plan.introAmount);
		console.log(plan.introDuration);
	}, (error) => {
		console.log(error);
	});

	Purchasely.setDefaultPresentationDismissHandler(callback => {
		console.log('[setDefaultPresentationDismissHandler] onDismissed — purchaseResult=' + callback.purchaseResult + ' closeReason=' + callback.closeReason + ' — outcome: ' + safeStringify(callback));
		if(callback.result == Purchasely.PurchaseResult.CANCELLED) {
			console.log("User cancelled purchase - close reason " + callback.closeReason);
		} else if (callback.plan) {
			console.log("User purchased " + callback.plan.vendorId);
		}
	},
		(error) => {
		console.log("[setDefaultPresentationDismissHandler] error: " + error);
	});

	Purchasely.setUserAttributeWithString("key_string", "value_string", Purchasely.DataProcessingLegalBasis.essential);
	Purchasely.setUserAttributeWithBoolean("key_boolean", true, Purchasely.DataProcessingLegalBasis.essential);
	Purchasely.setUserAttributeWithInt("key_int", 7, Purchasely.DataProcessingLegalBasis.essential);
	Purchasely.setUserAttributeWithDouble("key_double", 4.5, Purchasely.DataProcessingLegalBasis.essential);
	Purchasely.setUserAttributeWithDate("key_date", new Date().toISOString(), Purchasely.DataProcessingLegalBasis.essential);

	Purchasely.clearUserAttributes();

	Purchasely.setUserAttributeWithString("key_string", "value_string");
	Purchasely.setUserAttributeWithBoolean("key_boolean", true);
	Purchasely.setUserAttributeWithInt("key_int", 7);
	Purchasely.setUserAttributeWithDouble("key_double", 4.5);
	Purchasely.setUserAttributeWithDate("key_date", new Date().toISOString());

	Purchasely.setUserAttributeWithStringArray("key_string_array", ["value1", "value2"]);
	Purchasely.setUserAttributeWithIntArray("key_int_array", [1, 2, 3]);
	Purchasely.setUserAttributeWithDoubleArray("key_double_array", [1.1, 2.2, 3.3]);
	Purchasely.setUserAttributeWithBooleanArray("key_boolean_array", [true, false, true]);

	Purchasely.revokeDataProcessingConsent(["CAMPAIGNS"])

	Purchasely.userAttribute("key_string", value => {
		console.log("User attribute string: " + value);
	});

	Purchasely.userAttribute("key_boolean", value => {
		console.log("User attribute boolean: " + value);
	});

	Purchasely.userAttribute("key_int", value => {
		console.log("User attribute int: " + value);
	});

	Purchasely.userAttribute("key_double", value => {
		console.log("User attribute double: " + value);
	});

	Purchasely.userAttribute("key_string_array", value => {
	    console.log("User attribute string array: " + value);
	});

	Purchasely.userAttribute("key_int_array", value => {
	    console.log("User attribute int array: " + value);
	});

	Purchasely.userAttribute("key_double_array", value => {
	    console.log("User attribute double array: " + value);
	});

	Purchasely.userAttribute("key_boolean_array", value => {
	    console.log("User attribute boolean array: " + value);
	});

	Purchasely.userAttribute("key_date", value => {
		console.log("User attribute date " + value);

		Purchasely.clearUserAttribute("key_string");
		Purchasely.userAttribute("key_string",{}, error => {
			console.log("User attribute string cleared ? " + error);

			Purchasely.clearUserAttributes();
			Purchasely.userAttribute("key_double", {}, error => {
				console.log("User attribute double empty? " + error);
			});
		});
	});

	Purchasely.removeUserAttributeListener();

	// Purchasely 6.0: per-action interceptor. Register a handler per action kind; each
	// handler receives (info, parameters) and returns a Purchasely.InterceptResult telling
	// the SDK how it was handled (notHandled = let the SDK proceed, success = app handled it).
	Purchasely.removeAllActionInterceptors();

	// NOTE: `info` and `parameters` can be null depending on the action and the
	// platform (e.g. on iOS the `close` action carries no parameters). Always log
	// them with safeStringify (null-safe) rather than reading fields directly, or
	// a thrown handler is reported to the SDK as `failed` and the action (e.g.
	// close) will NOT be performed.
	Purchasely.interceptAction(Purchasely.PresentationAction.navigate, (info, parameters) => {
		console.log('[interceptAction] navigate — info: ' + safeStringify(info) + ' — parameters: ' + safeStringify(parameters));
		return Purchasely.InterceptResult.notHandled;
	});

	Purchasely.interceptAction(Purchasely.PresentationAction.close, (info, parameters) => {
		console.log('[interceptAction] close — info: ' + safeStringify(info) + ' — parameters: ' + safeStringify(parameters));
		return Purchasely.InterceptResult.notHandled;
	});

	Purchasely.interceptAction(Purchasely.PresentationAction.close_all, (info, parameters) => {
		console.log('[interceptAction] close_all — info: ' + safeStringify(info) + ' — parameters: ' + safeStringify(parameters));
		return Purchasely.InterceptResult.notHandled;
	});

	Purchasely.interceptAction(Purchasely.PresentationAction.login, (info, parameters) => {
		console.log('[interceptAction] login — info: ' + safeStringify(info) + ' — parameters: ' + safeStringify(parameters));
		// Present your own screen for the user to log in, then report success so the paywall refreshes.
		Purchasely.closePresentation();
		Purchasely.userLogin('MY_USER_ID');
		return Purchasely.InterceptResult.success;
	});

	Purchasely.interceptAction(Purchasely.PresentationAction.open_presentation, (info, parameters) => {
		console.log('[interceptAction] open_presentation — info: ' + safeStringify(info) + ' — parameters: ' + safeStringify(parameters));
		return Purchasely.InterceptResult.notHandled;
	});

	Purchasely.interceptAction(Purchasely.PresentationAction.open_placement, (info, parameters) => {
		console.log('[interceptAction] open_placement — info: ' + safeStringify(info) + ' — parameters: ' + safeStringify(parameters));
		return Purchasely.InterceptResult.notHandled;
	});

	Purchasely.interceptAction(Purchasely.PresentationAction.purchase, (info, parameters) => {
		console.log('[interceptAction] purchase — info: ' + safeStringify(info) + ' — parameters: ' + safeStringify(parameters));
		// Let the SDK proceed with the purchase.
		return Purchasely.InterceptResult.notHandled;
	});

	Purchasely.interceptAction(Purchasely.PresentationAction.web_checkout, (info, parameters) => {
		console.log('[interceptAction] web_checkout — info: ' + safeStringify(info) + ' — parameters: ' + safeStringify(parameters));
		return Purchasely.InterceptResult.notHandled;
	});

	Purchasely.clearBuiltInAttributes();
}

// Purchasely 6.0: `back()`/`close()` live on the request, not as bare top-level calls
// (backPresentation() was removed). The example keeps a reference to the last request
// it built/displayed so the "Back presentation" button below has something to drive.
var currentPresentationRequest = null;

function openPresentation() {
	// Purchasely 6.0: the v6 builder — pick a source (.placement/.screen/.defaultSource),
	// chain lifecycle callbacks, .build(), then .display(transition?). display() resolves
	// at dismiss with a 5-field outcome: { presentation, purchaseResult, plan, closeReason, error }.
	currentPresentationRequest = Purchasely.presentation
		.placement('ONBOARDING')
		.onPresented((presentation, error) => {
			console.log('[openPresentation] onPresented — ' + (presentation ? presentation.screenId : '') + (error ? ' error=' + error : ''));
		})
		.onCloseRequested(() => {
			console.log('[openPresentation] onCloseRequested');
		})
		.build();

	currentPresentationRequest
		.display(Purchasely.TransitionType.fullScreen) //display mode (string) — or a transition object, see below
		.then((outcome) => {
			console.log('[openPresentation] onDismissed — purchaseResult=' + outcome.purchaseResult + ' — outcome: ' + safeStringify(outcome));
			if (outcome.error) {
				console.log("[openPresentation] error: " + outcome.error);
			} else if (outcome.purchaseResult === 'purchased' || outcome.purchaseResult === 'restored') {
				console.log("User purchased " + (outcome.plan ? outcome.plan.name : ''));
			} else {
				console.log("User cancelled purchased - close reason " + outcome.closeReason);
			}
		});

	// Purchasely 6.0 also supports:
	//  - a rich transition object for drawer/popin sizing (see fetchPresentation below):
	//      { type: Purchasely.TransitionType.drawer, dismissible: true,
	//        height: { type: Purchasely.DimensionType.percentage, value: 0.8 }, backgroundColor: '#000000' }
	//  - the default (audience-targeted) presentation, targeted with .defaultSource() (or its
	//    iOS-style alias .default()):
	//      Purchasely.presentation.defaultSource().build().display(Purchasely.TransitionType.fullScreen);
	//  - stopping campaign/deeplink dismiss outcomes:
	//      Purchasely.removeDefaultPresentationDismissHandler();
}

function fetchPresentation() {
	// Purchasely 6.0: preload() fetches without displaying; the resolved presentation
	// exposes screenId (the authoritative identifier). Calling display() on the SAME
	// request re-displays exactly what was preloaded.
	const request = Purchasely.presentation.placement('flow_demo').build();
	currentPresentationRequest = request;
	request.preload().then((presentation) => {
		console.log('[fetchPresentation] onFetched — presentation: ' + safeStringify(presentation));
		// Rich transition object: drawer at 80% height, dismissible. (iOS applies the
		// percentage height + dismissible; Android also supports pixel + popin width.)
		request.display({
			type: Purchasely.TransitionType.drawer,
			dismissible: true,
			height: { type: Purchasely.DimensionType.percentage, value: 0.8 }
		}).then((outcome) => {
			console.log('[fetchPresentation → display] onDismissed — purchaseResult=' + outcome.purchaseResult + ' — outcome: ' + safeStringify(outcome));
			if (outcome.error) {
				console.log("[fetchPresentation → display] error: " + outcome.error);
			} else if (outcome.purchaseResult === 'purchased' || outcome.purchaseResult === 'restored') {
				console.log("User purchased " + (outcome.plan ? outcome.plan.name : ''));
			} else {
				console.log("User cancelled purchased - close reason " + outcome.closeReason);
			}
		});
	}, (error) => {
		console.log("[fetchPresentation] error: " + safeStringify(error));
	});
}

function purchaseWithPlanVendorId() {
	Purchasely.purchaseWithPlanVendorId("PURCHASELY_PLUS_MONTHLY");
}

function processToPayment() {
	// Call this method in observer mode to synchronize purchases with Purchasely
	// Purchasely.synchronize((ok) => console.log("synchronized " + ok), (e) => console.log(e));

	// Purchasely 6.0: with the per-action interceptor (interceptAction), each handler returns
	// its own Purchasely.InterceptResult, so there is no separate "process action" step.
	// Kept as a no-op for the example's existing button wiring.
	console.log('processToPayment: no-op in v6 — interceptAction handlers report their own result');
}

function backPresentation() {
	if (currentPresentationRequest) currentPresentationRequest.back();
}

function closePresentation() {
	Purchasely.closePresentation();
}

function restore() {
	Purchasely.restoreAllProducts(
		(plan) => {
			if(plan) console.log("Restore " + plan.vendorId);
			else console.log("Nothing to restore");
		},
		(error) => {
			console.log("Restore failed " + error);
		},
	);
}

function silentRestore() {
	Purchasely.silentRestoreAllProducts(
		(plan) => {
			if(plan) console.log("Silent restore " + plan.vendorId);
			else console.log("Nothing to restore");
		},
		(error) => {
			console.log("Silent Restore failed " + error);
		},
	);
}

function isEligibleForIntroOffer() {
	console.log("isEligibleForIntroOffer");
	Purchasely.isEligibleForIntroOffer(
		'PURCHASELY_PLUS_YEARLY', // planVendorId
		(isEligible) => {
			console.log("isEligibleForIntroOffer result: " + isEligible);
		},
		(error) => {
			console.log("Error with isEligibleForIntroOffer : " + error);
		}
	);
}

function signPromotionalOffer() {
	console.log("signPromotionalOffer");
	Purchasely.signPromotionalOffer(
		'com.purchasely.plus.yearly', // storeProductId
		'com.purchasely.plus.yearly.winback.test', // storeOfferId
		(signature) => {
			console.log("signPromotionalOffer result: " + signature);
		},
		(error) => {
			console.log("Error with signPromotionalOffer : " + error);
		}
	);
}

function openDeeplink() {
	Purchasely.handleDeeplink(
		"purchasely://ply/presentations/CAROUSEL",
		isHandled => {
			console.log("Deeplink is handled ? " + isHandled)
		},
		(error) => {
			console.log(error)
		},
	);
}

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

	Purchasely.builder('fcb39be4-2ba4-4db7-bde3-2a5a1e20745d')
		.appUserId(null)
		.runningMode('full')
		.logLevel('error')
		.allowDeeplink(true)
		.start()
		.then(configured => {
			if (configured) onPurchaselySdkReady();
		})
		.catch(error => {
			console.log(error);
		});

	Purchasely.setDebugMode(true);

	Purchasely.setLanguage('en');

	document.getElementById("openPresentation").addEventListener("click", openPresentation);
	document.getElementById("fetchPresentation").addEventListener("click", fetchPresentation);
	document.getElementById("showPresentation").addEventListener("click", showPresentation);
	document.getElementById("hidePresentation").addEventListener("click", hidePresentation);
	document.getElementById("closePresentation").addEventListener("click", closePresentation);
	document.getElementById("purchaseWithPlanVendorId").addEventListener("click", purchaseWithPlanVendorId);
	document.getElementById("restore").addEventListener("click", restore);
	document.getElementById("silentRestore").addEventListener("click", silentRestore);
	document.getElementById("processToPayment").addEventListener("click", processToPayment);

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

	Purchasely.setDefaultPresentationDismissHandler(outcome => {
		console.log(outcome);
		// v6: rich outcome. `presentation` identifies which campaign/deeplink closed.
		console.log("Dismissed presentation: " + (outcome.presentation && outcome.presentation.screenId));
		console.log("Purchase result: " + outcome.purchaseResult + " / close reason: " + outcome.closeReason);
		if (outcome.purchaseResult === 'cancelled') {
			console.log("User cancelled purchase");
		} else {
			console.log("User purchased " + (outcome.plan && outcome.plan.vendorId));
		}
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

	// v6 interceptor: per-action handlers replacing setPaywallActionInterceptor + onProcessAction
	Purchasely.interceptAction('navigate', (info, payload) => {
		console.log('User wants to navigate to website ' + payload.title + ' ' + payload.url);
		console.log('prevent Purchasely SDK to navigate to website');
		return Purchasely.InterceptResult.notHandled;
	});

	Purchasely.interceptAction('close', (info, payload) => {
		console.log('User wants to close paywall - close reason ' + payload.closeReason);
		return Purchasely.InterceptResult.notHandled;
	});

	Purchasely.interceptAction('closeAll', (info, payload) => {
		console.log('User wants to close all paywalls');
		return Purchasely.InterceptResult.notHandled;
	});

	Purchasely.interceptAction('login', (info, payload) => {
		console.log('User wants to login');
		//Present your own screen for user to log in
		Purchasely.userLogin('MY_USER_ID');
		return Purchasely.InterceptResult.success;
	});

	Purchasely.interceptAction('openPresentation', (info, payload) => {
		console.log('User wants to open a new paywall');
		return Purchasely.InterceptResult.notHandled;
	});

	Purchasely.interceptAction('openPlacement', (info, payload) => {
		console.log('User wants to open a new placement');
		return Purchasely.InterceptResult.notHandled;
	});

	Purchasely.interceptAction('purchase', (info, payload) => {
		console.log('User wants to purchase');
		//If you want to intercept it, handle the purchase yourself
		return Purchasely.InterceptResult.notHandled;
	});

	Purchasely.interceptAction('webCheckout', (info, payload) => {
		console.log('User wants to proceed to web checkout');
		console.log('web checkout url: ' + payload.url);
		console.log('web checkout provider: ' + payload.webCheckoutProvider);
		console.log('web checkout client reference id: ' + payload.clientReferenceId);
		console.log('web checkout query parameter key: ' + payload.queryParameterKey);
		return Purchasely.InterceptResult.notHandled;
	});

	Purchasely.clearBuiltInAttributes();
}

// Active presentation request for use with show/hide/close controls
var _activePresentationRequest = null;

function openPresentation() {
	Purchasely.PresentationBuilder
		.placement('ONBOARDING')
		.contentId(null)
		.build()
		.display({ type: 'fullScreen' })
		.then(outcome => {
			console.log(outcome);
			if (outcome.purchaseResult === 'cancelled') {
				console.log("User cancelled purchased");
			} else {
				console.log("User purchased " + (outcome.plan && outcome.plan.name));
			}
		})
		.catch(error => {
			console.log("Error with purchase : " + error);
		});
}

function fetchPresentation() {
	var req = Purchasely.PresentationBuilder
		.placement('flow_demo')
		.contentId(null)
		.build();

	req.preload()
		.then(presentation => {
			console.log(safeStringify(presentation));
			_activePresentationRequest = req;
			return req.display();
		})
		.then(outcome => {
			console.log(outcome);
			if (outcome.purchaseResult === 'cancelled') {
				console.log("User cancelled purchased");
			} else {
				console.log("User purchased " + (outcome.plan && outcome.plan.name));
			}
			_activePresentationRequest = null;
		})
		.catch(error => {
			console.log("Error with presentation : " + error);
			_activePresentationRequest = null;
		});
}

function purchaseWithPlanVendorId() {
	Purchasely.purchaseWithPlanVendorId("PURCHASELY_PLUS_MONTHLY");
}

function processToPayment() {
	// In v6, showing/hiding a presentation is managed via PresentationRequest.
	// If you have an active request, call display() again to bring it back.
	if (_activePresentationRequest) {
		_activePresentationRequest.display();
	}
}

function showPresentation() {
	if (_activePresentationRequest) {
		_activePresentationRequest.display();
	}
}

function hidePresentation() {
	// In v6 there is no hide — close the active presentation instead.
	if (_activePresentationRequest) {
		_activePresentationRequest.close();
		_activePresentationRequest = null;
	}
}

function closePresentation() {
	if (_activePresentationRequest) {
		_activePresentationRequest.close();
		_activePresentationRequest = null;
	}
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

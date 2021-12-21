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

// Wait for the deviceready event before using any of Cordova's device APIs.
// See https://cordova.apache.org/docs/en/latest/cordova/events/events.html#deviceready
document.addEventListener('deviceready', onDeviceReady, false);

function onDeviceReady() {
	// Cordova is now initialized. Have fun!

	console.log('Running cordova-' + cordova.platformId + '@' + cordova.version);
	document.getElementById('deviceready').classList.add('ready');

	console.log("Hi");

	Purchasely.setLanguage('en')
	
	Purchasely.startWithAPIKey(
		'afa96c76-1d8e-4e3c-a48f-204a3cd93a15',
		['Google'],
		null,
		Purchasely.LogLevel.DEBUG,
		Purchasely.RunningMode.full,
		(isConfigured) => {
			if(isConfigured) onPuchaselySdkReady();
		},
		(error) => {
			console.log(error);
		});

	document.getElementById("openPresentation").addEventListener("click", openPresentation);
	document.getElementById("presentSubscriptions").addEventListener("click", presentSubscriptions);
	document.getElementById("purchaseWithPlanVendorId").addEventListener("click", purchaseWithPlanVendorId);
	document.getElementById("restore").addEventListener("click", restore);
	document.getElementById("silentRestore").addEventListener("click", silentRestore);
	document.getElementById("processToPayment").addEventListener("click", processToPayment);

}

function onPuchaselySdkReady() {
	Purchasely.allProducts( products => {
		console.log("Products " + products.length);
		console.log("First product name: " + products[0].name);
	}, (error) => {
		console.log(error);
	});

	Purchasely.getAnonymousUserId(id => { console.log("Purchasely anonymous Id:" + id) });

	Purchasely.addEventsListener((event) => {
		console.log("Event Name " + event.name);
		console.log(event.properties);
		console.log(event);
	}, (error) => {
		console.log(error);
	});

	Purchasely.purchasedSubscription(() => {
		console.log("Purchased performed, reload content to unlock.");
	});

	Purchasely.userLogin('test_cordova', refresh => {
		console.log("User logged, refresh needed ? " + refresh);
	});

	Purchasely.userLogout();

	Purchasely.setLogLevel(Purchasely.LogLevel.DEBUG);

	Purchasely.setAttribute(Purchasely.Attribute.FIREBASE_APP_INSTANCE_ID, "1");
	Purchasely.setAttribute(Purchasely.Attribute.BATCH_INSTALLATION_ID, "testBatch1");

	Purchasely.isReadyToPurchase(true);

	Purchasely.setDefaultPresentationResultHandler(callback => {
		console.log(callback);
		if(callback.result == Purchasely.PurchaseResult.CANCELLED) {
			console.log("User cancelled purchased");
		} else {
			console.log("User purchased " + callback.plan.vendorId);
		}
	},
												   (error) => {
		console.log("Error with purchase : " + error);
	});

	Purchasely.setPaywallActionInterceptor((result) => {
		console.log(result);
		console.log('Received action from paywall');

		if (result.action === Purchasely.PaywallAction.navigate) {
			console.log(
			'User wants to navigate to website ' +
				result.parameters.title +
				' ' +
				result.parameters.url
			);
			Purchasely.onProcessAction(true);
		} else if (result.action === Purchasely.PaywallAction.close) {
			console.log('User wants to close paywall');
			Purchasely.onProcessAction(true);
		} else if (result.action === Purchasely.PaywallAction.login) {
			console.log('User wants to login');
			//Present your own screen for user to log in
			Purchasely.closePaywall();
			Purchasely.userLogin('MY_USER_ID');
			//Call this method to update Purchasely Paywall
			Purchasely.onProcessAction(true);
		} else if (result.action === Purchasely.PaywallAction.open_presentation) {
			console.log('User wants to open a new paywall');
			Purchasely.onProcessAction(true);
		} else if (result.action === Purchasely.PaywallAction.purchase) {
			console.log('User wants to purchase');
			//If you want to intercept it, close paywall and display your screen
			Purchasely.closePaywall();
		} else if (result.action === Purchasely.PaywallAction.restore) {
			console.log('User wants to restore his purchases');
			Purchasely.onProcessAction(true);
		} else {
			console.log('Action unknown ' + result.action);
			Purchasely.onProcessAction(true);
		}
	});
}

function openPresentation() {
	Purchasely.presentPresentationWithIdentifier(
		null,
		(callback) => {
			console.log(callback);
			if(callback.result == Purchasely.PurchaseResult.CANCELLED) {
				console.log("User cancelled purchased");
			} else {
				console.log("User purchased " + callback.plan.name);
			}
		},
		(error) => {
			console.log("Error with purchase : " + error);
		}
	);
}

function presentSubscriptions() {
	Purchasely.presentSubscriptions();
}

function purchaseWithPlanVendorId() {
	Purchasely.purchaseWithPlanVendorId("PURCHASELY_PLUS_MONTHLY");
}

function processToPayment() {
	// Call this method to process to payment
	Purchasely.onProcessAction(true);
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

function openDeeplink() {
	Purchasely.handle(
		"purchasely://ply/presentations/CAROUSEL",
		isHandled => {
			console.log("Deeplink is handled ? " + isHandled)
		},
		(error) => {
			console.log(error)
		},
	);
}

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

    Purchasely.startWithAPIKey('afa96c76-1d8e-4e3c-a48f-204a3cd93a15', ['Google'], null, 0, false);

    document.getElementById("openPresentation").addEventListener("click", openPresentation);
    document.getElementById("presentSubscriptions").addEventListener("click", presentSubscriptions);
    document.getElementById("purchaseWithPlanVendorId").addEventListener("click", purchaseWithPlanVendorId);

	console.log("Purchasely anonymous Id" + Purchasely.getAnonymousUserId());

	Purchasely.addEventsListener((event) => {
        console.log("Event Name " + event.name);
        console.log(event.properties);
        console.log(event);
    }, (error) => {
        console.log(error);
    });

	Purchasely.purchasedSubscription(() => {
		console.log("PURCHASED");
	})
}

function openPresentation() {
    Purchasely.presentPresentationWithIdentifier(null);
}

function presentSubscriptions() {
    Purchasely.presentSubscriptions();
}

function purchaseWithPlanVendorId() {
    Purchasely.purchaseWithPlanVendorId("PURCHASELY_PLUS_MONTHLY");
}

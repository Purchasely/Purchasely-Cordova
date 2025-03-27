var exec = require('cordova/exec');

var defaultError = (e) => { console.log(e); }

exports.start = function (apiKey, stores, storekit1, userId, logLevel, runningMode, success, error) {
    var cordovaSdkVersion = cordova.define.moduleMap['cordova/plugin_list'].exports['metadata']['cordova-plugin-purchasely']
    if(!cordovaSdkVersion) {
        cordovaSdkVersion = "4.4.0";
    }
    exec(success, error, 'Purchasely', 'start', [apiKey, stores, storekit1, userId, logLevel, runningMode, cordovaSdkVersion]);
};

exports.addEventsListener = function (success, error) {
    exec(success, error, 'Purchasely', 'addEventsListener', []);
};

exports.addUserAttributeListener = function(success, error) {
    exec(success, error, 'Purchasely', 'addUserAttributeListener', []);
}

exports.removeEventsListener = function () {
    exec(() => {}, defaultError, 'Purchasely', 'removeEventsListener', []);
};

exports.getAnonymousUserId = function (success, error) {
    exec(success, error, 'Purchasely', 'getAnonymousUserId', []);
};

exports.userLogin = function (userId, success) {
    exec(success, defaultError, 'Purchasely', 'userLogin', [userId]);
};

exports.userLogout = function () {
    exec(() => {}, defaultError, 'Purchasely', 'userLogout', []);
};

exports.setLogLevel = function (logLevel) {
    exec(() => {}, defaultError, 'Purchasely', 'setLogLevel', [logLevel]);
};

exports.setAttribute = function (attribute, value) {
    exec(() => {}, defaultError, 'Purchasely', 'setAttribute', [attribute, value]);
};

exports.readyToOpenDeeplink = function (isReady) {
    exec(() => {}, defaultError, 'Purchasely', 'readyToOpenDeeplink', [isReady]);
};

exports.setDefaultPresentationResultHandler = function (success, error) {
    exec(success, error, 'Purchasely', 'setDefaultPresentationResultHandler', []);
};

exports.synchronize = function () {
    exec(() => {}, defaultError, 'Purchasely', 'synchronize', []);
};

exports.presentPresentationWithIdentifier = function (presentationId, contentId, isFullscreen, success, error) {
    exec(success, error, 'Purchasely', 'presentPresentationWithIdentifier', [presentationId, contentId, isFullscreen]);
};

exports.presentPresentationForPlacement = function (placementId, contentId, isFullscreen, success, error) {
    exec(success, error, 'Purchasely', 'presentPresentationForPlacement', [placementId, contentId, isFullscreen]);
};

exports.presentProductWithIdentifier = function (productId, presentationId, contentId, isFullscreen, success, error) {
    exec(success, error, 'Purchasely', 'presentProductWithIdentifier', [productId, presentationId, contentId, isFullscreen]);
};

exports.presentPlanWithIdentifier = function (planId, presentationId, contentId, isFullscreen, success, error) {
    exec(success, error, 'Purchasely', 'presentPlanWithIdentifier', [planId, presentationId, contentId, isFullscreen]);
};

exports.fetchPresentation = function (presentationId, contentId, success, error) {
    exec(success, error, 'Purchasely', 'fetchPresentation', [null, presentationId, contentId]);
};

exports.fetchPresentationForPlacement = function (placementId, contentId, success, error) {
    exec(success, error, 'Purchasely', 'fetchPresentation', [placementId, null, contentId]);
};

exports.presentPresentation = function (presentation, isFullscreen, backgroundColor,success, error) {
    exec(success, error, 'Purchasely', 'presentPresentation', [presentation, isFullscreen, backgroundColor]);
};

exports.presentSubscriptions = function () {
    exec(() => {}, defaultError, 'Purchasely', 'presentSubscriptions', []);
};

exports.purchaseWithPlanVendorId = function (planId, offerId, contentId, success, error) {
    exec( success, error, 'Purchasely', 'purchaseWithPlanVendorId', [planId, offerId, contentId]);
};

exports.restoreAllProducts = function (success, error) {
    exec(success, error, 'Purchasely', 'restoreAllProducts', []);
};

exports.silentRestoreAllProducts = function (success, error) {
    exec(success, error, 'Purchasely', 'silentRestoreAllProducts', []);
};

exports.purchasedSubscription = function (success, error) {
    exec(success, error, 'Purchasely', 'purchasedSubscription', []);
};

exports.isDeeplinkHandled = function (deepLink, success, error) {
    exec(success, error, 'Purchasely', 'isDeeplinkHandled', [deepLink]);
};

exports.allProducts = function (success, error) {
    exec(success, defaultError, 'Purchasely', 'allProducts', []);
};

exports.planWithIdentifier = function (planId, success) {
    exec(success, defaultError, 'Purchasely', 'planWithIdentifier', [planId]);
};

exports.productWithIdentifier = function (productId, success) {
    exec(success, defaultError, 'Purchasely', 'productWithIdentifier', [productId]);
};

exports.setPaywallActionInterceptor = function (success) {
    exec(success, defaultError, 'Purchasely', 'setPaywallActionInterceptor', []);
};

exports.onProcessAction = function (processAction) {
    exec(() => {}, defaultError, 'Purchasely', 'onProcessAction', [processAction]);
};

exports.userDidConsumeSubscriptionContent = function () {
    exec(() => {}, defaultError, 'Purchasely', 'userDidConsumeSubscriptionContent', []);
};

exports.userSubscriptions = function (success, error) {
    exec(success, defaultError, 'Purchasely', 'userSubscriptions', []);
};

exports.userSubscriptionsHistory = function (success, error) {
    exec(success, defaultError, 'Purchasely', 'userSubscriptionsHistory', []);
};

exports.setLanguage = function (language) {
    exec(() => {}, defaultError, 'Purchasely', 'setLanguage', [language]);
};

exports.showPresentation = function () {
    exec(() => {}, defaultError, 'Purchasely', 'showPresentation', []);
};

exports.hidePresentation = function () {
    exec(() => {}, defaultError, 'Purchasely', 'hidePresentation', []);
};

exports.closePresentation = function () {
    exec(() => {}, defaultError, 'Purchasely', 'closePresentation', []);
};

exports.setUserAttributeWithString = function (key, value) {
    exec(() => {}, defaultError, 'Purchasely', 'setUserAttributeWithString', [key, value]);
};

exports.setUserAttributeWithBoolean = function (key, value) {
    exec(() => {}, defaultError, 'Purchasely', 'setUserAttributeWithBoolean', [key, value]);
};

exports.setUserAttributeWithInt = function (key, value) {
    exec(() => {}, defaultError, 'Purchasely', 'setUserAttributeWithInt', [key, value]);
};

exports.setUserAttributeWithDouble = function (key, value) {
    exec(() => {}, defaultError, 'Purchasely', 'setUserAttributeWithDouble', [key, value]);
};

exports.setUserAttributeWithDate = function (key, value) {
    exec(() => {}, defaultError, 'Purchasely', 'setUserAttributeWithDate', [key, value]);
};

exports.userAttribute = function (key, success, error) {
    exec(success, error, 'Purchasely', 'userAttribute', [key]);
};

exports.clearUserAttribute = function (key) {
    exec(() => {}, defaultError, 'Purchasely', 'clearUserAttribute', [key]);
};

exports.clearUserAttributes = function () {
    exec(() => {}, defaultError, 'Purchasely', 'clearUserAttributes', []);
};

exports.isEligibleForIntroOffer = function (planId, success, error) {
    exec(success, error, 'Purchasely', 'isEligibleForIntroOffer', [planId]);
};

exports.signPromotionalOffer = function (storeProductId, storeOfferId, success, error) {
    exec(success, error, 'Purchasely', 'signPromotionalOffer', [storeProductId, storeOfferId]);
};

exports.setThemeMode = function (mode) {
    exec(() => {}, defaultError, 'Purchasely', 'setThemeMode', [mode]);
};

exports.LogLevel = {
	DEBUG: 0,
	INFO: 1,
	WARN: 2,
	ERROR: 3,
}

exports.Attribute = {
  FIREBASE_APP_INSTANCE_ID: 0,
  AIRSHIP_CHANNEL_ID: 1,
  AIRSHIP_USER_ID: 2,
  BATCH_INSTALLATION_ID: 3,
  ADJUST_ID: 4,
  APPSFLYER_ID: 5,
  ONESIGNAL_PLAYER_ID: 6,
  MIXPANEL_DISTINCT_ID: 7,
  CLEVER_TAP_ID: 8,
  SENDINBLUE_USER_EMAIL: 9,
  ITERABLE_USER_EMAIL: 10,
  ITERABLE_USER_ID: 11,
  AT_INTERNET_ID_CLIENT: 12,
  MPARTICLE_USER_ID: 13,
  CUSTOMERIO_USER_ID: 14,
  CUSTOMERIO_USER_EMAIL: 15,
  BRANCH_USER_DEVELOPER_IDENTITY: 16,
  AMPLITUDE_USER_ID: 17,
  AMPLITUDE_DEVICE_ID: 18,
  MOENGAGE_UNIQUE_ID: 19,
  ONESIGNAL_EXTERNAL_ID: 20,
  BATCH_CUSTOM_USER_ID: 21,
}

exports.PurchaseResult = {
	PURCHASED: 0,
	CANCELLED: 1,
	RESTORED: 2
}

exports.SubscriptionSource = {
    appleAppStore: 0,
    googlePlayStore: 1,
    amazonAppstore: 2,
    huaweiAppGallery: 3,
    none: 4
}

exports.PlanType = {
    consumable: 0,
    nonConsumable: 1,
    autoRenewingSubscription: 2,
    nonRenewingSubscription: 3,
    unknown: 4
}


exports.RunningMode = {
    paywallObserver: 2,
    full: 3
}

exports.PaywallAction = {
    close: 'close',
    login: 'login',
    navigate: 'navigate',
    purchase: 'purchase',
    restore: 'restore',
    open_presentation: 'open_presentation',
    open_presentation: 'open_placement',
    promo_code: 'promo_code',
}

exports.ThemeMode = {
	light: 0,
	dark: 1,
	system: 2
}

exports.PurchaselyUserAttributeAction = {
    ADD: 'add',
    REMOVE: 'remove'
}
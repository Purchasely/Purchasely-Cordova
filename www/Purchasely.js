var exec = require('cordova/exec');

var defaultError = (e) => { console.log(e); }

exports.startWithAPIKey = function (apiKey, stores, userId, logLevel, runningMode, success, error) {
    exec(success, error, 'Purchasely', 'startWithAPIKey', [apiKey, stores, userId, logLevel, runningMode]);
};

exports.addEventsListener = function (success, error) {
    exec(success, error, 'Purchasely', 'addEventsListener', []);
};

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

exports.isReadyToPurchase = function (isReady) {
    exec(() => {}, defaultError, 'Purchasely', 'isReadyToPurchase', [isReady]);
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

exports.presentSubscriptions = function () {
    exec(() => {}, defaultError, 'Purchasely', 'presentSubscriptions', []);
};

exports.purchaseWithPlanVendorId = function (planId, contentId, success, error) {
    exec( success, error, 'Purchasely', 'purchaseWithPlanVendorId', [planId, contentId]);
};

exports.purchaseWithPlanVendorId = function (planId, success, error) {
    exec( success, error, 'Purchasely', 'purchaseWithPlanVendorId', [planId, null]);
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

exports.handle = function (deepLink, success, error) {
    exec(success, error, 'Purchasely', 'handle', [deepLink]);
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

exports.closePaywall = function () {
    exec(() => {}, defaultError, 'Purchasely', 'closePaywall', []);
};

exports.userSubscriptions = function (success, error) {
    exec(success, defaultError, 'Purchasely', 'userSubscriptions', []);
};

exports.setLanguage = function (language) {
    exec(() => {}, defaultError, 'Purchasely', 'setLanguage', [language]);
};

exports.LogLevel = {
	DEBUG: 0,
	INFO: 1,
	WARN: 2,
	ERROR: 3,
}

exports.Attribute = {
	AMPLITUDE_SESSION_ID: 0,
	FIREBASE_APP_INSTANCE_ID: 1,
	AIRSHIP_CHANNEL_ID: 2,
    BATCH_INSTALLATION_ID: 3
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
    transactionOnly: 0,
    observer: 1,
    paywallOnly: 2,
    paywallObserver: 3,
    full: 4
}

exports.PaywallAction = {
    close: 'close',
    login: 'login',
    navigate: 'navigate',
    purchase: 'purchase',
    restore: 'restore',
    open_presentation: 'open_presentation',
    promo_code: 'promo_code',
}

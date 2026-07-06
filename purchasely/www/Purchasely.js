var exec = require('cordova/exec');

var defaultError = (e) => { console.log(e); }

// Normalize a presentation display mode. Historically the presentation methods
// took an `isFullscreen` boolean; Purchasely 6.0 replaced it with a display mode
// (see Purchasely.TransitionType). Booleans are still accepted for source
// compatibility: true -> fullScreen, false -> modal.
function normalizeDisplayMode(mode) {
    if (mode === true) return 'fullScreen';
    if (mode === false) return 'modal';
    return mode || 'fullScreen';
}

// Purchasely 6.0: `start` now takes a single options object instead of a
// positional argument list. Existing positional calls are no longer supported
// (see MIGRATION-v6.md).
//
// options:
//   apiKey          (string, required)
//   appUserId       (string, optional)
//   logLevel        (int, optional — see Purchasely.LogLevel)
//   runningMode     (string, optional — see Purchasely.RunningMode; defaults to observer)
//   stores          (string[], optional — see Purchasely.Store)
//   storeKit1       (bool, optional — iOS; true forces StoreKit 1)
//   storekitVersion (string, optional — iOS; see Purchasely.StorekitVersion)
//   allowDeeplink   (bool, optional)
//   allowCampaigns  (bool, optional)
//   deeplink        (string, optional — cold-start deeplink URL)
exports.start = function (options, success, error) {
    var opts = options || {};
    var cordovaSdkVersion = cordova.define.moduleMap['cordova/plugin_list'].exports['metadata']['cordova-plugin-purchasely']
    if(!cordovaSdkVersion) {
        cordovaSdkVersion = "6.0.0-rc.1";
    }
    opts.sdkVersion = cordovaSdkVersion;
    exec(success, error, 'Purchasely', 'start', [opts]);
};

exports.addEventsListener = function (success, error) {
    exec(success, error, 'Purchasely', 'addEventsListener', []);
};

exports.addUserAttributeListener = function(success, error) {
    exec(success, error, 'Purchasely', 'addUserAttributeListener', []);
};

exports.removeUserAttributeListener = function () {
    exec(() => {}, defaultError, 'Purchasely', 'removeUserAttributeListener', []);
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

// Purchasely 6.0: allow (or defer) the SDK from opening deeplinks.
exports.allowDeeplink = function (allow) {
    exec(() => {}, defaultError, 'Purchasely', 'allowDeeplink', [allow]);
};

// Purchasely 6.0: allow (or defer) the SDK from displaying campaign deeplinks.
exports.allowCampaigns = function (allow) {
    exec(() => {}, defaultError, 'Purchasely', 'allowCampaigns', [allow]);
};

// @deprecated Purchasely 6.0 — renamed to allowDeeplink.
exports.readyToOpenDeeplink = function (isReady) {
    exports.allowDeeplink(isReady);
};

exports.setDefaultPresentationDismissHandler = function (success, error) {
    exec(success, error, 'Purchasely', 'setDefaultPresentationDismissHandler', []);
};

// @deprecated Purchasely 6.0 — renamed to setDefaultPresentationDismissHandler.
exports.setDefaultPresentationResultHandler = function (success, error) {
    exports.setDefaultPresentationDismissHandler(success, error);
};

// Purchasely 6.0: synchronize now reports completion. success receives true on
// success; error is invoked on failure (previously fire-and-forget).
exports.synchronize = function (success, error) {
    exec(success || (() => {}), error || defaultError, 'Purchasely', 'synchronize', []);
};

exports.presentPresentationWithIdentifier = function (presentationId, contentId, displayMode, success, error) {
    exec(success, error, 'Purchasely', 'presentPresentationWithIdentifier', [presentationId, contentId, normalizeDisplayMode(displayMode)]);
};

exports.presentPresentationForPlacement = function (placementId, contentId, displayMode, success, error) {
    exec(success, error, 'Purchasely', 'presentPresentationForPlacement', [placementId, contentId, normalizeDisplayMode(displayMode)]);
};

exports.fetchPresentation = function (presentationId, contentId, success, error) {
    exec(success, error, 'Purchasely', 'fetchPresentation', [null, presentationId, contentId]);
};

exports.fetchPresentationForPlacement = function (placementId, contentId, success, error) {
    exec(success, error, 'Purchasely', 'fetchPresentation', [placementId, null, contentId]);
};

exports.presentPresentation = function (presentation, displayMode, backgroundColor, success, error) {
    exec(success, error, 'Purchasely', 'presentPresentation', [presentation, normalizeDisplayMode(displayMode), backgroundColor]);
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

// Purchasely 6.0: returns whether the deeplink was handled by Purchasely.
exports.handleDeeplink = function (deepLink, success, error) {
    exec(success, error, 'Purchasely', 'handleDeeplink', [deepLink]);
};

// @deprecated Purchasely 6.0 — renamed to handleDeeplink.
exports.isDeeplinkHandled = function (deepLink, success, error) {
    exports.handleDeeplink(deepLink, success, error);
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

// Purchasely 6.0: per-action interceptor. Registers a handler for a single
// action kind (see Purchasely.PaywallAction). The handler receives
// (info, parameters) and returns — or resolves to — a Purchasely.InterceptResult
// ('success' | 'failed' | 'notHandled'); legacy booleans are also accepted
// (true -> notHandled, false -> success). Registering a kind again replaces its
// handler. This maps 1:1 onto the native v6 SDK, which intercepts per action.
var _actionInterceptors = {}; // kind -> true (registered)

function normalizeInterceptResult(result) {
    if (result === true) return 'notHandled';
    if (result === false) return 'success';
    if (result === 'success' || result === 'failed' || result === 'notHandled') return result;
    return 'notHandled';
}

exports.interceptAction = function (kind, handler) {
    exports.removeActionInterceptor(kind);
    _actionInterceptors[kind] = true;
    exec(function (event) {
        // Native registers one interceptor per kind, so events only arrive for
        // this kind; guard anyway. `callbackId` ties the async reply back to the
        // exact intercepted invocation, so concurrent intercepts never clobber.
        if (!event || event.action !== kind) return;
        Promise.resolve()
            .then(function () { return handler(event.info || null, event.parameters || null); })
            .then(function (result) {
                exec(function () {}, defaultError, 'Purchasely', 'completeActionInterceptor',
                    [event.callbackId, normalizeInterceptResult(result)]);
            })
            .catch(function () {
                exec(function () {}, defaultError, 'Purchasely', 'completeActionInterceptor',
                    [event.callbackId, 'failed']);
            });
    }, defaultError, 'Purchasely', 'registerActionInterceptor', [kind]);
};

// Purchasely 6.0: stop intercepting a single action kind.
exports.removeActionInterceptor = function (kind, success, error) {
    delete _actionInterceptors[kind];
    exec(function () {}, defaultError, 'Purchasely', 'unregisterActionInterceptor', [kind]);
    if (success) setTimeout(success, 0);
};

// Purchasely 6.0: stop intercepting every registered action kind.
exports.removeAllActionInterceptors = function (success, error) {
    Object.keys(_actionInterceptors).forEach(function (kind) {
        delete _actionInterceptors[kind];
        exec(function () {}, defaultError, 'Purchasely', 'unregisterActionInterceptor', [kind]);
    });
    if (success) setTimeout(success, 0);
};

// @deprecated Purchasely 6.0 — prefer interceptAction(kind, handler). Kept as a
// compatibility shim: registers every action kind and fans them into the single
// `success` callback with { action, info, parameters }. The app reports the
// outcome by calling onProcessAction(result). This legacy contract carries no
// invocation id, so outcomes match intercepts in FIFO order — correct for the
// usual one-action-at-a-time flow.
var _legacyInterceptQueue = [];

exports.setPaywallActionInterceptor = function (success) {
    exports.removeAllActionInterceptors();
    Object.keys(exports.PaywallAction).forEach(function (key) {
        var kind = exports.PaywallAction[key];
        exports.interceptAction(kind, function (info, parameters) {
            return new Promise(function (resolve) {
                _legacyInterceptQueue.push(resolve);
                success({ action: kind, info: info, parameters: parameters });
            });
        });
    });
};

// @deprecated Purchasely 6.0 — report how the intercepted action was handled.
// Only used with the deprecated setPaywallActionInterceptor; interceptAction
// handlers report their result by returning it. Accepts an InterceptResult
// string or a legacy boolean (true -> notHandled, false -> success).
exports.onProcessAction = function (result) {
    var resolve = _legacyInterceptQueue.shift();
    if (resolve) resolve(normalizeInterceptResult(result));
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

// Purchasely 6.0: close the displayed presentation.
exports.closePresentation = function () {
    exec(() => {}, defaultError, 'Purchasely', 'closePresentation', []);
};

// Purchasely 6.0: navigate back within the displayed presentation.
exports.backPresentation = function () {
    exec(() => {}, defaultError, 'Purchasely', 'backPresentation', []);
};

exports.setUserAttributeWithString = function (key, value, processLegalBasis) {
    exec(() => {}, defaultError, 'Purchasely', 'setUserAttributeWithString', [key, value, processLegalBasis]);
};

exports.setUserAttributeWithBoolean = function (key, value, processLegalBasis) {
    exec(() => {}, defaultError, 'Purchasely', 'setUserAttributeWithBoolean', [key, value, processLegalBasis]);
};

exports.setUserAttributeWithInt = function (key, value, processLegalBasis) {
    exec(() => {}, defaultError, 'Purchasely', 'setUserAttributeWithInt', [key, value, processLegalBasis]);
};

exports.setUserAttributeWithDouble = function (key, value, processLegalBasis) {
    exec(() => {}, defaultError, 'Purchasely', 'setUserAttributeWithDouble', [key, value, processLegalBasis]);
};

exports.setUserAttributeWithDate = function (key, value, processLegalBasis) {
    exec(() => {}, defaultError, 'Purchasely', 'setUserAttributeWithDate', [key, value, processLegalBasis]);
};

exports.setUserAttributeWithStringArray = function (key, value, processLegalBasis) {
    exec(() => {}, defaultError, 'Purchasely', 'setUserAttributeWithStringArray', [key, value, processLegalBasis]);
}

exports.setUserAttributeWithIntArray = function (key, value, processLegalBasis) {
    exec(() => {}, defaultError, 'Purchasely', 'setUserAttributeWithIntArray', [key, value, processLegalBasis]);
}

exports.setUserAttributeWithDoubleArray = function (key, value, processLegalBasis) {
    exec(() => {}, defaultError, 'Purchasely', 'setUserAttributeWithDoubleArray', [key, value, processLegalBasis]);
}

exports.setUserAttributeWithBooleanArray = function (key, value, processLegalBasis) {
    exec(() => {}, defaultError, 'Purchasely', 'setUserAttributeWithBooleanArray', [key, value, processLegalBasis]);
}

exports.userAttribute = function (key, success, error) {
    exec(success, error, 'Purchasely', 'userAttribute', [key]);
};

exports.clearUserAttribute = function (key) {
    exec(() => {}, defaultError, 'Purchasely', 'clearUserAttribute', [key]);
};

exports.clearUserAttributes = function () {
    exec(() => {}, defaultError, 'Purchasely', 'clearUserAttributes', []);
};

exports.clearBuiltInAttributes = function () {
    exec(() => {}, defaultError, 'Purchasely', 'clearBuiltInAttributes', []);
}

exports.isEligibleForIntroOffer = function (planId, success, error) {
    exec(success, error, 'Purchasely', 'isEligibleForIntroOffer', [planId]);
};

exports.signPromotionalOffer = function (storeProductId, storeOfferId, success, error) {
    exec(success, error, 'Purchasely', 'signPromotionalOffer', [storeProductId, storeOfferId]);
};

exports.setThemeMode = function (mode) {
    exec(() => {}, defaultError, 'Purchasely', 'setThemeMode', [mode]);
};

exports.revokeDataProcessingConsent = function (purposes) {
    exec(() => {}, defaultError, 'Purchasely', 'revokeDataProcessingConsent', [purposes]);
}

exports.setDebugMode = function (enabled) {
    exec(() => {}, defaultError, 'Purchasely', 'setDebugMode', [enabled]);
}

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
  MIXPANEL_DISTINCT_ID: 6,
  CLEVER_TAP_ID: 7,
  SENDINBLUE_USER_EMAIL: 8,
  ITERABLE_USER_EMAIL: 9,
  ITERABLE_USER_ID: 10,
  AT_INTERNET_ID_CLIENT: 11,
  MPARTICLE_USER_ID: 12,
  CUSTOMERIO_USER_ID: 13,
  CUSTOMERIO_USER_EMAIL: 14,
  BRANCH_USER_DEVELOPER_IDENTITY: 15,
  AMPLITUDE_USER_ID: 16,
  AMPLITUDE_DEVICE_ID: 17,
  MOENGAGE_UNIQUE_ID: 18,
  ONESIGNAL_EXTERNAL_ID: 19,
  BATCH_CUSTOM_USER_ID: 20,
}

exports.DataProcessingLegalBasis = {
    essential:  'ESSENTIAL',
    optional:   'OPTIONAL'
}

exports.DataProcessingPurpose = {
    allNonEssentials:       'ALL_NON_ESSENTIALS',
    analytics:              'ANALYTICS',
    identifiedAnalytics:    'IDENTIFIED_ANALYTICS',
    campaigns:              'CAMPAIGNS',
    personalization:        'PERSONALIZATION',
    thirdPartyIntegrations: 'THIRD_PARTY_INTEGRATIONS'
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

// Purchasely 6.0: running mode is passed by name (the native iOS and Android
// enums use different raw values). `paywallObserver` was merged into `observer`
// and is kept here as a deprecated alias.
exports.RunningMode = {
    observer: 'observer',
    full: 'full',
    paywallObserver: 'observer'
}

exports.PaywallAction = {
    close: 'close',
    close_all: 'close_all',
    login: 'login',
    navigate: 'navigate',
    purchase: 'purchase',
    restore: 'restore',
    open_presentation: 'open_presentation',
    open_placement: 'open_placement',
    promo_code: 'promo_code',
    web_checkout: 'web_checkout'
}

// Purchasely 6.0: PaywallAction was renamed to PresentationAction (same values).
// PaywallAction is kept above as a deprecated alias.
exports.PresentationAction = exports.PaywallAction;

// Purchasely 6.0: result reported to onProcessAction after handling an
// intercepted paywall action.
exports.InterceptResult = {
    success: 'success',
    failed: 'failed',
    notHandled: 'notHandled'
}

// Purchasely 6.0: the type of a fetched presentation.
exports.PresentationType = {
    normal: 0,
    fallback: 1,
    deactivated: 2,
    client: 3
}

// Purchasely 6.0: why a presentation closed (delivered in the dismiss outcome).
exports.CloseReason = {
    none: 'none',
    button: 'button',
    interactiveDismiss: 'interactive_dismiss',
    programmatic: 'programmatic'
}

// Purchasely 6.0: presentation display mode, passed in place of the former
// `isFullscreen` boolean to the present* methods.
exports.TransitionType = {
    fullScreen: 'fullScreen',
    modal: 'modal',
    drawer: 'drawer',
    popin: 'popin',
    push: 'push',
    inlinePaywall: 'inlinePaywall'
}

// Purchasely 6.0: sizing unit for drawer/popin display modes.
exports.DimensionType = {
    pixel: 'pixel',
    percentage: 'percentage'
}

// Purchasely 6.0: stores that can be enabled at start.
exports.Store = {
    google: 'Google',
    huawei: 'Huawei',
    amazon: 'Amazon'
}

// Purchasely 6.0: StoreKit version selection (iOS).
exports.StorekitVersion = {
    storeKit1: 'storeKit1',
    storeKit2: 'storeKit2'
}

exports.ThemeMode = {
	light: 0,
	dark: 1,
	system: 2
}

exports.UserAttributeAction = {
    ADD: 'add',
    REMOVE: 'remove'
}

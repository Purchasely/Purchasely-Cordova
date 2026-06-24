var exec = require('cordova/exec');

var defaultError = (e) => { console.log(e); }

var LOG_LEVEL_MAP = { debug: 0, info: 1, warn: 2, error: 3 };
var RUNNING_MODE_MAP = { observer: 2, full: 3 };

function resolveSdkVersion() {
    var v = cordova.define.moduleMap['cordova/plugin_list'].exports['metadata']['cordova-plugin-purchasely'];
    return v || '6.0.0-rc.1';
}

class PurchaselyBuilder {
    constructor(state) { this._state = state; }
    static apiKey(key) {
        return new PurchaselyBuilder({
            apiKey: key, appUserId: null, runningMode: 'observer', logLevel: 'error',
            allowDeeplink: false, allowCampaigns: true, androidStores: ['google'],
            storekitVersion: 'storeKit2',
        });
    }
    appUserId(id) { this._state.appUserId = id; return this; }
    runningMode(m) { this._state.runningMode = m; return this; }
    logLevel(l) { this._state.logLevel = l; return this; }
    allowDeeplink(a) { this._state.allowDeeplink = a; return this; }
    allowCampaigns(a) { this._state.allowCampaigns = a; return this; }
    stores(s) { this._state.androidStores = s; return this; }
    storekitVersion(v) { this._state.storekitVersion = v; return this; }
    start() {
        var s = this._state;
        var storeNames = s.androidStores.map(function (x) {
            return x.charAt(0).toUpperCase() + x.slice(1);
        });
        return new Promise(function (resolve, reject) {
            exec(function (configured) {
                exec(function () {}, function () {}, 'Purchasely', 'applyStartOptions',
                    [{ allowDeeplink: s.allowDeeplink, allowCampaigns: s.allowCampaigns }]);
                resolve(configured);
            }, reject, 'Purchasely', 'start', [
                s.apiKey, storeNames, s.storekitVersion === 'storeKit1', s.appUserId,
                LOG_LEVEL_MAP[s.logLevel], RUNNING_MODE_MAP[s.runningMode], resolveSdkVersion(),
            ]);
        });
    }
}

exports.PurchaselyBuilder = PurchaselyBuilder;
exports.builder = function (apiKey) { return PurchaselyBuilder.apiKey(apiKey); };

// ---------------------------------------------------------------------------
// Presentation outcome & error normalizers
// Module-level function declarations (hoisted) — consumed by Tasks 4–6.
// ---------------------------------------------------------------------------

function normalizePresentation(raw) {
  if (!raw || typeof raw !== 'object') return null;
  var screenId = raw.screenId != null ? raw.screenId : raw.id;
  if (!screenId) return null;
  return {
    screenId: screenId, id: screenId,
    placementId: raw.placementId != null ? raw.placementId : null,
    contentId: raw.contentId != null ? raw.contentId : null,
    audienceId: raw.audienceId != null ? raw.audienceId : null,
    abTestId: raw.abTestId != null ? raw.abTestId : null,
    abTestVariantId: raw.abTestVariantId != null ? raw.abTestVariantId : null,
    language: raw.language != null ? raw.language : null,
    type: raw.type != null ? raw.type : null,
    plans: raw.plans != null ? raw.plans : null,
    metadata: raw.metadata != null ? raw.metadata : null,
    height: raw.height != null ? raw.height : null,
  };
}

function normalizeError(raw) {
  if (!raw) return null;
  if (typeof raw === 'string') return { message: raw };
  return {
    code: raw.code != null ? raw.code : null,
    message: raw.message != null ? raw.message : 'Unknown error',
    domain: raw.domain != null ? raw.domain : null,
  };
}

function purchaseResultFromOrdinal(v) {
  if (v === null || v === undefined) return null;
  if (v === 0) return 'purchased';
  if (v === 2) return 'restored';
  if (v === 1) return 'cancelled';
  return null;
}

function eventToOutcome(event, presentation) {
  var error = normalizeError(event.error);
  return {
    presentation: presentation || null,
    purchaseResult: purchaseResultFromOrdinal(event.purchaseResult),
    plan: event.plan != null ? event.plan : null,
    closeReason: error ? null : (event.closeReason != null ? event.closeReason : null),
    error: error,
  };
}

// Internal test-only surface — not part of the public API.
exports.__test = { normalizePresentation, normalizeError, purchaseResultFromOrdinal, eventToOutcome };

// ---------------------------------------------------------------------------

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

exports.allowDeeplink = function (isAllowed) {
    exec(() => {}, defaultError, 'Purchasely', 'allowDeeplink', [isAllowed]);
};

// v6: renamed from setDefaultPresentationResultHandler (breaking change, no alias).
// Handles the dismissal of presentations the app did NOT open itself (campaigns,
// deeplinks, promoted in-app purchases). The success callback receives a rich
// outcome object:
//   {
//     result,          // legacy PurchaseResult code (0=PURCHASED, 1=CANCELLED, 2=RESTORED) — kept for compat
//     plan,            // the purchased/restored plan (or {} / undefined)
//     purchaseResult,  // 'purchased' | 'cancelled' | 'restored' | null
//     closeReason,     // e.g. 'button' | 'back_system' (Android) | 'interactiveDismiss' (iOS) | null
//     presentation     // the presentation that produced the outcome (screenId, placementId, campaignId, …)
//   }
exports.setDefaultPresentationDismissHandler = function (success, error) {
    exec(success, error, 'Purchasely', 'setDefaultPresentationDismissHandler', []);
};

exports.synchronize = function (success, error) {
    exec(success || (() => {}), error || defaultError, 'Purchasely', 'synchronize', []);
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

exports.handleDeeplink = function (deepLink, success, error) {
    exec(success, error, 'Purchasely', 'handleDeeplink', [deepLink]);
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

exports.RunningMode = {
    observer: 2,
    full: 3
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

exports.ThemeMode = {
	light: 0,
	dark: 1,
	system: 2
}

exports.UserAttributeAction = {
    ADD: 'add',
    REMOVE: 'remove'
}
var exec = require('cordova/exec');

var defaultError = (e) => { console.log(e); }

// Normalize a presentation transition. Accepts, for source compatibility:
//   - a display-mode string ('fullScreen'|'modal'|'drawer'|'popin'|'push'|'inlinePaywall')
//   - a legacy boolean (true -> fullScreen, false -> modal)
//   - a full transition object { type, dismissible?, width?, height?, backgroundColor? }
//     where width/height are { type: 'pixel'|'percentage', value: Number } (width is
//     popin-only, height drives drawer+popin) and backgroundColor is a hex string.
// CDV-W-12: when no displayMode is given, sends undefined (not a forced fullScreen
// default) so both natives' nil/null handling honors the backend-configured transition
// for that placement/screen, as documented in their own displayModeFromTransition /
// transitionFromMap helpers.
function normalizeTransition(mode) {
    if (mode === true) return { type: 'fullScreen' };
    if (mode === false) return { type: 'modal' };
    if (typeof mode === 'string') return { type: mode };
    if (mode && typeof mode === 'object' && mode.type) return mode;
    return undefined;
}

// Wire a present* command's callback stream. Purchasely 6.0 emits presentation
// lifecycle events during display: the native side sends keep-alive envelopes
// { event: 'presented', presentation } and { event: 'closeRequested' }, then the
// dismiss OUTCOME (which has no `event` key) as the final, non-kept callback.
// `callbacks` may carry onPresented(presentation, error) and onCloseRequested().
function presentationDispatcher(success, callbacks) {
    callbacks = callbacks || {};
    return function (payload) {
        if (payload && payload.event === 'presented') {
            if (callbacks.onPresented) callbacks.onPresented(payload.presentation || null, payload.error || null);
            return;
        }
        if (payload && payload.event === 'closeRequested') {
            if (callbacks.onCloseRequested) callbacks.onCloseRequested();
            return;
        }
        if (success) success(payload);
    };
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
        cordovaSdkVersion = "6.0.0-rc.3";
    }
    opts.sdkVersion = cordovaSdkVersion;
    exec(success, error, 'Purchasely', 'start', [opts]);
};

// REC-18 / PAR-18: addEventListener is the canonical name (matches RN's naming).
// addEventsListener (plural "Events", the original Cordova-only spelling) is kept as a
// deprecated alias.
exports.addEventListener = function (success, error) {
    exec(success, error, 'Purchasely', 'addEventsListener', []);
};

// @deprecated use addEventListener instead.
exports.addEventsListener = function (success, error) {
    exec(success, error, 'Purchasely', 'addEventsListener', []);
};

exports.addUserAttributeListener = function(success, error) {
    exec(success, error, 'Purchasely', 'addUserAttributeListener', []);
};

exports.removeUserAttributeListener = function () {
    exec(() => {}, defaultError, 'Purchasely', 'removeUserAttributeListener', []);
};

// REC-18 / PAR-18: canonical name, paired with addEventListener.
exports.removeEventListener = function () {
    exec(() => {}, defaultError, 'Purchasely', 'removeEventsListener', []);
};

// @deprecated use removeEventListener instead.
exports.removeEventsListener = function () {
    exec(() => {}, defaultError, 'Purchasely', 'removeEventsListener', []);
};

exports.getAnonymousUserId = function (success, error) {
    exec(success, error, 'Purchasely', 'getAnonymousUserId', []);
};

exports.userLogin = function (userId, success) {
    exec(success, defaultError, 'Purchasely', 'userLogin', [userId]);
};

// PAR-30: clearUserAttributes controls whether logout also clears locally cached user
// attributes (native default true on both platforms).
exports.userLogout = function (clearUserAttributes) {
    var clear = clearUserAttributes === undefined ? true : clearUserAttributes;
    exec(() => {}, defaultError, 'Purchasely', 'userLogout', [clear]);
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

exports.setDefaultPresentationDismissHandler = function (success, error) {
    exec(success, error, 'Purchasely', 'setDefaultPresentationDismissHandler', []);
};

// Purchasely 6.0: stop receiving default (campaign/deeplink) presentation dismiss outcomes.
exports.removeDefaultPresentationDismissHandler = function () {
    exec(() => {}, defaultError, 'Purchasely', 'removeDefaultPresentationDismissHandler', []);
};

// Purchasely 6.0: synchronize now reports completion. success receives true on
// success; error is invoked on failure (previously fire-and-forget).
exports.synchronize = function (success, error) {
    exec(success || (() => {}), error || defaultError, 'Purchasely', 'synchronize', []);
};

// Purchasely 6.0: the v5 presentation surface (fetchPresentation*, present-
// Presentation*, presentPresentation, backPresentation) is REMOVED, not
// deprecated -- replaced by the v6 builder below (parity with the React
// Native/Flutter SDKs; see MIGRATION-v6.md). It re-wraps the very same native
// exec actions used by v5 (fetchPresentation, presentPresentation,
// presentPresentationWithIdentifier/ForPlacement/ForDefault, backPresentation,
// closeAllScreens): no new native action is introduced.
//
//   Purchasely.presentation.placement(id) | .screen(id) | .defaultSource()  // alias: .default()
//     .contentId(id)
//     .onPresented(cb) / .onCloseRequested(cb) / .onDismissed(cb)
//     .build()
//       .preload()             -> Promise<presentation>            (screenId is authoritative)
//       .display(transition?)  -> Promise<outcome>                 ({ presentation, purchaseResult, plan, closeReason, error })
//       .close()               -> closeAllScreens()
//       .back()                -> navigate back within the displayed presentation
//
// screenId is authoritative: normalizePresentation always resolves it (tolerating
// a raw `id` fallback) and only exposes the documented presentation fields. Any
// native re-display handle (Android's synthetic fetchId; iOS's internal `id`,
// which already equals screenId there) never leaves the private `_raw` field
// kept on the request -- it is not part of the presentation object handed back
// to callers.

function normalizeError(error) {
    if (error === undefined || error === null) return null;
    if (typeof error === 'object' && error.message) return error;
    return { message: String(error) };
}

function normalizePresentation(raw) {
    if (!raw || typeof raw !== 'object') return null;
    var screenId = raw.screenId != null ? raw.screenId : raw.id;
    if (screenId == null) return null;
    return {
        screenId: screenId,
        placementId: raw.placementId != null ? raw.placementId : null,
        contentId: raw.contentId != null ? raw.contentId : null,
        audienceId: raw.audienceId != null ? raw.audienceId : null,
        abTestId: raw.abTestId != null ? raw.abTestId : null,
        abTestVariantId: raw.abTestVariantId != null ? raw.abTestVariantId : null,
        campaignId: raw.campaignId != null ? raw.campaignId : null,
        flowId: raw.flowId != null ? raw.flowId : null,
        language: raw.language != null ? raw.language : null,
        type: raw.type != null ? raw.type : null,
        plans: raw.plans != null ? raw.plans : null,
        metadata: raw.metadata != null ? raw.metadata : null,
        height: raw.height != null ? raw.height : null
    };
}

function normalizeOutcome(raw) {
    raw = raw || {};
    return {
        presentation: normalizePresentation(raw.presentation),
        purchaseResult: raw.purchaseResult != null ? raw.purchaseResult : null,
        plan: raw.plan != null ? raw.plan : null,
        closeReason: raw.closeReason != null ? raw.closeReason : null,
        error: raw.error != null ? raw.error : null
    };
}

// A single presentation request: preload it (fetch without display), display it
// (resolves at dismiss with a 5-field outcome), close it, or navigate back. Calling
// `display()` after `preload()` re-displays the exact presentation that was fetched
// (via the native presentPresentation action, carrying its private re-display
// handle); `display()` alone (no prior preload) fetches and displays directly
// through the present* action matching this request's source.
function PLYPresentationRequest(config) {
    this._config = config; // { placementId?, screenId?, contentId?, callbacks }
    this._raw = null; // private: native fetch payload (carries the re-display handle)
}

PLYPresentationRequest.prototype.preload = function () {
    var self = this;
    return new Promise(function (resolve, reject) {
        exec(function (raw) {
            self._raw = raw;
            resolve(normalizePresentation(raw));
        }, function (error) {
            reject(normalizeError(error));
        }, 'Purchasely', 'fetchPresentation', [
            self._config.placementId || null,
            self._config.screenId || null,
            self._config.contentId || null
        ]);
    });
};

PLYPresentationRequest.prototype.display = function (transition) {
    var self = this;
    var callbacks = this._config.callbacks;
    var normalizedTransition = normalizeTransition(transition);

    return new Promise(function (resolve) {
        function settle(rawOutcome) {
            var outcome = normalizeOutcome(rawOutcome);
            if (callbacks.onDismissed) callbacks.onDismissed(outcome);
            resolve(outcome);
        }
        var dispatch = presentationDispatcher(settle, {
            onPresented: callbacks.onPresented,
            onCloseRequested: callbacks.onCloseRequested
        });
        function onNativeError(error) {
            var normalized = normalizeError(error);
            settle({ error: normalized ? normalized.message : 'Unable to display presentation' });
        }

        if (self._raw) {
            // Re-display the presentation preloaded by preload() -- same native
            // 'presentPresentation' action v5 used, carrying its private handle.
            exec(dispatch, onNativeError, 'Purchasely', 'presentPresentation', [self._raw, normalizedTransition, null]);
        } else if (self._config.screenId) {
            exec(dispatch, onNativeError, 'Purchasely', 'presentPresentationWithIdentifier',
                [self._config.screenId, self._config.contentId || null, normalizedTransition]);
        } else if (self._config.placementId) {
            exec(dispatch, onNativeError, 'Purchasely', 'presentPresentationForPlacement',
                [self._config.placementId, self._config.contentId || null, normalizedTransition]);
        } else {
            exec(dispatch, onNativeError, 'Purchasely', 'presentPresentationForDefault',
                [self._config.contentId || null, normalizedTransition]);
        }
    });
};

// Purchasely 6.0: dismisses via the same native action as the top-level
// Purchasely.closeAllScreens() / closePresentation() (current bridge semantics:
// closes every displayed screen, not just this request's).
PLYPresentationRequest.prototype.close = function () {
    exports.closeAllScreens();
};

// Purchasely 6.0: navigate back within the displayed presentation (was the
// standalone Purchasely.backPresentation(), now request-scoped).
PLYPresentationRequest.prototype.back = function () {
    exec(() => {}, defaultError, 'Purchasely', 'backPresentation', []);
};

function PLYPresentationBuilder(config) {
    this._config = config; // { placementId?, screenId?, contentId?, callbacks }
}

PLYPresentationBuilder.prototype.contentId = function (id) {
    this._config.contentId = id;
    return this;
};

PLYPresentationBuilder.prototype.onPresented = function (handler) {
    this._config.callbacks.onPresented = handler;
    return this;
};

PLYPresentationBuilder.prototype.onCloseRequested = function (handler) {
    this._config.callbacks.onCloseRequested = handler;
    return this;
};

PLYPresentationBuilder.prototype.onDismissed = function (handler) {
    this._config.callbacks.onDismissed = handler;
    return this;
};

PLYPresentationBuilder.prototype.build = function () {
    return new PLYPresentationRequest(this._config);
};

// Purchasely 6.0: the v6 presentation builder (parity with the React Native /
// Flutter Purchasely.presentation). Pick exactly one source, chain
// .contentId() / .onPresented() / .onCloseRequested() / .onDismissed(), then
// .build().
exports.presentation = {
    placement: function (placementId) {
        return new PLYPresentationBuilder({ placementId: placementId, callbacks: {} });
    },
    screen: function (screenId) {
        return new PLYPresentationBuilder({ screenId: screenId, callbacks: {} });
    },
    defaultSource: function () {
        return new PLYPresentationBuilder({ callbacks: {} });
    },
    // Alias of defaultSource(), kept for parity with the iOS native API name.
    default: function () {
        return exports.presentation.defaultSource();
    }
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
// action kind (see Purchasely.PresentationAction). The handler receives
// (info, parameters) and returns — or resolves to — a Purchasely.InterceptResult
// ('success' | 'failed' | 'notHandled'). Registering a kind again replaces its
// handler. This maps 1:1 onto the native v6 SDK, which intercepts per action.
var _actionInterceptors = {}; // kind -> true (registered)

function normalizeInterceptResult(result) {
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

exports.userDidConsumeSubscriptionContent = function () {
    exec(() => {}, defaultError, 'Purchasely', 'userDidConsumeSubscriptionContent', []);
};

// PAR-29: invalidateCache forces a fresh fetch instead of returning the cached list
// (native default false on both platforms).
exports.userSubscriptions = function (success, error, invalidateCache) {
    exec(success, defaultError, 'Purchasely', 'userSubscriptions', [!!invalidateCache]);
};

exports.userSubscriptionsHistory = function (success, error, invalidateCache) {
    exec(success, defaultError, 'Purchasely', 'userSubscriptionsHistory', [!!invalidateCache]);
};

exports.setLanguage = function (language) {
    exec(() => {}, defaultError, 'Purchasely', 'setLanguage', [language]);
};

// PAR-19: closeAllScreens is the canonical name (matches the iOS/Android Purchasely-level
// API). success/error are optional.
exports.closeAllScreens = function (success, error) {
    exec(success || (() => {}), error || defaultError, 'Purchasely', 'closeAllScreens', []);
};

// @deprecated use closeAllScreens instead; kept as an alias (same native action both
// platforms already call: Purchasely.closeAllScreens()).
exports.closePresentation = function (success, error) {
    exports.closeAllScreens(success, error);
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

// REC-12 / PAR-03: bulk read of every user attribute currently stored, with the same
// per-value type conversions as the single-key userAttribute(key) read.
exports.userAttributes = function (success, error) {
    exec(success, error || defaultError, 'Purchasely', 'userAttributes', []);
};

// REC-12 / PAR-02: increment/decrement a numerical user attribute. value defaults to 1
// natively when omitted.
exports.incrementUserAttribute = function (key, value) {
    exec(() => {}, defaultError, 'Purchasely', 'incrementUserAttribute', [key, value]);
};

exports.decrementUserAttribute = function (key, value) {
    exec(() => {}, defaultError, 'Purchasely', 'decrementUserAttribute', [key, value]);
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

// PAR-07: read-only accessors for the built-in (SDK-collected) attributes.
exports.getBuiltInAttributes = function (success, error) {
    exec(success, error || defaultError, 'Purchasely', 'getBuiltInAttributes', []);
};

exports.getBuiltInAttribute = function (key, success, error) {
    exec(success, error || defaultError, 'Purchasely', 'getBuiltInAttribute', [key]);
};

// REC-12 / PAR-04: whether the current user is anonymous (no userLogin call yet).
exports.isAnonymous = function (success, error) {
    exec(success, error || defaultError, 'Purchasely', 'isAnonymous', []);
};

// PAR-05: Dynamic Offerings -- force a specific plan (and optionally offer) to be shown
// in a specific context, keyed by an app-chosen reference.
exports.setDynamicOffering = function (reference, planVendorId, offerVendorId, success, error) {
    exec(success || (() => {}), error || defaultError, 'Purchasely', 'setDynamicOffering', [reference, planVendorId, offerVendorId]);
};

// Returns a list of { reference, planVendorId, offerVendorId }.
exports.getDynamicOfferings = function (success, error) {
    exec(success, error || defaultError, 'Purchasely', 'getDynamicOfferings', []);
};

exports.removeDynamicOffering = function (reference) {
    exec(() => {}, defaultError, 'Purchasely', 'removeDynamicOffering', [reference]);
};

exports.clearDynamicOfferings = function () {
    exec(() => {}, defaultError, 'Purchasely', 'clearDynamicOfferings', []);
};

exports.isEligibleForIntroOffer = function (planId, success, error) {
    exec(success, error, 'Purchasely', 'isEligibleForIntroOffer', [planId]);
};

// REC-04: iOS-only (StoreKit promotional offer signing). On Android this is a no-op that
// resolves success (no signing is required there); no error is raised.
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

// WARNING: this list, iOS's CordovaPLYAttribute typedef, and Android's CordovaPLYAttribute
// enum class must be kept in strictly identical declaration order across all 3. The bridge
// matches an attribute by ordinal/symbol POSITION (not by the real native SDK's raw value,
// which does churn -- see the native PLYAttribute/Attribute enums), so appending a new
// attribute here always requires the matching append, in the same position, on both natives.
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
  ONESIGNAL_USER_ID: 21, // ENM-02 / REC-11
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
// enums use different raw values). Native 6.0 exposes only observer and full.
exports.RunningMode = {
    observer: 'observer',
    full: 'full'
}

// Purchasely 6.0: the paywall action kinds handled by interceptAction.
exports.PresentationAction = {
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

// Purchasely 6.0: result returned by an interceptAction handler after handling
// an intercepted paywall action.
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
// Matches the native PLYCloseReason wire contract (identical to the Flutter
// PLYCloseReason enum): `button`, `back_system`, `programmatic`. Android emits
// these directly; on iOS a swipe/interactive dismiss maps to `back_system`, and
// a close with no dismiss reason (e.g. after a purchase) omits the key.
exports.CloseReason = {
    button: 'button',
    backSystem: 'back_system',
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

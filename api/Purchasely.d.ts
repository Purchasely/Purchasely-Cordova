export function start(options: any, success: any, error: any): void;
export function builder(apiKey: any): PLYStartBuilder;
export function addEventListener(success: any, error: any): void;
export function addEventsListener(success: any, error: any): void;
export function addWebRedemptionListener(success: any, error: any): void;
export function removeWebRedemptionListener(): void;
export function addUserAttributeListener(success: any, error: any): void;
export function removeUserAttributeListener(): void;
export function removeEventListener(): void;
export function removeEventsListener(): void;
export function getAnonymousUserId(success: any, error: any): void;
export function userLogin(userId: any, success: any): void;
export function userLogout(clearUserAttributes: any): void;
export function setLogLevel(logLevel: any): void;
export function setAttribute(attribute: any, value: any): void;
export function allowDeeplink(allow: any): void;
export function allowCampaigns(allow: any): void;
export function setDefaultPresentationDismissHandler(success: any, error: any): void;
export function removeDefaultPresentationDismissHandler(): void;
export function synchronize(success: any, error: any): void;
export namespace presentation {
    export function placement(placementId: any): PLYPresentationBuilder;
    export function screen(screenId: any): PLYPresentationBuilder;
    export function defaultSource(): PLYPresentationBuilder;
    function _default(): PLYPresentationBuilder;
    export { _default as default };
}
export function purchaseWithPlanVendorId(planId: any, offerId: any, contentId: any, success: any, error: any): void;
export function restoreAllProducts(success: any, error: any): void;
export function silentRestoreAllProducts(success: any, error: any): void;
export function purchasedSubscription(success: any, error: any): void;
export function handleDeeplink(deepLink: any, success: any, error: any): void;
export function allProducts(success: any, error: any): void;
export function planWithIdentifier(planId: any, success: any): void;
export function productWithIdentifier(productId: any, success: any): void;
export function interceptAction(kind: any, handler: any): void;
export function removeActionInterceptor(kind: any, success: any, error: any): void;
export function removeAllActionInterceptors(success: any, error: any): void;
export function userDidConsumeSubscriptionContent(): void;
export function userSubscriptions(success: any, error: any, invalidateCache: any): void;
export function userSubscriptionsHistory(success: any, error: any, invalidateCache: any): void;
export function setLanguage(language: any): void;
export function closeAllScreens(success: any, error: any): void;
export function closePresentation(success: any, error: any): void;
export function setUserAttributeWithString(key: any, value: any, processLegalBasis: any): void;
export function setUserAttributeWithBoolean(key: any, value: any, processLegalBasis: any): void;
export function setUserAttributeWithInt(key: any, value: any, processLegalBasis: any): void;
export function setUserAttributeWithDouble(key: any, value: any, processLegalBasis: any): void;
export function setUserAttributeWithDate(key: any, value: any, processLegalBasis: any): void;
export function setUserAttributeWithStringArray(key: any, value: any, processLegalBasis: any): void;
export function setUserAttributeWithIntArray(key: any, value: any, processLegalBasis: any): void;
export function setUserAttributeWithDoubleArray(key: any, value: any, processLegalBasis: any): void;
export function setUserAttributeWithBooleanArray(key: any, value: any, processLegalBasis: any): void;
export function userAttribute(key: any, success: any, error: any): void;
export function userAttributes(success: any, error: any): void;
export function incrementUserAttribute(key: any, value: any): void;
export function decrementUserAttribute(key: any, value: any): void;
export function clearUserAttribute(key: any): void;
export function clearUserAttributes(): void;
export function clearBuiltInAttributes(): void;
export function getBuiltInAttributes(success: any, error: any): void;
export function getBuiltInAttribute(key: any, success: any, error: any): void;
export function isAnonymous(success: any, error: any): void;
export namespace BillingPlanType {
    let unspecified: number;
    let upFront: number;
    let monthly: number;
}
export function setDynamicOffering(reference: any, planVendorId: any, offerVendorId: any, billingPlanType: any, success: any, error: any): void;
export function getDynamicOfferings(success: any, error: any): void;
export function removeDynamicOffering(reference: any): void;
export function emit(name: any, properties: any, success: any, error: any): void;
export function clearDynamicOfferings(): void;
export function isEligibleForIntroOffer(planId: any, success: any, error: any): void;
export function signPromotionalOffer(storeProductId: any, storeOfferId: any, success: any, error: any): void;
export function signPromotionalOfferWithToken(storeProductId: any, storeOfferId: any, purchaseContextToken: any, success: any, error: any): void;
export function setThemeMode(mode: any): void;
export function revokeDataProcessingConsent(purposes: any): void;
export function setDebugMode(enabled: any): void;
export namespace LogLevel {
    let DEBUG: number;
    let INFO: number;
    let WARN: number;
    let ERROR: number;
}
export namespace Attribute {
    let FIREBASE_APP_INSTANCE_ID: number;
    let AIRSHIP_CHANNEL_ID: number;
    let AIRSHIP_USER_ID: number;
    let BATCH_INSTALLATION_ID: number;
    let ADJUST_ID: number;
    let APPSFLYER_ID: number;
    let MIXPANEL_DISTINCT_ID: number;
    let CLEVER_TAP_ID: number;
    let SENDINBLUE_USER_EMAIL: number;
    let ITERABLE_USER_EMAIL: number;
    let ITERABLE_USER_ID: number;
    let AT_INTERNET_ID_CLIENT: number;
    let MPARTICLE_USER_ID: number;
    let CUSTOMERIO_USER_ID: number;
    let CUSTOMERIO_USER_EMAIL: number;
    let BRANCH_USER_DEVELOPER_IDENTITY: number;
    let AMPLITUDE_USER_ID: number;
    let AMPLITUDE_DEVICE_ID: number;
    let MOENGAGE_UNIQUE_ID: number;
    let ONESIGNAL_EXTERNAL_ID: number;
    let BATCH_CUSTOM_USER_ID: number;
    let ONESIGNAL_USER_ID: number;
}
export namespace DataProcessingLegalBasis {
    let essential: string;
    let optional: string;
}
export namespace DataProcessingPurpose {
    let allNonEssentials: string;
    let analytics: string;
    let identifiedAnalytics: string;
    let campaigns: string;
    let personalization: string;
    let thirdPartyIntegrations: string;
    let refundHandling: string;
}
export namespace PurchaseResult {
    let PURCHASED: number;
    let CANCELLED: number;
    let RESTORED: number;
}
export namespace SubscriptionSource {
    let appleAppStore: number;
    let googlePlayStore: number;
    let amazonAppstore: number;
    let huaweiAppGallery: number;
    let webCheckoutStripe: number;
    let none: number;
}
export namespace PlanType {
    let consumable: number;
    let nonConsumable: number;
    let autoRenewingSubscription: number;
    let nonRenewingSubscription: number;
    let unknown: number;
}
export namespace RunningMode {
    let observer: string;
    let full: string;
}
export namespace PresentationAction {
    let close: string;
    let closeAll: string;
    let login: string;
    let navigate: string;
    let purchase: string;
    let restore: string;
    let openPresentation: string;
    let openPlacement: string;
    let promoCode: string;
    let webCheckout: string;
}
export namespace InterceptResult {
    let success: string;
    let failed: string;
    let notHandled: string;
}
export namespace PresentationType {
    let normal: number;
    let fallback: number;
    let deactivated: number;
    let client: number;
}
export namespace CloseReason {
    let button: string;
    let backSystem: string;
    let programmatic: string;
}
export namespace TransitionType {
    let fullScreen: string;
    let modal: string;
    let drawer: string;
    let popin: string;
    let push: string;
    let inlinePaywall: string;
}
export namespace DimensionType {
    let pixel: string;
    let percentage: string;
}
export namespace Store {
    let google: string;
    let huawei: string;
    let amazon: string;
}
export namespace StorekitVersion {
    let storeKit1: string;
    let storeKit2: string;
}
export namespace ThemeMode {
    let light: number;
    let dark: number;
    let system: number;
}
export namespace UserAttributeAction {
    let ADD: string;
    let REMOVE: string;
}
declare function PLYStartBuilder(apiKey: any): void;
declare class PLYStartBuilder {
    constructor(apiKey: any);
    _options: {
        apiKey: any;
    };
    appUserId(value: any): this;
    runningMode(value: any): this;
    logLevel(value: any): this;
    allowDeeplink(value: any): this;
    allowCampaigns(value: any): this;
    stores(value: any): this;
    storekitVersion(value: any): this;
    storeKit1(value: any): this;
    deeplink(value: any): this;
    anonymousUserId(id: any, override: any): this;
    proxy(api: any, ...args: any[]): this;
    appHandlesRedemptionAlert(handles: any): this;
    webRedemptionListener(callback: any, appHandlesRedemptionAlert: any): this;
    _webRedemptionCallback: any;
    start(success: any, error: any): any;
}
declare function PLYPresentationBuilder(config: any): void;
declare class PLYPresentationBuilder {
    constructor(config: any);
    _config: any;
    contentId(id: any): this;
    backgroundColor(hex: any): this;
    onLoaded(handler: any): this;
    onPresented(handler: any): this;
    onCloseRequested(handler: any): this;
    onDismissed(handler: any): this;
    build(): PLYPresentationRequest;
}
declare function PLYPresentationRequest(config: any): void;
declare class PLYPresentationRequest {
    constructor(config: any);
    _config: any;
    _raw: any;
    preload(): any;
    display(transition: any): any;
    close(): void;
    back(): void;
}
export {};

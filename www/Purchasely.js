import { exec } from "cordova";

const defaultError = (e) => {
  console.log(e);
};

const Purchasely = {};

Purchasely.startWithAPIKey = (
  apiKey,
  stores,
  userId,
  logLevel,
  runningMode,
  success,
  error
) => {
  let cordovaSdkVersion =
    cordova.define.moduleMap["cordova/plugin_list"].exports["metadata"][
      "cordova-plugin-purchasely"
    ];
  if (!cordovaSdkVersion) {
    cordovaSdkVersion = "2.2.0"; //fallback if we cannot find version from metadata
  }
  exec(success, error, "Purchasely", "startWithAPIKey", [
    apiKey,
    stores,
    userId,
    logLevel,
    runningMode,
    cordovaSdkVersion,
  ]);
};

Purchasely.addEventsListener = (success, error) =>
  exec(success, error, "Purchasely", "addEventsListener", []);

Purchasely.removeEventsListener = () =>
  exec(() => {}, defaultError, "Purchasely", "removeEventsListener", []);

Purchasely.getAnonymousUserId = (success, error) =>
  exec(success, error, "Purchasely", "getAnonymousUserId", []);

Purchasely.userLogin = (userId, success) =>
  exec(success, defaultError, "Purchasely", "userLogin", [userId]);

Purchasely.userLogout = () =>
  exec(() => {}, defaultError, "Purchasely", "userLogout", []);

Purchasely.setLogLevel = (logLevel) =>
  exec(() => {}, defaultError, "Purchasely", "setLogLevel", [logLevel]);

Purchasely.setAttribute = (attribute, value) =>
  exec(() => {}, defaultError, "Purchasely", "setAttribute", [
    attribute,
    value,
  ]);

Purchasely.isReadyToPurchase = (isReady) =>
  exec(() => {}, defaultError, "Purchasely", "isReadyToPurchase", [isReady]);

Purchasely.setDefaultPresentationResultHandler = (success, error) =>
  exec(success, error, "Purchasely", "setDefaultPresentationResultHandler", []);

Purchasely.synchronize = () =>
  exec(() => {}, defaultError, "Purchasely", "synchronize", []);

Purchasely.presentPresentationWithIdentifier = (
  presentationId,
  contentId,
  isFullscreen,
  success,
  error
) =>
  exec(success, error, "Purchasely", "presentPresentationWithIdentifier", [
    presentationId,
    contentId,
    isFullscreen,
  ]);

Purchasely.presentPresentationForPlacement = (
  placementId,
  contentId,
  isFullscreen,
  success,
  error
) =>
  exec(success, error, "Purchasely", "presentPresentationForPlacement", [
    placementId,
    contentId,
    isFullscreen,
  ]);

Purchasely.presentProductWithIdentifier = (
  productId,
  presentationId,
  contentId,
  isFullscreen,
  success,
  error
) =>
  exec(success, error, "Purchasely", "presentProductWithIdentifier", [
    productId,
    presentationId,
    contentId,
    isFullscreen,
  ]);

Purchasely.presentPlanWithIdentifier = (
  planId,
  presentationId,
  contentId,
  isFullscreen,
  success,
  error
) =>
  exec(success, error, "Purchasely", "presentPlanWithIdentifier", [
    planId,
    presentationId,
    contentId,
    isFullscreen,
  ]);

Purchasely.presentSubscriptions = () =>
  exec(() => {}, defaultError, "Purchasely", "presentSubscriptions", []);

Purchasely.purchaseWithPlanVendorId = (
  planId,
  contentId = null,
  success,
  error
) =>
  exec(success, error, "Purchasely", "purchaseWithPlanVendorId", [
    planId,
    contentId,
  ]);

Purchasely.restoreAllProducts = (success, error) =>
  exec(success, error, "Purchasely", "restoreAllProducts", []);

Purchasely.silentRestoreAllProducts = (success, error) =>
  exec(success, error, "Purchasely", "silentRestoreAllProducts", []);

Purchasely.purchasedSubscription = (success, error) =>
  exec(success, error, "Purchasely", "purchasedSubscription", []);

Purchasely.handle = (deepLink, success, error) =>
  exec(success, error, "Purchasely", "handle", [deepLink]);

Purchasely.allProducts = (success, error) =>
  exec(success, defaultError, "Purchasely", "allProducts", []);

Purchasely.planWithIdentifier = (planId, success) =>
  exec(success, defaultError, "Purchasely", "planWithIdentifier", [planId]);

Purchasely.productWithIdentifier = (productId, success) =>
  exec(success, defaultError, "Purchasely", "productWithIdentifier", [
    productId,
  ]);

Purchasely.setPaywallActionInterceptor = (success) =>
  exec(success, defaultError, "Purchasely", "setPaywallActionInterceptor", []);

Purchasely.onProcessAction = (processAction) =>
  exec(() => {}, defaultError, "Purchasely", "onProcessAction", [
    processAction,
  ]);

Purchasely.closePaywall = () =>
  exec(() => {}, defaultError, "Purchasely", "closePaywall", []);

Purchasely.userSubscriptions = (success, error) =>
  exec(success, defaultError, "Purchasely", "userSubscriptions", []);

Purchasely.setLanguage = (language) =>
  exec(() => {}, defaultError, "Purchasely", "setLanguage", [language]);

Purchasely.LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

Purchasely.Attribute = {
  AMPLITUDE_SESSION_ID: 0,
  FIREBASE_APP_INSTANCE_ID: 1,
  AIRSHIP_CHANNEL_ID: 2,
  BATCH_INSTALLATION_ID: 3,
  ADJUST_ID: 4,
  APPSFLYER_ID: 5,
  ONESIGNAL_PLAYER_ID: 6,
};

Purchasely.PurchaseResult = {
  PURCHASED: 0,
  CANCELLED: 1,
  RESTORED: 2,
};

Purchasely.SubscriptionSource = {
  appleAppStore: 0,
  googlePlayStore: 1,
  amazonAppstore: 2,
  huaweiAppGallery: 3,
  none: 4,
};

Purchasely.PlanType = {
  consumable: 0,
  nonConsumable: 1,
  autoRenewingSubscription: 2,
  nonRenewingSubscription: 3,
  unknown: 4,
};

Purchasely.RunningMode = {
  transactionOnly: 0,
  observer: 1,
  paywallOnly: 2,
  paywallObserver: 3,
  full: 4,
};

Purchasely.PaywallAction = {
  close: "close",
  login: "login",
  navigate: "navigate",
  purchase: "purchase",
  restore: "restore",
  open_presentation: "open_presentation",
  promo_code: "promo_code",
};

export default Purchasely;

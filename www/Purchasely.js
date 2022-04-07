import { exec } from "cordova";

const defaultError = (e) => {
  console.log(e);
};

export const startWithAPIKey = (
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

export const addEventsListener = (success, error) =>
  exec(success, error, "Purchasely", "addEventsListener", []);

export const removeEventsListener = () =>
  exec(() => {}, defaultError, "Purchasely", "removeEventsListener", []);

export const getAnonymousUserId = (success, error) =>
  exec(success, error, "Purchasely", "getAnonymousUserId", []);

export const userLogin = (userId, success) =>
  exec(success, defaultError, "Purchasely", "userLogin", [userId]);

export const userLogout = () =>
  exec(() => {}, defaultError, "Purchasely", "userLogout", []);

export const setLogLevel = (logLevel) =>
  exec(() => {}, defaultError, "Purchasely", "setLogLevel", [logLevel]);

export const setAttribute = (attribute, value) =>
  exec(() => {}, defaultError, "Purchasely", "setAttribute", [
    attribute,
    value,
  ]);

export const isReadyToPurchase = (isReady) =>
  exec(() => {}, defaultError, "Purchasely", "isReadyToPurchase", [isReady]);

export const setDefaultPresentationResultHandler = (success, error) =>
  exec(success, error, "Purchasely", "setDefaultPresentationResultHandler", []);

export const synchronize = () =>
  exec(() => {}, defaultError, "Purchasely", "synchronize", []);

export const presentPresentationWithIdentifier = (
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

export const presentPresentationForPlacement = (
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

export const presentProductWithIdentifier = (
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

export const presentPlanWithIdentifier = (
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

export const presentSubscriptions = () =>
  exec(() => {}, defaultError, "Purchasely", "presentSubscriptions", []);

export const purchaseWithPlanVendorId = (
  planId,
  contentId = null,
  success,
  error
) =>
  exec(success, error, "Purchasely", "purchaseWithPlanVendorId", [
    planId,
    contentId,
  ]);

export const restoreAllProducts = (success, error) =>
  exec(success, error, "Purchasely", "restoreAllProducts", []);

export const silentRestoreAllProducts = (success, error) =>
  exec(success, error, "Purchasely", "silentRestoreAllProducts", []);

export const purchasedSubscription = (success, error) =>
  exec(success, error, "Purchasely", "purchasedSubscription", []);

export const handle = (deepLink, success, error) =>
  exec(success, error, "Purchasely", "handle", [deepLink]);

export const allProducts = (success, error) =>
  exec(success, defaultError, "Purchasely", "allProducts", []);

export const planWithIdentifier = (planId, success) =>
  exec(success, defaultError, "Purchasely", "planWithIdentifier", [planId]);

export const productWithIdentifier = (productId, success) =>
  exec(success, defaultError, "Purchasely", "productWithIdentifier", [
    productId,
  ]);

export const setPaywallActionInterceptor = (success) =>
  exec(success, defaultError, "Purchasely", "setPaywallActionInterceptor", []);

export const onProcessAction = (processAction) =>
  exec(() => {}, defaultError, "Purchasely", "onProcessAction", [
    processAction,
  ]);

export const closePaywall = () =>
  exec(() => {}, defaultError, "Purchasely", "closePaywall", []);

export const userSubscriptions = (success, error) =>
  exec(success, defaultError, "Purchasely", "userSubscriptions", []);

export const setLanguage = (language) =>
  exec(() => {}, defaultError, "Purchasely", "setLanguage", [language]);

export const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

export const Attribute = {
  AMPLITUDE_SESSION_ID: 0,
  FIREBASE_APP_INSTANCE_ID: 1,
  AIRSHIP_CHANNEL_ID: 2,
  BATCH_INSTALLATION_ID: 3,
  ADJUST_ID: 4,
  APPSFLYER_ID: 5,
  ONESIGNAL_PLAYER_ID: 6,
};

export const PurchaseResult = {
  PURCHASED: 0,
  CANCELLED: 1,
  RESTORED: 2,
};

export const SubscriptionSource = {
  appleAppStore: 0,
  googlePlayStore: 1,
  amazonAppstore: 2,
  huaweiAppGallery: 3,
  none: 4,
};

export const PlanType = {
  consumable: 0,
  nonConsumable: 1,
  autoRenewingSubscription: 2,
  nonRenewingSubscription: 3,
  unknown: 4,
};

export const RunningMode = {
  transactionOnly: 0,
  observer: 1,
  paywallOnly: 2,
  paywallObserver: 3,
  full: 4,
};

export const PaywallAction = {
  close: "close",
  login: "login",
  navigate: "navigate",
  purchase: "purchase",
  restore: "restore",
  open_presentation: "open_presentation",
  promo_code: "promo_code",
};

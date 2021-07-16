var exec = require('cordova/exec');

var defaultError = (e) => { console.log(e); }

exports.startWithAPIKey = function (apiKey, stores, userId, logLevel, observerMode) {
    exec(() => {}, defaultError, 'Purchasely', 'startWithAPIKey', [apiKey, stores, userId, logLevel, observerMode]);
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

exports.userLogin = function (userId, success, error) {
    exec(success, error, 'Purchasely', 'userLogin', [userId]);
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

exports.presentPresentationWithIdentifier = function (presentationId, success, error) {
    exec(success, error, 'Purchasely', 'presentPresentationWithIdentifier', [presentationId]);
};

exports.presentProductWithIdentifier = function (productId, presentationId, success, error) {
    exec(success, error, 'Purchasely', 'presentProductWithIdentifier', [productId, presentationId]);
};

exports.presentPlanWithIdentifier = function (planId, presentationId, success, error) {
    exec(success, error, 'Purchasely', 'presentPlanWithIdentifier', [planId, presentationId]);
};

exports.presentSubscriptions = function () {
    exec(() => {}, defaultError, 'Purchasely', 'presentSubscriptions', []);
};

exports.purchaseWithPlanVendorId = function (planId, success, error) {
    exec( success, error, 'Purchasely', 'purchaseWithPlanVendorId', [planId]);
};

exports.restoreAllProducts = function (success, error) {
    exec(success, error, 'Purchasely', 'restoreAllProducts', []);
};

exports.handle = function (deepLink, success, error) {
    exec(success, error, 'Purchasely', 'handle', [deepLink]);
};

exports.planWithIdentifier = function (planId, success) {
    exec(success, defaultError, 'Purchasely', 'planWithIdentifier', [planId]);
};

exports.productWithIdentifier = function (productId, success) {
    exec(success, defaultError, 'Purchasely', 'productWithIdentifier', [productId]);
};

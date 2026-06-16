package cordova.plugin.purchasely

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.util.Log
import io.purchasely.billing.Store
import io.purchasely.ext.Attribute
import io.purchasely.ext.DistributionType
import io.purchasely.ext.EventListener
import io.purchasely.ext.LogLevel
import io.purchasely.ext.PLYActionInterceptorCallback
import io.purchasely.ext.PLYAppTechnology
import io.purchasely.ext.PLYDataProcessingLegalBasis
import io.purchasely.ext.PLYDataProcessingPurpose
import io.purchasely.ext.PLYEvent
import io.purchasely.ext.PLYInterceptResult
import io.purchasely.ext.PLYInterceptorInfo
import io.purchasely.ext.PLYRunningMode
import io.purchasely.ext.PlanListener
import io.purchasely.ext.ProductListener
import io.purchasely.ext.ProductsListener
import io.purchasely.ext.PurchaseListener
import io.purchasely.ext.Purchasely
import io.purchasely.ext.State
import io.purchasely.ext.StoreType
import io.purchasely.ext.SubscriptionsListener
import io.purchasely.ext.UserAttributeListener
import io.purchasely.ext.presentation.PLYPresentation
import io.purchasely.ext.presentation.PLYPresentationAction
import io.purchasely.ext.presentation.PLYPresentationOutcome
import io.purchasely.ext.presentation.PLYPresentationType
import io.purchasely.ext.presentation.PLYPurchaseResult
import io.purchasely.ext.presentation.display
import io.purchasely.ext.presentation.preload
import io.purchasely.storage.userData.PLYUserAttributeSource
import io.purchasely.storage.userData.PLYUserAttributeType
import io.purchasely.models.PLYError
import io.purchasely.models.PLYPlan
import io.purchasely.models.PLYPresentationPlan
import io.purchasely.models.PLYProduct
import io.purchasely.models.PLYSubscriptionData
import io.purchasely.views.presentation.PLYThemeMode
import org.apache.cordova.CallbackContext
import org.apache.cordova.CordovaInterface
import org.apache.cordova.CordovaPlugin
import org.apache.cordova.PluginResult
import org.json.JSONArray
import org.json.JSONException
import org.json.JSONObject
import java.lang.ref.WeakReference
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import java.util.TimeZone

/**
 * This class echoes a string called from JavaScript.
 */
class PurchaselyPlugin : CordovaPlugin() {
    // v6: the global interceptor was replaced by per-action interceptors that
    // resolve a PLYInterceptResult. We keep the latest resolver so onProcessAction
    // can complete it, preserving the v5 Cordova contract.
    private var interceptCompletion: ((PLYInterceptResult) -> Unit)? = null

    override fun execute(
        action: String,
        args: JSONArray,
        callbackContext: CallbackContext
    ): Boolean {
        try {
            when (action) {
                "start" -> start(
                    getStringFromJson(args.getString(0)),
                    args.getJSONArray(1),
                    args.getBoolean(2),
                    getStringFromJson(args.getString(3)),
                    args.getInt(4),
                    args.getInt(5),
                    getStringFromJson(args.getString(6)),
                    callbackContext
                )

                "close" -> close()
                "addEventsListener" -> addEventsListener(callbackContext)
                "addUserAttributeListener" -> addUserAttributesListener(callbackContext)
                "removeUserAttributeListener" -> removeUserAttributesListener()
                "removeEventsListener" -> removeEventsListener()
                "getAnonymousUserId" -> getAnonymousUserId(callbackContext)
                "userLogin" -> userLogin(getStringFromJson(args.getString(0)), callbackContext)
                "userLogout" -> userLogout()
                "setLanguage" -> setLanguage(getStringFromJson(args.getString(0)))
                "setLogLevel" -> setLogLevel(args.getInt(0))
                "setThemeMode" -> setThemeMode(args.getInt(0))
                "setAttribute" -> setAttribute(args.getInt(0), getStringFromJson(args.getString(1)))
                "setDefaultPresentationResultHandler" -> setDefaultPresentationResultHandler(
                    callbackContext
                )

                "purchasedSubscription" -> purchasedSubscription(callbackContext)
                "allowDeeplink" -> allowDeeplink(args.getBoolean(0))
                "synchronize" -> synchronize(callbackContext)
                "presentPresentationWithIdentifier" -> presentPresentationWithIdentifier(
                    getStringFromJson(args.getString(0)),
                    getStringFromJson(args.getString(1)),
                    args.getBoolean(2),
                    callbackContext
                )

                "presentPresentationForPlacement" -> presentPresentationForPlacement(
                    getStringFromJson(args.getString(0)),
                    getStringFromJson(args.getString(1)),
                    args.getBoolean(2),
                    callbackContext
                )

                "presentProductWithIdentifier" -> presentProductWithIdentifier(
                    getStringFromJson(args.getString(0)),
                    getStringFromJson(args.getString(1)),
                    getStringFromJson(args.getString(2)),
                    args.getBoolean(3),
                    callbackContext
                )

                "presentPlanWithIdentifier" -> presentPlanWithIdentifier(
                    getStringFromJson(args.getString(0)),
                    getStringFromJson(args.getString(1)),
                    getStringFromJson(args.getString(2)),
                    args.getBoolean(3),
                    callbackContext
                )
                "fetchPresentation" -> fetchPresentation(
                    getStringFromJson(args.getString(0)),
                    getStringFromJson(args.getString(1)),
                    getStringFromJson(args.getString(2)),
                    callbackContext
                )
                "presentPresentation" -> presentPresentation(
                    args.getJSONObject(0),
                    args.getBoolean(1),
                    getStringFromJson(args.getString(2)),
                    callbackContext
                )
                "presentSubscriptions" -> presentSubscriptions()
                "restoreAllProducts" -> restoreAllProducts(callbackContext)
                "silentRestoreAllProducts" -> restoreAllProducts(callbackContext)
                "userSubscriptions" -> userSubscriptions(callbackContext)
                "userSubscriptionsHistory" -> userSubscriptionsHistory(callbackContext)
                "handleDeeplink" -> handleDeeplink(
                    getStringFromJson(args.getString(0)),
                    callbackContext
                )

                "allProducts" -> allProducts(callbackContext)
                "productWithIdentifier" -> productWithIdentifier(
                    getStringFromJson(args.getString(0)),
                    callbackContext
                )

                "planWithIdentifier" -> planWithIdentifier(
                    getStringFromJson(args.getString(0)),
                    callbackContext
                )

                "purchaseWithPlanVendorId" -> purchaseWithPlanVendorId(
                    getStringFromJson(args.getString(0)),
                    getStringFromJson(args.getString(1)),
                    getStringFromJson(args.getString(2)),
                    callbackContext
                )
                "setPaywallActionInterceptor" -> setPaywallActionInterceptor(callbackContext)
                "onProcessAction" -> onProcessAction(args.getBoolean(0))
                "closePresentation" -> closePresentation(callbackContext)
                "hidePresentation" -> hidePresentation()
                "showPresentation" -> showPresentation()
                "userDidConsumeSubscriptionContent" -> userDidConsumeSubscriptionContent()
                "setUserAttributeWithString" -> setUserAttributeWithString(getStringFromJson(args.getString(0)), getStringFromJson(args.getString(1)), getStringFromJson(args.optString(2)))
                "setUserAttributeWithBoolean" -> setUserAttributeWithBoolean(getStringFromJson(args.getString(0)), args.getBoolean(1), getStringFromJson(args.optString(2)))
                "setUserAttributeWithInt" -> setUserAttributeWithInt(getStringFromJson(args.getString(0)), args.getInt(1), getStringFromJson(args.optString(2)))
                "setUserAttributeWithDouble" -> setUserAttributeWithDouble(getStringFromJson(args.getString(0)), args.getDouble(1), getStringFromJson(args.optString(2)))
                "setUserAttributeWithDate" -> setUserAttributeWithDate(getStringFromJson(args.getString(0)), getStringFromJson(args.getString(1)), getStringFromJson(args.optString(2)))
                "setUserAttributeWithStringArray" -> setUserAttributeWithStringArray(getStringFromJson(args.getString(0)), args.getJSONArray(1), getStringFromJson(args.optString(2)))
                "setUserAttributeWithIntArray" -> setUserAttributeWithIntArray(getStringFromJson(args.getString(0)), args.getJSONArray(1), getStringFromJson(args.optString(2)))
                "setUserAttributeWithDoubleArray" -> setUserAttributeWithDoubleArray(getStringFromJson(args.getString(0)), args.getJSONArray(1), getStringFromJson(args.optString(2)))
                "setUserAttributeWithBooleanArray" -> setUserAttributeWithBooleanArray(getStringFromJson(args.getString(0)), args.getJSONArray(1), getStringFromJson(args.optString(2)))
                "userAttribute" -> userAttribute(getStringFromJson(args.getString(0)), callbackContext)
                "clearUserAttribute" -> clearUserAttribute(getStringFromJson(args.getString(0)))
                "clearUserAttributes" -> clearUserAttributes()
                "clearBuiltInAttributes" -> clearBuiltInAttributes()
                "isEligibleForIntroOffer" -> isEligibleForIntroOffer(getStringFromJson(args.getString(0)), callbackContext)
                "signPromotionalOffer" -> signPromotionalOffer(getStringFromJson(args.getString(0)), getStringFromJson(args.getString(1)), callbackContext)
                "revokeDataProcessingConsent" -> revokeDataProcessingConsent(args.getJSONArray(0))
                "setDebugMode" -> setDebugMode(args.getBoolean(0))
                else -> return false
            }
        } catch (e: JSONException) {
            Log.e("Purchasely", String.format("Error executing action %s", action), e)
        }
        return true
    }

    private fun getStringFromJson(value: String?): String? {
        return if (value == null || value == "null" || value.isEmpty()) {
            null
        } else value
    }

    private fun start(
        apiKey: String?,
        stores: JSONArray,
        storeKit1: Boolean,
        userId: String?,
        logLevel: Int,
        runningMode: Int,
        cordovaSdkVersion: String?,
        callbackContext: CallbackContext
    ) {

        if(apiKey == null) {
            callbackContext.error("API Key is null")
            return
        }

        val list = ArrayList<String>()
        for (i in 0 until stores.length()) {
            try {
                list.add(stores.getString(i))
            } catch (e: JSONException) {
                Log.e("Purchasely", "Error in store array" + e.message, e)
            }
        }
        val storesInstances = getStoresInstances(list)
        // v6: PLYRunningMode.PaywallObserver was removed; both observer modes map to
        // PLYRunningMode.Observer. The JS layer passes the raw value (observer = 2,
        // full = 3). Note the native default changed to Observer in v6.
        val plyRunningMode: PLYRunningMode =
            if (runningMode == runningModeObserver) PLYRunningMode.Observer else PLYRunningMode.Full
        Purchasely.Builder(cordova.context)
            .apiKey(apiKey)
            .stores(storesInstances)
            .userId(userId)
            .runningMode(plyRunningMode)
            .logLevel(LogLevel.values()[logLevel])
            .build()
        Purchasely.sdkBridgeVersion = cordovaSdkVersion
        Purchasely.appTechnology = PLYAppTechnology.CORDOVA
        // v6: the start callback now delivers a single nullable PLYError.
        Purchasely.start { error: PLYError? ->
            if (error == null) {
                callbackContext.success()
            } else {
                callbackContext.error(error.message ?: "Purchasely SDK not configured")
            }
        }
    }

    private fun getStoresInstances(stores: List<String>): ArrayList<Store> {
        val result = ArrayList<Store>()
        if (stores.contains("Google") && Package.getPackage("io.purchasely.google") != null) {
            try {
                result.add(Class.forName("io.purchasely.google.GoogleStore").newInstance() as Store)
            } catch (e: Exception) {
                Log.e("Purchasely", "Google Store not found :" + e.message, e)
            }
        }
        if (stores.contains("Huawei") && Package.getPackage("io.purchasely.huawei") != null) {
            try {
                result.add(Class.forName("io.purchasely.huawei.HuaweiStore").newInstance() as Store)
            } catch (e: Exception) {
                Log.e("Purchasely", "Huawei Store not found :" + e.message, e)
            }
        }
        if (stores.contains("Amazon") && Package.getPackage("io.purchasely.amazon") != null) {
            try {
                result.add(Class.forName("io.purchasely.amazon.AmazonStore").newInstance() as Store)
            } catch (e: Exception) {
                Log.e("Purchasely", "Amazon Store not found :" + e.message, e)
            }
        }
        return result
    }

    private fun close() {
        defaultCallback = null
        purchaseCallback = null
        interceptCompletion = null
        displayedPresentation = null
        Purchasely.close()
    }

    private fun addUserAttributesListener(callbackContext: CallbackContext) {
        attributesCallback = callbackContext
        Purchasely.userAttributeListener = object: UserAttributeListener {
            override fun onUserAttributeSet(
                key: String,
                type: PLYUserAttributeType,
                value: Any,
                source: PLYUserAttributeSource
            ) {
                val map = HashMap<String, Any?>()
                map["action"] = "add"
                map["key"] = key
                map["type"] = type.name
                map["value"] = value
                map["source"] = source.name

                val pluginResult = PluginResult(PluginResult.Status.OK, JSONObject(map))
                pluginResult.keepCallback = true
                attributesCallback?.sendPluginResult(pluginResult)
            }

            override fun onUserAttributeRemoved(key: String, source: PLYUserAttributeSource) {
                val map = HashMap<String, Any?>()
                map["action"] = "remove"
                map["key"] = key
                map["source"] = source.name

                val pluginResult = PluginResult(PluginResult.Status.OK, JSONObject(map))
                pluginResult.keepCallback = true
                attributesCallback?.sendPluginResult(pluginResult)
            }
        }
    }

    private fun addEventsListener(callbackContext: CallbackContext) {
        eventsCallback = callbackContext
        Purchasely.eventListener = object: EventListener {
            override fun onEvent(event: PLYEvent) {
                val map = HashMap<String?, Any?>()
                map["name"] = event.name
                map["properties"] = event.properties.toMap()
                val pluginResult = PluginResult(PluginResult.Status.OK, JSONObject(map))
                pluginResult.keepCallback = true
                eventsCallback?.sendPluginResult(pluginResult)
            }
        }
    }

    private fun removeUserAttributesListener() {
        attributesCallback = null
        Purchasely.userAttributeListener = null
    }

    private fun removeEventsListener() {
        eventsCallback = null
        Purchasely.eventListener = null
    }

    private fun getAnonymousUserId(callbackContext: CallbackContext) {
        callbackContext.success(Purchasely.anonymousUserId)
    }

    private fun userLogin(userId: String?, callbackContext: CallbackContext) {
        if(userId == null) {
            callbackContext.sendPluginResult(PluginResult(PluginResult.Status.OK, false))
            return
        }

        Purchasely.userLogin(userId) { refresh ->
            callbackContext.sendPluginResult(PluginResult(PluginResult.Status.OK, refresh))
        }
    }

    private fun userLogout() {
        Purchasely.userLogout()
    }

    private fun setLogLevel(logLevel: Int) {
        Purchasely.logLevel = LogLevel.values()[logLevel]
    }

    private fun setLanguage(language: String?) {
        try {
            Purchasely.language = Locale(language ?: "en")
        } catch (e: Exception) {
            Purchasely.language = Locale.getDefault()
        }
    }

    private fun allowDeeplink(isAllowed: Boolean) {
        Purchasely.allowDeeplink = isAllowed
    }

    private fun setThemeMode(mode: Int) {
        Purchasely.setThemeMode(PLYThemeMode.values()[mode])
    }

    private fun setAttribute(attribute: Int, value: String?) {
        if(value == null) return

        val attributeKey = when (attribute) {
            CordovaPLYAttribute.firebase_app_instance_id.ordinal -> Attribute.FIREBASE_APP_INSTANCE_ID
            CordovaPLYAttribute.airship_channel_id.ordinal -> Attribute.AIRSHIP_CHANNEL_ID
            CordovaPLYAttribute.airship_user_id.ordinal -> Attribute.AIRSHIP_USER_ID
            CordovaPLYAttribute.batch_installation_id.ordinal -> Attribute.BATCH_INSTALLATION_ID
            CordovaPLYAttribute.adjust_id.ordinal -> Attribute.ADJUST_ID
            CordovaPLYAttribute.appsflyer_id.ordinal -> Attribute.APPSFLYER_ID
            CordovaPLYAttribute.mixpanel_distinct_id.ordinal -> Attribute.MIXPANEL_DISTINCT_ID
            CordovaPLYAttribute.clever_tap_id.ordinal -> Attribute.CLEVER_TAP_ID
            CordovaPLYAttribute.sendinblueUserEmail.ordinal -> Attribute.SENDINBLUE_USER_EMAIL
            CordovaPLYAttribute.iterableUserEmail.ordinal -> Attribute.ITERABLE_USER_EMAIL
            CordovaPLYAttribute.iterableUserId.ordinal -> Attribute.ITERABLE_USER_ID
            CordovaPLYAttribute.atInternetIdClient.ordinal -> Attribute.AT_INTERNET_ID_CLIENT
            CordovaPLYAttribute.mParticleUserId.ordinal -> Attribute.MPARTICLE_USER_ID
            CordovaPLYAttribute.customerioUserId.ordinal -> Attribute.CUSTOMERIO_USER_ID
            CordovaPLYAttribute.customerioUserEmail.ordinal -> Attribute.CUSTOMERIO_USER_EMAIL
            CordovaPLYAttribute.branchUserDeveloperIdentity.ordinal -> Attribute.BRANCH_USER_DEVELOPER_IDENTITY
            CordovaPLYAttribute.amplitudeUserId.ordinal -> Attribute.AMPLITUDE_USER_ID
            CordovaPLYAttribute.amplitudeDeviceId.ordinal -> Attribute.AMPLITUDE_DEVICE_ID
            CordovaPLYAttribute.moengageUniqueId.ordinal -> Attribute.MOENGAGE_UNIQUE_ID
            CordovaPLYAttribute.oneSignalExternalId.ordinal -> Attribute.ONESIGNAL_EXTERNAL_ID
            CordovaPLYAttribute.batchCustomUserId.ordinal -> Attribute.BATCH_CUSTOM_USER_ID
            else -> null
        }

        attributeKey?.let {
            Purchasely.setAttribute(attribute = it, value = value)
        }
    }

    private fun setDefaultPresentationResultHandler(callbackContext: CallbackContext) {
        defaultCallback = callbackContext
        // v6: the handler now receives a single PLYPresentationOutcome.
        Purchasely.setDefaultPresentationResultHandler { outcome: PLYPresentationOutcome ->
            sendPurchaseResult(outcome)
        }
    }

    private fun purchasedSubscription(callbackContext: CallbackContext) {
        Purchasely.purchaseListener = object : PurchaseListener {
            override fun onPurchaseStateChanged(state: State) {
                if (state is State.PurchaseComplete || state is State.RestorationComplete) {
                    val pluginResult = PluginResult(PluginResult.Status.OK, "")
                    pluginResult.keepCallback = true
                    callbackContext.sendPluginResult(pluginResult)
                }
            }

        }
    }

    private fun synchronize(callbackContext: CallbackContext) {
        // v6 exposes onSuccess/onError callbacks on synchronize — wire them to the
        // JS success/error callbacks (was previously fire-and-forget).
        Purchasely.synchronize(
            onSuccess = { callbackContext.success() },
            onError = { error -> callbackContext.error(error?.message ?: "Synchronization failed") }
        )
    }

    private fun userDidConsumeSubscriptionContent() {
        Purchasely.userDidConsumeSubscriptionContent()
    }

    // v6: the dedicated PLYProductActivity host is gone. The native SDK's
    // PLYPresentation { ... }.display(activity) builds, preloads and displays the
    // presentation (handling full-screen and multi-step Flows automatically).
    // isFullScreen is now controlled by the Console transition and is ignored here.
    private fun presentPresentationWithIdentifier(
        screenId: String?,
        contentId: String?,
        isFullScreen: Boolean,
        callbackContext: CallbackContext
    ) {
        purchaseCallback = callbackContext
        val activity = cordova.activity ?: return
        PLYPresentation {
            if (screenId != null) screenId(screenId)
            contentId(contentId)
            onPresented { loaded, _ -> displayedPresentation = loaded }
        }.display(activity) { outcome -> sendPurchaseResult(outcome) }
    }

    private fun presentPresentationForPlacement(
        placementVendorId: String?,
        contentId: String?,
        isFullScreen: Boolean,
        callbackContext: CallbackContext
    ) {
        purchaseCallback = callbackContext
        val activity = cordova.activity ?: return
        PLYPresentation {
            if (placementVendorId != null) placementId(placementVendorId)
            contentId(contentId)
            onPresented { loaded, _ -> displayedPresentation = loaded }
        }.display(activity) { outcome -> sendPurchaseResult(outcome) }
    }

    private fun presentProductWithIdentifier(
        productVendorId: String?,
        screenId: String?,
        contentId: String?,
        isFullScreen: Boolean,
        callbackContext: CallbackContext
    ) {
        // v6: product-specific presentation was removed. A presentation is identified by
        // a placementId or screenId; here we display the screen.
        purchaseCallback = callbackContext
        val activity = cordova.activity ?: return
        PLYPresentation {
            if (screenId != null) screenId(screenId)
            contentId(contentId)
            onPresented { loaded, _ -> displayedPresentation = loaded }
        }.display(activity) { outcome -> sendPurchaseResult(outcome) }
    }

    private fun presentPlanWithIdentifier(
        planVendorId: String?,
        screenId: String?,
        contentId: String?,
        isFullScreen: Boolean,
        callbackContext: CallbackContext
    ) {
        // v6: plan-specific presentation was removed. A presentation is identified by
        // a placementId or screenId; here we display the screen.
        purchaseCallback = callbackContext
        val activity = cordova.activity ?: return
        PLYPresentation {
            if (screenId != null) screenId(screenId)
            contentId(contentId)
            onPresented { loaded, _ -> displayedPresentation = loaded }
        }.display(activity) { outcome -> sendPurchaseResult(outcome) }
    }

    private fun fetchPresentation(
        placementId: String?,
        screenId: String?,
        contentId: String?,
        callbackContext: CallbackContext) {
        // v6: Purchasely.fetchPresentation(properties) / PLYPresentationProperties were
        // removed. Build a request with the PLYPresentation { } DSL (by placementId or
        // screenId) and preload it; keep the loaded presentation so presentPresentation
        // can display it later.
        PLYPresentation {
            if (placementId != null) placementId(placementId)
            if (screenId != null) screenId(screenId)
            contentId(contentId)
        }.preload { presentation: PLYPresentation?, error: PLYError? ->
            if (presentation != null) {
                presentationsLoaded.removeAll { it.screenId == presentation.screenId && it.placementId == presentation.placementId }
                presentationsLoaded.add(presentation)
                val map = hashMapOf<String, Any?>(
                    "id" to presentation.screenId,
                    "placementId" to presentation.placementId,
                    "audienceId" to presentation.audienceId,
                    "abTestId" to presentation.abTestId,
                    "abTestVariantId" to presentation.abTestVariantId,
                    "language" to presentation.language,
                    "type" to presentation.type.ordinal,
                    "plans" to presentation.plans.map { it.toMap() }
                )
                callbackContext.success(JSONObject(map))
            }
            if (error != null) callbackContext.error(error.message ?: "Unable to fetch presentation")
        }
    }

    // Delete when available in Android SDK
    fun PLYPresentationPlan.toMap() : Map<String, String?> {
        return mapOf(
            Pair("planVendorId", planVendorId),
            Pair("storeProductId", storeProductId),
            Pair("basePlanId", basePlanId),
            //Pair("offerId", offerId)
        )
    }

    private fun presentPresentation(presentationMap: JSONObject?,
                            isFullScreen: Boolean,
                            loadingBackgroundColor: String?,
                            callbackContext: CallbackContext) {
        if (presentationMap == null) {
            callbackContext.error("presentation cannot be null")
            return
        }

        val id = if (presentationMap.has("id") && !presentationMap.isNull("id")) presentationMap.getString("id") else null
        val placement = if (presentationMap.has("placementId") && !presentationMap.isNull("placementId")) presentationMap.getString("placementId") else null

        val presentation = presentationsLoaded.lastOrNull {
            it.screenId == id && it.placementId == placement
        }
        if (presentation == null) {
            callbackContext.error("presentation cannot be found")
            return
        }

        purchaseCallback = callbackContext
        // Retain so showPresentation can re-display it after hide.
        displayedPresentation = presentation

        // v6: display() handles Flows and standard presentations transparently and
        // delivers a single PLYPresentationOutcome on dismissal.
        cordova.activity?.let { activity ->
            presentation.display(activity) { outcome -> sendPurchaseResult(outcome) }
        }
    }

    private fun presentSubscriptions() {
        // v6: the native subscriptions list UI (subscriptionsFragment) was removed.
        // Build your own UI from userSubscriptions / userSubscriptionsHistory.
        Log.w("Purchasely", "presentSubscriptions is no longer available in SDK v6 (native subscriptions UI removed).")
    }

    private fun restoreAllProducts(callbackContext: CallbackContext) {
        Purchasely.restoreAllProducts({ plyPlan: PLYPlan? ->
            callbackContext.success(JSONObject(transformPlanToMap(plyPlan)))
        }) { plyError: PLYError? ->
            callbackContext.error(plyError?.message)
        }
    }

    private fun userSubscriptions(callbackContext: CallbackContext) {
        Purchasely.userSubscriptions(
            false,
            object : SubscriptionsListener {
                override fun onSuccess(list: List<PLYSubscriptionData>) {
                    val result = JSONArray()
                    for (i in list.indices) {
                        val data = list[i]
                        val map = HashMap(data.toMap())
                        map["plan"] = transformPlanToMap(data.plan)
                        map["product"] = data.product.toMap()
                        if (data.data.storeType == StoreType.GOOGLE_PLAY_STORE) {
                            map["subscriptionSource"] = StoreType.GOOGLE_PLAY_STORE.ordinal
                        } else if (data.data.storeType == StoreType.AMAZON_APP_STORE) {
                            map["subscriptionSource"] = StoreType.AMAZON_APP_STORE.ordinal
                        } else if (data.data.storeType == StoreType.HUAWEI_APP_GALLERY) {
                            map["subscriptionSource"] = StoreType.HUAWEI_APP_GALLERY.ordinal
                        } else if (data.data.storeType == StoreType.APPLE_APP_STORE) {
                            map["subscriptionSource"] = StoreType.APPLE_APP_STORE.ordinal
                        }
                        result.put(JSONObject(map))
                    }
                    callbackContext.success(result)
                }

                override fun onFailure(throwable: Throwable) {
                    callbackContext.error(throwable.message)
                }
            }
        )
    }

    private fun userSubscriptionsHistory(callbackContext: CallbackContext) {
        Purchasely.userSubscriptionsHistory(
            false,
            object : SubscriptionsListener {
                override fun onSuccess(list: List<PLYSubscriptionData>) {
                    val result = JSONArray()
                    for (i in list.indices) {
                        val data = list[i]
                        val map = HashMap(data.toMap())
                        map["plan"] = transformPlanToMap(data.plan)
                        map["product"] = data.product.toMap()
                        if (data.data.storeType == StoreType.GOOGLE_PLAY_STORE) {
                            map["subscriptionSource"] = StoreType.GOOGLE_PLAY_STORE.ordinal
                        } else if (data.data.storeType == StoreType.AMAZON_APP_STORE) {
                            map["subscriptionSource"] = StoreType.AMAZON_APP_STORE.ordinal
                        } else if (data.data.storeType == StoreType.HUAWEI_APP_GALLERY) {
                            map["subscriptionSource"] = StoreType.HUAWEI_APP_GALLERY.ordinal
                        } else if (data.data.storeType == StoreType.APPLE_APP_STORE) {
                            map["subscriptionSource"] = StoreType.APPLE_APP_STORE.ordinal
                        }
                        result.put(JSONObject(map))
                    }
                    callbackContext.success(result)
                }

                override fun onFailure(throwable: Throwable) {
                    callbackContext.error(throwable.message)
                }
            }
        )
    }

    private fun handleDeeplink(deeplink: String?, callbackContext: CallbackContext) {
        if (deeplink == null) {
            callbackContext.error("Deeplink must not be null")
            return
        }
        val uri = Uri.parse(deeplink)
        // v6: isDeeplinkHandled(uri) → handleDeeplink(uri, activity).
        callbackContext.sendPluginResult(
            PluginResult(
                PluginResult.Status.OK,
                Purchasely.handleDeeplink(uri, cordova.activity)
            )
        )
    }

    private fun allProducts(callbackContext: CallbackContext) {
        Purchasely.allProducts(object : ProductsListener {
            override fun onSuccess(list: List<PLYProduct>) {
                val result = JSONArray()
                for (i in list.indices) {
                    result.put(JSONObject(list[i].toMap()))
                }
                callbackContext.success(result)
            }

            override fun onFailure(throwable: Throwable) {
                callbackContext.error(throwable.message)
            }
        })
    }

    private fun productWithIdentifier(vendorId: String?, callbackContext: CallbackContext) {
        if(vendorId == null) {
            callbackContext.error("No product found with $vendorId")
            return
        }
        Purchasely.product(vendorId, object : ProductListener {
            override fun onSuccess(product: PLYProduct?) {
                if (product != null) {
                    callbackContext.success(JSONObject(product.toMap()))
                } else {
                    callbackContext.error("No product found with $vendorId")
                }
            }

            override fun onFailure(throwable: Throwable) {
                callbackContext.error(throwable.message)
            }
        })
    }

    private fun planWithIdentifier(vendorId: String?, callbackContext: CallbackContext) {
        if(vendorId == null) {
            callbackContext.error("No plan found with $vendorId")
            return
        }
        Purchasely.plan(vendorId, object : PlanListener {
            override fun onSuccess(plan: PLYPlan?) {
                if (plan != null) {
                    callbackContext.success(JSONObject(transformPlanToMap(plan)))
                } else {
                    callbackContext.error("No plan found with $vendorId")
                }
            }

            override fun onFailure(throwable: Throwable) {
                callbackContext.error(throwable.message)
            }
        })
    }

    private fun purchaseWithPlanVendorId(
        planVendorId: String?,
        offerId: String?,
        contentId: String?,
        callbackContext: CallbackContext
    ) {
        if(planVendorId == null) {
            callbackContext.error("No plan found with $planVendorId")
            return
        }

        Purchasely.plan(planVendorId, object : PlanListener {
            override fun onSuccess(plyPlan: PLYPlan?) {
                if (plyPlan != null) {
                    val offer = plyPlan.promoOffers.firstOrNull { it.vendorId == offerId }
                    Purchasely.purchase(cordova.activity, plyPlan, offer, contentId,
                        { plyPlan1: PLYPlan? ->
                            callbackContext.success(JSONObject(transformPlanToMap(plyPlan1)))
                        }) { plyError: PLYError? ->
                        callbackContext.error(plyError?.message)
                    }
                } else {
                    callbackContext.error("No plan found with $planVendorId")
                }
            }

            override fun onFailure(throwable: Throwable) {
                callbackContext.error(throwable.message)
            }
        })
    }

    private fun setPaywallActionInterceptor(callbackContext: CallbackContext) {
        // v6: the global setPaywallActionsInterceptor was removed. Register a typed
        // interceptor per action and bridge them all to the single JS callback,
        // keeping the v5 Cordova contract (setPaywallActionInterceptor + onProcessAction).
        val actionClasses = listOf(
            PLYPresentationAction.Login::class.java,
            PLYPresentationAction.Purchase::class.java,
            PLYPresentationAction.Close::class.java,
            PLYPresentationAction.CloseAll::class.java,
            PLYPresentationAction.Restore::class.java,
            PLYPresentationAction.Navigate::class.java,
            PLYPresentationAction.PromoCode::class.java,
            PLYPresentationAction.OpenPresentation::class.java,
            PLYPresentationAction.OpenPlacement::class.java,
            PLYPresentationAction.WebCheckout::class.java
        )
        for (actionClass in actionClasses) {
            Purchasely.interceptAction(actionClass, PLYActionInterceptorCallback { info, action, result ->
                // Store the resolver so onProcessAction can complete it later.
                interceptCompletion = result
                interceptorActivity = WeakReference(info.activity)

                val pluginResult = PluginResult(
                    PluginResult.Status.OK,
                    JSONObject(
                        hashMapOf<String, Any?>(
                            "info" to buildInterceptorInfo(info),
                            "action" to action.value,
                            "parameters" to buildInterceptorParameters(action).filterNot { it.value == null }
                        )
                    )
                )
                pluginResult.keepCallback = true
                callbackContext.sendPluginResult(pluginResult)
            })
        }
    }

    private fun buildInterceptorInfo(info: PLYInterceptorInfo): Map<String, Any?> {
        val presentation = info.presentation
        return mapOf(
            "contentId" to info.contentId,
            "presentationId" to presentation?.screenId,
            "placementId" to presentation?.placementId,
            "abTestId" to presentation?.abTestId,
            "abTestVariantId" to presentation?.abTestVariantId
        )
    }

    private fun buildInterceptorParameters(action: PLYPresentationAction): HashMap<String, Any?> {
        // v6: parameters now live on the typed action subclass (PLYPresentationActionParameters
        // was removed). Map them back to the flat dictionary the JS layer expects.
        val params = hashMapOf<String, Any?>()
        when (action) {
            is PLYPresentationAction.Navigate -> {
                params["url"] = action.url.toString()
                params["title"] = action.title
            }
            is PLYPresentationAction.Purchase -> {
                params["plan"] = transformPlanToMap(action.plan)
                params["subscriptionOffer"] = action.subscriptionOffer?.toMap()
                params["offer"] = mapOf(
                    "vendorId" to action.offer?.vendorId,
                    "storeOfferId" to action.offer?.storeOfferId
                )
            }
            is PLYPresentationAction.Close -> params["closeReason"] = action.closeReason.name
            is PLYPresentationAction.CloseAll -> params["closeReason"] = action.closeReason.name
            is PLYPresentationAction.OpenPresentation -> params["presentation"] = action.presentationId
            is PLYPresentationAction.OpenPlacement -> params["placement"] = action.placementId
            is PLYPresentationAction.WebCheckout -> {
                params["url"] = action.url.toString()
                params["clientReferenceId"] = action.clientReferenceId
                params["queryParameterKey"] = action.queryParameterKey
                params["webCheckoutProvider"] = action.webCheckoutProvider.name
            }
            else -> {}
        }
        return params
    }

    private fun closePresentation(callbackContext: CallbackContext) {
        // v6: closeAllScreens dismisses every displayed screen (handles Flows too).
        Purchasely.closeAllScreens()
    }

    private fun onProcessAction(processAction: Boolean) {
        val activityHandler = interceptorActivity?.get() ?: cordova.activity
        activityHandler?.runOnUiThread {
            // v5 mapping: onProcessAction(true) = let Purchasely proceed = NOT_HANDLED;
            // onProcessAction(false) = app handled the action = SUCCESS.
            interceptCompletion?.invoke(if (processAction) PLYInterceptResult.NOT_HANDLED else PLYInterceptResult.SUCCESS)
            interceptCompletion = null
            interceptorActivity?.clear()
            interceptorActivity = null
        }
    }

    private fun showPresentation() {
        // v6 has no native hide/show: re-display the last presentation we displayed
        // (retained from present*/presentPresentation). hidePresentation closes it.
        val activity = cordova.activity ?: return
        displayedPresentation?.display(activity) { outcome -> sendPurchaseResult(outcome) }
    }

    private fun hidePresentation() {
        // v6 has no hide/reopen for a single presentation; closeAllScreens is the closest behavior.
        Purchasely.closeAllScreens()
    }

    fun setUserAttributeWithStringArray(key: String?, value: JSONArray?, legalBasisString: String?) {
        if(key == null || value == null) return
        val list = mutableListOf<String>()
        for (i in 0 until value.length()) {
            try {
                list.add(value.getString(i))
            } catch (e: JSONException) {
                Log.e("Purchasely", "Error in string array" + e.message, e)
            }
        }
        val processingLegalBasis = when (legalBasisString?.uppercase()) {
            "ESSENTIAL" -> PLYDataProcessingLegalBasis.ESSENTIAL
            else -> PLYDataProcessingLegalBasis.OPTIONAL
        }
        Purchasely.setUserAttribute(key, list.toTypedArray(), processingLegalBasis)
    }

    fun setUserAttributeWithIntArray(key: String?, value: JSONArray?, legalBasisString: String?) {
        if(key == null || value == null) return
        val list = mutableListOf<Int>()
        for (i in 0 until value.length()) {
            try {
                list.add(value.getInt(i))
            } catch (e: JSONException) {
                Log.e("Purchasely", "Error in int array" + e.message, e)
            }
        }
        val processingLegalBasis = when (legalBasisString?.uppercase()) {
            "ESSENTIAL" -> PLYDataProcessingLegalBasis.ESSENTIAL
            else -> PLYDataProcessingLegalBasis.OPTIONAL
        }
        Purchasely.setUserAttribute(key, list.toTypedArray(), processingLegalBasis)
    }

    fun setUserAttributeWithDoubleArray(key: String?, value: JSONArray?, legalBasisString: String?) {
        if (key == null || value == null) return
        val list = mutableListOf<Float>()
        for (i in 0 until value.length()) {
            try {
                list.add(value.getDouble(i).toFloat())
            } catch (e: JSONException) {
                Log.e("Purchasely", "Error in double array: ${e.message}", e)
            }
        }
        val processingLegalBasis = when (legalBasisString?.uppercase()) {
            "ESSENTIAL" -> PLYDataProcessingLegalBasis.ESSENTIAL
            else -> PLYDataProcessingLegalBasis.OPTIONAL
        }
        Purchasely.setUserAttribute(key, list.toTypedArray(), processingLegalBasis)
    }

    fun setUserAttributeWithBooleanArray(key: String?, value: JSONArray?, legalBasisString: String?) {
        if(key == null || value == null) return
        val list = mutableListOf<Boolean>()
        for (i in 0 until value.length()) {
            try {
                list.add(value.getBoolean(i))
            } catch (e: JSONException) {
                Log.e("Purchasely", "Error in boolean array" + e.message, e)
            }
        }
        val processingLegalBasis = when (legalBasisString?.uppercase()) {
            "ESSENTIAL" -> PLYDataProcessingLegalBasis.ESSENTIAL
            else -> PLYDataProcessingLegalBasis.OPTIONAL
        }
        Purchasely.setUserAttribute(key, list.toTypedArray(), processingLegalBasis)
    }

    fun setUserAttributeWithString(key: String?, value: String?, legalBasisString: String?) {
        if(key == null || value == null) return
        val processingLegalBasis = when (legalBasisString?.uppercase()) {
            "ESSENTIAL" -> PLYDataProcessingLegalBasis.ESSENTIAL
            else -> PLYDataProcessingLegalBasis.OPTIONAL
        }
        Purchasely.setUserAttribute(key, value, processingLegalBasis)
    }

    fun setUserAttributeWithInt(key: String?, value: Int?, legalBasisString: String?) {
        if(key == null || value == null) return
        val processingLegalBasis = when (legalBasisString?.uppercase()) {
            "ESSENTIAL" -> PLYDataProcessingLegalBasis.ESSENTIAL
            else -> PLYDataProcessingLegalBasis.OPTIONAL
        }
        Purchasely.setUserAttribute(key, value, processingLegalBasis)
    }

    fun setUserAttributeWithDouble(key: String?, value: Double?, legalBasisString: String?) {
        if(key == null || value == null) return
        val processingLegalBasis = when (legalBasisString?.uppercase()) {
            "ESSENTIAL" -> PLYDataProcessingLegalBasis.ESSENTIAL
            else -> PLYDataProcessingLegalBasis.OPTIONAL
        }
        Purchasely.setUserAttribute(key, value.toFloat(), processingLegalBasis)
    }

    fun setUserAttributeWithBoolean(key: String?, value: Boolean?, legalBasisString: String?) {
        if(key == null || value == null) return
        val processingLegalBasis = when (legalBasisString?.uppercase()) {
            "ESSENTIAL" -> PLYDataProcessingLegalBasis.ESSENTIAL
            else -> PLYDataProcessingLegalBasis.OPTIONAL
        }
        Purchasely.setUserAttribute(key, value, processingLegalBasis)
    }

    fun setUserAttributeWithDate(key: String?, value: String?, legalBasisString: String?) {
        if(key == null || value == null) return
        val processingLegalBasis = when (legalBasisString?.uppercase()) {
            "ESSENTIAL" -> PLYDataProcessingLegalBasis.ESSENTIAL
            else -> PLYDataProcessingLegalBasis.OPTIONAL
        }
        val format = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSX", Locale.getDefault())
        } else {
            SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.getDefault())
        }
        format.timeZone = TimeZone.getTimeZone("GMT")
        val calendar = Calendar.getInstance()
        try {
            format.parse(value)?.let {
                calendar.time = it
            }
            Purchasely.setUserAttribute(key, calendar.time, processingLegalBasis)
        } catch (e: Exception) {
            Log.e("Purchasely", "Cannot save date attribute $key", e)
        }
    }

    fun userAttribute(key: String?, callbackContext: CallbackContext) {
        if(key == null) return
        val result = getUserAttributeValueForCordova(Purchasely.userAttribute(key))
        when (result) {
            is JSONArray -> callbackContext.success(result)
            is String -> callbackContext.success(result)
            is Int -> callbackContext.success(result)
            is Boolean -> callbackContext.success(if (result) 1 else 0)
            else -> callbackContext.error("No user attribute found with $key")
        }
    }

    private fun getUserAttributeValueForCordova(value: Any?): Any? {
        return when (value) {
            is Date -> {
                val format = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                    SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSX", Locale.getDefault())
                } else {
                    SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.getDefault())
                }
                format.timeZone = TimeZone.getTimeZone("GMT")
                try {
                    format.format(value)
                } catch (e: Exception) {
                    ""
                }
            }
            is Int -> value
            //awful but to keep same precision so 1.2f = 1.2 double and not 1.20000056
            is Float -> value.toString().toDouble()
            is String -> value
            is Boolean -> value
            is Array<*> -> {
                val jsonArray = JSONArray()
                value.forEach {
                    jsonArray.put(getUserAttributeValueForCordova(it))
                }
                jsonArray
            }
            else -> null
        }
    }

    fun clearUserAttribute(key: String?) {
        if(key == null) return
        Purchasely.clearUserAttribute(key)
    }

    fun clearUserAttributes() {
        Purchasely.clearUserAttributes()
    }

    fun clearBuiltInAttributes() {
        Purchasely.clearBuiltInAttributes()
    }

    private fun isEligibleForIntroOffer(planId: String?, callbackContext: CallbackContext) {
        Purchasely.plan(planId,
            onSuccess = { plan ->
                callbackContext.sendPluginResult(PluginResult(PluginResult.Status.OK, plan?.isEligibleToOffer(null) ?: false))
            },
            onError = { error ->
                callbackContext.error(error.message ?: "Unable to fetch plan")
            }
        )
    }

    private fun signPromotionalOffer(storeProductId: String?, storeOfferId: String?, callbackContext: CallbackContext) {
        callbackContext.error("No signing required on Android")
    }

    private fun revokeDataProcessingConsent(purposes: JSONArray?) {
        if(purposes == null) return
        var mappedPurposes = mutableSetOf<PLYDataProcessingPurpose>()
        for (i in 0 until purposes.length()) {
            try {
                when (purposes.getString(i)) {
                    "ALL_NON_ESSENTIALS" -> {
                        mappedPurposes = mutableSetOf(PLYDataProcessingPurpose.AllNonEssentials)
                        break
                    }
                    "ANALYTICS" -> mappedPurposes.add(PLYDataProcessingPurpose.Analytics)
                    "IDENTIFIED_ANALYTICS" -> mappedPurposes.add(PLYDataProcessingPurpose.IdentifiedAnalytics)
                    "CAMPAIGNS" -> mappedPurposes.add(PLYDataProcessingPurpose.Campaigns)
                    "PERSONALIZATION" -> mappedPurposes.add(PLYDataProcessingPurpose.Personalization)
                    "THIRD_PARTY_INTEGRATIONS" -> mappedPurposes.add(PLYDataProcessingPurpose.ThirdPartyIntegrations)
                }
            } catch (e: JSONException) {
                Log.e("Purchasely", "Error in string array" + e.message, e)
            }
        }
        Purchasely.revokeDataProcessingConsent(mappedPurposes)
    }

    fun setDebugMode(enabled: Boolean) {
        Purchasely.debugMode = enabled
    }

    companion object {
        var defaultCallback: CallbackContext? = null
        var purchaseCallback: CallbackContext? = null
        var eventsCallback: CallbackContext? = null
        var attributesCallback: CallbackContext? = null

        var interceptorActivity: WeakReference<Activity>? = null

        val presentationsLoaded = mutableListOf<PLYPresentation>()
        // Last presentation displayed — retained so showPresentation can re-display it.
        var displayedPresentation: PLYPresentation? = null

        private const val runningModeObserver = 2
        private const val runningModeFull = 3

        // v6: dismissal delivers a single PLYPresentationOutcome. PLYPurchaseResult
        // ordinals (PURCHASED=0, CANCELLED=1, RESTORED=2) match the JS PurchaseResult
        // enum, but we map explicitly to stay robust and handle the null (no-purchase) case.
        fun sendPurchaseResult(outcome: PLYPresentationOutcome) {
            val map = HashMap<String?, Any?>()
            map["result"] = when (outcome.purchaseResult) {
                PLYPurchaseResult.PURCHASED -> 0
                PLYPurchaseResult.CANCELLED -> 1
                PLYPurchaseResult.RESTORED -> 2
                null -> 1
            }
            map["plan"] = transformPlanToMap(outcome.plan)
            if (purchaseCallback != null) {
                purchaseCallback?.success(JSONObject(map))
                purchaseCallback = null
            } else if (defaultCallback != null) {
                val pluginResult = PluginResult(PluginResult.Status.OK, JSONObject(map))
                pluginResult.keepCallback = true
                defaultCallback?.sendPluginResult(pluginResult)
            }
        }

        private fun transformPlanToMap(plan: PLYPlan?): Map<String?, Any?> {
            if (plan == null) return HashMap()
            val map = HashMap(plan.toMap())
            if (plan.type == DistributionType.CONSUMABLE) {
                map["type"] = DistributionType.CONSUMABLE.ordinal
            } else if (plan.type == DistributionType.CONSUMABLE) {
                map["type"] = DistributionType.NON_CONSUMABLE.ordinal
            } else if (plan.type == DistributionType.NON_CONSUMABLE) {
                map["type"] = DistributionType.RENEWING_SUBSCRIPTION.ordinal
            } else if (plan.type == DistributionType.NON_RENEWING_SUBSCRIPTION) {
                map["type"] = DistributionType.NON_RENEWING_SUBSCRIPTION.ordinal
            } else if (plan.type == DistributionType.UNKNOWN) {
                map["type"] = DistributionType.UNKNOWN.ordinal
            }
            map["isEligibleForIntroOffer"] = plan.isEligibleToOffer(null)
            return map
        }
    }

    // WARNING: This enum must be strictly identical to the one in the JS side (Purchasely.js).
    enum class CordovaPLYAttribute {
        firebase_app_instance_id,
        airship_channel_id,
        airship_user_id,
        batch_installation_id,
        adjust_id,
        appsflyer_id,
        mixpanel_distinct_id,
        clever_tap_id,
        sendinblueUserEmail,
        iterableUserEmail,
        iterableUserId,
        atInternetIdClient,
        mParticleUserId,
        customerioUserId,
        customerioUserEmail,
        branchUserDeveloperIdentity,
        amplitudeUserId,
        amplitudeDeviceId,
        moengageUniqueId,
        oneSignalExternalId,
        batchCustomUserId,

        /*
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
         */
    }
}
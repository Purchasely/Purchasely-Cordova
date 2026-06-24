package cordova.plugin.purchasely

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
import io.purchasely.ext.presentation.PLYCloseReason
import io.purchasely.ext.presentation.PLYPresentation
import io.purchasely.ext.presentation.PLYPresentationAction
import io.purchasely.ext.presentation.PLYPresentationBase
import io.purchasely.ext.presentation.PLYPresentationMetadata
import io.purchasely.ext.presentation.PLYPresentationOutcome
import io.purchasely.ext.presentation.PLYPurchaseResult
import io.purchasely.ext.presentation.display
import io.purchasely.ext.presentation.preload
import io.purchasely.views.presentation.models.PLYDimensionType
import io.purchasely.views.presentation.models.PLYTransition
import io.purchasely.views.presentation.models.PLYTransitionDimension
import io.purchasely.views.presentation.models.PLYTransitionType
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
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeoutOrNull
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

/**
 * This class echoes a string called from JavaScript.
 */
class PurchaselyPlugin : CordovaPlugin() {

    // v6 presentation lifecycle state, keyed by the JS-supplied requestId.
    private val activePresentations = ConcurrentHashMap<String, PLYPresentation>()
    // Pending interceptor resolvers, completed when JS calls completeActionInterceptor.
    private val pendingInterceptors = ConcurrentHashMap<String, CompletableDeferred<PLYInterceptResult>>()
    // Kept-alive interceptor event callbacks, keyed by action kind.
    private val interceptorCallbacks = ConcurrentHashMap<String, CallbackContext>()

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
                "setDefaultPresentationDismissHandler" -> setDefaultPresentationDismissHandler(
                    callbackContext
                )

                "purchasedSubscription" -> purchasedSubscription(callbackContext)
                "allowDeeplink" -> allowDeeplink(args.getBoolean(0))
                "applyStartOptions" -> applyStartOptions(args.optJSONObject(0))
                "synchronize" -> synchronize(callbackContext)
                "preloadPresentation" -> preloadPresentation(
                    getStringFromJson(args.getString(0)) ?: "",
                    args.optJSONObject(1),
                    callbackContext
                )
                "displayPresentation" -> displayPresentation(
                    getStringFromJson(args.getString(0)) ?: "",
                    args.optJSONObject(1),
                    args.optJSONObject(2),
                    callbackContext
                )
                "closePresentation" -> closePresentation(
                    getStringFromJson(args.getString(0)) ?: "",
                    callbackContext
                )
                "goBackToPreviousScreen" -> goBackToPreviousScreen(
                    getStringFromJson(args.getString(0)) ?: ""
                )
                "registerActionInterceptor" -> registerActionInterceptor(
                    getStringFromJson(args.getString(0)) ?: "",
                    callbackContext
                )
                "unregisterActionInterceptor" -> unregisterActionInterceptor(
                    getStringFromJson(args.getString(0)) ?: ""
                )
                "completeActionInterceptor" -> completeActionInterceptor(
                    getStringFromJson(args.getString(0)) ?: "",
                    getStringFromJson(args.getString(1)) ?: "notHandled"
                )
                "removeDefaultPresentationDismissHandler" -> removeDefaultPresentationDismissHandler()
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
        activePresentations.clear()
        pendingInterceptors.clear()
        interceptorCallbacks.clear()
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

    private fun setDefaultPresentationDismissHandler(callbackContext: CallbackContext) {
        defaultCallback = callbackContext
        // v6: renamed from setDefaultPresentationResultHandler. The handler now
        // receives a single PLYPresentationOutcome (purchaseResult + closeReason +
        // plan + the presentation that produced it — populated for campaign/deeplink
        // presentations the app did not open itself). It is forwarded to JS through
        // the kept-alive default-dismiss callback with the same fields as a
        // `dismissed` event, but without a requestId.
        Purchasely.setDefaultPresentationDismissHandler { outcome: PLYPresentationOutcome ->
            emitDefaultPresentationDismissed(outcome)
        }
    }

    private fun removeDefaultPresentationDismissHandler() {
        defaultCallback = null
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

    // -----------------------------------------------------------------------
    // v6 presentation lifecycle (builder API)
    //
    // The JS PresentationBuilder/PresentationRequest layer drives the native
    // presentation through requestId-scoped actions. Each builds a
    // PLYPresentation { ... } (alias for PLYPresentationBase.Prepared), wires the
    // lifecycle callbacks, and emits `{type, requestId, ...}` JSONObjects on the
    // kept-alive callbackContext that issued the action.
    // -----------------------------------------------------------------------

    private fun applyStartOptions(options: JSONObject?) {
        options ?: return
        if (options.has("allowDeeplink") && !options.isNull("allowDeeplink")) {
            Purchasely.allowDeeplink = options.optBoolean("allowDeeplink")
        }
        if (options.has("allowCampaigns") && !options.isNull("allowCampaigns")) {
            Purchasely.allowCampaigns = options.optBoolean("allowCampaigns")
        }
    }

    private fun buildPreparedPresentation(payload: JSONObject?): PLYPresentationBase.Prepared {
        return PLYPresentation {
            payload?.let { p ->
                p.optStringOrNull("placementId")?.let { placementId(it) }
                // The JS `screenId` is forwarded as the legacy native key `presentationId`.
                p.optStringOrNull("presentationId")?.let { screenId(it) }
                p.optStringOrNull("contentId")?.let { contentId(it) }
                if (p.has("displayCloseButton") && !p.isNull("displayCloseButton")) {
                    displayCloseButton(p.optBoolean("displayCloseButton"))
                }
                if (p.has("displayBackButton") && !p.isNull("displayBackButton")) {
                    displayBackButton(p.optBoolean("displayBackButton"))
                }
                p.optStringOrNull("backgroundColor")?.let { hex ->
                    try {
                        backgroundColor(android.graphics.Color.parseColor(hex))
                    } catch (e: Exception) {
                        Log.w("Purchasely", "Invalid backgroundColor: $hex")
                    }
                }
                p.optStringOrNull("progressColor")?.let { hex ->
                    try {
                        progressColor(android.graphics.Color.parseColor(hex))
                    } catch (e: Exception) {
                        Log.w("Purchasely", "Invalid progressColor: $hex")
                    }
                }
            }
        }
    }

    private fun preloadPresentation(
        requestId: String,
        payload: JSONObject?,
        callbackContext: CallbackContext
    ) {
        val prepared = buildPreparedPresentation(payload)
        prepared.preload { loaded: PLYPresentation?, error: PLYError? ->
            val map = HashMap<String, Any?>()
            map["type"] = "loaded"
            map["requestId"] = requestId
            loaded?.let {
                activePresentations[requestId] = it
                map["presentation"] = it.toPresentationMap()
            }
            error?.let { map["error"] = it.toErrorMap() }
            emitOn(callbackContext, map)
        }
    }

    private fun displayPresentation(
        requestId: String,
        payload: JSONObject?,
        transition: JSONObject?,
        callbackContext: CallbackContext
    ) {
        val activity = cordova.activity
        if (activity == null) {
            emitOn(
                callbackContext,
                mapOf(
                    "type" to "dismissed",
                    "requestId" to requestId,
                    "error" to mapOf("message" to "No current activity to host the presentation")
                )
            )
            return
        }

        val prepared = buildPreparedPresentation(payload)
        prepared.onCloseRequested = {
            emitOn(callbackContext, mapOf("type" to "closeRequested", "requestId" to requestId))
        }

        prepared.display(
            context = activity,
            transition = mapTransition(transition),
            presentation = { loaded: PLYPresentation ->
                activePresentations[requestId] = loaded
                emitOn(
                    callbackContext,
                    mapOf(
                        "type" to "presented",
                        "requestId" to requestId,
                        "presentation" to loaded.toPresentationMap()
                    )
                )
            },
            callback = { outcome: PLYPresentationOutcome ->
                emitOn(callbackContext, dismissedMap(requestId, outcome))
                activePresentations.remove(requestId)
            }
        )
    }

    private fun closePresentation(requestId: String, callbackContext: CallbackContext) {
        emitOn(callbackContext, mapOf("type" to "closeRequested", "requestId" to requestId))
        activePresentations.remove(requestId)
        // The native SDK does not expose a per-request close, so this dismisses
        // *every* displayed presentation, not just `requestId` (RN parity).
        if (activePresentations.isNotEmpty()) {
            Log.w(
                "Purchasely",
                "closePresentation($requestId) dismisses ALL displayed presentations " +
                    "(per-request close is not supported by the native SDK); " +
                    "${activePresentations.size} other active request(s) will also be closed."
            )
        }
        Purchasely.closeAllScreens()
    }

    private fun goBackToPreviousScreen(requestId: String) {
        val loaded = activePresentations[requestId]
        if (loaded == null) {
            Log.w("Purchasely", "goBackToPreviousScreen($requestId) ignored: presentation is not loaded")
            return
        }
        loaded.back()
    }

    private fun mapTransition(transition: JSONObject?): PLYTransition? {
        transition ?: return null
        val typeString = transition.optStringOrNull("type") ?: return null
        val type = when (typeString) {
            "fullScreen" -> PLYTransitionType.FULLSCREEN
            "push" -> PLYTransitionType.PUSH
            "modal" -> PLYTransitionType.MODAL
            "drawer" -> PLYTransitionType.DRAWER
            "popin" -> PLYTransitionType.POPIN
            else -> PLYTransitionType.FULLSCREEN
        }

        fun readDimension(key: String): PLYTransitionDimension? {
            if (!transition.has(key) || transition.isNull(key)) return null
            val dim = transition.optJSONObject(key) ?: return null
            val dimType = when (dim.optStringOrNull("type")) {
                "pixel" -> PLYDimensionType.PIXEL
                else -> PLYDimensionType.PERCENTAGE
            }
            val value = if (dim.has("value") && !dim.isNull("value")) {
                dim.optDouble("value", 0.0).toFloat()
            } else {
                0f
            }
            return PLYTransitionDimension(type = dimType, value = value)
        }

        val dismissible = if (transition.has("dismissible") && !transition.isNull("dismissible")) {
            transition.optBoolean("dismissible")
        } else {
            true
        }

        return PLYTransition(
            type = type,
            width = readDimension("width"),
            height = readDimension("height"),
            dismissible = dismissible
        )
    }

    // -----------------------------------------------------------------------
    // v6 per-action interceptor (builder API)
    // -----------------------------------------------------------------------

    private fun registerActionInterceptor(kind: String, callbackContext: CallbackContext) {
        val actionType = kindToActionClass(kind)
        if (actionType == null) {
            Log.w("Purchasely", "Unknown interceptor kind: $kind")
            return
        }
        interceptorCallbacks[kind] = callbackContext
        Purchasely.interceptAction(actionType, PLYActionInterceptorCallback { info, action, complete ->
            val callbackId = UUID.randomUUID().toString()
            val deferred = CompletableDeferred<PLYInterceptResult>()
            pendingInterceptors[callbackId] = deferred

            val map = HashMap<String, Any?>()
            map["callbackId"] = callbackId
            map["kind"] = kind
            map["info"] = buildInterceptorInfo(info)
            map["payload"] = buildInterceptorPayload(action)
            emitOn(interceptorCallbacks[kind], map)

            CoroutineScope(Dispatchers.Main).launch {
                // Bound the suspension: withTimeoutOrNull returns null if JS never
                // resolves within INTERCEPTOR_TIMEOUT_MS; in every case we default to
                // NOT_HANDLED and drop the pending entry so the SDK action is never
                // blocked indefinitely.
                val result = runCatching {
                    withTimeoutOrNull(INTERCEPTOR_TIMEOUT_MS) { deferred.await() }
                }.getOrNull() ?: PLYInterceptResult.NOT_HANDLED
                pendingInterceptors.remove(callbackId)
                complete(result)
            }
        })
    }

    private fun unregisterActionInterceptor(kind: String) {
        val actionType = kindToActionClass(kind)
        if (actionType == null) {
            Log.w("Purchasely", "Unknown interceptor kind: $kind")
            return
        }
        interceptorCallbacks.remove(kind)
        runCatching { Purchasely.removeActionInterceptor(actionType) }.onFailure {
            Log.w("Purchasely", "removeActionInterceptor($kind) failed: ${it.message}")
        }
    }

    private fun completeActionInterceptor(callbackId: String, result: String) {
        val deferred = pendingInterceptors.remove(callbackId) ?: return
        deferred.complete(
            when (result) {
                "success" -> PLYInterceptResult.SUCCESS
                "failed" -> PLYInterceptResult.FAILED
                else -> PLYInterceptResult.NOT_HANDLED
            }
        )
    }

    // Accepts both the v6 builder camelCase kinds (registerActionInterceptor /
    // unregisterActionInterceptor) and the legacy PaywallAction snake_case kinds
    // (removeActionInterceptor) so both JS surfaces resolve to the same classes.
    private fun kindToActionClass(kind: String): Class<out PLYPresentationAction>? = when (kind) {
        "close" -> PLYPresentationAction.Close::class.java
        "closeAll", "close_all" -> PLYPresentationAction.CloseAll::class.java
        "login" -> PLYPresentationAction.Login::class.java
        "navigate" -> PLYPresentationAction.Navigate::class.java
        "purchase" -> PLYPresentationAction.Purchase::class.java
        "restore" -> PLYPresentationAction.Restore::class.java
        "openPresentation", "open_presentation" -> PLYPresentationAction.OpenPresentation::class.java
        "openPlacement", "open_placement" -> PLYPresentationAction.OpenPlacement::class.java
        "promoCode", "promo_code" -> PLYPresentationAction.PromoCode::class.java
        "webCheckout", "web_checkout" -> PLYPresentationAction.WebCheckout::class.java
        else -> null
    }

    private fun buildInterceptorInfo(info: PLYInterceptorInfo): Map<String, Any?> {
        val map = HashMap<String, Any?>()
        map["contentId"] = info.contentId
        info.presentation?.let { map["presentation"] = it.toPresentationMap() }
        return map
    }

    private fun buildInterceptorPayload(action: PLYPresentationAction): Map<String, Any?> {
        val payload = HashMap<String, Any?>()
        when (action) {
            is PLYPresentationAction.Navigate -> {
                payload["url"] = action.url.toString()
                action.title?.let { payload["title"] = it }
            }
            is PLYPresentationAction.Purchase -> {
                payload["plan"] = transformPlanToMap(action.plan)
                action.offer?.let {
                    payload["offer"] = mapOf(
                        "vendorId" to it.vendorId,
                        "storeOfferId" to it.storeOfferId
                    )
                }
                action.subscriptionOffer?.let { so ->
                    payload["subscriptionOffer"] = mapOf(
                        "subscriptionId" to so.subscriptionId,
                        "basePlanId" to so.basePlanId,
                        "offerToken" to so.offerToken,
                        "offerId" to so.offerId
                    )
                }
            }
            is PLYPresentationAction.Close -> payload["closeReason"] = action.closeReason.toCordovaString()
            is PLYPresentationAction.CloseAll -> payload["closeReason"] = action.closeReason.toCordovaString()
            is PLYPresentationAction.OpenPresentation -> payload["presentationId"] = action.presentationId
            is PLYPresentationAction.OpenPlacement -> payload["placementId"] = action.placementId
            is PLYPresentationAction.WebCheckout -> {
                payload["url"] = action.url.toString()
                payload["clientReferenceId"] = action.clientReferenceId
                payload["queryParameterKey"] = action.queryParameterKey
                payload["webCheckoutProvider"] = action.webCheckoutProvider.name.lowercase()
            }
            else -> {
                // login, restore, promoCode → no extra payload.
            }
        }
        return payload
    }

    // -----------------------------------------------------------------------
    // v6 presentation event payload builders
    // -----------------------------------------------------------------------

    private fun dismissedMap(requestId: String, outcome: PLYPresentationOutcome): Map<String, Any?> {
        val map = HashMap<String, Any?>()
        map["type"] = "dismissed"
        map["requestId"] = requestId
        outcome.presentation?.let { map["presentation"] = it.toPresentationMap() }
        outcome.purchaseResult?.let { map["purchaseResult"] = it.toOrdinal() }
        outcome.plan?.let { map["plan"] = transformPlanToMap(it) }
        val outcomeError1 = outcome.error
        if (outcomeError1 == null) {
            outcome.closeReason?.let { map["closeReason"] = it.toCordovaString() }
        } else {
            map["error"] = outcomeError1.toErrorMap()
        }
        return map
    }

    private fun emitDefaultPresentationDismissed(outcome: PLYPresentationOutcome) {
        val map = HashMap<String, Any?>()
        outcome.presentation?.let { map["presentation"] = it.toPresentationMap() }
        outcome.purchaseResult?.let { map["purchaseResult"] = it.toOrdinal() }
        outcome.plan?.let { map["plan"] = transformPlanToMap(it) }
        val outcomeError2 = outcome.error
        if (outcomeError2 == null) {
            outcome.closeReason?.let { map["closeReason"] = it.toCordovaString() }
        } else {
            map["error"] = outcomeError2.toErrorMap()
        }
        emitOn(defaultCallback, map)
    }

    private fun PLYPresentation.toPresentationMap(): Map<String, Any?> {
        val map = HashMap<String, Any?>()
        map["screenId"] = screenId
        map["id"] = screenId
        map["placementId"] = placementId
        map["contentId"] = contentId
        map["audienceId"] = audienceId
        map["abTestId"] = abTestId
        map["abTestVariantId"] = abTestVariantId
        map["language"] = language
        map["type"] = type.ordinal
        map["height"] = height
        if (plans.isNotEmpty()) {
            map["plans"] = plans.map { it.toMap() }
        }
        metadata?.let { map["metadata"] = it.toMetadataMap() }
        return map
    }

    private fun PLYPresentationMetadata.toMetadataMap(): Map<String, Any?> {
        val result = HashMap<String, Any?>()
        keys().forEach { key -> result[key] = get(key) }
        return result
    }

    private fun PLYError.toErrorMap(): Map<String, Any?> {
        return mapOf("message" to (message ?: "Unknown error"))
    }

    // Delete when available in Android SDK
    private fun PLYPresentationPlan.toMap(): Map<String, String?> {
        return mapOf(
            "planVendorId" to planVendorId,
            "storeProductId" to storeProductId,
            "basePlanId" to basePlanId
        )
    }

    private fun JSONObject.optStringOrNull(key: String): String? {
        if (!has(key) || isNull(key)) return null
        val value = optString(key, "")
        return if (value.isEmpty() || value == "null") null else value
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

    // -----------------------------------------------------------------------
    // v6 kept-alive emit helper + outcome mappers (copied from RN bridge)
    // -----------------------------------------------------------------------

    /** Emit a JSONObject on a kept-alive callback (keepCallback = true). */
    private fun emitOn(cb: CallbackContext?, map: Map<String, Any?>) {
        cb ?: return
        val result = PluginResult(PluginResult.Status.OK, JSONObject(map))
        result.keepCallback = true
        cb.sendPluginResult(result)
    }

    private fun PLYCloseReason.toCordovaString(): String = when (this) {
        PLYCloseReason.BUTTON -> "button"
        PLYCloseReason.BACK_SYSTEM -> "backSystem"
        PLYCloseReason.PROGRAMMATIC -> "programmatic"
    }

    private fun PLYPurchaseResult.toOrdinal(): Int = when (this) {
        PLYPurchaseResult.PURCHASED -> 0
        PLYPurchaseResult.CANCELLED -> 1
        PLYPurchaseResult.RESTORED -> 2
    }

    companion object {
        var defaultCallback: CallbackContext? = null
        var eventsCallback: CallbackContext? = null
        var attributesCallback: CallbackContext? = null

        private const val runningModeObserver = 2
        private const val runningModeFull = 3

        /**
         * Upper bound on how long the bridge waits for JS to resolve an intercepted
         * action via completeActionInterceptor. If JS never calls back we default to
         * NOT_HANDLED so the SDK action is never blocked indefinitely.
         */
        private const val INTERCEPTOR_TIMEOUT_MS = 30_000L

        fun transformPlanToMap(plan: PLYPlan?): Map<String?, Any?> {
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
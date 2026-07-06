package cordova.plugin.purchasely

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
import io.purchasely.ext.PurchaseListener
import io.purchasely.ext.Purchasely
import io.purchasely.ext.State
import io.purchasely.ext.StoreType
import io.purchasely.ext.UserAttributeListener
import io.purchasely.ext.presentation.PLYPresentationAction
import io.purchasely.ext.presentation.PLYPresentationBase
import io.purchasely.ext.presentation.PLYPresentationOutcome
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
import io.purchasely.views.presentation.models.PLYDimensionType
import io.purchasely.views.presentation.models.PLYTransition
import io.purchasely.views.presentation.models.PLYTransitionDimension
import io.purchasely.views.presentation.models.PLYTransitionType
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import org.apache.cordova.CallbackContext
import org.apache.cordova.CordovaPlugin
import org.apache.cordova.PluginResult
import org.json.JSONArray
import org.json.JSONException
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import java.util.concurrent.ConcurrentHashMap

/**
 * This class echoes a string called from JavaScript.
 */
class PurchaselyPlugin : CordovaPlugin(), CoroutineScope {

    private val job = SupervisorJob()
    override val coroutineContext = job + Dispatchers.Main

    // v6 per-action interceptor state. Each registered action kind keeps its own
    // Cordova callback (to emit intercept events); each intercepted invocation stashes
    // its completion under a unique id so concurrent intercepts resolve independently.
    private val actionInterceptorCallbacks = ConcurrentHashMap<String, CallbackContext>()
    private val pendingInterceptCompletions = ConcurrentHashMap<String, (PLYInterceptResult) -> Unit>()
    private var interceptorInvocationCounter = 0

    // Presentation currently displayed (used for back()/close()).
    private var displayedPresentation: PLYPresentationBase.Loaded? = null
    // Presentations preloaded by fetchPresentation, keyed by a synthetic handle
    // (the "id" we send back to JS) so presentPresentation can re-display them.
    private val loadedPresentations = ConcurrentHashMap<String, PLYPresentationBase.Loaded>()

    override fun onDestroy() {
        job.cancel()
        super.onDestroy()
    }

    override fun execute(
        action: String,
        args: JSONArray,
        callbackContext: CallbackContext
    ): Boolean {
        try {
            when (action) {
                "start" -> start(args.getJSONObject(0), callbackContext)

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
                "removeDefaultPresentationDismissHandler" -> removeDefaultPresentationDismissHandler(callbackContext)

                "purchasedSubscription" -> purchasedSubscription(callbackContext)
                "allowDeeplink" -> allowDeeplink(args.getBoolean(0))
                "allowCampaigns" -> allowCampaigns(args.getBoolean(0))
                "synchronize" -> synchronize(callbackContext)
                "presentPresentationWithIdentifier" -> presentPresentationWithIdentifier(
                    getStringFromJson(args.getString(0)),
                    getStringFromJson(args.getString(1)),
                    args.optJSONObject(2),
                    callbackContext
                )

                "presentPresentationForPlacement" -> presentPresentationForPlacement(
                    getStringFromJson(args.getString(0)),
                    getStringFromJson(args.getString(1)),
                    args.optJSONObject(2),
                    callbackContext
                )

                "presentPresentationForDefault" -> presentPresentationForDefault(
                    getStringFromJson(args.getString(0)),
                    args.optJSONObject(1),
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
                    args.optJSONObject(1),
                    getStringFromJson(args.getString(2)),
                    callbackContext
                )
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
                "registerActionInterceptor" -> registerActionInterceptor(getStringFromJson(args.getString(0)), callbackContext)
                "unregisterActionInterceptor" -> unregisterActionInterceptor(getStringFromJson(args.getString(0)))
                "completeActionInterceptor" -> completeActionInterceptor(getStringFromJson(args.getString(0)), getStringFromJson(args.getString(1)))
                "closePresentation" -> closePresentation(callbackContext)
                "backPresentation" -> backPresentation(callbackContext)
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

    //region start
    private fun logLevelFrom(raw: Any?): LogLevel {
        return when (raw) {
            is Number -> LogLevel.values().getOrElse(raw.toInt()) { LogLevel.ERROR }
            is String -> LogLevel.values().firstOrNull { it.name.equals(raw, ignoreCase = true) } ?: LogLevel.ERROR
            else -> LogLevel.ERROR
        }
    }

    // v6: running mode is passed by NAME ("observer"/"full"). The old int mapping is
    // gone; PLYRunningMode has only Observer (default) and Full.
    private fun runningModeFrom(raw: Any?): PLYRunningMode {
        return when (raw) {
            is Number -> when (raw.toInt()) {
                1 -> PLYRunningMode.Full
                else -> PLYRunningMode.Observer
            }
            is String -> when (raw.lowercase(Locale.US)) {
                "full" -> PLYRunningMode.Full
                else -> PLYRunningMode.Observer
            }
            else -> PLYRunningMode.Observer
        }
    }

    private fun start(options: JSONObject, callbackContext: CallbackContext) {
        val apiKey = getStringFromJson(options.optString("apiKey"))
        if (apiKey == null) {
            callbackContext.error("API Key is null")
            return
        }

        val userId = getStringFromJson(options.optString("appUserId"))
        val logLevel = logLevelFrom(options.opt("logLevel"))
        val runningMode = runningModeFrom(options.opt("runningMode"))

        val storesList = ArrayList<String>()
        options.optJSONArray("stores")?.let { arr ->
            for (i in 0 until arr.length()) {
                try {
                    storesList.add(arr.getString(i))
                } catch (e: JSONException) {
                    Log.e("Purchasely", "Error in store array" + e.message, e)
                }
            }
        }

        val allowDeeplink = if (options.has("allowDeeplink")) options.optBoolean("allowDeeplink") else null
        val allowCampaigns = if (options.has("allowCampaigns")) options.optBoolean("allowCampaigns") else null
        val deeplink = getStringFromJson(options.optString("deeplink"))
        val sdkVersion = getStringFromJson(options.optString("sdkVersion"))

        Purchasely.Builder(cordova.context)
            .apiKey(apiKey)
            .stores(getStoresInstances(storesList))
            .userId(userId)
            .runningMode(runningMode)
            .logLevel(logLevel)
            .apply {
                allowDeeplink?.let { this.allowDeeplink(it) }
                allowCampaigns?.let { this.allowCampaigns(it) }
                // Cold-start deeplink: replayed automatically once started.
                deeplink?.let { this.handleDeeplink(Uri.parse(it)) }
            }
            .build()

        Purchasely.sdkBridgeVersion = sdkVersion
        Purchasely.appTechnology = PLYAppTechnology.CORDOVA
        Purchasely.start { error: PLYError? ->
            if (error == null) {
                callbackContext.sendPluginResult(PluginResult(PluginResult.Status.OK, true))
            } else {
                callbackContext.error(error.message ?: "Purchasely SDK not configured")
            }
        }
    }
    //endregion

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
        actionInterceptorCallbacks.clear()
        pendingInterceptCompletions.clear()
        displayedPresentation = null
        // TODO(v6-verify): the global Purchasely.close() teardown was removed/lumped with
        // presentation close in v6 (Flutter never calls it). Not invoked here to avoid a
        // reference to a symbol that may no longer exist.
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
        Purchasely.userLogout(true)
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

    private fun allowDeeplink(allow: Boolean) {
        Purchasely.allowDeeplink = allow
    }

    private fun allowCampaigns(allow: Boolean) {
        Purchasely.allowCampaigns = allow
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

    //region Default presentation dismiss handler
    private fun setDefaultPresentationDismissHandler(callbackContext: CallbackContext) {
        defaultCallback = callbackContext
        Purchasely.setDefaultPresentationDismissHandler { outcome: PLYPresentationOutcome ->
            val pluginResult = PluginResult(PluginResult.Status.OK, JSONObject(outcomeToMap(outcome)))
            pluginResult.keepCallback = true
            defaultCallback?.sendPluginResult(pluginResult)
        }
    }
    //endregion

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
        Purchasely.synchronize(
            onSuccess = {
                callbackContext.sendPluginResult(PluginResult(PluginResult.Status.OK, true))
            },
            onError = { error ->
                callbackContext.error(error?.message ?: "Synchronization failed")
            }
        )
    }

    private fun userDidConsumeSubscriptionContent() {
        Purchasely.userDidConsumeSubscriptionContent()
    }

    //region Presentation lifecycle
    // v6: the presentation activities are gone. A presentation is built via the
    // builder DSL, preloaded, then displayed. `displayMode` maps to a PLYTransition.
    private fun presentPresentationWithIdentifier(
        presentationVendorId: String?,
        contentId: String?,
        transition: JSONObject?,
        callbackContext: CallbackContext
    ) {
        purchaseCallback = callbackContext
        displayPresentation(
            screenId = presentationVendorId,
            placementId = null,
            contentId = contentId,
            transition = transition,
            callbackContext = callbackContext
        )
    }

    private fun presentPresentationForPlacement(
        placementVendorId: String?,
        contentId: String?,
        transition: JSONObject?,
        callbackContext: CallbackContext
    ) {
        purchaseCallback = callbackContext
        displayPresentation(
            screenId = null,
            placementId = placementVendorId,
            contentId = contentId,
            transition = transition,
            callbackContext = callbackContext
        )
    }

    // v6: present the default (audience-targeted) presentation — no placement/screen id.
    private fun presentPresentationForDefault(
        contentId: String?,
        transition: JSONObject?,
        callbackContext: CallbackContext
    ) {
        purchaseCallback = callbackContext
        displayPresentation(
            screenId = null,
            placementId = null,
            contentId = contentId,
            transition = transition,
            callbackContext = callbackContext
        )
    }

    private fun displayPresentation(
        screenId: String?,
        placementId: String?,
        contentId: String?,
        transition: JSONObject?,
        callbackContext: CallbackContext
    ) {
        launch {
            try {
                val builder = PLYPresentationBase.builder().apply {
                    when {
                        placementId != null -> this.placementId(placementId)
                        screenId != null -> this.screenId(screenId)
                        // else: default (audience-targeted) source — no id
                    }
                    contentId(contentId)
                    // v6: stream the presentation lifecycle to the JS callback via keep-alive
                    // envelopes; the dismiss outcome is delivered as the final (non-kept)
                    // result by sendPurchaseResult.
                    onPresented { presentation, error ->
                        val env = mutableMapOf<String, Any?>("event" to "presented")
                        presentation?.let { env["presentation"] = presentationToMap(it) }
                        error?.let { env["error"] = it.message }
                        val r = PluginResult(PluginResult.Status.OK, JSONObject(env))
                        r.keepCallback = true
                        callbackContext.sendPluginResult(r)
                    }
                    onCloseRequested {
                        val r = PluginResult(PluginResult.Status.OK, JSONObject(mapOf("event" to "closeRequested")))
                        r.keepCallback = true
                        callbackContext.sendPluginResult(r)
                    }
                }
                val loaded = builder.build().preload()
                displayedPresentation = loaded
                loaded.display(cordova.activity, transitionFromMap(transition)) { outcome ->
                    sendPurchaseResult(outcome)
                }
            } catch (t: Throwable) {
                if (purchaseCallback === callbackContext) purchaseCallback = null
                callbackContext.error(t.message ?: "Unable to present presentation")
            }
        }
    }

    private fun fetchPresentation(
        placementId: String?,
        presentationId: String?,
        contentId: String?,
        callbackContext: CallbackContext) {
        launch {
            try {
                val builder = PLYPresentationBase.builder().apply {
                    when {
                        placementId != null -> this.placementId(placementId)
                        presentationId != null -> this.screenId(presentationId)
                        // else: neither id → the default (audience-targeted) presentation
                    }
                    contentId(contentId)
                }
                val loaded = builder.build().preload()
                // Synthetic handle so presentPresentation can re-display this preloaded presentation.
                val handle = "ply_fetch_${System.nanoTime()}"
                loadedPresentations[handle] = loaded
                val map = presentationToMap(loaded).toMutableMap()
                map["id"] = handle
                callbackContext.success(JSONObject(map))
            } catch (t: Throwable) {
                callbackContext.error(t.message ?: "Unable to fetch presentation")
            }
        }
    }

    private fun presentPresentation(presentationMap: JSONObject?,
                            transition: JSONObject?,
                            loadingBackgroundColor: String?,
                            callbackContext: CallbackContext) {
        if (presentationMap == null) {
            callbackContext.error("presentation cannot be null")
            return
        }

        val handle = if (presentationMap.has("id")) presentationMap.optString("id") else null
        val loaded = handle?.let { loadedPresentations[it] }
        if (loaded == null) {
            callbackContext.error("presentation cannot be found")
            return
        }

        purchaseCallback = callbackContext
        displayedPresentation = loaded

        // TODO(v6-verify): loadingBackgroundColor cannot be applied to an already-preloaded
        // presentation in v6 (colors are builder options set before preload). The re-display
        // path delivers the dismiss outcome only; onPresented/onCloseRequested are wired on the
        // direct present* methods (builder-seeded before preload).
        cordova.activity?.runOnUiThread {
            loaded.display(cordova.activity, transitionFromMap(transition)) { outcome ->
                sendPurchaseResult(outcome)
            }
        }
    }

    // v6: stop receiving default (campaign/deeplink) presentation dismiss outcomes.
    private fun removeDefaultPresentationDismissHandler(callbackContext: CallbackContext) {
        // Android's setter is non-null; install a no-op handler and drop the JS callback
        // so default (campaign/deeplink) dismiss outcomes are no longer forwarded.
        Purchasely.setDefaultPresentationDismissHandler { }
        defaultCallback = null
        callbackContext.success()
    }

    // Maps the JS transition object to a v6 PLYTransition. Shape:
    //   { type, dismissible?, width?: {type,value}, height?: {type,value} }
    // width is popin-only; height drives drawer+popin. Null → surface default.
    private fun transitionFromMap(map: JSONObject?): PLYTransition? {
        if (map == null) return null
        val type = when (map.optString("type")) {
            "fullScreen" -> PLYTransitionType.FULLSCREEN
            "push" -> PLYTransitionType.PUSH
            "modal" -> PLYTransitionType.MODAL
            "drawer" -> PLYTransitionType.DRAWER
            "popin" -> PLYTransitionType.POPIN
            "inlinePaywall" -> PLYTransitionType.INLINE_PAYWALL
            else -> return null
        }
        return PLYTransition(
            type = type,
            width = dimensionFromMap(map.optJSONObject("width")),
            height = dimensionFromMap(map.optJSONObject("height")),
            dismissible = map.optBoolean("dismissible", true)
        )
    }

    // { type: 'pixel'|'percentage', value: Number } → PLYTransitionDimension. Null when absent.
    private fun dimensionFromMap(map: JSONObject?): PLYTransitionDimension? {
        if (map == null || !map.has("value")) return null
        val value = map.optDouble("value").toFloat()
        val type = if (map.optString("type") == "pixel") PLYDimensionType.PIXEL else PLYDimensionType.PERCENTAGE
        return PLYTransitionDimension(type, value)
    }

    private fun closePresentation(callbackContext: CallbackContext) {
        Purchasely.closeAllScreens()
        displayedPresentation = null
        callbackContext.success()
    }

    private fun backPresentation(callbackContext: CallbackContext) {
        cordova.activity?.runOnUiThread { displayedPresentation?.back() }
        callbackContext.success()
    }
    //endregion

    private fun restoreAllProducts(callbackContext: CallbackContext) {
        Purchasely.restoreAllProducts(
            onSuccess = {
                callbackContext.success()
            },
            onError = { plyError: PLYError? ->
                callbackContext.error(plyError?.message)
            }
        )
    }

    private fun userSubscriptions(callbackContext: CallbackContext) {
        launch {
            try {
                val list = Purchasely.userSubscriptions(true)
                callbackContext.success(transformSubscriptionsToJson(list))
            } catch (e: Exception) {
                callbackContext.error(e.message)
            }
        }
    }

    private fun userSubscriptionsHistory(callbackContext: CallbackContext) {
        launch {
            try {
                val list = Purchasely.userSubscriptionsHistory(true)
                callbackContext.success(transformSubscriptionsToJson(list))
            } catch (e: Exception) {
                callbackContext.error(e.message)
            }
        }
    }

    private fun transformSubscriptionsToJson(list: List<PLYSubscriptionData>): JSONArray {
        val result = JSONArray()
        for (data in list) {
            val map = HashMap(data.data.toMap())
            map["plan"] = transformPlanToMap(data.plan)
            map["product"] = data.product.toMap()
            map["subscriptionSource"] = when (data.data.storeType) {
                StoreType.GOOGLE_PLAY_STORE -> StoreType.GOOGLE_PLAY_STORE.ordinal
                StoreType.AMAZON_APP_STORE -> StoreType.AMAZON_APP_STORE.ordinal
                StoreType.HUAWEI_APP_GALLERY -> StoreType.HUAWEI_APP_GALLERY.ordinal
                StoreType.APPLE_APP_STORE -> StoreType.APPLE_APP_STORE.ordinal
                else -> null
            }
            result.put(JSONObject(map))
        }
        return result
    }

    private fun handleDeeplink(deeplink: String?, callbackContext: CallbackContext) {
        if (deeplink == null) {
            callbackContext.error("Deeplink must not be null")
            return
        }
        val uri = Uri.parse(deeplink)
        callbackContext.sendPluginResult(
            PluginResult(
                PluginResult.Status.OK,
                Purchasely.handleDeeplink(uri, cordova.activity)
            )
        )
    }

    private fun allProducts(callbackContext: CallbackContext) {
        launch {
            try {
                val list = Purchasely.allProducts()
                val result = JSONArray()
                for (product in list) {
                    result.put(JSONObject(product.toMap()))
                }
                callbackContext.success(result)
            } catch (e: Exception) {
                callbackContext.error(e.message)
            }
        }
    }

    private fun productWithIdentifier(vendorId: String?, callbackContext: CallbackContext) {
        if(vendorId == null) {
            callbackContext.error("No product found with $vendorId")
            return
        }
        launch {
            try {
                val product: PLYProduct? = Purchasely.product(vendorId)
                if (product != null) {
                    callbackContext.success(JSONObject(product.toMap()))
                } else {
                    callbackContext.error("No product found with $vendorId")
                }
            } catch (e: Exception) {
                callbackContext.error(e.message)
            }
        }
    }

    private fun planWithIdentifier(vendorId: String?, callbackContext: CallbackContext) {
        if(vendorId == null) {
            callbackContext.error("No plan found with $vendorId")
            return
        }
        launch {
            try {
                val plan: PLYPlan? = Purchasely.plan(vendorId)
                if (plan != null) {
                    callbackContext.success(JSONObject(transformPlanToMap(plan)))
                } else {
                    callbackContext.error("No plan found with $vendorId")
                }
            } catch (e: Exception) {
                callbackContext.error(e.message)
            }
        }
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

        launch {
            try {
                val plyPlan: PLYPlan? = Purchasely.plan(planVendorId)
                if (plyPlan != null) {
                    val offer = plyPlan.promoOffers.firstOrNull { it.vendorId == offerId }
                    Purchasely.purchase(cordova.activity, plyPlan, offer, contentId,
                        onSuccess = { plyPlan1: PLYPlan? ->
                            callbackContext.success(JSONObject(transformPlanToMap(plyPlan1)))
                        },
                        onError = { plyError: PLYError? ->
                            callbackContext.error(plyError?.message)
                        })
                } else {
                    callbackContext.error("No plan found with $planVendorId")
                }
            } catch (e: Exception) {
                callbackContext.error(e.message)
            }
        }
    }

    //region Action interceptor
    // v6: register a JS handler for a single action kind. Each intercept emits an
    // event carrying a unique callbackId; JS replies via completeActionInterceptor.
    private fun registerActionInterceptor(kind: String?, callbackContext: CallbackContext) {
        if (kind == null) return
        val clazz = PLYPresentationAction.fromValue(kind)?.java
        if (clazz == null) {
            Log.w("Purchasely", "Unknown interceptor kind: $kind")
            return
        }
        actionInterceptorCallbacks[kind] = callbackContext
        Purchasely.interceptAction(clazz, object : PLYActionInterceptorCallback {
            override fun onIntercept(
                info: PLYInterceptorInfo,
                action: PLYPresentationAction,
                completion: (PLYInterceptResult) -> Unit
            ) {
                val callback = actionInterceptorCallbacks[kind]
                if (callback == null) {
                    completion(PLYInterceptResult.NOT_HANDLED)
                    return
                }
                // Unique id per intercepted invocation so concurrent intercepts resolve independently.
                val invocationId = "$kind#${++interceptorInvocationCounter}"
                pendingInterceptCompletions[invocationId] = completion

                val map = hashMapOf<String, Any?>(
                    "action" to kind,
                    "callbackId" to invocationId,
                    "info" to mapOf(
                        // TODO(v6-verify): presentationId derived from info.presentation?.screenId;
                        // v6 PLYInterceptorInfo exposes {contentId, presentation}, not a raw id.
                        "contentId" to info.contentId,
                        "presentationId" to info.presentation?.screenId
                    ),
                    "parameters" to (actionPayloadToMap(action) ?: emptyMap<String, Any?>())
                )
                val result = PluginResult(PluginResult.Status.OK, JSONObject(map))
                result.keepCallback = true
                callback.sendPluginResult(result)
            }
        })
    }

    // v6: stop intercepting a single action kind.
    private fun unregisterActionInterceptor(kind: String?) {
        if (kind == null) return
        val clazz = PLYPresentationAction.fromValue(kind)?.java ?: return
        actionInterceptorCallbacks.remove(kind)
        runCatching { Purchasely.removeActionInterceptor(clazz) }.onFailure {
            Log.w("Purchasely", "removeActionInterceptor($kind) failed: ${it.message}")
        }
    }

    private fun actionPayloadToMap(action: PLYPresentationAction): Map<String, Any?>? {
        return when (action) {
            is PLYPresentationAction.Navigate -> mapOf(
                "url" to action.url?.toString(),
                "title" to action.title
            )
            is PLYPresentationAction.Purchase -> mapOf(
                "plan" to transformPlanToMap(action.plan),
                "subscriptionOffer" to action.subscriptionOffer?.toMap(),
                "offer" to action.offer?.let { offer ->
                    mapOf(
                        "vendorId" to offer.vendorId,
                        "storeOfferId" to offer.storeOfferId
                    )
                }
            )
            is PLYPresentationAction.Close -> mapOf("closeReason" to action.closeReason.value)
            is PLYPresentationAction.CloseAll -> mapOf("closeReason" to action.closeReason.value)
            is PLYPresentationAction.OpenPresentation -> mapOf("presentationId" to action.presentationId)
            is PLYPresentationAction.OpenPlacement -> mapOf("placementId" to action.placementId)
            is PLYPresentationAction.WebCheckout -> mapOf(
                "url" to action.url?.toString(),
                "clientReferenceId" to action.clientReferenceId,
                "queryParameterKey" to action.queryParameterKey,
                "webCheckoutProvider" to action.webCheckoutProvider?.name
            )
            else -> null
        }
    }

    // v6: JS reports how an intercepted action was handled, keyed by the invocation id
    // carried on the intercept event. Result is "success"/"failed"/"notHandled".
    private fun completeActionInterceptor(callbackId: String?, result: String?) {
        if (callbackId == null) return
        val completion = pendingInterceptCompletions.remove(callbackId) ?: return
        val plyResult = when (result) {
            "success" -> PLYInterceptResult.SUCCESS
            "failed" -> PLYInterceptResult.FAILED
            else -> PLYInterceptResult.NOT_HANDLED
        }
        val activity = cordova.activity
        if (activity != null) {
            activity.runOnUiThread { completion.invoke(plyResult) }
        } else {
            completion.invoke(plyResult)
        }
    }
    //endregion

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
        launch {
            try {
                val plan = Purchasely.plan(planId ?: "")
                val eligible = plan?.isEligibleToOffer(null) ?: false
                callbackContext.sendPluginResult(PluginResult(PluginResult.Status.OK, eligible))
            } catch (e: Exception) {
                callbackContext.error(e.message ?: "Unable to fetch plan")
            }
        }
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

        // Resolves a present*/presentPresentation call at dismissal. One-shot for the
        // purchase callback; falls back to the (repeatable) default dismiss handler.
        fun sendPurchaseResult(outcome: PLYPresentationOutcome) {
            val json = JSONObject(outcomeToMap(outcome))
            val oneShot = purchaseCallback
            if (oneShot != null) {
                oneShot.success(json)
                purchaseCallback = null
                return
            }
            defaultCallback?.let {
                val pluginResult = PluginResult(PluginResult.Status.OK, json)
                pluginResult.keepCallback = true
                it.sendPluginResult(pluginResult)
            }
        }

        // Serializes a v6 PLYPresentationOutcome to the wire contract. `result` is kept as an
        // int (PurchaseResult 0/1/2) for back-compat with the pre-6.0 JS layer.
        fun outcomeToMap(outcome: PLYPresentationOutcome): Map<String?, Any?> {
            val result = when (outcome.purchaseResult?.name?.lowercase(Locale.US)) {
                "purchased" -> 0
                "cancelled" -> 1
                "restored" -> 2
                else -> 1 // no purchase (plain dismiss) → cancelled
            }
            val map = HashMap<String?, Any?>()
            map["result"] = result
            // v6: also expose the string purchaseResult ('purchased'|'cancelled'|'restored'|null)
            // alongside the legacy int `result`, matching the Flutter outcome contract.
            map["purchaseResult"] = outcome.purchaseResult?.name?.lowercase(Locale.US)
            map["plan"] = transformPlanToMap(outcome.plan)
            map["closeReason"] = outcome.closeReason?.value
            map["error"] = outcome.error?.message
            map["presentation"] = outcome.presentation?.let { presentationToMap(it) }
            return map
        }

        fun presentationToMap(p: PLYPresentationBase.Loaded): Map<String, Any?> {
            return mapOf(
                "screenId" to p.screenId,
                "placementId" to p.placementId,
                "contentId" to p.contentId,
                "audienceId" to p.audienceId,
                "abTestId" to p.abTestId,
                "abTestVariantId" to p.abTestVariantId,
                "campaignId" to p.campaignId,
                "flowId" to p.flowId,
                "language" to p.language,
                "type" to p.type.ordinal,
                "height" to p.height,
                "plans" to p.plans.map { presentationPlanToMap(it) }
            )
        }

        private fun presentationPlanToMap(plan: PLYPresentationPlan): Map<String, Any?> {
            return mapOf(
                "planVendorId" to plan.planVendorId,
                "storeProductId" to plan.storeProductId,
                "basePlanId" to plan.basePlanId,
                "offerId" to plan.storeOfferId
            )
        }

        private fun transformPlanToMap(plan: PLYPlan?): Map<String?, Any?> {
            if (plan == null) return HashMap()
            val map = HashMap(plan.toMap())
            map["type"] = when (plan.type) {
                DistributionType.RENEWING_SUBSCRIPTION -> DistributionType.RENEWING_SUBSCRIPTION.ordinal
                DistributionType.NON_RENEWING_SUBSCRIPTION -> DistributionType.NON_RENEWING_SUBSCRIPTION.ordinal
                DistributionType.CONSUMABLE -> DistributionType.CONSUMABLE.ordinal
                DistributionType.NON_CONSUMABLE -> DistributionType.NON_CONSUMABLE.ordinal
                DistributionType.UNKNOWN -> DistributionType.UNKNOWN.ordinal
                else -> null
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

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
import io.purchasely.ext.PLYAppTechnology
import io.purchasely.ext.PLYCompletionHandler
import io.purchasely.ext.PLYEvent
import io.purchasely.ext.PLYPresentation
import io.purchasely.ext.PLYPresentationAction
import io.purchasely.ext.PLYPresentationType
import io.purchasely.ext.PLYPresentationViewProperties
import io.purchasely.ext.PLYProductViewResult
import io.purchasely.ext.PLYRunningMode
import io.purchasely.ext.PLYRunningMode.Full
import io.purchasely.ext.PLYRunningMode.PaywallObserver
import io.purchasely.ext.PlanListener
import io.purchasely.ext.ProductListener
import io.purchasely.ext.ProductsListener
import io.purchasely.ext.PurchaseListener
import io.purchasely.ext.Purchasely
import io.purchasely.ext.State
import io.purchasely.ext.StoreType
import io.purchasely.ext.SubscriptionsListener
import io.purchasely.models.PLYError
import io.purchasely.models.PLYPlan
import io.purchasely.models.PLYPresentationPlan
import io.purchasely.models.PLYProduct
import io.purchasely.models.PLYSubscriptionData
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
    private var paywallActionHandler: PLYCompletionHandler? = null
    private var paywallAction: PLYPresentationAction? = null

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
                "removeEventsListener" -> removeEventsListener()
                "getAnonymousUserId" -> getAnonymousUserId(callbackContext)
                "userLogin" -> userLogin(getStringFromJson(args.getString(0)), callbackContext)
                "userLogout" -> userLogout()
                "setLanguage" -> setLanguage(getStringFromJson(args.getString(0)))
                "setLogLevel" -> setLogLevel(args.getInt(0))
                "setAttribute" -> setAttribute(args.getInt(0), getStringFromJson(args.getString(1)))
                "setDefaultPresentationResultHandler" -> setDefaultPresentationResultHandler(
                    callbackContext
                )

                "purchasedSubscription" -> purchasedSubscription(callbackContext)
                "readyToOpenDeeplink" -> readyToOpenDeeplink(args.getBoolean(0))
                "synchronize" -> synchronize()
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
                "isDeeplinkHandled" -> isDeeplinkHandled(
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
                "setUserAttributeWithString" -> setUserAttributeWithString(getStringFromJson(args.getString(0)), getStringFromJson(args.getString(1)))
                "setUserAttributeWithBoolean" -> setUserAttributeWithBoolean(getStringFromJson(args.getString(0)), args.getBoolean(1))
                "setUserAttributeWithInt" -> setUserAttributeWithInt(getStringFromJson(args.getString(0)), args.getInt(1))
                "setUserAttributeWithDouble" -> setUserAttributeWithDouble(getStringFromJson(args.getString(0)), args.getDouble(1))
                "setUserAttributeWithDate" -> setUserAttributeWithDate(getStringFromJson(args.getString(0)), getStringFromJson(args.getString(1)))
                "userAttribute" -> userAttribute(getStringFromJson(args.getString(0)), callbackContext)
                "clearUserAttribute" -> clearUserAttribute(getStringFromJson(args.getString(0)))
                "clearUserAttributes" -> clearUserAttributes()
                "isEligibleForIntroOffer" -> isEligibleForIntroOffer(getStringFromJson(args.getString(0)), callbackContext)
                "signPromotionalOffer" -> signPromotionalOffer(getStringFromJson(args.getString(0)), getStringFromJson(args.getString(1)), callbackContext)
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
        var plyRunningMode: PLYRunningMode = Full
        if (runningMode == runningModePaywallObserver) plyRunningMode = PaywallObserver
        Purchasely.Builder(cordova.context)
            .apiKey(apiKey)
            .stores(storesInstances)
            .userId(userId)
            .runningMode(plyRunningMode)
            .logLevel(LogLevel.values()[logLevel])
            .build()
        Purchasely.sdkBridgeVersion = cordovaSdkVersion
        Purchasely.appTechnology = PLYAppTechnology.CORDOVA
        Purchasely.start { isConfigured: Boolean, error: PLYError? ->
            if (isConfigured) {
                callbackContext.success()
            } else {
                callbackContext.error(
                    if (error != null) error.message else "Purchasely SDK not configured"
                )
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
        paywallActionHandler = null
        productActivity = null
        Purchasely.close()
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

    private fun readyToOpenDeeplink(isReadyToPurchase: Boolean) {
        Purchasely.readyToOpenDeeplink = isReadyToPurchase
    }

    private fun setAttribute(attribute: Int, value: String?) {
        if(value == null) return

        Purchasely.setAttribute(Attribute.values()[attribute], value)
    }

    private fun setDefaultPresentationResultHandler(callbackContext: CallbackContext) {
        defaultCallback = callbackContext
        Purchasely.setDefaultPresentationResultHandler { result: PLYProductViewResult, plan: PLYPlan? ->
            sendPurchaseResult(
                result,
                plan
            )
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

    private fun synchronize() {
        Purchasely.synchronize()
    }

    private fun userDidConsumeSubscriptionContent() {
        Purchasely.userDidConsumeSubscriptionContent()
    }

    private fun presentPresentationWithIdentifier(
        presentationVendorId: String?,
        contentId: String?,
        isFullScreen: Boolean,
        callbackContext: CallbackContext
    ) {
        purchaseCallback = callbackContext
        val intent = PLYProductActivity.newIntent(cordova.activity)
        intent.putExtra("presentationId", presentationVendorId)
        intent.putExtra("contentId", contentId)
        intent.putExtra("isFullScreen", isFullScreen)
        cordova.activity.startActivity(intent)
    }

    private fun presentPresentationForPlacement(
        placementVendorId: String?,
        contentId: String?,
        isFullScreen: Boolean,
        callbackContext: CallbackContext
    ) {
        purchaseCallback = callbackContext
        val intent = PLYProductActivity.newIntent(cordova.activity)
        intent.putExtra("placementId", placementVendorId)
        intent.putExtra("contentId", contentId)
        intent.putExtra("isFullScreen", isFullScreen)
        cordova.activity.startActivity(intent)
    }

    private fun presentProductWithIdentifier(
        productVendorId: String?,
        presentationVendorId: String?,
        contentId: String?,
        isFullScreen: Boolean,
        callbackContext: CallbackContext
    ) {
        purchaseCallback = callbackContext
        val intent = PLYProductActivity.newIntent(cordova.activity)
        intent.putExtra("presentationId", presentationVendorId)
        intent.putExtra("productId", productVendorId)
        intent.putExtra("contentId", contentId)
        intent.putExtra("isFullScreen", isFullScreen)
        cordova.activity.startActivity(intent)
    }

    private fun presentPlanWithIdentifier(
        planVendorId: String?,
        presentationVendorId: String?,
        contentId: String?,
        isFullScreen: Boolean,
        callbackContext: CallbackContext
    ) {
        purchaseCallback = callbackContext
        val intent = PLYProductActivity.newIntent(cordova.activity)
        intent.putExtra("presentationId", presentationVendorId)
        intent.putExtra("planId", planVendorId)
        intent.putExtra("contentId", contentId)
        intent.putExtra("isFullScreen", isFullScreen)
        cordova.activity.startActivity(intent)
    }

    private fun fetchPresentation(
        placementId: String?,
        presentationId: String?,
        contentId: String?,
        callbackContext: CallbackContext) {
        val properties = PLYPresentationViewProperties(
            placementId = placementId,
            presentationId = presentationId,
            contentId = contentId)

        Purchasely.fetchPresentation(properties = properties) { presentation: PLYPresentation?, error: PLYError? ->
            if(presentation != null) {
                presentationsLoaded.removeAll { it.id == presentation.id && it.placementId == presentation.placementId }
                presentationsLoaded.add(presentation)
                val map = presentation.toMap().mapValues {
                    val value = it.value
                    if(value is PLYPresentationType) value.ordinal
                    else value
                }

                val mutableMap = map.toMutableMap().apply {
                    //this["metadata"] = presentation.metadata?.toMap()
                    this["plans"] = (this["plans"] as List<PLYPresentationPlan>).map { it.toMap() }
                }
                callbackContext.success(JSONObject(map))
            }
            if(error != null) callbackContext.error(error.message ?: "Unable to fetch presentation")
        }
    }

    // Delete when available in Android SDK
    fun PLYPresentationPlan.toMap() : Map<String, String?> {
        return mapOf(
            Pair("planVendorId", planVendorId),
            Pair("storeProductId", storeProductId),
            Pair("basePlanId", basePlanId),
            Pair("offerId", offerId)
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

        val presentation = presentationsLoaded.lastOrNull {
            it.id == presentationMap.getString("id")
                    && it.placementId == presentationMap.getString("placementId")
        }
        if(presentation == null) {
            callbackContext.error("presentation cannot be found")
            return
        }

        purchaseCallback = callbackContext

        cordova.activity.let { activity ->
            val intent = PLYProductActivity.newIntent(activity, PLYPresentationViewProperties(), isFullScreen, loadingBackgroundColor).apply {
                putExtra("presentation", presentation)
            }
            activity.startActivity(intent)
        }

    }

    private fun presentSubscriptions() {
        val intent =
            Intent(cordova.context, PLYSubscriptionsActivity::class.java)
        cordova.activity.startActivity(intent)
    }

    private fun restoreAllProducts(callbackContext: CallbackContext) {
        Purchasely.restoreAllProducts({ plyPlan: PLYPlan? ->
            callbackContext.success(JSONObject(transformPlanToMap(plyPlan)))
        }) { plyError: PLYError? ->
            callbackContext.error(plyError?.message)
        }
    }

    private fun userSubscriptions(callbackContext: CallbackContext) {
        Purchasely.userSubscriptions(object : SubscriptionsListener {
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
        })
    }

    private fun isDeeplinkHandled(deeplink: String?, callbackContext: CallbackContext) {
        if (deeplink == null) {
            callbackContext.error("Deeplink must not be null")
            return
        }
        val uri = Uri.parse(deeplink)
        callbackContext.sendPluginResult(
            PluginResult(
                PluginResult.Status.OK,
                Purchasely.isDeeplinkHandled(uri)
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
        Purchasely.setPaywallActionsInterceptor { info, action, parameters, processAction ->
            paywallActionHandler = processAction
            paywallAction = action

            interceptorActivity = WeakReference(info?.activity)

            val parametersForCordova = hashMapOf<String, Any?>();
            parametersForCordova["title"] = parameters.title
            parametersForCordova["url"] = parameters.url?.toString()
            parametersForCordova["plan"] = transformPlanToMap(parameters.plan)
            parametersForCordova["offer"] = mapOf(
                "vendorId" to parameters.offer?.vendorId,
                "storeOfferId" to parameters.offer?.storeOfferId
            )
            parametersForCordova["subscriptionOffer"] = parameters.subscriptionOffer?.toMap()
            parametersForCordova["presentation"] = parameters.presentation
            parametersForCordova["placement"] = parameters.placement

            val result = PluginResult(
                PluginResult.Status.OK,
                JSONObject(
                    hashMapOf<String, Any?>(
                        Pair("info", mapOf(
                            Pair("contentId", info?.contentId),
                            Pair("presentationId", info?.presentationId),
                            Pair("placementId", info?.placementId),
                            Pair("abTestId", info?.abTestId),
                            Pair("abTestVariantId", info?.abTestVariantId)
                        )),
                        Pair("action", action.value),
                        Pair("parameters", parametersForCordova.filterNot { it.value == null })
                    )
                )
            )
            result.keepCallback = true
            callbackContext.sendPluginResult(result)
        }
    }

    private fun closePresentation(callbackContext: CallbackContext) {
        val openedPaywall = productActivity?.activity?.get()
        openedPaywall?.finish()
        productActivity = null
    }

    private fun onProcessAction(processAction: Boolean) {
        val activityHandler = interceptorActivity?.get() ?: productActivity?.activity?.get() ?: cordova.activity
        activityHandler?.runOnUiThread {
            paywallActionHandler?.invoke(processAction)

            interceptorActivity?.clear()
            interceptorActivity = null
        }
    }

    private fun showPresentation() {
        val currentActivity = interceptorActivity?.get()

        if (currentActivity != null && !currentActivity.isFinishing && !currentActivity.isDestroyed) {
            cordova.activity?.let {
                it.startActivity(
                    Intent(it, currentActivity::class.java).apply {
                        //flags = Intent.FLAG_ACTIVITY_NEW_TASK
                        flags = Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
                    }
                )
            }
        }
        else {
            productActivity?.relaunch(cordova)
        }
    }

    private fun hidePresentation() {
        val cordovaActivity = cordova.activity
        val activity = productActivity?.activity?.get() ?: cordovaActivity
        cordovaActivity?.startActivity(
            Intent(activity, cordovaActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
            }
        )
    }

    fun setUserAttributeWithString(key: String?, value: String?) {
        if(key == null || value == null) return
        Purchasely.setUserAttribute(key, value)
    }

    fun setUserAttributeWithInt(key: String?, value: Int?) {
        if(key == null || value == null) return
        Purchasely.setUserAttribute(key, value)
    }

    fun setUserAttributeWithDouble(key: String?, value: Double?) {
        if(key == null || value == null) return
        Purchasely.setUserAttribute(key, value.toFloat())
    }

    fun setUserAttributeWithBoolean(key: String?, value: Boolean?) {
        if(key == null || value == null) return
        Purchasely.setUserAttribute(key, value)
    }

    fun setUserAttributeWithDate(key: String?, value: String?) {
        if(key == null || value == null) return
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
            Purchasely.setUserAttribute(key, calendar.time)
        } catch (e: Exception) {
            Log.e("Purchasely", "Cannot save date attribute $key", e)
        }
    }

    fun userAttribute(key: String?, callbackContext: CallbackContext) {
        if(key == null) return
        val result = getUserAttributeValueForCordova(Purchasely.userAttribute(key))
        if(result != null) {
            callbackContext.success(getUserAttributeValueForCordova(result))
        } else {
            callbackContext.error("No user attribute found with $key")
        }
    }

    private fun getUserAttributeValueForCordova(value: Any?): String? {
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
            is Int -> value.toString()
            //awful but to keep same precision so 1.2f = 1.2 double and not 1.20000056
            is Float -> value.toString().toDouble().toString()
            is String -> value
            is Boolean -> value.toString()
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

    private fun isEligibleForIntroOffer(planId: String?, callbackContext: CallbackContext) {
        Purchasely.plan(planId,
            onSuccess = { plan ->
                callbackContext.sendPluginResult(PluginResult(PluginResult.Status.OK, plan?.isEligibleToIntroOffer(null) ?: false))
            },
            onError = { error ->
                callbackContext.error(error.message ?: "Unable to fetch plan")
            }
        )
    }

    private fun signPromotionalOffer(storeProductId: String?, storeOfferId: String?, callbackContext: CallbackContext) {
        callbackContext.error("No signing required on Android")
    }


    class ProductActivity {
        var presentationId: String? = null
        var placementId: String? = null
        var productId: String? = null
        var planId: String? = null
        var contentId: String? = null
        var presentation: PLYPresentation? = null
        var isFullScreen = false
        var loadingBackgroundColor: String? = null
        var activity: WeakReference<PLYProductActivity>? = null
        fun relaunch(cordova: CordovaInterface): Boolean {
            var backgroundActivity: PLYProductActivity? = null
            if (activity != null) {
                backgroundActivity = activity?.get()
            }
            return if (backgroundActivity != null && !backgroundActivity.isFinishing
                && !backgroundActivity.isDestroyed
            ) {
                val intent = Intent(cordova.activity, PLYProductActivity::class.java)
                intent.putExtra("presentation", presentation)
                intent.putExtra("presentationId", presentationId)
                intent.putExtra("placementId", placementId)
                intent.putExtra("productId", productId)
                intent.putExtra("planId", planId)
                intent.putExtra("contentId", contentId)
                intent.putExtra("isFullScreen", isFullScreen)
                intent.putExtra("background_color", loadingBackgroundColor)
                intent.flags = Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
                cordova.activity.startActivity(intent)
                true
            } else {
                val intent = PLYProductActivity.newIntent(cordova.activity)
                intent.putExtra("presentation", presentation)
                intent.putExtra("presentationId", presentationId)
                intent.putExtra("placementId", placementId)
                intent.putExtra("productId", productId)
                intent.putExtra("planId", planId)
                intent.putExtra("contentId", contentId)
                intent.putExtra("isFullScreen", isFullScreen)
                intent.putExtra("background_color", loadingBackgroundColor)
                cordova.activity.startActivity(intent)
                false
            }
        }
    }

    companion object {
        var defaultCallback: CallbackContext? = null
        var purchaseCallback: CallbackContext? = null
        var eventsCallback: CallbackContext? = null
        var productActivity: ProductActivity? = null

        var interceptorActivity: WeakReference<Activity>? = null

        val presentationsLoaded = mutableListOf<PLYPresentation>()

        private const val runningModePaywallObserver = 2
        private const val runningModeFull = 3

        fun sendPurchaseResult(result: PLYProductViewResult, plan: PLYPlan?) {
            var productViewResult = 0
            if (result == PLYProductViewResult.PURCHASED) {
                productViewResult = PLYProductViewResult.PURCHASED.ordinal
            } else if (result == PLYProductViewResult.CANCELLED) {
                productViewResult = PLYProductViewResult.CANCELLED.ordinal
            } else if (result == PLYProductViewResult.RESTORED) {
                productViewResult = PLYProductViewResult.RESTORED.ordinal
            }
            val map = HashMap<String?, Any?>()
            map["result"] = productViewResult
            map["plan"] = transformPlanToMap(plan)
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
            map["isEligibleForIntroOffer"] = plan.isEligibleToIntroOffer(null)
            return map
        }
    }
}
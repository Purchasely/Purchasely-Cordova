package cordova.plugin.purchasely;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.fragment.app.FragmentActivity;

import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaInterface;
import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.PluginResult;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import org.w3c.dom.Attr;

import java.lang.ref.WeakReference;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.BiConsumer;

import io.purchasely.billing.Store;
import io.purchasely.ext.Attribute;
import io.purchasely.ext.DistributionType;
import io.purchasely.ext.LogLevel;
import io.purchasely.ext.PLYAppTechnology;
import io.purchasely.ext.PLYPaywallActionListener;
import io.purchasely.ext.PLYPresentationAction;
import io.purchasely.ext.PLYProcessActionListener;
import io.purchasely.ext.PLYProductViewResult;
import io.purchasely.ext.PLYRunningMode;
import io.purchasely.ext.PlanListener;
import io.purchasely.ext.ProductListener;
import io.purchasely.ext.ProductsListener;
import io.purchasely.ext.Purchasely;
import io.purchasely.ext.State;
import io.purchasely.ext.StoreType;
import io.purchasely.ext.SubscriptionsListener;
import io.purchasely.models.PLYPlan;
import io.purchasely.models.PLYProduct;
import io.purchasely.models.PLYSubscriptionData;

/**
 * This class echoes a string called from JavaScript.
 */
public class PurchaselyPlugin extends CordovaPlugin {

    static CallbackContext defaultCallback = null;
    static CallbackContext presentationCallback = null;
    static CallbackContext eventsCallback = null;
    static ProductActivity productActivity = null;

    private PLYProcessActionListener processActionListener;

    private static int runningModeTransactionOnly = 0;
    private static int runningModeObserver = 1;
    private static int runningModePaywallOnly = 2;
    private static int runningModePaywallObserver = 3;
    private static int runningModeFull = 4;

    @Override
    public boolean execute(String action, JSONArray args, CallbackContext callbackContext) {
        try {
            switch (action) {
                case "startWithAPIKey":
                    startWithAPIKey(
                            args.getString(0),
                            args.getJSONArray(1),
                            args.getString(2),
                            args.getInt(3),
                            args.getInt(4),
                            callbackContext);
                    break;
                case "close":
                    close();
                    break;
                case "addEventsListener":
                    addEventsListener(callbackContext);
                    break;
                case "removeEventsListener":
                    removeEventsListener();
                    break;
                case "getAnonymousUserId":
                    getAnonymousUserId(callbackContext);
                    break;
                case "userLogin":
                    userLogin(args.getString(0), callbackContext);
                    break;
                case "userLogout":
                    userLogout();
                    break;
                case "setLanguage":
                    setLanguage(args.getString(0));
                    break;
                case "setLogLevel":
                    setLogLevel(args.getInt(0));
                    break;
                case "setAttribute":
                    setAttribute(args.getInt(0), args.getString(1));
                    break;
                case "setDefaultPresentationResultHandler":
                    setDefaultPresentationResultHandler(callbackContext);
                    break;
                case "purchasedSubscription":
                    purchasedSubscription(callbackContext);
                    break;
                case "isReadyToPurchase":
                    isReadyToPurchase(args.getBoolean(0));
                    break;
                case "synchronize":
                    synchronize();
                    break;
                case "presentPresentationWithIdentifier":
                    presentPresentationWithIdentifier(
                        args.getString(0),
                        args.getString(1),
                        callbackContext
                        );
                    break;
                case "presentProductWithIdentifier":
                    presentProductWithIdentifier(
                        args.getString(0),
                        args.getString(1),
                        args.getString(2),
                        callbackContext
                    );
                    break;
                case "presentPlanWithIdentifier":
                    presentPlanWithIdentifier(
                        args.getString(0),
                        args.getString(1),
                        args.getString(2),
                        callbackContext
                    );
                    break;
                case "presentSubscriptions":
                    presentSubscriptions();
                    break;
                case "restoreAllProducts":
                    restoreAllProducts(callbackContext);
                    break;
                case "userSubscriptions":
                    userSubscriptions(callbackContext);
                    break;
                case "handle":
                    handle(args.getString(0), callbackContext);
                    break;
                case "allProducts":
                    allProducts(callbackContext);
                    break;
                case "productWithIdentifier":
                    productWithIdentifier(args.getString(0), callbackContext);
                    break;
                case "planWithIdentifier":
                    planWithIdentifier(args.getString(0), callbackContext);
                    break;
                case "purchaseWithPlanVendorId":
                    purchaseWithPlanVendorId(
                        args.getString(0),
                        args.getString(1),
                        callbackContext
                    );
                    break;
                case "setPaywallActionInterceptor":
                    setPaywallActionInterceptor(callbackContext);
                    break;
                case "onProcessAction":
                    onProcessAction(args.getBoolean(0));
                    break;
                case "closePaywall":
                    closePaywall(callbackContext);
                    break;
                default:
                    return false;
            }
        } catch (JSONException e) {
            Log.e("Purchasely", String.format("Error executing action %s", action), e);
        }

        return true;
    }

    public static void sendPurchaseResult(PLYProductViewResult result, PLYPlan plan) {
        int productViewResult = 0;
        if(result == PLYProductViewResult.PURCHASED) {
            productViewResult = PLYProductViewResult.PURCHASED.ordinal();
        } else if(result == PLYProductViewResult.CANCELLED) {
            productViewResult = PLYProductViewResult.CANCELLED.ordinal();
        } else if(result == PLYProductViewResult.RESTORED) {
            productViewResult = PLYProductViewResult.RESTORED.ordinal();
        }

        HashMap<String, Object> map = new HashMap<>();
        map.put("result", productViewResult);
        map.put("plan", transformPlanToMap(plan));

        if(presentationCallback != null) {
            presentationCallback.success(new JSONObject(map));
            presentationCallback = null;
        } else if(defaultCallback != null) {
            PluginResult pluginResult = new PluginResult(PluginResult.Status.OK, new JSONObject(map));
            pluginResult.setKeepCallback(true);
            defaultCallback.sendPluginResult(pluginResult);
       }
    }

    private void startWithAPIKey(String apiKey,
                                 JSONArray stores,
                                 String userId,
                                 int logLevel,
                                 int runningMode,
                                 CallbackContext callbackContext) {
        ArrayList<String> list = new ArrayList<>();
        for (int i=0; i< stores.length(); i++) {
            try {
                list.add(stores.getString(i) );
            } catch (JSONException e) {
                Log.e("Purchasely", "Error in store array" + e.getMessage(), e);
            }
        }
        ArrayList<Store> storesInstances = getStoresInstances(list);

        PLYRunningMode plyRunningMode = PLYRunningMode.Full.INSTANCE;
        if(runningMode == runningModeTransactionOnly) plyRunningMode = PLYRunningMode.TransactionOnly.INSTANCE;
        else if(runningMode == runningModeObserver) plyRunningMode = PLYRunningMode.Observer.INSTANCE;
        else if(runningMode == runningModePaywallOnly) plyRunningMode = PLYRunningMode.PaywallOnly.INSTANCE;
        else if(runningMode == runningModePaywallObserver) plyRunningMode = PLYRunningMode.PaywallObserver.INSTANCE;

        new Purchasely.Builder(cordova.getContext())
                .apiKey(apiKey)
                .stores(storesInstances)
                .userId(userId)
                .runningMode(plyRunningMode)
                .logLevel(LogLevel.values()[logLevel])
                .build();

        Purchasely.setAppTechnology(PLYAppTechnology.CORDOVA);

        Purchasely.start((isConfigured, error) -> {
            if(isConfigured) {
                callbackContext.success();
            } else {
                callbackContext.error(
                        error != null ? error.getMessage() : "Purchasely SDK not configured"
                );
            }
            return null;
        });
    }

    private ArrayList<Store> getStoresInstances(List<String> stores) {
        ArrayList<Store> result = new ArrayList<>();
        if (stores.contains("Google") && Package.getPackage("io.purchasely.google") != null) {
            try {
                result.add((Store) Class.forName("io.purchasely.google.GoogleStore").newInstance());
            } catch (Exception e) {
                Log.e("Purchasely", "Google Store not found :" + e.getMessage(), e);
            }
        }
        if (stores.contains("Huawei") && Package.getPackage("io.purchasely.huawei") != null) {
            try {
                result.add((Store) Class.forName("io.purchasely.huawei.HuaweiStore").newInstance());
            } catch (Exception e) {
                Log.e("Purchasely", "Huawei Store not found :" + e.getMessage(), e);
            }
        }
        if (stores.contains("Amazon") && Package.getPackage("io.purchasely.amazon") != null) {
            try {
                result.add((Store) Class.forName("io.purchasely.amazon.AmazonStore").newInstance());
            } catch (Exception e) {
                Log.e("Purchasely", "Amazon Store not found :" + e.getMessage(), e);
            }
        }

        return result;
    }

    private void close() {
        defaultCallback = null;
        presentationCallback = null;
        processActionListener = null;
        productActivity = null;
        Purchasely.close();
    }

    private void addEventsListener(CallbackContext callbackContext) {
        eventsCallback = callbackContext;

        Purchasely.setEventListener(plyEvent -> {
            if(plyEvent.getProperties() != null) {
                HashMap<String, Object> map = new HashMap<>();
                map.put("name", plyEvent.getName());
                map.put("properties", plyEvent.getProperties().toMap());
                PluginResult pluginResult = new PluginResult(PluginResult.Status.OK, new JSONObject(map));
                pluginResult.setKeepCallback(true);
                if(eventsCallback != null) eventsCallback.sendPluginResult(pluginResult);
            } else {
                HashMap<String, String> map = new HashMap<>();
                map.put("name", plyEvent.getName());
                PluginResult pluginResult = new PluginResult(PluginResult.Status.OK, new JSONObject(map));
                pluginResult.setKeepCallback(true);
                if(eventsCallback != null) eventsCallback.sendPluginResult(pluginResult);
            }
        });
    }

    private void removeEventsListener() {
        eventsCallback = null;
        Purchasely.setEventListener(null);
    }

    private void getAnonymousUserId(CallbackContext callbackContext) {
        callbackContext.success(Purchasely.getAnonymousUserId());
    }

    private void userLogin(String userId, CallbackContext callbackContext) {
        Purchasely.userLogin(userId, refresh -> {
            callbackContext.sendPluginResult(new PluginResult(PluginResult.Status.OK, refresh));
            return null;
        });
    }

    private void userLogout() {
        Purchasely.userLogout();
    }

    private void setLogLevel(int logLevel) {
        Purchasely.setLogLevel(LogLevel.values()[logLevel]);
    }

    private void setLanguage(String language) {
        try {
            Purchasely.setLanguage(new Locale(language));
        } catch (Exception e) {
            Purchasely.setLanguage(Locale.getDefault());
        }
    }

    private void isReadyToPurchase(boolean isReadyToPurchase) {
        Purchasely.setReadyToPurchase(isReadyToPurchase);
    }

    private void setAttribute(int attribute, String value) {
        Purchasely.setAttribute(Attribute.values()[attribute], value);
    }

    private void setDefaultPresentationResultHandler(CallbackContext callbackContext) {
        defaultCallback = callbackContext;
        Purchasely.setDefaultPresentationResultHandler(PurchaselyPlugin::sendPurchaseResult);
    }

    private void purchasedSubscription(CallbackContext callbackContext) {
        Purchasely.setPurchaseListener(state -> {
            if(state instanceof State.PurchaseComplete || state instanceof State.RestorationComplete) {
                PluginResult pluginResult = new PluginResult(PluginResult.Status.OK, "");
                pluginResult.setKeepCallback(true);
                callbackContext.sendPluginResult(pluginResult);
            }
        });
    }

    private void synchronize() {
        Purchasely.synchronize();
    }

    private void presentPresentationWithIdentifier(String presentationVendorId,
                                                    String contentId,
                                                   CallbackContext callbackContext) {
        presentationCallback = callbackContext;
        Intent intent = PLYProductActivity.newIntent(cordova.getActivity());
        intent.putExtra("presentationId", presentationVendorId);
        intent.putExtra("contentId", contentId);
        cordova.getActivity().startActivity(intent);
    }

    private void presentProductWithIdentifier(String productVendorId,
                                              String presentationVendorId,
                                              String contentId,
                                              CallbackContext callbackContext) {
        presentationCallback = callbackContext;
        Intent intent = PLYProductActivity.newIntent(cordova.getActivity());
        intent.putExtra("presentationId", presentationVendorId);
        intent.putExtra("productId", productVendorId);
        intent.putExtra("contentId", contentId);
        cordova.getActivity().startActivity(intent);
    }

    private void presentPlanWithIdentifier(String planVendorId,
                                          String presentationVendorId,
                                          String contentId,
                                          CallbackContext callbackContext) {
        presentationCallback = callbackContext;
        Intent intent = PLYProductActivity.newIntent(cordova.getActivity());
        intent.putExtra("presentationId", presentationVendorId);
        intent.putExtra("planId", planVendorId);
        intent.putExtra("contentId", contentId);
        cordova.getActivity().startActivity(intent);
    }

    private void presentSubscriptions() {
        Intent intent = new Intent(cordova.getContext(), cordova.plugin.purchasely.PLYSubscriptionsActivity.class);
        cordova.getActivity().startActivity(intent);
    }

    private void restoreAllProducts(CallbackContext callbackContext) {
        Purchasely.restoreAllProducts(plyPlan -> {
            callbackContext.success(new JSONObject(transformPlanToMap(plyPlan)));
            return null;
        }, plyError -> {
            callbackContext.error(plyError.getMessage());
            return null;
        });
    }

    private void userSubscriptions(CallbackContext callbackContext) {
        Purchasely.userSubscriptions(new SubscriptionsListener() {
            @Override
            public void onSuccess(@NotNull List<PLYSubscriptionData> list) {
                JSONArray result = new JSONArray();
                for (int i = 0; i < list.size(); i++) {
                    PLYSubscriptionData data = list.get(i);
                    HashMap<String, Object> map = new HashMap<>(data.toMap());
                    map.put("plan", transformPlanToMap(data.getPlan()));
                    map.put("product", data.getProduct().toMap());
                    if(data.getData().getStoreType() == StoreType.GOOGLE_PLAY_STORE) {
                        map.put("subscriptionSource", StoreType.GOOGLE_PLAY_STORE.ordinal());
                    } else if(data.getData().getStoreType() == StoreType.AMAZON_APP_STORE) {
                        map.put("subscriptionSource", StoreType.AMAZON_APP_STORE.ordinal());
                    } else if(data.getData().getStoreType() == StoreType.HUAWEI_APP_GALLERY) {
                        map.put("subscriptionSource", StoreType.HUAWEI_APP_GALLERY.ordinal());
                    } else if(data.getData().getStoreType() == StoreType.APPLE_APP_STORE) {
                        map.put("subscriptionSource", StoreType.APPLE_APP_STORE.ordinal());
                    }
                    result.put(new JSONObject(map));
                }
                callbackContext.success(result);
            }

            @Override
            public void onFailure(@NotNull Throwable throwable) {
                callbackContext.error(throwable.getMessage());
            }
        });
    }

    private void handle(String deeplink, CallbackContext callbackContext) {
        if (deeplink == null) {
            callbackContext.error("Deeplink must not be null");
            return;
        }
        Uri uri = Uri.parse(deeplink);
        callbackContext.sendPluginResult(new PluginResult(PluginResult.Status.OK, Purchasely.handle(uri)));
    }

    private void allProducts(CallbackContext callbackContext) {
        Purchasely.allProducts(new ProductsListener() {
            @Override
            public void onSuccess(@NotNull List<PLYProduct> list) {
                JSONArray result = new JSONArray();
                for (int i = 0; i < list.size(); i++) {
                    result.put(new JSONObject(list.get(i).toMap()));
                }
                callbackContext.success(result);
            }

            @Override
            public void onFailure(@NotNull Throwable throwable) {
                callbackContext.error(throwable.getMessage());
            }
        });
    }

    private void productWithIdentifier(String vendorId, CallbackContext callbackContext) {
        Purchasely.product(vendorId, new ProductListener() {
            @Override
            public void onSuccess(@Nullable PLYProduct plyProduct) {
                if(plyProduct != null) {
                    callbackContext.success(new JSONObject(plyProduct.toMap()));
                } else {
                    callbackContext.error("No product found with " + vendorId);
                }
            }

            @Override
            public void onFailure(@NotNull Throwable throwable) {
                callbackContext.error(throwable.getMessage());
            }
        });
    }

    private void planWithIdentifier(String vendorId, CallbackContext callbackContext) {
        Purchasely.plan(vendorId, new PlanListener() {
            @Override
            public void onSuccess(@Nullable PLYPlan plyPlan) {
                if(plyPlan != null) {
                    callbackContext.success(new JSONObject(transformPlanToMap(plyPlan)));
                } else {
                    callbackContext.error("No plan found with " + vendorId);
                }
            }

            @Override
            public void onFailure(@NotNull Throwable throwable) {
                callbackContext.error(throwable.getMessage());
            }
        });
    }

    private void purchaseWithPlanVendorId(String planVendorId, String contentId, CallbackContext callbackContext) {
        Purchasely.plan(planVendorId, new PlanListener() {
            @Override
            public void onSuccess(@Nullable PLYPlan plyPlan) {
                if(plyPlan != null) {
                    Purchasely.purchase(cordova.getActivity(), plyPlan, contentId, plyPlan1 -> {
                        callbackContext.success(new JSONObject(transformPlanToMap(plyPlan1)));
                        return null;
                    }, plyError -> {
                        callbackContext.error(plyError.getMessage());
                        return null;
                    });
                } else {
                    callbackContext.error("No plan found with " + planVendorId);
                }
            }

            @Override
            public void onFailure(@NotNull Throwable throwable) {
                callbackContext.error(throwable.getMessage());
            }
        });
    }

    private void setPaywallActionInterceptor(CallbackContext callbackContext) {
        Purchasely.setPaywallActionsInterceptor(
                (info, plyPresentationAction, map, plyProcessActionListener) -> {
            processActionListener = plyProcessActionListener;

            HashMap<String, Object> parametersForCordova = new HashMap<>();
            parametersForCordova.put("title", map.getTitle());
            parametersForCordova.put("url", map.getUrl());
            parametersForCordova.put("plan", transformPlanToMap(map.getPlan()));
            parametersForCordova.put("presentation", map.getPresentation());

            HashMap<String, Object> infoMap = new HashMap<>();
            if(info.getContentId() != null) infoMap.put("contentId", info.getContentId());
            if(info.getPresentationId() != null) infoMap.put("presentationId", info.getPresentationId());

            HashMap<String, Object> resultForCordova = new HashMap<>();
            resultForCordova.put("info", infoMap);
            resultForCordova.put("action", plyPresentationAction.getValue());
            resultForCordova.put("parameters", parametersForCordova);

            PluginResult result = new PluginResult(
                    PluginResult.Status.OK,
                    new JSONObject(resultForCordova)
            );
            result.setKeepCallback(true);
            callbackContext.sendPluginResult(result);
        });
    }

    private void closePaywall(CallbackContext callbackContext) {
        Activity purchaselyActivity = productActivity.activity.get();
        Activity activity =  purchaselyActivity != null ? purchaselyActivity : cordova.getActivity();
        Intent intent = new Intent(activity, cordova.getActivity().getClass());
        intent.setFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
        cordova.getActivity().startActivity(intent);
    }

    private void onProcessAction(boolean processAction) {
        if(processActionListener != null) {
            if(productActivity != null) {
                boolean softRelaunched = productActivity.relaunch(cordova);
                if(softRelaunched) {
                    cordova.getActivity().runOnUiThread(() -> processActionListener.processAction(processAction));
                } else {
                    new Thread(() -> {
                        try {
                            Thread.sleep(500);
                        } catch (InterruptedException e) {
                            Log.e("Purchasely", "process action error", e);
                        } finally {
                            cordova.getActivity().runOnUiThread(() -> processActionListener.processAction(processAction));
                        }
                    }).start();
                }

            }
        }
    }

    private static Map<String, Object> transformPlanToMap(PLYPlan plan)  {
        if(plan == null) return new HashMap<>();

        HashMap<String, Object> map = new HashMap<>(plan.toMap());
        if(plan.getType() == DistributionType.CONSUMABLE) {
            map.put("type", DistributionType.CONSUMABLE.ordinal());
        } else if(plan.getType() == DistributionType.CONSUMABLE) {
            map.put("type", DistributionType.NON_CONSUMABLE.ordinal());
        } else if(plan.getType() == DistributionType.NON_CONSUMABLE) {
            map.put("type", DistributionType.RENEWING_SUBSCRIPTION.ordinal());
        } else if(plan.getType() == DistributionType.NON_RENEWING_SUBSCRIPTION) {
            map.put("type", DistributionType.NON_RENEWING_SUBSCRIPTION.ordinal());
        } else if(plan.getType() == DistributionType.UNKNOWN) {
            map.put("type", DistributionType.UNKNOWN.ordinal());
        }
        return map;
    }

    public static class ProductActivity {
        String presentationId = null;
        String productId = null;
        String planId = null;
        String contentId = null;
        WeakReference<PLYProductActivity> activity = null;

        public boolean relaunch(CordovaInterface cordova) {
            PLYProductActivity backgroundActivity = activity.get();
            if(backgroundActivity != null
                && !backgroundActivity.isFinishing()
                && !backgroundActivity.isDestroyed()) {
                Intent intent = new Intent(cordova.getActivity(), PLYProductActivity.class);
                intent.putExtra("presentationId", presentationId);
                intent.putExtra("productId", productId);
                intent.putExtra("planId", planId);
                intent.putExtra("contentId", contentId);
                intent.setFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
                cordova.getActivity().startActivity(intent);
                return true;
            } else {
                Intent intent = PLYProductActivity.newIntent(cordova.getActivity());
                intent.putExtra("presentationId", presentationId);
                intent.putExtra("productId", productId);
                intent.putExtra("planId", planId);
                intent.putExtra("contentId", contentId);
                cordova.getActivity().startActivity(intent);
                return false;
            }
        }
    }
}

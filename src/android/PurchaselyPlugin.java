package cordova.plugin.purchasely;

import android.content.Intent;
import android.net.Uri;
import android.util.Log;

import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.PluginResult;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;

import io.purchasely.billing.Store;
import io.purchasely.ext.Attribute;
import io.purchasely.ext.EventListener;
import io.purchasely.ext.LogLevel;
import io.purchasely.ext.PLYAppTechnology;
import io.purchasely.ext.PLYEvent;
import io.purchasely.ext.PLYProductViewResult;
import io.purchasely.ext.PlanListener;
import io.purchasely.ext.ProductListener;
import io.purchasely.ext.Purchasely;
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

    @Override
    public boolean execute(String action, JSONArray args, CallbackContext callbackContext) throws JSONException {
        switch (action) {
            case "startWithAPIKey":
                startWithAPIKey(
                        args.getString(0),
                        args.getJSONArray(1),
                        args.getString(2),
                        args.getInt(3),
                        args.getBoolean(4),
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
            case "setLogLevel":
                setLogLevel(args.getInt(0));
                break;
            case "setAttribute":
                setAttribute(args.getInt(0), args.getString(1));
                break;
            case "setDefaultPresentationResultHandler":
                setDefaultPresentationResultHandler(callbackContext);
                break;
            case "isReadyToPurchase":
                isReadyToPurchase(args.getBoolean(0));
                break;
            case "synchronize":
                synchronize();
                break;
            case "presentPresentationWithIdentifier":
                presentPresentationWithIdentifier(args.getString(0), callbackContext);
                break;
            case "presentProductWithIdentifier":
                presentProductWithIdentifier(args.getString(0), args.getString(1), callbackContext);
                break;
            case "presentPlanWithIdentifier":
                presentPlanWithIdentifier(args.getString(0), args.getString(1), callbackContext);
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
            case "productWithIdentifier":
                productWithIdentifier(args.getString(0), callbackContext);
                break;
            case "planWithIdentifier":
                planWithIdentifier(args.getString(0), callbackContext);
                break;
            case "purchaseWithPlanVendorId":
                purchaseWithPlanVendorId(args.getString(0), callbackContext);
                break;
            default:
                return false;
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
        map.put("plan", plan != null ? plan.toMap() : "");

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
                                 boolean observerMode,
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

        new Purchasely.Builder(cordova.getContext())
                .apiKey(apiKey)
                .stores(storesInstances)
                .userId(userId)
                .observerMode(observerMode)
                .logLevel(LogLevel.values()[logLevel])
                .build();

        Purchasely.setAppTechnology(PLYAppTechnology.CORDOVA);

        Purchasely.start();

        callbackContext.success();
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
        JSONObject jsonObject = new JSONObject();

        Purchasely.userLogin(userId, refresh -> {
            try {
                jsonObject.put("refresh", refresh);
            } catch (JSONException e) {
                Log.e("Purchasely", "", e);
            }
            callbackContext.success(jsonObject);
            return null;
        });
    }

    private void userLogout() {
        Purchasely.userLogout();
    }

    private void setLogLevel(int logLevel) {
        Purchasely.setLogLevel(LogLevel.values()[logLevel]);
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

    private void synchronize() {
        Purchasely.synchronize();
    }

    private void presentPresentationWithIdentifier(String presentationVendorId,
                                                   CallbackContext callbackContext) {
        presentationCallback = callbackContext;
        Intent intent = new Intent(cordova.getContext(), cordova.plugin.purchasely.PLYProductActivity.class);
        intent.putExtra("presentationId", presentationVendorId);
        cordova.getActivity().startActivity(intent);
    }

    private void presentProductWithIdentifier(String productVendorId,
                                              String presentationVendorId,
                                              CallbackContext callbackContext) {
        presentationCallback = callbackContext;
        Intent intent = new Intent(cordova.getContext(), cordova.plugin.purchasely.PLYProductActivity.class);
        intent.putExtra("presentationId", presentationVendorId);
        intent.putExtra("productId", productVendorId);
        cordova.getActivity().startActivity(intent);
    }

    private void presentPlanWithIdentifier(String planVendorId,
                                          String presentationVendorId,
                                           CallbackContext callbackContext) {
        presentationCallback = callbackContext;
        Intent intent = new Intent(cordova.getContext(), cordova.plugin.purchasely.PLYProductActivity.class);
        intent.putExtra("presentationId", presentationVendorId);
        intent.putExtra("planId", planVendorId);
        cordova.getActivity().startActivity(intent);
    }

    private void presentSubscriptions() {
        Intent intent = new Intent(cordova.getContext(), cordova.plugin.purchasely.PLYSubscriptionsActivity.class);
        cordova.getActivity().startActivity(intent);
    }

    private void restoreAllProducts(CallbackContext callbackContext) {
        Purchasely.restoreAllProducts(plyPlan -> {
            callbackContext.success();
            return null;
        }, plyError -> {
            callbackContext.error(plyError.getMessage());
            return null;
        });
    }

    private void userSubscriptions(CallbackContext callbackContext) {
        Purchasely.getUserSubscriptions(new SubscriptionsListener() {
            @Override
            public void onSuccess(@NotNull List<PLYSubscriptionData> list) {
                JSONArray result = new JSONArray();
                for (int i = 0; i < list.size(); i++) {
                    PLYSubscriptionData data = list.get(i);
                    HashMap<String, Object> map = new HashMap<>(data.toMap());
                    map.put("plan", data.getPlan().toMap());
                    map.put("product", data.getProduct().toMap());
                    if(data.getData().getStoreType() == StoreType.PLAYSTORE) {
                        map.put("subscriptionSource", StoreType.PLAYSTORE.ordinal());
                    } else if(data.getData().getStoreType() == StoreType.AMAZON) {
                        map.put("subscriptionSource", StoreType.AMAZON.ordinal());
                    } else if(data.getData().getStoreType() == StoreType.HUAWEI) {
                        map.put("subscriptionSource", StoreType.HUAWEI.ordinal());
                    } else if(data.getData().getStoreType() == StoreType.APPSTORE) {
                        map.put("subscriptionSource", StoreType.APPSTORE.ordinal());
                    }
                    result.put(map);
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
        boolean handled = Purchasely.handle(uri);
        JSONObject result = new JSONObject();
        try {
            result.put("result", handled);
        } catch (JSONException e) {
            Log.e("Purchasely", "", e);
        }
        callbackContext.success(result);
    }

    private void productWithIdentifier(String vendorId, CallbackContext callbackContext) {
        Purchasely.getProduct(vendorId, new ProductListener() {
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
        Purchasely.getPlan(vendorId, new PlanListener() {
            @Override
            public void onSuccess(@Nullable PLYPlan plyPlan) {
                if(plyPlan != null) {
                    callbackContext.success(new JSONObject(plyPlan.toMap()));
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

    private void purchaseWithPlanVendorId(String planVendorId, CallbackContext callbackContext) {
        Purchasely.getPlan(planVendorId, new PlanListener() {
            @Override
            public void onSuccess(@Nullable PLYPlan plyPlan) {
                if(plyPlan != null) {
                    Purchasely.purchase(cordova.getActivity(), plyPlan, plyPlan1 -> {
                        callbackContext.success(new JSONObject(plyPlan1.toMap()));
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
}
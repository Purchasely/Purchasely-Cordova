package cordova.plugin.purchasely;

import android.os.Bundle;

import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.fragment.app.Fragment;

import java.lang.ref.WeakReference;

import io.purchasely.ext.ProductViewResultListener;
import io.purchasely.ext.Purchasely;

public class PLYProductActivity extends AppCompatActivity {

    @Override
    protected void onCreate(@Nullable @org.jetbrains.annotations.Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        String package_name = getApplication().getPackageName();
        setContentView(getApplication().getResources()
                .getIdentifier("activity_ply_product_activity",
                        "layout",
                        package_name)
        );

        String presentationId = getIntent().getExtras().getString("presentationId");
        String productId = getIntent().getExtras().getString("productId");
        String planId = getIntent().getExtras().getString("planId");
        String contentId = getIntent().getExtras().getString("contentId");

        Fragment fragment;
        if(planId != null && !planId.isEmpty()) {
            fragment = Purchasely.planFragment(planId, presentationId, contentId, listener);
        } else if(productId != null && !productId.isEmpty()) {
            fragment = Purchasely.productFragment(productId, presentationId, contentId, listener);
        } else {
            fragment = Purchasely.presentationFragment(presentationId, contentId, listener);
        }

        getSupportFragmentManager().beginTransaction()
                    .replace(getApplication().getResources()
                    .getIdentifier("fragmentContainer",
                            "id",
                            package_name), fragment)
                    .commit();

        PurchaselyPlugin.ProductActivity productActivity = new PurchaselyPlugin.ProductActivity();
        productActivity.presentationId = presentationId;
        productActivity.productId = productId;
        productActivity.planId = planId;
        productActivity.contentId = contentId;
        productActivity.activity = new WeakReference<>(this);
        PurchaselyPlugin.productActivity = productActivity;
    }

    @Override
    protected void onDestroy() {
        PurchaselyPlugin.productActivity.activity = null;
        super.onDestroy();
    }

    ProductViewResultListener listener = PurchaselyPlugin::sendPurchaseResult;
}

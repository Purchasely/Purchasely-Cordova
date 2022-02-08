package cordova.plugin.purchasely;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;

import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.view.WindowCompat;
import androidx.fragment.app.Fragment;

import java.lang.ref.WeakReference;

import io.purchasely.ext.ProductViewResultListener;
import io.purchasely.ext.Purchasely;

public class PLYProductActivity extends AppCompatActivity {

    @Override
    protected void onCreate(@Nullable @org.jetbrains.annotations.Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        boolean isFullScreen = getIntent().getExtras().getBoolean("isFullScreen");
        if(isFullScreen) {
            WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        }

        String package_name = getApplication().getPackageName();
        setContentView(getApplication().getResources()
                .getIdentifier("activity_ply_product_activity",
                        "layout",
                        package_name)
        );

        String presentationId = getIntent().getExtras().getString("presentationId");
        String placementId = getIntent().getExtras().getString("placementId");
        String productId = getIntent().getExtras().getString("productId");
        String planId = getIntent().getExtras().getString("planId");
        String contentId = getIntent().getExtras().getString("contentId");

        Fragment fragment;
        if(placementId != null && !placementId.isEmpty()) {
            fragment = Purchasely.presentationFragmentForPlacement(placementId, contentId, null, listener);
        } else if(planId != null && !planId.isEmpty()) {
            fragment = Purchasely.planFragment(planId, presentationId, contentId, null, listener);
        } else if(productId != null && !productId.isEmpty()) {
            fragment = Purchasely.productFragment(productId, presentationId, contentId, null, listener);
        } else {
            fragment = Purchasely.presentationFragment(presentationId, contentId, null, listener);
        }

        if(fragment == null) {
            supportFinishAfterTransition();
            return;
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

    static Intent newIntent(Activity activity) {
        Intent intent = new Intent(activity, PLYProductActivity.class);
        //intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_MULTIPLE_TASK);
        return intent;
    }
}

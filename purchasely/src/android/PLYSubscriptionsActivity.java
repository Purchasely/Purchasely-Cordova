package cordova.plugin.purchasely;

import android.os.Bundle;

import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;

import io.purchasely.ext.Purchasely;

public class PLYSubscriptionsActivity extends AppCompatActivity {

    @Override
    protected void onCreate(@Nullable @org.jetbrains.annotations.Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        String package_name = getApplication().getPackageName();
        setContentView(getApplication().getResources()
                .getIdentifier("activity_ply_product_activity",
                        "layout",
                        package_name)
        );

        getSupportFragmentManager()
                .beginTransaction()
                .addToBackStack(null)
                .replace(getApplication().getResources()
                .getIdentifier("fragmentContainer",
                        "id",
                        package_name), Purchasely.subscriptionsFragment(), "SubscriptionsFragment")
                .commitAllowingStateLoss();

        getSupportFragmentManager().addOnBackStackChangedListener(() -> {
            if(getSupportFragmentManager().getBackStackEntryCount() == 0) {
                supportFinishAfterTransition();
            }
        });
    }
}

package cordova.plugin.purchasely

import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.view.View
import android.widget.FrameLayout
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.WindowCompat
import cordova.plugin.purchasely.PurchaselyPlugin.ProductActivity
import io.purchasely.ext.PLYPresentation
import io.purchasely.ext.PLYPresentationViewProperties
import io.purchasely.ext.PLYProductViewResult
import io.purchasely.ext.Purchasely
import io.purchasely.models.PLYPlan
import io.purchasely.views.parseColor
import java.lang.ref.WeakReference

class PLYProductActivity : AppCompatActivity() {

    private var presentationId: String? = null
    private var placementId: String? = null
    private var productId: String? = null
    private var planId: String? = null
    private var contentId: String? = null

    private var presentation: PLYPresentation? = null

    private var isFullScreen: Boolean = false
    private var backgroundColor: String? = null

    private var paywallView: View? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        isFullScreen = intent.extras?.getBoolean("isFullScreen") ?: false
        backgroundColor = intent.extras?.getString("background_color")

        if(isFullScreen) {
            WindowCompat.setDecorFitsSystemWindows(window, false)
        }

        val package_name = application.packageName

        setContentView(
            application.resources
                .getIdentifier(
                    "activity_ply_product_activity",
                    "layout",
                    package_name
                )
        )

        val container = findViewById<View>(
            resources.getIdentifier(
                "container",
                "id",
                package_name
            )
        ) as FrameLayout

        try {
            val loadingBackgroundColor = backgroundColor.parseColor(Color.WHITE)
            container.setBackgroundColor(loadingBackgroundColor)
        } catch (e: Exception) {
            //do nothing
        }

        presentationId = intent.extras?.getString("presentationId")
        placementId = intent.extras?.getString("placementId")
        productId = intent.extras?.getString("productId")
        planId = intent.extras?.getString("planId")
        contentId = intent.extras?.getString("contentId")

        presentation = intent.extras?.getParcelable("presentation")

        paywallView = if(presentation != null) {
            presentation?.buildView(this, viewProperties = PLYPresentationViewProperties(onClose = {
                container.removeAllViews()
                supportFinishAfterTransition()
            }), callback)
        } else {
            Purchasely.presentationView(
                this@PLYProductActivity,
                PLYPresentationViewProperties(
                    placementId = placementId,
                    contentId = contentId,
                    presentationId = presentationId,
                    planId = planId,
                    productId = productId,
                    onLoaded = { isLoaded ->
                        if(!isLoaded) return@PLYPresentationViewProperties

                        val backgroundPaywall = paywallView?.findViewById<FrameLayout>(io.purchasely.R.id.content)?.background
                        if(backgroundPaywall != null) {
                            container.background = backgroundPaywall
                        }
                    },
                    onClose = {
                        container.removeAllViews()
                        supportFinishAfterTransition()
                    }
                ),
                callback
            )
        }

        if(paywallView == null) {
            finish()
            return
        }

        container.addView(paywallView)
    }

    override fun onStart() {
        super.onStart()

        val productActivity = ProductActivity()
        productActivity.presentation = presentation
        productActivity.presentationId = presentationId
        productActivity.placementId = placementId
        productActivity.productId = productId
        productActivity.planId = planId
        productActivity.contentId = contentId
        productActivity.isFullScreen = isFullScreen
        productActivity.loadingBackgroundColor = backgroundColor
        productActivity.activity = WeakReference(this)
        PurchaselyPlugin.productActivity = productActivity
    }

    private val callback: (PLYProductViewResult, PLYPlan?) -> Unit = { result, plan ->
        PurchaselyPlugin.sendPurchaseResult(
            result,
            plan
        )
        //supportFinishAfterTransition()
    }

    companion object {
        @JvmStatic
        fun newIntent(activity: Activity?,
                      properties: PLYPresentationViewProperties = PLYPresentationViewProperties(),
                      isFullScreen: Boolean = false,
                      backgroundColor: String? = null) = Intent(activity, PLYProductActivity::class.java).apply {
            //remove old activity if still referenced to avoid issues
            val oldActivity = PurchaselyPlugin.productActivity?.activity?.get()
            oldActivity?.finish()
            PurchaselyPlugin.productActivity?.activity = null
            PurchaselyPlugin.productActivity = null
            //flags = Intent.FLAG_ACTIVITY_NEW_TASK xor Intent.FLAG_ACTIVITY_MULTIPLE_TASK

            putExtra("background_color", backgroundColor)
            putExtra("isFullScreen", isFullScreen)

            putExtra("presentationId", properties.presentationId)
            putExtra("contentId", properties.contentId)
            putExtra("placementId", properties.placementId)
            putExtra("productId", properties.productId)
            putExtra("planId", properties.planId)
        }
    }

}
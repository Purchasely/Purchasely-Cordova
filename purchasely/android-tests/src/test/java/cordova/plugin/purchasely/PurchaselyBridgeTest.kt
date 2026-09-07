package cordova.plugin.purchasely

import org.apache.cordova.CallbackContext
import org.apache.cordova.PluginResult
import io.purchasely.ext.StoreType
import io.purchasely.models.PLYSubscriptionData
import io.purchasely.models.PLYWebRedemptionContext
import io.purchasely.models.PLYWebRedemptionResult
import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.mockito.kotlin.any
import org.mockito.kotlin.argumentCaptor
import org.mockito.kotlin.mock
import org.mockito.kotlin.never
import org.mockito.kotlin.verify

/**
 * Unit tests for the Android bridge's 6.1.0 surface.
 *
 * These drive the same functions `start()` calls, out of the shipped
 * `../src/android/PurchaselyPlugin.kt`, so they cover the real bridge rather than a copy.
 */
class PurchaselyBridgeTest {

    // region proxy: the three states

    // Both natives treat null as "clear the proxy and return to api.purchasely.io", which
    // is a supported operation and not an error. The bridge therefore has to keep three
    // states apart, plus a fourth case for a value that will not convert.
    //
    // `optString` cannot do this on its own: it renders JSONObject.NULL as the STRING
    // "null", which is exactly how a clear used to be swallowed into the absent branch.

    @Test
    fun `an absent key resolves as Absent, so no native call is made`() {
        val options = JSONObject().put("apiKey", "K")

        assertEquals(PLYProxyOption.Absent, resolveProxyOption(options))
    }

    @Test
    fun `an explicit null resolves as Clear`() {
        // JSONObject.NULL is what a JS null becomes after JSON.stringify crosses the bridge.
        val options = JSONObject().put("proxy", JSONObject.NULL)

        assertEquals(PLYProxyOption.Clear, resolveProxyOption(options))
    }

    @Test
    fun `a url string resolves as Set and carries the value through`() {
        val options = JSONObject().put("proxy", "https://svc.purchasely.io")

        val option = resolveProxyOption(options)

        assertEquals(PLYProxyOption.Set("https://svc.purchasely.io"), option)
        assertEquals("https://svc.purchasely.io", (option as PLYProxyOption.Set).api)
    }

    /**
     * The distinction the whole change exists for, asserted against itself rather than as
     * two expectations that could drift the same way.
     *
     * Collapsing Absent into Clear turns every start into an implicit clear. Collapsing
     * Clear into Absent makes a requested clear silently do nothing, which is the defect
     * this bridge shipped with.
     */
    @Test
    fun `Absent and Clear are different outcomes`() {
        val absent = resolveProxyOption(JSONObject().put("apiKey", "K"))
        val cleared = resolveProxyOption(JSONObject().put("proxy", JSONObject.NULL))

        assertNotEquals(absent, cleared)
        assertEquals(PLYProxyOption.Absent, absent)
        assertEquals(PLYProxyOption.Clear, cleared)
    }

    /**
     * Why the resolver reads `has` and `isNull` rather than `optString`.
     *
     * On Android, `optString` on an explicit null returns the four-character string "null",
     * so an implementation that reads the option through `optString` cannot tell a clear
     * from the literal text and drops it. That exact behaviour is not asserted here,
     * because it differs between `org.json` implementations and this module runs the
     * reference one. What both agree on, and what the resolver actually relies on, is
     * asserted instead.
     */
    @Test
    fun `has and isNull are what separate an absent key, a null and a value`() {
        val cleared = JSONObject().put("proxy", JSONObject.NULL)
        val absent = JSONObject().put("apiKey", "K")
        val set = JSONObject().put("proxy", "https://svc.purchasely.io")

        assertFalse("an absent key has no entry", absent.has("proxy"))
        assertTrue("a null is a PRESENT entry", cleared.has("proxy"))
        assertTrue("and isNull separates it from a value", cleared.isNull("proxy"))
        assertTrue(set.has("proxy"))
        assertFalse(set.isNull("proxy"))

        assertEquals(PLYProxyOption.Absent, resolveProxyOption(absent))
        assertEquals(PLYProxyOption.Clear, resolveProxyOption(cleared))
        assertEquals(PLYProxyOption.Set("https://svc.purchasely.io"), resolveProxyOption(set))
    }

    @Test
    fun `a value that will not convert to a URI resolves as Invalid, never as Clear`() {
        // A bare space is not legal in a URI, so java.net.URI throws for this string.
        val option = resolveProxyOption(JSONObject().put("proxy", "ht tp://nope"))

        assertEquals(PLYProxyOption.Invalid("ht tp://nope"), option)
        assertNotEquals(
            "Invalid must never resolve as Clear: a typo would then disable a proxy the app asked for",
            PLYProxyOption.Clear,
            option
        )
    }

    @Test
    fun `a non-string value resolves as Invalid`() {
        assertTrue(resolveProxyOption(JSONObject().put("proxy", 42)) is PLYProxyOption.Invalid)
        assertTrue(resolveProxyOption(JSONObject().put("proxy", true)) is PLYProxyOption.Invalid)
    }

    /**
     * The bridge deliberately does NOT check the scheme, the host, a query, a fragment or
     * credentials. The native SDK refuses those with an error log and keeps the production
     * host, and it drops a trailing slash. Re-checking here would diverge from that
     * contract, and would also make the two platforms accept different sets of strings.
     */
    @Test
    fun `the bridge does not validate the scheme, the host, a query or a fragment`() {
        assertEquals(
            PLYProxyOption.Set("http://insecure.example"),
            resolveProxyOption(JSONObject().put("proxy", "http://insecure.example"))
        )
        assertEquals(
            PLYProxyOption.Set("https://svc.purchasely.io/?a=b#c"),
            resolveProxyOption(JSONObject().put("proxy", "https://svc.purchasely.io/?a=b#c"))
        )
        assertEquals(
            PLYProxyOption.Set("https://user:pw@svc.purchasely.io"),
            resolveProxyOption(JSONObject().put("proxy", "https://user:pw@svc.purchasely.io"))
        )
    }

    /**
     * A blank string resolves as Invalid, NOT as Absent and NOT as Set.
     *
     * Invalid rather than Set so the two platforms accept the same strings: on iOS
     * `[NSURL URLWithString:@""]` is nil, so its bridge resolves Invalid and never calls
     * native. An earlier version forwarded it on Android and let the SDK refuse it, which
     * made the accepted sets differ.
     *
     * Invalid rather than Absent because the key WAS present: the caller asked for
     * something, it was refused, and that is logged. Absent means "never asked".
     */
    @Test
    fun `a blank string resolves as Invalid, matching the iOS bridge`() {
        assertEquals(PLYProxyOption.Invalid(""), resolveProxyOption(JSONObject().put("proxy", "")))
        assertEquals(PLYProxyOption.Invalid("   "), resolveProxyOption(JSONObject().put("proxy", "   ")))
        // And it must not be mistaken for the two "no proxy" states.
        assertNotEquals(PLYProxyOption.Absent, resolveProxyOption(JSONObject().put("proxy", "")))
        assertNotEquals(PLYProxyOption.Clear, resolveProxyOption(JSONObject().put("proxy", "")))
    }

    // endregion

    // region anonymous user id

    @Test
    fun `parseCanonicalUuid accepts a canonical uuid`() {
        val parsed = parseCanonicalUuid("3f2504e0-4f89-11d3-9a0c-0305e82c3301")

        assertEquals("3f2504e0-4f89-11d3-9a0c-0305e82c3301", parsed?.toString())
    }

    @Test
    fun `parseCanonicalUuid accepts an uppercase uuid and normalises it`() {
        val parsed = parseCanonicalUuid("3F2504E0-4F89-11D3-9A0C-0305E82C3301")

        assertEquals("3f2504e0-4f89-11d3-9a0c-0305e82c3301", parsed?.toString())
    }

    /**
     * The reason the round-trip check exists. `UUID.fromString` is lenient and accepts this
     * short form; the iOS `NSUUID` parser refuses it. Without the check the two platforms
     * would disagree on what "canonical" means, and the same id string would be accepted on
     * Android and refused on iOS.
     *
     * The iOS side of this contract is pinned by
     * `testCanonicalUUIDRefusesTheLenientShortForm` in the Capacitor sample's XCTest target.
     */
    @Test
    fun `parseCanonicalUuid refuses the lenient short form that iOS refuses`() {
        // Proof the leniency is real, so the test is not asserting a tautology.
        assertEquals("00000001-0002-0003-0004-000000000005", java.util.UUID.fromString("1-2-3-4-5").toString())

        assertNull(parseCanonicalUuid("1-2-3-4-5"))
    }

    @Test
    fun `parseCanonicalUuid refuses a value that is not a uuid`() {
        assertNull(parseCanonicalUuid("not-a-uuid"))
        assertNull(parseCanonicalUuid(""))
        assertNull(parseCanonicalUuid("3f2504e0-4f89-11d3-9a0c"))
    }

    @Test
    fun `parseCanonicalUuid returns null for a null value`() {
        assertNull(parseCanonicalUuid(null))
    }

    // endregion

    // region subscription source

    /**
     * The wire value IS the native raw value, and both platforms agree.
     *
     * Verified against the shipped 6.1.0 artifacts: iOS `PLYSubscriptionSource` has
     * `stripe = 4` and `none = 5`, and Android's `StoreType` ordinals match one for one.
     *
     * The bridge used to hardcode 4 for BOTH `NONE` and `WEB_CHECKOUT_STRIPE`, on the
     * stated but false premise that iOS's `None` was 4. So a Web2App subscription reported
     * `none`, and a sourceless one reported Stripe's value. A Web2App redemption grants a
     * subscription from exactly that source, which is how the gap became reachable.
     */
    // These drive subscriptionSourceFor, the function transformSubscriptionToMap calls, so
    // they cover the shipped mapping. An earlier version of this test asserted the
    // StoreType ordinals and a locally re-declared `when` instead, and reintroducing the
    // old collapsing mapping did NOT fail it: it was a tautology about the enum, not a
    // test of the bridge.

    @Test
    fun `the mapping reports the wire value both platforms agree on`() {
        assertEquals(0, subscriptionSourceFor(StoreType.APPLE_APP_STORE))
        assertEquals(1, subscriptionSourceFor(StoreType.GOOGLE_PLAY_STORE))
        assertEquals(2, subscriptionSourceFor(StoreType.AMAZON_APP_STORE))
        assertEquals(3, subscriptionSourceFor(StoreType.HUAWEI_APP_GALLERY))
        assertEquals(
            "Stripe is 4, not `none`",
            4, subscriptionSourceFor(StoreType.WEB_CHECKOUT_STRIPE)
        )
        assertEquals("`none` is 5, not 4", 5, subscriptionSourceFor(StoreType.NONE))
    }

    /**
     * Web checkout must not collapse into `none`, and `none` must not take Stripe's value.
     * Asserted against each other, because either alone passes while the two are swapped.
     */
    @Test
    fun `web checkout and none map to distinct wire values`() {
        assertNotEquals(
            subscriptionSourceFor(StoreType.WEB_CHECKOUT_STRIPE),
            subscriptionSourceFor(StoreType.NONE)
        )
    }

    /**
     * Every native store type maps to its own value, with no duplicate and no gap. This is
     * what an `else -> null` branch destroyed: two different sources produced one wire
     * value, and nothing noticed.
     */
    @Test
    fun `every StoreType maps to a distinct value, and none of them collapse`() {
        val mapped = StoreType.entries.map { subscriptionSourceFor(it) }

        assertEquals("no store type may map to null", 0, mapped.count { it == null })
        assertEquals("no two store types may share a wire value", mapped.size, mapped.toSet().size)
        assertEquals(setOf(0, 1, 2, 3, 4, 5), mapped.toSet())
        // The ordinal is the contract, so the mapping must be identity over it.
        for (storeType in StoreType.entries) {
            assertEquals(storeType.ordinal, subscriptionSourceFor(storeType))
        }
    }

    @Test
    fun `a null store type maps to null`() {
        assertNull(subscriptionSourceFor(null))
    }

    // endregion

    // region teardown: no stale callback contexts

    /**
     * The callbacks live on the companion object, so they are STATIC and outlive both the
     * plugin instance and the WebView. Neither teardown path cleared them, which leaked the
     * dead CordovaWebView through each stale context and sent post-teardown events into a
     * dead bridge.
     *
     * `onDestroy` is the activity teardown; `onReset` is a WebView navigation, which
     * invalidates every callbackId the previous page handed over.
     */
    @Test
    fun `onDestroy clears every stored callback context`() {
        val plugin = PurchaselyPlugin()
        seedEveryCallbackContext()

        plugin.onDestroy()

        assertEveryCallbackContextCleared()
    }

    @Test
    fun `onReset clears every stored callback context`() {
        val plugin = PurchaselyPlugin()
        seedEveryCallbackContext()

        plugin.onReset()

        assertEveryCallbackContextCleared()
    }

    /**
     * The redemption handle is the one that matters most: `webRedemptionListener` is fixed
     * on the builder at `start()` and `start()` cannot run twice, so the SDK keeps calling
     * the first instance's lambda for the whole process lifetime. That lambda reads the
     * static handle at fire time, so a reloaded page can re-register; this asserts the
     * handle is genuinely gone in between rather than pointing at the dead page.
     */
    @Test
    fun `the redemption handle specifically does not survive a teardown`() {
        PurchaselyPlugin.webRedemptionCallback = mock()
        assertNotNull(PurchaselyPlugin.webRedemptionCallback)

        PurchaselyPlugin().onReset()

        assertNull(
            "a surviving handle sends the next redemption outcome into a dead bridge",
            PurchaselyPlugin.webRedemptionCallback
        )
    }

    /**
     * Replacing a listener must CLOSE the stream it replaces.
     *
     * A listener registered with `exec(success, error, ...)` owns an entry in
     * `cordova.callbacks`, and every result the bridge sends carries `keepCallback = true`
     * so the stream stays open. Dropping the native reference alone leaks the JS closure and
     * whatever component state it captured, until the WebView reloads.
     *
     * A NO_RESULT with `keepCallback = false` is cordova.js's own documented way out: it
     * "is used to remove a callback from the list without calling the callbacks".
     */
    @Test
    fun `re-registering the redemption listener closes the stream it replaces`() {
        val first = mock<CallbackContext>()
        val second = mock<CallbackContext>()
        val plugin = PurchaselyPlugin()

        plugin.dispatch("addWebRedemptionListener", first)
        plugin.dispatch("addWebRedemptionListener", second)

        val terminal = argumentCaptor<PluginResult>()
        verify(first).sendPluginResult(terminal.capture())
        assertEquals(PluginResult.Status.NO_RESULT.ordinal, terminal.firstValue.status)
        assertFalse("the stream must be closed, not kept", terminal.firstValue.keepCallback)
        // The replacement is the live one and must not have been closed.
        verify(second, never()).sendPluginResult(any())
        assertEquals(second, PurchaselyPlugin.webRedemptionCallback)
    }

    @Test
    fun `removing the redemption listener closes its stream and acknowledges the command`() {
        val listener = mock<CallbackContext>()
        val remove = mock<CallbackContext>()
        val plugin = PurchaselyPlugin()

        plugin.dispatch("addWebRedemptionListener", listener)
        plugin.dispatch("removeWebRedemptionListener", remove)

        val terminal = argumentCaptor<PluginResult>()
        verify(listener).sendPluginResult(terminal.capture())
        assertEquals(PluginResult.Status.NO_RESULT.ordinal, terminal.firstValue.status)
        assertFalse(terminal.firstValue.keepCallback)
        assertNull(PurchaselyPlugin.webRedemptionCallback)
        // The remove action must answer, or ITS OWN callbackId leaks the same way.
        verify(remove).success()
    }

    /** Nothing registered means nothing to close, and no crash. */
    @Test
    fun `removing with no listener registered still acknowledges`() {
        val remove = mock<CallbackContext>()
        PurchaselyPlugin.webRedemptionCallback = null

        PurchaselyPlugin().dispatch("removeWebRedemptionListener", remove)

        verify(remove).success()
        assertNull(PurchaselyPlugin.webRedemptionCallback)
    }

    /** Drives the real `execute` dispatch, so a renamed action fails the test. */
    private fun PurchaselyPlugin.dispatch(action: String, callback: CallbackContext) {
        assertTrue("$action must be handled by execute()", execute(action, JSONArray(), callback))
    }

    private fun seedEveryCallbackContext() {
        PurchaselyPlugin.defaultCallback = mock()
        PurchaselyPlugin.eventsCallback = mock()
        PurchaselyPlugin.attributesCallback = mock()
        PurchaselyPlugin.webRedemptionCallback = mock()
    }

    private fun assertEveryCallbackContextCleared() {
        assertNull(PurchaselyPlugin.defaultCallback)
        assertNull(PurchaselyPlugin.eventsCallback)
        assertNull(PurchaselyPlugin.attributesCallback)
        assertNull(PurchaselyPlugin.webRedemptionCallback)
    }

    // endregion

    // region web redemption result

    // The sealed Kotlin result and the flat iOS PLYWebRedemptionResult both map to the same
    // five keys, so one JS listener drives both platforms.

    /** Stands in for the plugin's subscription mapper, so these tests need no SDK models. */
    private val fakeSubscriptionMapper: (PLYSubscriptionData) -> Map<String, Any?> =
        { mapOf("plan" to mapOf("vendorId" to "monthly")) }

    @Test
    fun `a success that describes nothing reports the full five-key shape`() {
        val json = webRedemptionResultToJson(
            PLYWebRedemptionResult.Success(null, false),
            fakeSubscriptionMapper
        )

        assertEquals(true, json.getBoolean("isSuccess"))
        assertTrue(json.isNull("context"))
        assertEquals(false, json.getBoolean("replay"))
        assertTrue(json.isNull("errorCode"))
        assertTrue(json.isNull("errorMessage"))
        // The shape must never vary between branches, so every key is always PRESENT, and
        // a null is JSON null rather than a missing key that JS would read as undefined.
        assertEquals(
            setOf("isSuccess", "context", "replay", "errorCode", "errorMessage"),
            json.keys().asSequence().toSet()
        )
    }

    /**
     * Both levels are nullable and must not be flattened into one. A present context can
     * still hold a null subscription: the receipt validated and entitlements refreshed, but
     * the response carried no subscription or the products behind it are not loaded yet.
     * Both remain a success.
     */
    @Test
    fun `a present context with a null subscription stays a present context`() {
        val json = webRedemptionResultToJson(
            PLYWebRedemptionResult.Success(PLYWebRedemptionContext(null), false),
            fakeSubscriptionMapper
        )

        assertEquals(true, json.getBoolean("isSuccess"))
        val context = json.getJSONObject("context")
        assertTrue("the subscription key must be present", context.has("subscription"))
        assertTrue("and hold JSON null, not be missing", context.isNull("subscription"))
    }

    @Test
    fun `a present subscription is mapped through the shared subscription mapper`() {
        val subscription = mock<PLYSubscriptionData>()
        val json = webRedemptionResultToJson(
            PLYWebRedemptionResult.Success(PLYWebRedemptionContext(subscription), false),
            fakeSubscriptionMapper
        )

        val mapped = json.getJSONObject("context").getJSONObject("subscription")
        assertEquals("monthly", mapped.getJSONObject("plan").getString("vendorId"))
    }

    @Test
    fun `a replayed token is reported`() {
        val json = webRedemptionResultToJson(
            PLYWebRedemptionResult.Success(null, true),
            fakeSubscriptionMapper
        )

        assertEquals(true, json.getBoolean("isSuccess"))
        assertEquals(true, json.getBoolean("replay"))
    }

    @Test
    fun `a failure keeps the JS shape stable`() {
        val json = webRedemptionResultToJson(
            PLYWebRedemptionResult.Failure("EXPIRED_REDEMPTION_TOKEN", "Redemption link has expired."),
            fakeSubscriptionMapper
        )

        assertEquals(false, json.getBoolean("isSuccess"))
        assertTrue(json.isNull("context"))
        // A failure still reports replay, so the shape never changes between branches.
        assertEquals(false, json.getBoolean("replay"))
        assertEquals("EXPIRED_REDEMPTION_TOKEN", json.getString("errorCode"))
        assertEquals("Redemption link has expired.", json.getString("errorMessage"))
        assertEquals(
            setOf("isSuccess", "context", "replay", "errorCode", "errorMessage"),
            json.keys().asSequence().toSet()
        )
    }

    /** A transport or parsing failure never reached the server, so it carries no code. */
    @Test
    fun `a failure with no error code is accepted`() {
        val json = webRedemptionResultToJson(
            PLYWebRedemptionResult.Failure(null, "Network error"),
            fakeSubscriptionMapper
        )

        assertEquals(false, json.getBoolean("isSuccess"))
        assertTrue("errorCode must be present and JSON null", json.has("errorCode"))
        assertTrue(json.isNull("errorCode"))
        assertEquals("Network error", json.getString("errorMessage"))
    }

    /**
     * A null must reach JS as `null`, never as a missing key that reads as `undefined`.
     *
     * This is why the bridge puts `JSONObject.NULL` explicitly instead of handing back a
     * `Map` for the caller to wrap: `JSONObject(Map)` disagrees across implementations on
     * a null value. Android's wraps it and keeps the key; the reference `org.json` DROPS
     * the entry. This module runs the reference one, so this test would fail against the
     * Map-wrapping version, which is what makes it worth having.
     */
    @Test
    fun `every null is JSON null on the wire, not a dropped key`() {
        val wire = webRedemptionResultToJson(
            PLYWebRedemptionResult.Success(null, false),
            fakeSubscriptionMapper
        )

        for (key in listOf("context", "errorCode", "errorMessage")) {
            assertTrue("$key must be present on the wire", wire.has(key))
            assertTrue("$key must be JSON null", wire.isNull(key))
        }
        assertEquals(true, wire.getBoolean("isSuccess"))
        assertFalse(wire.getBoolean("replay"))

        // And the serialised form the WebView receives carries them as nulls.
        assertTrue(wire.toString().contains("\"errorCode\":null"))
    }

    // endregion
}

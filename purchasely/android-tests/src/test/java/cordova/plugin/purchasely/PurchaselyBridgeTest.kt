package cordova.plugin.purchasely

import io.purchasely.models.PLYSubscriptionData
import io.purchasely.models.PLYWebRedemptionContext
import io.purchasely.models.PLYWebRedemptionResult
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.mockito.kotlin.mock

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
     * An empty string must reach native rather than collapse into Absent, so both bridges
     * hand the same value to the SDK and the SDK refuses it the same way. The earlier
     * implementation dropped it with a `length > 0` guard on iOS and a null-mapping helper
     * on Android, which made the two platforms disagree.
     */
    @Test
    fun `an empty string is forwarded, so native refuses it rather than the bridge`() {
        assertEquals(
            PLYProxyOption.Set(""),
            resolveProxyOption(JSONObject().put("proxy", ""))
        )
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

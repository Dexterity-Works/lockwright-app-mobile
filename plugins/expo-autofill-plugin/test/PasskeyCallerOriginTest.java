package com.pears.pass.autofill.utils;

import java.nio.charset.StandardCharsets;

/**
 * Real check: a passkey response is bound to the app that asked for it.
 * Only a privileged browser may hand us a clientDataHash, because that hash
 * fixes the origin. Any other app gets android:apk-key-hash:<its signing
 * cert>, and its hash is ignored.
 */
public final class PasskeyCallerOriginTest {
    private static int failures = 0;

    public static void main(String[] args) {
        privilegedBrowserHashIsHonoured();
        privilegedBrowserWithoutHashGetsItsOrigin();
        nativeAppHashIsIgnored();
        unknownCallerIsRefused();
        apkKeyHashIsBase64UrlOfSha256();
        allowlistFingerprintsAreWellFormed();

        if (failures > 0) {
            System.err.println(failures + " PasskeyCallerOrigin checks failed");
            System.exit(1);
        }
        System.out.println("ok");
    }

    private static void privilegedBrowserHashIsHonoured() {
        byte[] hash = bytes("browser-hash");
        PasskeyCallerOrigin.Plan plan = PasskeyCallerOrigin.plan("https://victim.com", hash, bytes("cert"));
        expect("browser hash is signed", plan.clientDataHash, hash);
        expect("browser origin is kept", plan.origin, "https://victim.com");
    }

    private static void privilegedBrowserWithoutHashGetsItsOrigin() {
        PasskeyCallerOrigin.Plan plan = PasskeyCallerOrigin.plan("https://victim.com", null, bytes("cert"));
        expect("no hash to sign", plan.clientDataHash, null);
        expect("clientDataJSON carries the browser origin", plan.origin, "https://victim.com");
    }

    /** The attack: a plain app sends the hash of a clientDataJSON that claims https://victim.com. */
    private static void nativeAppHashIsIgnored() {
        PasskeyCallerOrigin.Plan plan = PasskeyCallerOrigin.plan(null, bytes("forged-hash"), bytes("abc"));
        expect("caller hash is dropped", plan.clientDataHash, null);
        expect("origin is the caller's apk key hash", plan.origin,
                "android:apk-key-hash:ungWv48Bz-pBQUDeXa4iI7ADYaOWF3qctBD_YfIAFa0");
    }

    private static void unknownCallerIsRefused() {
        expect("no cert, no plan", PasskeyCallerOrigin.plan(null, bytes("hash"), null), null);
        expect("empty cert, no plan", PasskeyCallerOrigin.plan(null, null, new byte[0]), null);
    }

    /** SHA-256("abc") = ba7816bf...15ad, base64url without padding. */
    private static void apkKeyHashIsBase64UrlOfSha256() {
        expect("known vector", PasskeyCallerOrigin.apkKeyHashOrigin(bytes("abc")),
                "android:apk-key-hash:ungWv48Bz-pBQUDeXa4iI7ADYaOWF3qctBD_YfIAFa0");
    }

    private static void allowlistFingerprintsAreWellFormed() {
        String json = PrivilegedBrowsers.ALLOWLIST_JSON;
        expect("chrome listed", json.contains("\"com.android.chrome\""), true);
        expect("firefox listed", json.contains("\"org.mozilla.firefox\""), true);
        java.util.regex.Matcher m = java.util.regex.Pattern
                .compile("\"cert_fingerprint_sha256\":\\s*\"([^\"]*)\"").matcher(json);
        int count = 0;
        while (m.find()) {
            count++;
            expect("fingerprint " + m.group(1),
                    m.group(1).matches("([0-9A-F]{2}:){31}[0-9A-F]{2}"), true);
        }
        expect("has fingerprints", count > 0, true);
    }

    private static byte[] bytes(String s) {
        return s.getBytes(StandardCharsets.UTF_8);
    }

    private static void expect(String name, Object actual, Object wanted) {
        boolean ok = actual instanceof byte[] && wanted instanceof byte[]
                ? java.util.Arrays.equals((byte[]) actual, (byte[]) wanted)
                : actual == null ? wanted == null : actual.equals(wanted);
        if (!ok) {
            failures++;
            System.err.println("FAIL " + name + ": wanted " + wanted + " got " + actual);
        }
    }
}

package com.pears.pass.autofill.utils;

import java.security.MessageDigest;
import java.util.Base64;

/**
 * Which origin a passkey response is bound to, decided by who asked for it.
 *
 * A privileged browser vouches for a web origin and hands over the hash of
 * its own clientDataJSON; that hash is signed as-is. Any other app gets the
 * origin the FIDO Android spec assigns it, android:apk-key-hash:<sha256 of
 * its signing cert>, and its clientDataHash is ignored: honouring it would
 * let the app choose the origin, and with it the site it signs in to.
 * The RP checks the key hash against its own assetlinks.json.
 */
public final class PasskeyCallerOrigin {
    public static final String APK_KEY_HASH_PREFIX = "android:apk-key-hash:";

    public static final class Plan {
        /** Caller-supplied hash to sign, or null when clientDataJSON is ours to build. */
        public final byte[] clientDataHash;
        /** Origin for clientDataJSON when we build it. */
        public final String origin;

        Plan(byte[] clientDataHash, String origin) {
            this.clientDataHash = clientDataHash;
            this.origin = origin;
        }
    }

    private PasskeyCallerOrigin() {}

    /**
     * @param browserOrigin origin from CallingAppInfo.getOrigin(allowlist); null unless
     *                      the caller is a privileged browser
     * @param callerHash    the request's clientDataHash, may be null
     * @param signerCert    DER of the caller's first APK signing cert; null when unknown
     * @return the plan, or null when the caller cannot be identified and must be refused
     */
    public static Plan plan(String browserOrigin, byte[] callerHash, byte[] signerCert) {
        if (browserOrigin != null) {
            return new Plan(callerHash, browserOrigin);
        }
        if (signerCert == null || signerCert.length == 0) {
            return null;
        }
        return new Plan(null, apkKeyHashOrigin(signerCert));
    }

    /** android:apk-key-hash:base64url(SHA-256(cert)), no padding. */
    public static String apkKeyHashOrigin(byte[] signerCert) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(signerCert);
            return APK_KEY_HASH_PREFIX + Base64.getUrlEncoder().withoutPadding().encodeToString(digest);
        } catch (java.security.NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 missing", e);
        }
    }
}

package com.pears.pass.autofill.utils;

import java.security.MessageDigest;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Does the site vouch for the app asking for its passkeys? A plain app
 * (no browser origin) is only shown a site's passkeys when
 * https://rpId/.well-known/assetlinks.json names its package and signing
 * cert under get_login_creds or handle_all_urls. Verdicts from a fetched
 * file are cached per rpId and package for a day; a fetch that fails
 * denies (fail closed) and is retried after a minute.
 */
public final class AssetLinksVerifier {
    public interface Fetcher {
        /** @return the statements array as plain lists and maps; throws when the file cannot be read */
        List<Map<String, Object>> fetch(String url) throws Exception;
    }

    public static final long CACHE_TTL_MS = 24 * 60 * 60 * 1000L;
    public static final long FAILURE_TTL_MS = 60 * 1000L;
    static final String NAMESPACE = "android_app";
    static final List<String> RELATIONS = Arrays.asList(
            "delegate_permission/common.get_login_creds",
            "delegate_permission/common.handle_all_urls");

    private static final class Verdict {
        final boolean allowed;
        final long untilMs;

        Verdict(boolean allowed, long untilMs) {
            this.allowed = allowed;
            this.untilMs = untilMs;
        }
    }

    private final Fetcher fetcher;
    private final Map<String, Verdict> cache = new HashMap<>();

    public AssetLinksVerifier(Fetcher fetcher) {
        this.fetcher = fetcher;
    }

    /** The Digital Asset Links URL, or null when rpId is not a bare host name. */
    public static String url(String rpId) {
        if (rpId == null || !rpId.matches("[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?")) {
            return null;
        }
        return "https://" + rpId + "/.well-known/assetlinks.json";
    }

    /** SHA-256 of a signing cert in assetlinks form: upper-case hex, colon separated. */
    public static String fingerprint(byte[] cert) {
        if (cert == null || cert.length == 0) return null;
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(cert);
            StringBuilder out = new StringBuilder(digest.length * 3);
            for (int i = 0; i < digest.length; i++) {
                if (i > 0) out.append(':');
                out.append(String.format(Locale.ROOT, "%02X", digest[i]));
            }
            return out.toString();
        } catch (java.security.NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 missing", e);
        }
    }

    /** One statement naming this package and cert under a login relation. */
    public static boolean vouches(List<Map<String, Object>> statements, String packageName, String fingerprint) {
        if (statements == null || packageName == null || fingerprint == null) return false;
        for (Map<String, Object> statement : statements) {
            if (statement == null) continue;
            if (!hasLoginRelation(statement.get("relation"))) continue;
            Object targetObj = statement.get("target");
            if (!(targetObj instanceof Map)) continue;
            Map<?, ?> target = (Map<?, ?>) targetObj;
            if (!NAMESPACE.equals(target.get("namespace"))) continue;
            if (!packageName.equals(target.get("package_name"))) continue;
            Object prints = target.get("sha256_cert_fingerprints");
            if (!(prints instanceof List)) continue;
            for (Object print : (List<?>) prints) {
                if (print instanceof String && fingerprint.equalsIgnoreCase(((String) print).trim())) {
                    return true;
                }
            }
        }
        return false;
    }

    private static boolean hasLoginRelation(Object relation) {
        if (!(relation instanceof List)) return false;
        for (Object r : (List<?>) relation) {
            if (RELATIONS.contains(r)) return true;
        }
        return false;
    }

    public synchronized boolean allows(String rpId, String packageName, String fingerprint, long nowMs) {
        String url = url(rpId);
        if (url == null || packageName == null || packageName.isEmpty() || fingerprint == null) {
            return false;
        }
        String key = rpId + "|" + packageName;
        Verdict cached = cache.get(key);
        if (cached != null && nowMs < cached.untilMs) {
            return cached.allowed;
        }
        boolean allowed;
        long ttl;
        try {
            allowed = vouches(fetcher.fetch(url), packageName, fingerprint);
            ttl = CACHE_TTL_MS;
        } catch (Exception e) {
            // Fail closed; the fetcher logs why at debug.
            allowed = false;
            ttl = FAILURE_TTL_MS;
        }
        cache.put(key, new Verdict(allowed, nowMs + ttl));
        return allowed;
    }
}

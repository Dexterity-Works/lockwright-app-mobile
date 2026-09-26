package com.pears.pass.autofill.utils;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Real check: a plain app only sees a site's passkeys when the site's
 * assetlinks.json names that app's package and signing cert. No file, a
 * failed fetch, or a wrong app all mean nothing is listed.
 */
public final class AssetLinksVerifierTest {
    private static int failures = 0;
    private static final String PKG = "com.example.bank";
    private static final String FP = "AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99";
    private static final long HOUR = 60 * 60 * 1000L;

    /** Fake fetcher: serves a fixed file, or throws, and counts calls. */
    private static final class Fake implements AssetLinksVerifier.Fetcher {
        List<Map<String, Object>> statements;
        boolean fail;
        int calls;
        String lastUrl;

        @Override
        public List<Map<String, Object>> fetch(String url) throws Exception {
            calls++;
            lastUrl = url;
            if (fail) throw new java.io.IOException("offline");
            return statements;
        }
    }

    public static void main(String[] args) {
        vouchedAppIsAllowed();
        wrongPackageOrCertIsDenied();
        otherRelationOrNamespaceIsDenied();
        fetchFailureDeniesAndRetriesSoon();
        verdictIsCachedPerRpAndPackage();
        badRpIdNeverFetches();
        fingerprintIsColonHex();

        if (failures > 0) {
            System.err.println(failures + " AssetLinksVerifier checks failed");
            System.exit(1);
        }
        System.out.println("ok");
    }

    private static void vouchedAppIsAllowed() {
        Fake fake = new Fake();
        fake.statements = file(statement("delegate_permission/common.get_login_creds", "android_app", PKG, FP));
        AssetLinksVerifier v = new AssetLinksVerifier(fake);
        expect("vouched app allowed", v.allows("bank.example", PKG, FP, 0), true);
        expect("fetched the site's file", fake.lastUrl, "https://bank.example/.well-known/assetlinks.json");

        Fake lower = new Fake();
        lower.statements = file(statement("delegate_permission/common.handle_all_urls", "android_app", PKG, FP.toLowerCase()));
        expect("handle_all_urls and lower-case hex also vouch",
                new AssetLinksVerifier(lower).allows("bank.example", PKG, FP, 0), true);
    }

    private static void wrongPackageOrCertIsDenied() {
        Fake fake = new Fake();
        fake.statements = file(statement("delegate_permission/common.get_login_creds", "android_app", PKG, FP));
        AssetLinksVerifier v = new AssetLinksVerifier(fake);
        expect("other package denied", v.allows("bank.example", "com.evil.app", FP, 0), false);
        expect("other cert denied", v.allows("bank.example", PKG, FP.replace("AA:BB", "00:00"), 0), false);
        Fake empty = new Fake();
        empty.statements = new ArrayList<>();
        expect("empty file denied", new AssetLinksVerifier(empty).allows("bank.example", PKG, FP, 0), false);
    }

    private static void otherRelationOrNamespaceIsDenied() {
        Fake fake = new Fake();
        fake.statements = file(
                statement("delegate_permission/common.share_location", "android_app", PKG, FP),
                statement("delegate_permission/common.get_login_creds", "web", PKG, FP));
        expect("share_location or web namespace do not vouch",
                new AssetLinksVerifier(fake).allows("bank.example", PKG, FP, 0), false);
    }

    /** Fail closed, but do not remember an outage for a day. */
    private static void fetchFailureDeniesAndRetriesSoon() {
        Fake fake = new Fake();
        fake.fail = true;
        AssetLinksVerifier v = new AssetLinksVerifier(fake);
        expect("offline denies", v.allows("bank.example", PKG, FP, 0), false);
        expect("offline verdict held briefly", v.allows("bank.example", PKG, FP, 1000), false);
        expect("no refetch inside failure ttl", fake.calls, 1);
        fake.fail = false;
        fake.statements = file(statement("delegate_permission/common.get_login_creds", "android_app", PKG, FP));
        expect("retried after the failure ttl",
                v.allows("bank.example", PKG, FP, AssetLinksVerifier.FAILURE_TTL_MS), true);
        expect("refetched", fake.calls, 2);
    }

    private static void verdictIsCachedPerRpAndPackage() {
        Fake fake = new Fake();
        fake.statements = file(statement("delegate_permission/common.get_login_creds", "android_app", PKG, FP));
        AssetLinksVerifier v = new AssetLinksVerifier(fake);
        v.allows("bank.example", PKG, FP, 0);
        v.allows("bank.example", PKG, FP, 23 * HOUR);
        expect("one fetch within a day", fake.calls, 1);
        v.allows("bank.example", "com.other.app", FP, 0);
        expect("another package fetches on its own", fake.calls, 2);
        v.allows("bank.example", PKG, FP, 25 * HOUR);
        expect("refetched after a day", fake.calls, 3);
    }

    private static void badRpIdNeverFetches() {
        Fake fake = new Fake();
        AssetLinksVerifier v = new AssetLinksVerifier(fake);
        expect("path in rpId denied", v.allows("bank.example/evil", PKG, FP, 0), false);
        expect("empty rpId denied", v.allows("", PKG, FP, 0), false);
        expect("null rpId denied", v.allows(null, PKG, FP, 0), false);
        expect("no fetch for a bad rpId", fake.calls, 0);
        expect("url is https well-known", AssetLinksVerifier.url("Bank.example"),
                "https://Bank.example/.well-known/assetlinks.json");
        expect("url refuses a userinfo trick", AssetLinksVerifier.url("bank.example@evil.example"), null);
    }

    /** SHA-256("abc") = BA7816BF...F20015AD. */
    private static void fingerprintIsColonHex() {
        expect("known vector", AssetLinksVerifier.fingerprint("abc".getBytes(StandardCharsets.UTF_8)),
                "BA:78:16:BF:8F:01:CF:EA:41:41:40:DE:5D:AE:22:23:B0:03:61:A3:96:17:7A:9C:B4:10:FF:61:F2:00:15:AD");
        expect("empty cert has none", AssetLinksVerifier.fingerprint(new byte[0]), null);
    }

    @SafeVarargs
    private static List<Map<String, Object>> file(Map<String, Object>... statements) {
        return new ArrayList<>(Arrays.asList(statements));
    }

    private static Map<String, Object> statement(String relation, String namespace, String pkg, String print) {
        Map<String, Object> target = new HashMap<>();
        target.put("namespace", namespace);
        target.put("package_name", pkg);
        target.put("sha256_cert_fingerprints", new ArrayList<>(Arrays.asList(print)));
        Map<String, Object> statement = new HashMap<>();
        statement.put("relation", new ArrayList<>(Arrays.asList(relation)));
        statement.put("target", target);
        return statement;
    }

    private static void expect(String name, Object actual, Object wanted) {
        if (actual == null ? wanted != null : !actual.equals(wanted)) {
            failures++;
            System.err.println("FAIL " + name + ": wanted " + wanted + " got " + actual);
        }
    }
}

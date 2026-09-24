package com.pears.pass.autofill.utils;

import java.net.URI;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Bitwarden-style URI match for vault schema v2.
 * Ports the mobile/extension JS matcher (domain / host / startsWith / exact).
 */
public final class UriMatchHelper {
    /**
     * ponytail: static browser packages. Reverse-DNS of
     * com.vivaldi.browser is vivaldi.com, which hides github.com
     * when the browser omits webDomain. Add a package when a fill
     * from that browser filters to the vendor site.
     */
    private static final Set<String> BROWSER_PACKAGES = new HashSet<>(Arrays.asList(
            "com.android.chrome",
            "com.chrome.beta",
            "com.chrome.dev",
            "com.chrome.canary",
            "com.google.android.apps.chrome",
            "org.mozilla.firefox",
            "org.mozilla.firefox_beta",
            "org.mozilla.focus",
            "org.mozilla.fenix",
            "com.vivaldi.browser",
            "com.vivaldi.browser.snapshot",
            "com.microsoft.emmx",
            "com.opera.browser",
            "com.opera.mini.native",
            "com.brave.browser",
            "com.sec.android.app.sbrowser",
            "com.duckduckgo.mobile.android",
            "org.bromite.bromite",
            "com.kiwibrowser.browser",
            "com.huawei.browser",
            "org.torproject.torbrowser",
            "com.android.browser"
    ));

    public static final String MATCH_DOMAIN = "domain";
    public static final String MATCH_HOST = "host";
    public static final String MATCH_STARTS_WITH = "startsWith";
    public static final String MATCH_EXACT = "exact";
    public static final String VAULT_MATCH_BASE_DOMAIN = "baseDomain";

    private UriMatchHelper() {}

    public static final class UriEntry {
        public final String uri;
        public final String match;

        public UriEntry(String uri, String match) {
            this.uri = uri;
            this.match = match;
        }
    }

    public static List<UriEntry> parseUris(Object urisObj) {
        List<UriEntry> out = new ArrayList<>();
        if (!(urisObj instanceof List)) return out;
        for (Object item : (List<?>) urisObj) {
            if (!(item instanceof Map)) continue;
            Map<?, ?> map = (Map<?, ?>) item;
            Object uri = map.get("uri");
            Object match = map.get("match");
            if (uri instanceof String && !((String) uri).trim().isEmpty()) {
                out.add(new UriEntry(
                        (String) uri,
                        match instanceof String ? (String) match : VAULT_MATCH_BASE_DOMAIN
                ));
            }
        }
        return out;
    }

    public static List<String> parseWebsites(Object websitesObj) {
        List<String> out = new ArrayList<>();
        if (!(websitesObj instanceof List)) return out;
        for (Object w : (List<?>) websitesObj) {
            if (w instanceof String && !((String) w).trim().isEmpty()) {
                out.add((String) w);
            }
        }
        return out;
    }

    public static String fromVaultUriMatch(String vaultMatch) {
        if (VAULT_MATCH_BASE_DOMAIN.equals(vaultMatch)) return MATCH_DOMAIN;
        if (MATCH_DOMAIN.equals(vaultMatch)
                || MATCH_HOST.equals(vaultMatch)
                || MATCH_STARTS_WITH.equals(vaultMatch)
                || MATCH_EXACT.equals(vaultMatch)) {
            return vaultMatch;
        }
        return MATCH_DOMAIN;
    }

    /**
     * Unlock-to-fill search. Title and username miss logins named unlike
     * the page (X vs twitter.com). URI strings are part of the query.
     */
    public static boolean credentialMatchesSearch(
            String title,
            String username,
            List<String> websites,
            List<UriEntry> uris,
            String query
    ) {
        if (query == null || query.trim().isEmpty()) return true;
        String q = query.toLowerCase(Locale.ROOT);
        if (title != null && title.toLowerCase(Locale.ROOT).contains(q)) return true;
        if (username != null && username.toLowerCase(Locale.ROOT).contains(q)) return true;
        String hostLabel = hostLabel(q);
        if (hostLabel != null) {
            if (title != null && title.toLowerCase(Locale.ROOT).contains(hostLabel)) {
                return true;
            }
            if (username != null && username.toLowerCase(Locale.ROOT).contains(hostLabel)) {
                return true;
            }
        }
        for (String website : getRecordWebsiteValues(websites, uris)) {
            if (website == null) continue;
            if (website.toLowerCase(Locale.ROOT).contains(q)) return true;
            String normalized = normalizeUrl(website);
            if (normalized != null && normalized.toLowerCase(Locale.ROOT).contains(q)) {
                return true;
            }
        }
        return false;
    }

    public static String normalizeUrl(String urlString) {
        if (urlString == null) return null;
        String trimmed = urlString.trim();
        if (trimmed.isEmpty()) return null;
        try {
            trimmed = unwrapPrefixedAppUri(trimmed);
            String withProtocol = trimmed.matches("(?i)^[a-z][a-z0-9+.-]*://.*")
                    ? trimmed
                    : "https://" + trimmed;
            URI uri = URI.create(withProtocol);
            String protocol = uri.getScheme() == null ? "https" : uri.getScheme().toLowerCase(Locale.ROOT);
            String hostname = uri.getHost() == null ? "" : uri.getHost().toLowerCase(Locale.ROOT);
            if (hostname.isEmpty()) return null;
            int port = uri.getPort();
            String portPart = (port > 0 && port != 80 && port != 443) ? (":" + port) : "";
            String path = uri.getRawPath() == null ? "" : uri.getRawPath();
            if (path.endsWith("/") && path.length() > 1) {
                path = path.substring(0, path.length() - 1);
            }
            if ("/".equals(path)) path = "";
            return protocol + "://" + hostname + portPart + path;
        } catch (Exception e) {
            return null;
        }
    }

    public static List<String> getRecordWebsiteValues(List<String> websites, List<UriEntry> uris) {
        List<String> fromWebsites = new ArrayList<>();
        if (websites != null) {
            for (String website : websites) {
                if (website != null && !website.trim().isEmpty()) {
                    fromWebsites.add(website);
                }
            }
        }
        List<String> fromUris = new ArrayList<>();
        if (uris != null) {
            for (UriEntry entry : uris) {
                if (entry != null && entry.uri != null && !entry.uri.trim().isEmpty()) {
                    fromUris.add(entry.uri);
                }
            }
        }
        if (fromUris.isEmpty()) return fromWebsites;
        if (fromWebsites.isEmpty()) return fromUris;

        Set<String> seen = new LinkedHashSet<>();
        List<String> merged = new ArrayList<>();
        for (String website : fromWebsites) {
            String key = normalizeUrl(website);
            if (key == null) key = website.trim().toLowerCase(Locale.ROOT);
            if (seen.add(key)) merged.add(website);
        }
        for (String website : fromUris) {
            String key = normalizeUrl(website);
            if (key == null) key = website.trim().toLowerCase(Locale.ROOT);
            if (seen.add(key)) merged.add(website);
        }
        return merged;
    }

    public static String resolveMatchType(List<UriEntry> uris, String website) {
        if (uris == null || website == null) return MATCH_DOMAIN;
        String key = normalizeUrl(website);
        if (key == null) key = website.trim().toLowerCase(Locale.ROOT);
        for (UriEntry entry : uris) {
            if (entry == null || entry.uri == null) continue;
            String entryKey = normalizeUrl(entry.uri);
            if (entryKey == null) entryKey = entry.uri.trim().toLowerCase(Locale.ROOT);
            if (key.equals(entryKey)) {
                return fromVaultUriMatch(entry.match);
            }
        }
        return MATCH_DOMAIN;
    }

    public static boolean doesWebsiteMatchPage(String pageUrl, String website, String matchType) {
        if (website == null || website.trim().isEmpty() || pageUrl == null) return false;
        // An app is its exact package. Its host must never meet a website
        // host (package paypal.com) or a longer package (startsWith).
        String pagePackage = androidAppPackage(pageUrl);
        if (pagePackage != null) {
            return pagePackage.equals(androidAppPackage(website));
        }
        if (androidAppPackage(website) == null && matchesPage(pageUrl, website, matchType)) {
            return true;
        }
        String fromApp = httpsUrlFromAndroidApp(website);
        return fromApp != null && matchesPage(pageUrl, fromApp, matchType);
    }

    private static boolean matchesPage(String pageUrl, String website, String matchType) {
        String type = fromVaultUriMatch(matchType);
        switch (type) {
            case MATCH_HOST:
                return matchesHost(pageUrl, website);
            case MATCH_STARTS_WITH:
                return matchesStartsWith(pageUrl, website);
            case MATCH_EXACT:
                return matchesExact(pageUrl, website);
            case MATCH_DOMAIN:
            default:
                return matchesDomain(pageUrl, website);
        }
    }

    public static boolean recordMatchesPage(List<String> websites, List<UriEntry> uris, String pageUrl) {
        if (pageUrl == null || pageUrl.trim().isEmpty()) return false;
        List<String> values = getRecordWebsiteValues(websites, uris);
        for (String website : values) {
            String matchType = resolveMatchType(uris, website);
            if (doesWebsiteMatchPage(pageUrl, website, matchType)) {
                return true;
            }
        }
        return false;
    }

    public static int getUriMatchSpecificityRank(String matchType) {
        String type = fromVaultUriMatch(matchType);
        switch (type) {
            case MATCH_EXACT:
                return 4;
            case MATCH_STARTS_WITH:
                return 3;
            case MATCH_HOST:
                return 2;
            case MATCH_DOMAIN:
                return 1;
            default:
                return 0;
        }
    }

    public static int getRecordSiteMatchRank(List<String> websites, List<UriEntry> uris, String pageUrl) {
        if (!recordMatchesPage(websites, uris, pageUrl)) return 0;
        int best = 0;
        for (String website : getRecordWebsiteValues(websites, uris)) {
            String matchType = resolveMatchType(uris, website);
            if (!doesWebsiteMatchPage(pageUrl, website, matchType)) continue;
            int rank = getUriMatchSpecificityRank(matchType);
            if (rank > best) best = rank;
        }
        return best;
    }

    public static String pageUrlFromWebDomain(String webDomain) {
        if (webDomain == null || webDomain.trim().isEmpty()) return null;
        String trimmed = webDomain.trim();
        if (trimmed.matches("(?i)^[a-z][a-z0-9+.-]*://.*")) return trimmed;
        return "https://" + trimmed;
    }

    public static String pageUrlFromAndroidApp(String packageName) {
        if (packageName == null) return null;
        String trimmed = packageName.trim();
        if (trimmed.isEmpty()) return null;
        if (trimmed.toLowerCase(Locale.ROOT).startsWith("androidapp://")) {
            return trimmed;
        }
        return "androidapp://" + trimmed;
    }

    /**
     * Page URLs to try for an Android fill: the trusted web domain, then
     * the androidapp package URI. No reverse-DNS https guess: any app can
     * be named com.paypal.attacker.
     */
    public static List<String> pageUrlsForAutofill(String webDomain, String packageName) {
        List<String> out = new ArrayList<>();
        Set<String> seen = new LinkedHashSet<>();
        addPageUrl(out, seen, pageUrlFromWebDomain(trustedWebDomain(webDomain, packageName)));
        addPageUrl(out, seen, pageUrlFromAndroidApp(packageName));
        return out;
    }

    /**
     * webDomain is the page only when a known browser reports it. Any other
     * app's WebView can claim paypal.com (loadDataWithBaseURL). A domain
     * with no package is the Credential Manager rpId, not a view tree.
     * ponytail: no Digital Asset Links check yet, so app WebViews never
     * match a website on their own; the user picks the login in the sheet.
     */
    public static String trustedWebDomain(String webDomain, String packageName) {
        if (packageName == null || packageName.trim().isEmpty()) return webDomain;
        return isBrowserPackage(packageName) ? webDomain : null;
    }

    public static int bestRecordSiteMatchRank(
            List<String> websites, List<UriEntry> uris, List<String> pageUrls) {
        int best = 0;
        if (pageUrls == null) return 0;
        for (String pageUrl : pageUrls) {
            int rank = getRecordSiteMatchRank(websites, uris, pageUrl);
            if (rank > best) best = rank;
        }
        return best;
    }

    private static void addPageUrl(List<String> out, Set<String> seen, String pageUrl) {
        if (pageUrl == null || pageUrl.isEmpty()) return;
        if (seen.add(pageUrl)) out.add(pageUrl);
    }

    private static String unwrapPrefixedAppUri(String trimmed) {
        String lower = trimmed.toLowerCase(Locale.ROOT);
        if (lower.startsWith("https://androidapp://")
                || lower.startsWith("http://androidapp://")
                || lower.startsWith("https://iosapp://")
                || lower.startsWith("http://iosapp://")) {
            int schemeEnd = trimmed.indexOf("://");
            return trimmed.substring(schemeEnd + 3);
        }
        return trimmed;
    }

    static String httpsUrlFromAndroidApp(String website) {
        if (website == null) return null;
        String trimmed = unwrapPrefixedAppUri(website.trim());
        String lower = trimmed.toLowerCase(Locale.ROOT);
        if (!lower.startsWith("androidapp://")) return null;
        String pkg = trimmed.substring("androidapp://".length()).trim();
        if (pkg.isEmpty() || isBrowserPackage(pkg)) return null;
        String domain = packageNameToDomain(pkg);
        if (domain == null || domain.isEmpty()) return null;
        return "https://" + domain;
    }

    /** androidapp://com.x → com.x (lowercase), else null. */
    private static String androidAppPackage(String value) {
        if (value == null) return null;
        String trimmed = unwrapPrefixedAppUri(value.trim()).toLowerCase(Locale.ROOT);
        if (!trimmed.startsWith("androidapp://")) return null;
        String pkg = trimmed.substring("androidapp://".length()).trim();
        while (pkg.endsWith("/")) pkg = pkg.substring(0, pkg.length() - 1);
        return pkg.isEmpty() ? null : pkg;
    }

    static boolean isBrowserPackage(String packageName) {
        if (packageName == null) return false;
        String pkg = packageName.trim().toLowerCase(Locale.ROOT);
        if (pkg.startsWith("androidapp://")) {
            pkg = pkg.substring("androidapp://".length());
        }
        return BROWSER_PACKAGES.contains(pkg);
    }

    /** com.twitter.android → twitter.com. Null/short names return as-is. */
    public static String packageNameToDomain(String pkg) {
        if (pkg == null || pkg.isEmpty()) return null;
        String[] parts = pkg.split("\\.");
        if (parts.length < 2) return pkg;
        return parts[1] + "." + parts[0];
    }

    private static boolean matchesDomain(String pageUrl, String website) {
        String pageHost = hostname(pageUrl);
        String recordHost = hostname(website);
        if (pageHost == null || recordHost == null) return false;
        if (pageHost.equals(recordHost)) return true;
        // ponytail: dotted-parent stand-in for eTLD+1. A bare label (com)
        // is never a parent; co.uk still is until a public suffix list lands.
        if (recordHost.contains(".") && pageHost.endsWith("." + recordHost)) return true;
        return pageHost.contains(".") && recordHost.endsWith("." + pageHost);
    }

    private static boolean matchesHost(String pageUrl, String website) {
        String pageHost = hostWithPort(pageUrl);
        String recordHost = hostWithPort(website);
        if (pageHost == null || recordHost == null) return false;
        return pageHost.equals(recordHost);
    }

    private static boolean matchesStartsWith(String pageUrl, String website) {
        String pageNormalized = normalizeUrl(pageUrl);
        String websiteNormalized = normalizeUrl(website);
        if (pageNormalized == null || websiteNormalized == null) return false;
        return pageNormalized.startsWith(websiteNormalized);
    }

    private static boolean matchesExact(String pageUrl, String website) {
        String pageNormalized = normalizeUrl(pageUrl);
        String websiteNormalized = normalizeUrl(website);
        if (pageNormalized == null || websiteNormalized == null) return false;
        return pageNormalized.equals(websiteNormalized);
    }

    /**
     * github.com → github. Lets a login titled GitHub match a typed
     * page host when the URI list missed the site.
     */
    static String hostLabel(String query) {
        if (query == null) return null;
        String q = query.trim().toLowerCase(Locale.ROOT);
        if (q.startsWith("http://") || q.startsWith("https://")) {
            String host = hostname(q);
            if (host == null) return null;
            q = host;
        }
        int slash = q.indexOf('/');
        if (slash != -1) q = q.substring(0, slash);
        if (q.contains(" ") || !q.contains(".")) return null;
        String[] parts = q.split("\\.");
        int i = 0;
        if (parts.length > 2 && "www".equals(parts[0])) i = 1;
        if (i >= parts.length) return null;
        String label = parts[i];
        if (label.length() < 2) return null;
        return label;
    }

    private static String hostname(String value) {
        String normalized = normalizeUrl(value);
        if (normalized == null) return null;
        try {
            String host = URI.create(normalized).getHost();
            return host == null ? null : host.toLowerCase(Locale.ROOT);
        } catch (Exception e) {
            return null;
        }
    }

    private static String hostWithPort(String value) {
        String normalized = normalizeUrl(value);
        if (normalized == null) return null;
        try {
            URI uri = URI.create(normalized);
            String host = uri.getHost();
            if (host == null || host.isEmpty()) return null;
            int port = uri.getPort();
            String portPart = (port > 0 && port != 80 && port != 443) ? (":" + port) : "";
            return host.toLowerCase(Locale.ROOT) + portPart;
        } catch (Exception e) {
            return null;
        }
    }
}

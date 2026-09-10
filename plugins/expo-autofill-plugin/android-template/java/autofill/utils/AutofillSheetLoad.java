package com.pears.pass.autofill.utils;

import java.util.List;

/**
 * Unlock-to-fill sheet load. OTP codes are generated on credential select,
 * not while listing. Search text is read after the host may have gone.
 * The search field shows the page being matched so the user can change it.
 */
public final class AutofillSheetLoad {
    private AutofillSheetLoad() {}

    public static String searchQuery(CharSequence text) {
        return text == null ? "" : text.toString();
    }

    public static boolean isPreselect(String preselectId, String itemId) {
        return preselectId != null && !preselectId.isEmpty() && preselectId.equals(itemId);
    }

    /**
     * Text shown in the sheet search field: the page domain when the
     * browser sent one, else the androidapp URI for a native app.
     * Browsers that omit the page leave this empty so the user can type.
     */
    public static String visibleFillLocation(String webDomain, String packageName) {
        if (webDomain != null && !webDomain.trim().isEmpty()) {
            return webDomain.trim();
        }
        if (packageName == null || packageName.trim().isEmpty()) return "";
        if (UriMatchHelper.isBrowserPackage(packageName)) return "";
        String androidApp = UriMatchHelper.pageUrlFromAndroidApp(packageName);
        return androidApp == null ? "" : androidApp;
    }

    public static boolean matchesFillQuery(
            String title,
            String username,
            List<String> websites,
            List<UriMatchHelper.UriEntry> uris,
            String query,
            String packageName
    ) {
        String q = query == null ? "" : query.trim();
        if (q.isEmpty()) return true;
        List<String> pageUrls = UriMatchHelper.pageUrlsForAutofill(q, packageName);
        if (UriMatchHelper.bestRecordSiteMatchRank(websites, uris, pageUrls) > 0) {
            return true;
        }
        return UriMatchHelper.credentialMatchesSearch(title, username, websites, uris, q);
    }

    /**
     * Prefill of the page in the search field is not a typed query.
     * Treating it as one hides logins titled GitHub when the URI
     * list missed github.com.
     */
    public static boolean filterAsTypedQuery(boolean hasUserSearched, String query) {
        if (!hasUserSearched) return false;
        return query != null && !query.trim().isEmpty();
    }
}

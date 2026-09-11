package com.pears.pass.autofill.utils;

import java.util.List;
import java.util.Map;

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
     * A later text event that repeats the same page still is not.
     */
    public static boolean filterAsTypedQuery(boolean hasUserSearched, String query) {
        return filterAsTypedQuery(hasUserSearched, query, null);
    }

    public static boolean filterAsTypedQuery(
            boolean hasUserSearched, String query, String pageLocation) {
        if (!hasUserSearched) return false;
        String q = query == null ? "" : query.trim();
        if (q.isEmpty()) return false;
        if (pageLocation != null && q.equals(pageLocation.trim())) return false;
        return true;
    }

    /**
     * github.com in the field with 3 GitHub logins in Personal must
     * not become "No matching items". A typed miss still can.
     */
    public static boolean keepVaultWhenPagePrefillMisses(
            String query, String pageLocation, int matchCount, int vaultCount) {
        if (vaultCount <= 0 || matchCount > 0) return false;
        if (pageLocation == null || pageLocation.trim().isEmpty()) return false;
        String q = query == null ? "" : query.trim();
        return q.equals(pageLocation.trim());
    }

    public static String recordType(Map<String, Object> record) {
        if (record == null) return "";
        Object type = record.get("type");
        if (type instanceof String && !((String) type).trim().isEmpty()) {
            return ((String) type).trim();
        }
        Object data = record.get("data");
        if (data instanceof Map) {
            Object nested = ((Map<?, ?>) data).get("type");
            if (nested instanceof String) return ((String) nested).trim();
        }
        return "";
    }

    /**
     * Same hasUriShape as toAppRecord: a login is type=login, or it
     * carries websites/uris. Fill used to skip those and show empty
     * while the app search still found them.
     */
    public static boolean recordMatchesFilter(Map<String, Object> record, String filter) {
        if (record == null || filter == null || filter.isEmpty()) return false;
        String type = recordType(record);
        if (filter.equals(type)) return true;
        if (!"login".equals(filter)) return false;
        return hasLoginShape(record);
    }

    static boolean hasLoginShape(Map<String, Object> record) {
        Object dataObj = record.get("data");
        Map<?, ?> data = dataObj instanceof Map ? (Map<?, ?>) dataObj : record;
        return data.get("websites") instanceof List || data.get("uris") instanceof List;
    }

    /**
     * The app worklet holding pearpass/ is not an empty vault.
     * Showing "No matching items" there drops the sheet for a
     * lock Unlock to fill can still win on retry.
     */
    public static boolean showEmptyAfterLoadFailure(boolean databaseLocked) {
        return !databaseLocked;
    }
}

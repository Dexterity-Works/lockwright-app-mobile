package com.pears.pass.autofill.utils;

import java.util.ArrayList;
import java.util.List;

/**
 * Real checks against AutofillSheetLoad. Unlock-to-fill must not block
 * the sheet on per-login TOTP, and a missing search field must not NPE.
 * The search field shows the page being matched so the user can change it.
 */
public final class AutofillSheetLoadTest {
    private static int failures = 0;

    public static void main(String[] args) {
        nullSearchIsEmptyQuery();
        typedSearchKeepsText();
        loginChipPreselectMatchesId();
        vivaldiShowsGithubLocation();
        vivaldiWithoutPageLeavesLocationEmpty();
        nativeAppShowsAndroidAppLocation();
        appWebViewDomainIsNotTheFillLocation();
        typedGithubLocationFindsGithubLogin();
        githubDotComFindsTitleGitHub();
        androidAppGithubUriMatchesTypedGithubDotCom();
        prefillIsNotExclusiveSearch();
        pagePrefillIsNotTypedSearchEvenAfterTextEvent();
        pagePrefillMissShowsVaultLogins();
        loginTypeInDataIsStillALogin();
        lockErrorIsNotEmptyVault();
        workletDownIsNotEmptyVault();
        failedActivateIsNotEmptyVault();
        forgejoHostFindsForgejoLogin();
        emptyListAfterActivateIsNotEmptyVault();
        emptyUnlockMustNotCacheSession();

        if (failures > 0) {
            System.err.println(failures + " AutofillSheetLoad checks failed");
            System.exit(1);
        }
        System.out.println("ok");
    }

    private static void nullSearchIsEmptyQuery() {
        expect("null query", AutofillSheetLoad.searchQuery(null), "");
    }

    private static void typedSearchKeepsText() {
        expect("typed query", AutofillSheetLoad.searchQuery("gh"), "gh");
    }

    private static void loginChipPreselectMatchesId() {
        expect("login chip matches",
                AutofillSheetLoad.isPreselect("rec-1", "rec-1"), true);
        expect("other login skipped",
                AutofillSheetLoad.isPreselect("rec-1", "rec-2"), false);
        expect("empty preselect skipped",
                AutofillSheetLoad.isPreselect("", "rec-1"), false);
        expect("null preselect skipped",
                AutofillSheetLoad.isPreselect(null, "rec-1"), false);
    }

    private static void vivaldiShowsGithubLocation() {
        expect(
                "Vivaldi github.com fill shows github.com",
                AutofillSheetLoad.visibleFillLocation("github.com", "com.vivaldi.browser"),
                "github.com");
    }

    private static void vivaldiWithoutPageLeavesLocationEmpty() {
        expect(
                "Vivaldi without page domain shows empty location, not vivaldi.com",
                AutofillSheetLoad.visibleFillLocation(null, "com.vivaldi.browser"),
                "");
    }

    private static void nativeAppShowsAndroidAppLocation() {
        expect(
                "Twitter app fill shows androidapp URI",
                AutofillSheetLoad.visibleFillLocation(null, "com.twitter.android"),
                "androidapp://com.twitter.android");
    }

    /** #3: another app's WebView domain is not shown or matched as the page. */
    private static void appWebViewDomainIsNotTheFillLocation() {
        expect(
                "non-browser webDomain shows the app URI, not paypal.com",
                AutofillSheetLoad.visibleFillLocation("paypal.com", "com.evil.app"),
                "androidapp://com.evil.app");
        List<String> websites = new ArrayList<>();
        websites.add("https://paypal.com");
        expect(
                "typing paypal.com in the sheet is an explicit choice and still finds it",
                AutofillSheetLoad.matchesFillQuery(
                        "X", "user", websites, new ArrayList<UriMatchHelper.UriEntry>(),
                        "paypal.com", "com.evil.app"),
                true);
    }

    private static void typedGithubLocationFindsGithubLogin() {
        List<String> websites = new ArrayList<>();
        websites.add("https://github.com");
        expect(
                "typing github.com in the sheet finds the github login",
                AutofillSheetLoad.matchesFillQuery(
                        "X", "user", websites, new ArrayList<UriMatchHelper.UriEntry>(),
                        "github.com", "com.vivaldi.browser"),
                true);
        expect(
                "vivaldi.com typed does not find github",
                AutofillSheetLoad.matchesFillQuery(
                        "X", "user", websites, new ArrayList<UriMatchHelper.UriEntry>(),
                        "vivaldi.com", "com.vivaldi.browser"),
                false);
    }

    private static void githubDotComFindsTitleGitHub() {
        expect(
                "github.com finds a login titled GitHub with no URI",
                AutofillSheetLoad.matchesFillQuery(
                        "GitHub", "user", new ArrayList<String>(),
                        new ArrayList<UriMatchHelper.UriEntry>(),
                        "github.com", "com.vivaldi.browser"),
                true);
    }

    private static void androidAppGithubUriMatchesTypedGithubDotCom() {
        List<String> websites = new ArrayList<>();
        websites.add("androidapp://com.github.android");
        expect(
                "typed github.com finds androidapp GitHub login",
                AutofillSheetLoad.matchesFillQuery(
                        "GitHub", "user", websites,
                        new ArrayList<UriMatchHelper.UriEntry>(),
                        "github.com", "com.vivaldi.browser"),
                true);
    }

    private static void prefillIsNotExclusiveSearch() {
        expect(
                "prefill github.com is not an exclusive typed search",
                AutofillSheetLoad.filterAsTypedQuery(false, "github.com"),
                false);
        expect(
                "typing github.com is an exclusive typed search",
                AutofillSheetLoad.filterAsTypedQuery(true, "github.com"),
                true);
        expect(
                "cleared search after typing shows the vault",
                AutofillSheetLoad.filterAsTypedQuery(true, ""),
                false);
    }

    private static void pagePrefillIsNotTypedSearchEvenAfterTextEvent() {
        expect(
                "github.com still in the field is the page, not a typed exclusive search",
                AutofillSheetLoad.filterAsTypedQuery(true, "github.com", "github.com"),
                false);
        expect(
                "typing gh on github.com is an exclusive search",
                AutofillSheetLoad.filterAsTypedQuery(true, "gh", "github.com"),
                true);
    }

    private static void pagePrefillMissShowsVaultLogins() {
        expect(
                "github.com prefill with 0 URI matches still shows 3 vault logins",
                AutofillSheetLoad.keepVaultWhenPagePrefillMisses(
                        "github.com", "github.com", 0, 3),
                true);
        expect(
                "a typed miss does not dump the vault",
                AutofillSheetLoad.keepVaultWhenPagePrefillMisses("zzzz", "github.com", 0, 3),
                false);
    }

    private static void loginTypeInDataIsStillALogin() {
        java.util.Map<String, Object> data = new java.util.HashMap<>();
        data.put("type", "login");
        data.put("title", "GitHub");
        java.util.List<String> sites = new java.util.ArrayList<>();
        sites.add("https://github.com");
        data.put("websites", sites);
        java.util.Map<String, Object> record = new java.util.HashMap<>();
        record.put("id", "gh-1");
        record.put("data", data);
        expect(
                "login type nested in data is still a fill login",
                AutofillSheetLoad.recordMatchesFilter(record, "login"),
                true);
        java.util.Map<String, Object> noType = new java.util.HashMap<>();
        noType.put("id", "gh-2");
        java.util.Map<String, Object> noTypeData = new java.util.HashMap<>();
        noTypeData.put("title", "GitHub work");
        noTypeData.put("websites", sites);
        noType.put("data", noTypeData);
        expect(
                "websites without a type field is still a fill login",
                AutofillSheetLoad.recordMatchesFilter(noType, "login"),
                true);
    }

    private static void lockErrorIsNotEmptyVault() {
        expect(
                "a locked database is not an empty vault",
                AutofillSheetLoad.showEmptyAfterLoadFailure(true),
                false);
        expect(
                "a failed load without a lock is an empty vault",
                AutofillSheetLoad.showEmptyAfterLoadFailure(false),
                true);
    }

    private static void workletDownIsNotEmptyVault() {
        expect(
                "a dead autofill worklet is a transient load failure",
                AutofillSheetLoad.isTransientLoadFailure(
                        new RuntimeException("Worklet not running")),
                true);
        expect(
                "vault not initialised after a crash is a transient load failure",
                AutofillSheetLoad.isTransientLoadFailure(
                        new RuntimeException("Vault not initialised")),
                true);
        expect(
                "a dead worklet is not an empty vault",
                AutofillSheetLoad.showEmptyAfterLoadFailure(
                        AutofillSheetLoad.isTransientLoadFailure(
                                new RuntimeException("Worklet not running"))),
                false);
    }

    private static void failedActivateIsNotEmptyVault() {
        expect(
                "failed activate after unlock is a transient load failure",
                AutofillSheetLoad.isTransientLoadFailure(
                        new RuntimeException("Failed to activate vault")),
                true);
        expect(
                "failed activate is not an empty Personal vault",
                AutofillSheetLoad.showEmptyAfterLoadFailure(
                        AutofillSheetLoad.isTransientLoadFailure(
                                new RuntimeException("Failed to activate vault"))),
                false);
        expect(
                "an unrelated parse error can still be an empty vault",
                AutofillSheetLoad.showEmptyAfterLoadFailure(
                        AutofillSheetLoad.isTransientLoadFailure(
                                new RuntimeException("bad record id"))),
                true);
    }

    private static void emptyListAfterActivateIsNotEmptyVault() {
        expect(
                "0 records right after activate still wait for the view",
                AutofillSheetLoad.keepWaitingForRecords(0, 0),
                true);
        expect(
                "3 Personal logins stop waiting",
                AutofillSheetLoad.keepWaitingForRecords(3, 0),
                false);
        expect(
                "still empty after the wait is a real empty vault",
                AutofillSheetLoad.keepWaitingForRecords(
                        0, AutofillSheetLoad.RECORD_WAIT_MS),
                false);
    }

    private static void emptyUnlockMustNotCacheSession() {
        expect(
                "empty Personal must not unlock the keyboard session",
                AutofillSheetLoad.cacheUnlockSession(0),
                false);
        expect(
                "3 GitHub logins unlock the keyboard session",
                AutofillSheetLoad.cacheUnlockSession(3),
                true);
    }

    private static void forgejoHostFindsForgejoLogin() {
        List<String> websites = new ArrayList<>();
        websites.add("https://git.sandstrak.win");
        expect(
                "git.sandstrak.win fill finds the Forgejo login",
                AutofillSheetLoad.matchesFillQuery(
                        "Forgejo",
                        "tor-arne",
                        websites,
                        new ArrayList<UriMatchHelper.UriEntry>(),
                        "git.sandstrak.win",
                        "com.vivaldi.browser"),
                true);
        expect(
                "git.sandstrak.win prefill with 0 URI matches still shows Personal logins",
                AutofillSheetLoad.keepVaultWhenPagePrefillMisses(
                        "git.sandstrak.win", "git.sandstrak.win", 0, 4),
                true);
    }

    private static void expect(String label, Object got, Object want) {
        if (got == null ? want != null : !got.equals(want)) {
            failures++;
            System.err.println("FAIL " + label + ": got " + got + ", want " + want);
        }
    }
}

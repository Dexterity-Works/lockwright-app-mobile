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
        typedGithubLocationFindsGithubLogin();
        githubDotComFindsTitleGitHub();
        androidAppGithubUriMatchesTypedGithubDotCom();
        prefillIsNotExclusiveSearch();

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

    private static void expect(String label, Object got, Object want) {
        if (got == null ? want != null : !got.equals(want)) {
            failures++;
            System.err.println("FAIL " + label + ": got " + got + ", want " + want);
        }
    }
}

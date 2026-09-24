package com.pears.pass.autofill.utils;

import java.util.ArrayList;
import java.util.List;

/**
 * Real checks against UriMatchHelper. Android app fills must match
 * androidapp:// package URIs, not only a guessed https host.
 */
public final class UriMatchHelperTest {
    private static int failures = 0;

    public static void main(String[] args) {
        keepsAndroidAppUri();
        unwrapsHttpsPrefixedAndroidAppUri();
        androidAppRecordMatchesAndroidAppPage();
        appPackageDoesNotGuessWebsite();
        appWebViewDomainIsNotTheSite();
        packageNamedLikeDomainIsNotTheSite();
        androidAppMatchIsExactPackage();
        bareTldPageDoesNotMatchEverySite();
        hostWithPortStillGetsHttps();
        prefixedAndroidAppRecordMatchesPackageFill();
        searchMatchesWebsiteWhenTitleDoesNot();
        vivaldiGithubPageFindsGithubWebsite();
        browserPackageDoesNotGuessItsOwnSite();
        githubAppUriMatchesGithubWebsite();

        if (failures > 0) {
            System.err.println(failures + " UriMatchHelper checks failed");
            System.exit(1);
        }
        System.out.println("ok");
    }

    private static void keepsAndroidAppUri() {
        expect(
                "androidapp URI is not prefixed with https",
                UriMatchHelper.normalizeUrl("androidapp://com.twitter.android"),
                "androidapp://com.twitter.android");
    }

    private static void unwrapsHttpsPrefixedAndroidAppUri() {
        expect(
                "glued https prefix unwraps",
                UriMatchHelper.normalizeUrl("https://androidapp://com.twitter.android"),
                "androidapp://com.twitter.android");
    }

    private static void androidAppRecordMatchesAndroidAppPage() {
        List<String> websites = listOf("androidapp://com.twitter.android");
        List<UriMatchHelper.UriEntry> uris = new ArrayList<>();
        uris.add(new UriMatchHelper.UriEntry(
                "androidapp://com.twitter.android", "host"));
        expect(
                "native app fill matches stored androidapp URI",
                UriMatchHelper.recordMatchesPage(
                        websites, uris, "androidapp://com.twitter.android"),
                true);
        expect(
                "package fill queries include androidapp URI",
                UriMatchHelper.bestRecordSiteMatchRank(
                        websites,
                        uris,
                        UriMatchHelper.pageUrlsForAutofill(null, "com.twitter.android")) > 0,
                true);
    }

    /** #3: com.paypal.attacker must not become https://paypal.com. */
    private static void appPackageDoesNotGuessWebsite() {
        List<String> websites = listOf("https://paypal.com");
        List<String> pageUrls =
                UriMatchHelper.pageUrlsForAutofill(null, "com.paypal.attacker");
        expect(
                "native app page URLs do not include a reverse-DNS https guess",
                pageUrls.contains("https://paypal.com"),
                false);
        expect(
                "com.paypal.attacker does not match a paypal.com login",
                UriMatchHelper.bestRecordSiteMatchRank(websites, new ArrayList<>(), pageUrls) > 0,
                false);
    }

    /** #3: any app's WebView can report webDomain=paypal.com. */
    private static void appWebViewDomainIsNotTheSite() {
        List<String> websites = listOf("https://paypal.com");
        expect(
                "non-browser webDomain does not match a paypal.com login",
                UriMatchHelper.bestRecordSiteMatchRank(
                        websites,
                        new ArrayList<>(),
                        UriMatchHelper.pageUrlsForAutofill("paypal.com", "com.evil.app")) > 0,
                false);
    }

    /** #3: package paypal.com is androidapp://paypal.com, not the website. */
    private static void packageNamedLikeDomainIsNotTheSite() {
        List<String> websites = listOf("https://paypal.com");
        expect(
                "androidapp page does not match an https login by host",
                UriMatchHelper.bestRecordSiteMatchRank(
                        websites,
                        new ArrayList<>(),
                        UriMatchHelper.pageUrlsForAutofill(null, "paypal.com")) > 0,
                false);
    }

    private static void androidAppMatchIsExactPackage() {
        List<String> websites = listOf("androidapp://com.paypal");
        List<UriMatchHelper.UriEntry> uris = new ArrayList<>();
        uris.add(new UriMatchHelper.UriEntry("androidapp://com.paypal", "startsWith"));
        expect(
                "androidapp startsWith does not match a longer package",
                UriMatchHelper.recordMatchesPage(
                        websites, uris, "androidapp://com.paypal.evil"),
                false);
        List<UriMatchHelper.UriEntry> domain = new ArrayList<>();
        domain.add(new UriMatchHelper.UriEntry("androidapp://com.paypal", "baseDomain"));
        expect(
                "androidapp domain match does not treat the package as a parent host",
                UriMatchHelper.recordMatchesPage(
                        websites, domain, "androidapp://x.com.paypal"),
                false);
    }

    /** #3: a page host of com must not match every stored *.com login. */
    private static void bareTldPageDoesNotMatchEverySite() {
        expect(
                "page host com does not match paypal.com",
                UriMatchHelper.recordMatchesPage(
                        listOf("https://paypal.com"), new ArrayList<>(), "https://com"),
                false);
        expect(
                "subdomain page still matches the parent login",
                UriMatchHelper.recordMatchesPage(
                        listOf("https://paypal.com"), new ArrayList<>(), "https://www.paypal.com"),
                true);
    }

    private static void hostWithPortStillGetsHttps() {
        expect(
                "schemeless host:port still gets https",
                UriMatchHelper.normalizeUrl("example.com:8080"),
                "https://example.com:8080");
    }

    private static void prefixedAndroidAppRecordMatchesPackageFill() {
        List<String> websites = listOf("https://androidapp://com.twitter.android");
        List<UriMatchHelper.UriEntry> uris = new ArrayList<>();
        uris.add(new UriMatchHelper.UriEntry(
                "https://androidapp://com.twitter.android", "host"));
        expect(
                "prefixed androidapp record matches package fill",
                UriMatchHelper.bestRecordSiteMatchRank(
                        websites,
                        uris,
                        UriMatchHelper.pageUrlsForAutofill(null, "com.twitter.android")) > 0,
                true);
    }

    private static void searchMatchesWebsiteWhenTitleDoesNot() {
        List<String> websites = listOf("https://twitter.com");
        expect(
                "search finds URI when title is unrelated",
                UriMatchHelper.credentialMatchesSearch(
                        "X", "user", websites, new ArrayList<>(), "twitter"),
                true);
        expect(
                "search misses unrelated query",
                UriMatchHelper.credentialMatchesSearch(
                        "X", "user", websites, new ArrayList<>(), "nomatch"),
                false);
        expect(
                "search finds androidapp package",
                UriMatchHelper.credentialMatchesSearch(
                        "X",
                        "user",
                        listOf("androidapp://com.twitter.android"),
                        new ArrayList<>(),
                        "twitter.android"),
                true);
    }

    private static void vivaldiGithubPageFindsGithubWebsite() {
        List<String> websites = listOf("https://github.com");
        expect(
                "Vivaldi github.com fill matches github.com login",
                UriMatchHelper.bestRecordSiteMatchRank(
                        websites,
                        new ArrayList<>(),
                        UriMatchHelper.pageUrlsForAutofill(
                                "github.com", "com.vivaldi.browser"))
                        > 0,
                true);
    }

    private static void browserPackageDoesNotGuessItsOwnSite() {
        List<String> pageUrls =
                UriMatchHelper.pageUrlsForAutofill(null, "com.vivaldi.browser");
        expect(
                "Vivaldi without webDomain does not guess vivaldi.com",
                pageUrls.contains("https://vivaldi.com"),
                false);
        List<String> github = listOf("https://github.com");
        List<String> vivaldi = listOf("https://vivaldi.com");
        expect(
                "missing webDomain must not hide github behind a vivaldi.com hit",
                UriMatchHelper.bestRecordSiteMatchRank(github, new ArrayList<>(), pageUrls)
                        > 0,
                false);
        expect(
                "missing webDomain must not exclusive-match vivaldi.com",
                UriMatchHelper.bestRecordSiteMatchRank(vivaldi, new ArrayList<>(), pageUrls)
                        > 0,
                false);
    }

    private static void githubAppUriMatchesGithubWebsite() {
        List<String> websites = listOf("androidapp://com.github.android");
        expect(
                "GitHub app URI matches github.com in a browser",
                UriMatchHelper.recordMatchesPage(
                        websites, new ArrayList<>(), "https://github.com"),
                true);
    }

    private static List<String> listOf(String value) {
        List<String> out = new ArrayList<>();
        out.add(value);
        return out;
    }

    private static void expect(String label, Object got, Object want) {
        if (got == null ? want != null : !got.equals(want)) {
            failures++;
            System.err.println("FAIL " + label + ": got " + got + ", want " + want);
        }
    }

    private static void expect(String label, boolean got, boolean want) {
        expect(label, Boolean.valueOf(got), Boolean.valueOf(want));
    }
}

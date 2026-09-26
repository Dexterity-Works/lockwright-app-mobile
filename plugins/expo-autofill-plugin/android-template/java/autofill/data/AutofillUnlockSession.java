package com.pears.pass.autofill.data;

import com.pears.pass.autofill.utils.AutofillUnlockWindow;
import com.pears.pass.autofill.utils.UriMatchHelper;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Process-memory unlock session for keyboard suggestions.
 * Survives AuthenticationActivity teardown (which must close the Bare
 * worklet so the main app can open the DB). Never written to disk.
 * Closed by the sliding TTL, the absolute cap, the app locking, screen
 * off, or closing the vault; see {@link AutofillUnlockWindow}.
 */
public final class AutofillUnlockSession {
    private static final AutofillUnlockSession INSTANCE = new AutofillUnlockSession();

    private final Object lock = new Object();
    private List<CredentialItem> credentials = new ArrayList<>();
    private final AutofillUnlockWindow window = new AutofillUnlockWindow();

    private AutofillUnlockSession() {}

    public static AutofillUnlockSession get() {
        return INSTANCE;
    }

    public boolean isUnlocked() {
        synchronized (lock) {
            return expireLocked();
        }
    }

    /** @param ttlMs the app's auto-lock timeout; 0 or less means the default */
    public void unlock(List<CredentialItem> items, long ttlMs) {
        synchronized (lock) {
            credentials = items != null ? new ArrayList<>(items) : new ArrayList<>();
            window.unlock(System.currentTimeMillis(), ttlMs);
        }
    }

    public void touch() {
        synchronized (lock) {
            if (expireLocked()) {
                window.touch(System.currentTimeMillis());
            }
        }
    }

    public void lock() {
        synchronized (lock) {
            credentials = new ArrayList<>();
            window.lock();
        }
    }

    public List<CredentialItem> copyLogins() {
        synchronized (lock) {
            expireLocked();
            List<CredentialItem> out = new ArrayList<>();
            for (CredentialItem item : credentials) {
                if (item != null && !item.isCreditCard() && !item.isIdentity()) out.add(item);
            }
            return out;
        }
    }

    /**
     * Site matches, most specific first. Empty when nothing matches the page
     * (do not dump the whole vault onto the keyboard).
     */
    public List<CredentialItem> matchingLogins(String webDomain, String packageName, int limit) {
        if (limit <= 0) return Collections.emptyList();
        synchronized (lock) {
            if (!expireLocked()) return Collections.emptyList();

            List<String> pageUrls = UriMatchHelper.pageUrlsForAutofill(webDomain, packageName);

            List<CredentialItem> matches = new ArrayList<>();
            List<Integer> ranks = new ArrayList<>();
            for (CredentialItem item : credentials) {
                if (item == null || item.isCreditCard() || item.isIdentity()) continue;
                int rank = UriMatchHelper.bestRecordSiteMatchRank(
                        item.getWebsites(), item.getUris(), pageUrls);
                if (rank > 0) {
                    matches.add(item);
                    ranks.add(rank);
                }
            }

            List<Integer> order = new ArrayList<>();
            for (int i = 0; i < matches.size(); i++) order.add(i);
            order.sort((a, b) -> Integer.compare(ranks.get(b), ranks.get(a)));

            List<CredentialItem> out = new ArrayList<>();
            for (int i = 0; i < order.size() && out.size() < limit; i++) {
                out.add(matches.get(order.get(i)));
            }
            return out;
        }
    }

    /** @return whether the session is still open; drops the logins when it is not */
    private boolean expireLocked() {
        if (window.isUnlocked(System.currentTimeMillis())) return true;
        credentials = new ArrayList<>();
        return false;
    }
}

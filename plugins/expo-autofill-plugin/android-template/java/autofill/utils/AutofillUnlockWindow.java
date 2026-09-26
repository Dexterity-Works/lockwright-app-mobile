package com.pears.pass.autofill.utils;

/**
 * When the in-memory autofill unlock session is open. Two clocks: a
 * sliding TTL that every sheet open renews, and an absolute cap from the
 * first unlock that no touch can push. The TTL follows the app's auto-lock
 * timeout; a disabled or missing timeout falls back to the default, never
 * to forever.
 */
public final class AutofillUnlockWindow {
    /** Hard cap on one unlock, however often the sheet is opened. */
    public static final long MAX_LIFETIME_MS = 60 * 60 * 1000L;

    private long ttlMs = AutofillConstants.UNLOCK_SESSION_TTL_MS;
    private long slidingUntilMs;
    private long hardUntilMs;

    /** TTL for the app's auto-lock timeout: default when unset, never past the cap. */
    public static long ttlFor(long appTimeoutMs) {
        if (appTimeoutMs <= 0) return AutofillConstants.UNLOCK_SESSION_TTL_MS;
        return Math.min(appTimeoutMs, MAX_LIFETIME_MS);
    }

    public void unlock(long nowMs, long ttlMs) {
        this.ttlMs = ttlFor(ttlMs);
        hardUntilMs = nowMs + MAX_LIFETIME_MS;
        slidingUntilMs = Math.min(nowMs + this.ttlMs, hardUntilMs);
    }

    public void touch(long nowMs) {
        if (!isUnlocked(nowMs)) return;
        slidingUntilMs = Math.min(nowMs + ttlMs, hardUntilMs);
    }

    public boolean isUnlocked(long nowMs) {
        if (slidingUntilMs > 0 && (nowMs >= slidingUntilMs || nowMs >= hardUntilMs)) {
            lock();
        }
        return slidingUntilMs > 0;
    }

    public void lock() {
        slidingUntilMs = 0;
        hardUntilMs = 0;
    }
}

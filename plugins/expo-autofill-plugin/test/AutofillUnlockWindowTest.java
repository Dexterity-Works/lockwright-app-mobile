package com.pears.pass.autofill.utils;

/**
 * Real check: the autofill unlock session ends. Touching the sheet renews
 * the sliding TTL but never past the absolute cap, lock() closes it at
 * once, and the TTL follows the app's auto-lock timeout.
 */
public final class AutofillUnlockWindowTest {
    private static int failures = 0;
    private static final long MIN = 60 * 1000L;

    public static void main(String[] args) {
        slidingTtlExpires();
        touchRenewsSlidingTtl();
        touchCannotPassAbsoluteCap();
        lockClosesAtOnce();
        touchAfterLockStaysLocked();
        ttlFollowsAppTimeout();

        if (failures > 0) {
            System.err.println(failures + " AutofillUnlockWindow checks failed");
            System.exit(1);
        }
        System.out.println("ok");
    }

    private static void slidingTtlExpires() {
        AutofillUnlockWindow w = new AutofillUnlockWindow();
        w.unlock(0, 15 * MIN);
        expect("open right after unlock", w.isUnlocked(1), true);
        expect("open before ttl", w.isUnlocked(14 * MIN), true);
        expect("closed at ttl", w.isUnlocked(15 * MIN), false);
    }

    private static void touchRenewsSlidingTtl() {
        AutofillUnlockWindow w = new AutofillUnlockWindow();
        w.unlock(0, 15 * MIN);
        w.touch(10 * MIN);
        expect("touch pushed the ttl", w.isUnlocked(20 * MIN), true);
        expect("renewed ttl still ends", w.isUnlocked(25 * MIN), false);
    }

    /** The bug: touch() on every sheet open kept the session alive forever. */
    private static void touchCannotPassAbsoluteCap() {
        AutofillUnlockWindow w = new AutofillUnlockWindow();
        w.unlock(0, 15 * MIN);
        for (long t = 10 * MIN; t < AutofillUnlockWindow.MAX_LIFETIME_MS; t += 10 * MIN) {
            w.touch(t);
            expect("open at " + (t / MIN) + " min", w.isUnlocked(t), true);
        }
        expect("closed at the cap", w.isUnlocked(AutofillUnlockWindow.MAX_LIFETIME_MS), false);

        AutofillUnlockWindow longTtl = new AutofillUnlockWindow();
        longTtl.unlock(0, 5 * AutofillUnlockWindow.MAX_LIFETIME_MS);
        expect("ttl longer than the cap is capped",
                longTtl.isUnlocked(AutofillUnlockWindow.MAX_LIFETIME_MS), false);
    }

    private static void lockClosesAtOnce() {
        AutofillUnlockWindow w = new AutofillUnlockWindow();
        w.unlock(0, 15 * MIN);
        w.lock();
        expect("locked", w.isUnlocked(1), false);
    }

    private static void touchAfterLockStaysLocked() {
        AutofillUnlockWindow w = new AutofillUnlockWindow();
        w.unlock(0, 15 * MIN);
        w.lock();
        w.touch(1);
        expect("touch does not reopen", w.isUnlocked(2), false);
    }

    private static void ttlFollowsAppTimeout() {
        expect("unset falls back to default",
                AutofillUnlockWindow.ttlFor(0), AutofillConstants.UNLOCK_SESSION_TTL_MS);
        expect("auto-lock off (negative) falls back to default, not forever",
                AutofillUnlockWindow.ttlFor(-1), AutofillConstants.UNLOCK_SESSION_TTL_MS);
        expect("app timeout is used", AutofillUnlockWindow.ttlFor(5 * MIN), 5 * MIN);
        expect("app timeout never exceeds the cap",
                AutofillUnlockWindow.ttlFor(4 * 60 * MIN), AutofillUnlockWindow.MAX_LIFETIME_MS);
    }

    private static void expect(String name, Object actual, Object wanted) {
        if (actual == null ? wanted != null : !actual.equals(wanted)) {
            failures++;
            System.err.println("FAIL " + name + ": wanted " + wanted + " got " + actual);
        }
    }
}

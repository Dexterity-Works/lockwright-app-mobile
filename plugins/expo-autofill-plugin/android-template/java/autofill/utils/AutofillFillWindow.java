package com.pears.pass.autofill.utils;

/**
 * Unlock-to-fill window. A non-floating activity hides the caller
 * (Vivaldi vanishes, then sits minimized under Lockwright). A
 * dedicated .autofill affinity keeps fill off the main app task.
 * Empty affinity is dropped from the merged manifest and joins.
 */
public final class AutofillFillWindow {
    /**
     * 0.85 covers the caller. Screenshot of Unlock to fill left only
     * a right sliver of Vivaldi. Keep a top band of the page visible.
     */
    public static final float HEIGHT_RATIO = 0.58f;
    public static final float DIM_AMOUNT = 0.5f;
    public static final String FILL_TASK_AFFINITY_SUFFIX = ".autofill";
    /** WindowManager.LayoutParams.MATCH_PARENT without android.jar. */
    public static final int OVERLAY_WIDTH = -1;
    /** Gravity.BOTTOM | Gravity.FILL_HORIZONTAL without android.jar. */
    public static final int OVERLAY_GRAVITY = 0x50 | 0x07;

    private AutofillFillWindow() {}

    public static String fillTaskAffinity(String applicationId) {
        if (applicationId == null || applicationId.isEmpty()) {
            return FILL_TASK_AFFINITY_SUFFIX;
        }
        return applicationId + FILL_TASK_AFFINITY_SUFFIX;
    }

    /**
     * Null affinity is the app default and joins the Lockwright task.
     * Empty affinity is no-affinity. .autofill is a separate fill task.
     */
    public static boolean joinsAppTask(String taskAffinity, String applicationId) {
        if (taskAffinity == null) return true;
        if (taskAffinity.isEmpty()) return false;
        if (FILL_TASK_AFFINITY_SUFFIX.equals(taskAffinity)) return false;
        if (applicationId == null || applicationId.isEmpty()) return true;
        return taskAffinity.equals(applicationId);
    }

    /**
     * Theme.AppCompat activity windows hide the caller unless they
     * float. Dialog / windowIsFloating keeps Vivaldi's surface.
     */
    public static boolean hidesCallerSurface(boolean windowIsFloating) {
        return !windowIsFloating;
    }

    public static int overlayHeightPx(int screenHeightPx) {
        if (screenHeightPx <= 0) return 0;
        return (int) (screenHeightPx * HEIGHT_RATIO);
    }

    public static int overlayWidth() {
        return OVERLAY_WIDTH;
    }

    public static int overlayGravity() {
        return OVERLAY_GRAVITY;
    }

    /** PendingIntent.FLAG_UPDATE_CURRENT without android.jar. */
    public static final int FLAG_UPDATE_CURRENT = 1 << 27;
    /** PendingIntent.FLAG_CANCEL_CURRENT without android.jar. */
    public static final int FLAG_CANCEL_CURRENT = 1 << 28;
    /** PendingIntent.FLAG_MUTABLE without android.jar. */
    public static final int FLAG_MUTABLE = 1 << 25;

    /**
     * CANCEL_CURRENT on a second fill after fingerprint kills the
     * live Unlock to fill host and takes the browser with it.
     */
    public static boolean cancelsLiveAuthHost(int flags) {
        return (flags & FLAG_CANCEL_CURRENT) != 0;
    }

    public static int authPendingIntentFlags(boolean mutableRequired) {
        int flags = FLAG_UPDATE_CURRENT;
        if (mutableRequired) {
            flags |= FLAG_MUTABLE;
        }
        return flags;
    }

    /**
     * IME on a floating fill host recreates the activity unless
     * configChanges lists keyboard. Recreate cancels Autofill and
     * the sheet drops into recents.
     */
    public static boolean typingRecreatesHost(String configChanges) {
        if (configChanges == null || configChanges.isEmpty()) return true;
        return !configChanges.contains("keyboard");
    }
}

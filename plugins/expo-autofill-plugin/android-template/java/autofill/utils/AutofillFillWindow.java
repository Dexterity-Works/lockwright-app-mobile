package com.pears.pass.autofill.utils;

/**
 * Unlock-to-fill window. A non-floating activity hides the caller
 * (Vivaldi vanishes, then sits minimized under Lockwright). Empty
 * taskAffinity keeps fill off the main app task.
 */
public final class AutofillFillWindow {
    public static final float HEIGHT_RATIO = 0.85f;
    public static final float DIM_AMOUNT = 0.5f;

    private AutofillFillWindow() {}

    /**
     * Non-empty affinity joins the Lockwright task and brings the
     * app forward. Missing affinity (null) is the app default.
     */
    public static boolean joinsAppTask(String taskAffinity) {
        return taskAffinity == null || !taskAffinity.isEmpty();
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
}

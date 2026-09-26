package com.pears.pass.autofill.utils;

import android.content.Context;
import android.content.SharedPreferences;

/**
 * The app's auto-lock timeout, mirrored by AutofillModule.setAutoLockTimeout
 * so the fill sheet's unlock session follows it. Not a secret: it is a
 * duration, and the app keeps its own copy in SecureStore.
 */
public final class AutofillLockPrefs {
    private static final String PREFS = "pp_autofill_lock";
    private static final String KEY_TIMEOUT_MS = "auto_lock_timeout_ms";

    private AutofillLockPrefs() {}

    public static void setAutoLockTimeoutMs(Context context, long timeoutMs) {
        prefs(context).edit().putLong(KEY_TIMEOUT_MS, timeoutMs).apply();
    }

    /** TTL for the unlock session: the app's timeout, defaulted and capped. */
    public static long autoLockTtlMs(Context context) {
        return AutofillUnlockWindow.ttlFor(prefs(context).getLong(KEY_TIMEOUT_MS, 0));
    }

    private static SharedPreferences prefs(Context context) {
        return context.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }
}

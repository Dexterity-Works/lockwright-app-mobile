package com.pears.pass.autofill.utils;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Build;

import com.pears.pass.autofill.data.AutofillUnlockSession;

/**
 * Screen off closes the autofill unlock session. Registered from the
 * Application class: the fill services are unbound between fills, and the
 * session is process memory that outlives them.
 */
public final class AutofillScreenOffLock {
    private static final String TAG = "AutofillScreenOffLock";

    private AutofillScreenOffLock() {}

    public static void register(Context context) {
        Context app = context.getApplicationContext();
        BroadcastReceiver receiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context ctx, Intent intent) {
                if (Intent.ACTION_SCREEN_OFF.equals(intent.getAction())) {
                    AutofillUnlockSession.get().lock();
                    SecureLog.d(TAG, "Screen off, autofill session locked");
                }
            }
        };
        IntentFilter filter = new IntentFilter(Intent.ACTION_SCREEN_OFF);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            // A system broadcast still reaches a non-exported receiver.
            app.registerReceiver(receiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            app.registerReceiver(receiver, filter);
        }
    }
}

package com.pears.pass.autofill.utils;

import android.content.pm.Signature;
import android.os.Build;

import androidx.annotation.Nullable;
import androidx.annotation.RequiresApi;
import androidx.credentials.provider.CallingAppInfo;

import java.util.List;

/**
 * Reads the calling app off a Credential Manager request and decides the
 * origin its passkey response is bound to. See {@link PasskeyCallerOrigin}.
 */
@RequiresApi(api = Build.VERSION_CODES.UPSIDE_DOWN_CAKE)
public final class PasskeyCaller {
    private static final String TAG = "PasskeyCaller";

    private PasskeyCaller() {}

    /** @return the plan, or null when the request must be refused. */
    @Nullable
    public static PasskeyCallerOrigin.Plan plan(@Nullable CallingAppInfo info, @Nullable byte[] callerHash) {
        if (info == null) {
            SecureLog.e(TAG, "Passkey request without calling app info");
            return null;
        }
        String browserOrigin = null;
        if (info.isOriginPopulated()) {
            try {
                browserOrigin = info.getOrigin(PrivilegedBrowsers.ALLOWLIST_JSON);
            } catch (Exception e) {
                SecureLog.e(TAG, "Caller set an origin but is not a privileged browser: " + info.getPackageName());
                return null;
            }
            if (browserOrigin == null) {
                return null;
            }
        }
        byte[] signerCert = null;
        List<Signature> signers = info.getSigningInfoCompat().getApkContentsSigners();
        if (!signers.isEmpty()) {
            signerCert = signers.get(0).toByteArray();
        }
        PasskeyCallerOrigin.Plan plan = PasskeyCallerOrigin.plan(browserOrigin, callerHash, signerCert);
        if (plan == null) {
            SecureLog.e(TAG, "Passkey caller has no signing cert: " + info.getPackageName());
        }
        return plan;
    }
}

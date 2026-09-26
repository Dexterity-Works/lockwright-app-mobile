package com.pears.pass.autofill.service;

import android.app.PendingIntent;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.os.CancellationSignal;
import android.os.OutcomeReceiver;
import androidx.annotation.NonNull;
import androidx.annotation.RequiresApi;
import androidx.credentials.exceptions.ClearCredentialException;
import androidx.credentials.exceptions.CreateCredentialException;
import androidx.credentials.exceptions.CreateCredentialUnknownException;
import androidx.credentials.exceptions.GetCredentialException;
import androidx.credentials.exceptions.GetCredentialUnknownException;
import androidx.credentials.exceptions.NoCredentialException;
import androidx.credentials.provider.BeginCreateCredentialRequest;
import androidx.credentials.provider.BeginCreateCredentialResponse;
import androidx.credentials.provider.BeginCreatePublicKeyCredentialRequest;
import androidx.credentials.provider.BeginGetCredentialRequest;
import androidx.credentials.provider.BeginGetCredentialResponse;
import androidx.credentials.provider.BeginGetPublicKeyCredentialOption;
import androidx.credentials.provider.CallingAppInfo;
import androidx.credentials.provider.CreateEntry;
import androidx.credentials.provider.CredentialProviderService;
import androidx.credentials.provider.ProviderClearCredentialStateRequest;
import androidx.credentials.provider.PublicKeyCredentialEntry;

import com.pears.pass.R;
import com.pears.pass.autofill.data.AutofillUnlockSession;
import com.pears.pass.autofill.data.CredentialItem;
import com.pears.pass.autofill.ui.AuthenticationActivity;
import com.pears.pass.autofill.utils.AssetLinksHttpFetcher;
import com.pears.pass.autofill.utils.AssetLinksVerifier;
import com.pears.pass.autofill.utils.AutofillConstants;
import com.pears.pass.autofill.utils.PasskeyCaller;
import com.pears.pass.autofill.utils.PasskeyPickerPlan;
import com.pears.pass.autofill.utils.PrivilegedBrowsers;
import com.pears.pass.autofill.utils.SecureLog;
import com.pears.pass.autofill.ui.PasskeyRegistrationActivity;

import org.json.JSONObject;

import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.function.Predicate;

/**
 * Android CredentialProviderService for passkey operations (Android 14+).
 * Handles both passkey registration (creation) and assertion (authentication).
 * The existing AutofillService remains for password autofill on all Android versions.
 */
@RequiresApi(api = Build.VERSION_CODES.UPSIDE_DOWN_CAKE)
public class PearPassCredentialProviderService extends CredentialProviderService {
    private static final String TAG = "PearPassCredProvService";

    /** Process-wide: the service is unbound between requests, the cache should not be. */
    private static final AssetLinksVerifier ASSET_LINKS = new AssetLinksVerifier(new AssetLinksHttpFetcher());
    private static final ExecutorService ASSET_LINKS_EXECUTOR = Executors.newSingleThreadExecutor();

    @Override
    public void onBeginCreateCredentialRequest(
            @NonNull BeginCreateCredentialRequest request,
            @NonNull CancellationSignal cancellationSignal,
            @NonNull OutcomeReceiver<BeginCreateCredentialResponse, CreateCredentialException> callback) {

        SecureLog.d(TAG, "onBeginCreateCredentialRequest called");

        if (request instanceof BeginCreatePublicKeyCredentialRequest) {
            SecureLog.d(TAG, "Processing passkey registration request");

            try {
                // Create PendingIntent to launch PasskeyRegistrationActivity
                Intent intent = new Intent(this, PasskeyRegistrationActivity.class);
                intent.setAction("com.pears.pass.PASSKEY_REGISTRATION");

                PendingIntent pendingIntent = PendingIntent.getActivity(
                        this, 0, intent,
                        PendingIntent.FLAG_MUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);

                CreateEntry createEntry = new CreateEntry.Builder(
                        "Lockwright", pendingIntent)
                        .setDescription("Save passkey in Lockwright")
                        .build();

                BeginCreateCredentialResponse response =
                        new BeginCreateCredentialResponse.Builder()
                                .addCreateEntry(createEntry)
                                .build();

                callback.onResult(response);
            } catch (Exception e) {
                SecureLog.e(TAG, "Error creating registration response: " + e.getMessage());
                callback.onError(new CreateCredentialUnknownException(e.getMessage()));
            }
        } else {
            SecureLog.d(TAG, "Unsupported credential type, ignoring");
            callback.onError(new CreateCredentialUnknownException("Unsupported credential type"));
        }
    }

    /**
     * Lists passkeys only for a caller the site vouches for. A privileged
     * browser vouches for itself with its origin. Any other app must be named
     * in https://rpId/.well-known/assetlinks.json (checked off the binder
     * thread, cached a day); no vouch, no entries.
     */
    @Override
    public void onBeginGetCredentialRequest(
            @NonNull BeginGetCredentialRequest request,
            @NonNull CancellationSignal cancellationSignal,
            @NonNull OutcomeReceiver<BeginGetCredentialResponse, GetCredentialException> callback) {

        SecureLog.d(TAG, "onBeginGetCredentialRequest called");

        CallingAppInfo info = request.getCallingAppInfo();
        if (info == null) {
            SecureLog.e(TAG, "Passkey list request without calling app info");
            callback.onError(new NoCredentialException());
            return;
        }
        if (info.isOriginPopulated()) {
            String origin = null;
            try {
                origin = info.getOrigin(PrivilegedBrowsers.ALLOWLIST_JSON);
            } catch (Exception e) {
                // Not on the list; refused below.
            }
            if (origin == null) {
                SecureLog.e(TAG, "Caller set an origin but is not a privileged browser: " + info.getPackageName());
                callback.onError(new NoCredentialException());
                return;
            }
            respond(callback, listEntries(request, rpId -> true));
            return;
        }

        final String packageName = info.getPackageName();
        final String fingerprint = AssetLinksVerifier.fingerprint(PasskeyCaller.signerCert(info));
        if (fingerprint == null) {
            SecureLog.e(TAG, "Passkey caller has no signing cert: " + packageName);
            callback.onError(new NoCredentialException());
            return;
        }
        ASSET_LINKS_EXECUTOR.execute(() -> {
            if (cancellationSignal.isCanceled()) return;
            respond(callback, listEntries(request, rpId ->
                    ASSET_LINKS.allows(rpId, packageName, fingerprint, System.currentTimeMillis())));
        });
    }

    private static void respond(
            OutcomeReceiver<BeginGetCredentialResponse, GetCredentialException> callback,
            BeginGetCredentialResponse response) {
        if (response != null) {
            callback.onResult(response);
        } else {
            SecureLog.d(TAG, "No passkey entries for this caller");
            callback.onError(new NoCredentialException());
        }
    }

    /** @return the entries, or null when nothing may be listed */
    private BeginGetCredentialResponse listEntries(BeginGetCredentialRequest request, Predicate<String> rpAllowed) {
        BeginGetCredentialResponse.Builder responseBuilder =
                new BeginGetCredentialResponse.Builder();
        boolean hasEntries = false;

        for (int i = 0; i < request.getBeginGetCredentialOptions().size(); i++) {
            if (request.getBeginGetCredentialOptions().get(i) instanceof BeginGetPublicKeyCredentialOption) {
                BeginGetPublicKeyCredentialOption option =
                        (BeginGetPublicKeyCredentialOption) request.getBeginGetCredentialOptions().get(i);

                SecureLog.d(TAG, "Processing passkey assertion request");

                try {
                    String rpId = "";
                    try {
                        JSONObject json = new JSONObject(option.getRequestJson());
                        rpId = json.optString("rpId", "");
                    } catch (Exception parseError) {
                        SecureLog.e(TAG, "Passkey request JSON parse failed: " + parseError.getMessage());
                    }

                    if (!rpAllowed.test(rpId)) {
                        SecureLog.d(TAG, "Site does not vouch for the caller, not listing: " + rpId);
                        continue;
                    }

                    int added = 0;
                    if (AutofillUnlockSession.get().isUnlocked()) {
                        List<CredentialItem> logins = AutofillUnlockSession.get().copyLogins();
                        for (int j = 0; j < logins.size(); j++) {
                            CredentialItem item = logins.get(j);
                            if (!PasskeyPickerPlan.isPasskeyForRp(
                                    item.hasPasskey(), item.getWebsites(), item.getUris(), rpId)) {
                                continue;
                            }
                            Intent intent = new Intent(this, AuthenticationActivity.class);
                            intent.setAction("com.pears.pass.PASSKEY_ASSERTION");
                            intent.putExtra("is_passkey_assertion", true);
                            intent.putExtra(AutofillConstants.EXTRA_PRESELECT_RECORD_ID, item.getId());
                            if (!rpId.isEmpty()) {
                                intent.putExtra(AutofillConstants.EXTRA_WEB_DOMAIN, rpId);
                            }

                            PendingIntent pendingIntent = PendingIntent.getActivity(
                                    this, 100 + i * 50 + j, intent,
                                    PendingIntent.FLAG_MUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);

                            String display = item.getUsername() != null && !item.getUsername().trim().isEmpty()
                                    ? item.getUsername().trim()
                                    : (item.getTitle() != null ? item.getTitle() : "Passkey");
                            PublicKeyCredentialEntry entry = new PublicKeyCredentialEntry.Builder(
                                    this, display, pendingIntent, option)
                                    .build();
                            responseBuilder.addCredentialEntry(entry);
                            added++;
                        }
                    }

                    if (added == 0) {
                        Intent intent = new Intent(this, AuthenticationActivity.class);
                        intent.setAction("com.pears.pass.PASSKEY_ASSERTION");
                        intent.putExtra("is_passkey_assertion", true);
                        if (!rpId.isEmpty()) {
                            intent.putExtra(AutofillConstants.EXTRA_WEB_DOMAIN, rpId);
                        }

                        PendingIntent pendingIntent = PendingIntent.getActivity(
                                this, 1 + i, intent,
                                PendingIntent.FLAG_MUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);

                        PublicKeyCredentialEntry entry = new PublicKeyCredentialEntry.Builder(
                                this, "Unlock Lockwright",
                                pendingIntent, option)
                                .build();
                        responseBuilder.addCredentialEntry(entry);
                    }
                    hasEntries = true;
                } catch (Exception e) {
                    SecureLog.e(TAG, "Error creating assertion entry: " + e.getMessage());
                }
            }
        }

        return hasEntries ? responseBuilder.build() : null;
    }

    @Override
    public void onClearCredentialStateRequest(
            @NonNull ProviderClearCredentialStateRequest request,
            @NonNull CancellationSignal cancellationSignal,
            @NonNull OutcomeReceiver<Void, ClearCredentialException> callback) {
        SecureLog.d(TAG, "onClearCredentialStateRequest - no-op");
        callback.onResult(null);
    }
}

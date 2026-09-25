package com.pears.pass.autofill.ui;

import android.app.Activity;
import android.app.PendingIntent;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.service.autofill.Dataset;
import android.service.autofill.FillResponse;
import android.service.autofill.InlinePresentation;
import android.view.autofill.AutofillId;
import android.view.autofill.AutofillManager;
import android.view.autofill.AutofillValue;
import android.widget.RemoteViews;
import android.widget.inline.InlinePresentationSpec;

import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.fragment.app.Fragment;
import androidx.fragment.app.FragmentTransaction;

import com.pears.pass.R;
import com.pears.pass.autofill.crypto.AuthenticatorDataBuilder;
import com.pears.pass.autofill.crypto.Base64URLUtils;
import com.pears.pass.autofill.crypto.PasskeyCrypto;
import com.pears.pass.autofill.data.CredentialItem;
import com.pears.pass.autofill.data.PasskeyCredential;
import com.pears.pass.autofill.data.PearPassVaultClient;
import com.pears.pass.autofill.data.AutofillUnlockSession;
import com.pears.pass.autofill.utils.AutofillConstants;
import com.pears.pass.autofill.utils.IdentityFillPlan;
import com.pears.pass.autofill.utils.LoginFillPlan;
import com.pears.pass.autofill.utils.PasskeyCaller;
import com.pears.pass.autofill.utils.PasskeyCallerOrigin;
import com.pears.pass.autofill.utils.SecureLog;
import com.pears.pass.autofill.utils.AutofillFillWindow;
import com.pears.pass.autofill.utils.AutofillHostTeardown;
import com.pears.pass.autofill.utils.VaultInitializer;

import org.json.JSONObject;

import java.security.PrivateKey;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.atomic.AtomicBoolean;

public class AuthenticationActivity extends AppCompatActivity implements NavigationListener {
    private static final String TAG = "AuthenticationActivity";

    private AutofillId usernameId;
    private AutofillId passwordId;
    private AutofillId otpId;
    private List<AutofillId> fallbackIds = new ArrayList<>();
    private AutofillId cardNumberId;
    private AutofillId cardExpiryDateId;
    private AutofillId cardExpiryMonthId;
    private AutofillId cardExpiryYearId;
    private AutofillId cardSecurityCodeId;
    private AutofillId cardholderNameId;
    private AutofillId identityNameId;
    private AutofillId identityPhoneId;
    private AutofillId identityAddressId;
    private AutofillId identityPostalId;
    private AutofillId identityCityId;
    private AutofillId identityRegionId;
    private AutofillId identityCountryId;
    private String webDomain;
    private String packageName;
    private String preselectRecordId;

    // Passkey assertion mode
    private boolean isPasskeyAssertion = false;
    private String passkeyRpId;
    private byte[] passkeyChallenge;
    private PasskeyCallerOrigin.Plan passkeyCaller;

    // Vault client and initialization state
    private PearPassVaultClient vaultClient;
    private final AtomicBoolean isInitializing = new AtomicBoolean(false);
    private final AtomicBoolean hasNavigated = new AtomicBoolean(false);
    private boolean hasInitializedOnce = false;
    private int initRetryCount = 0;
    private static final int MAX_INIT_RETRIES = 5;

    // User initialization state
    private boolean hasPasswordSet = false;
    private boolean isLoggedIn = false;
    private boolean isVaultOpen = false;
    private boolean isLoading = true;

    // State keys for savedInstanceState
    private static final String STATE_HAS_PASSWORD_SET = "hasPasswordSet";
    private static final String STATE_HAS_INITIALIZED_ONCE = "hasInitializedOnce";

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        setContentView(R.layout.activity_authentication);
        AutofillHostTeardown.setFillHostVisible(true);
        applyPartialHeightWindow();

        // Show loading fragment immediately - user must not interact until initialization is complete
        if (savedInstanceState == null) {
            getSupportFragmentManager().beginTransaction()
                .replace(R.id.fragment_container, new LoadingFragment())
                .commitNow();
        }

        readAutofillExtras(getIntent());

        Intent intent = getIntent();
        // Check for passkey assertion mode
        isPasskeyAssertion = intent.getBooleanExtra("is_passkey_assertion", false);

        if (isPasskeyAssertion && Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            SecureLog.d(TAG, "Passkey assertion mode enabled");
            try {
                androidx.credentials.provider.ProviderGetCredentialRequest providerRequest =
                        androidx.credentials.provider.PendingIntentHandler.retrieveProviderGetCredentialRequest(intent);
                if (providerRequest != null) {
                    for (androidx.credentials.CredentialOption option : providerRequest.getCredentialOptions()) {
                        if (option instanceof androidx.credentials.GetPublicKeyCredentialOption) {
                            androidx.credentials.GetPublicKeyCredentialOption pkOption =
                                    (androidx.credentials.GetPublicKeyCredentialOption) option;
                            String requestJson = pkOption.getRequestJson();
                            SecureLog.d(TAG, "Passkey request JSON: " + requestJson);
                            JSONObject json = new JSONObject(requestJson);
                            passkeyRpId = json.optString("rpId", "");
                            webDomain = passkeyRpId; // Use rpId as domain for credential filtering

                            // Extract challenge for fallback clientDataJSON construction
                            String challengeB64 = json.optString("challenge", "");
                            if (!challengeB64.isEmpty()) {
                                passkeyChallenge = Base64URLUtils.decode(challengeB64);
                            }

                            passkeyCaller = PasskeyCaller.plan(
                                    providerRequest.getCallingAppInfo(), pkOption.getClientDataHash());
                            SecureLog.d(TAG, "Passkey rpId: " + passkeyRpId);
                            break;
                        }
                    }
                }
            } catch (Exception e) {
                SecureLog.e(TAG, "Error parsing passkey request: " + e.getMessage());
            }
            if (passkeyCaller == null) {
                SecureLog.e(TAG, "Refusing passkey assertion: caller not identified");
                onCancel();
                return;
            }
        }

        if (webDomain != null) {
            SecureLog.d(TAG, "Received web domain: " + webDomain);
        }
        if (packageName != null) {
            SecureLog.d(TAG, "Received package name: " + packageName);
        }

        // Restore critical state if activity was recreated
        if (savedInstanceState != null) {
            hasPasswordSet = savedInstanceState.getBoolean(STATE_HAS_PASSWORD_SET, false);
            hasInitializedOnce = savedInstanceState.getBoolean(STATE_HAS_INITIALIZED_ONCE, false);
            SecureLog.d(TAG, "Restored state - hasPasswordSet: " + hasPasswordSet +
                               ", hasInitializedOnce: " + hasInitializedOnce);
        }

        initialize();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        readAutofillExtras(intent);
        Fragment current = getSupportFragmentManager().findFragmentById(R.id.fragment_container);
        if (current instanceof CombinedItemsFragment) {
            hasNavigated.set(false);
            navigateToVaultSelection();
        }
    }

    @SuppressWarnings("deprecation")
    private void readAutofillExtras(Intent intent) {
        if (intent == null) return;
        usernameId = intent.getParcelableExtra(AutofillConstants.EXTRA_USERNAME_ID);
        passwordId = intent.getParcelableExtra(AutofillConstants.EXTRA_PASSWORD_ID);
        otpId = intent.getParcelableExtra(AutofillConstants.EXTRA_OTP_ID);
        cardNumberId = intent.getParcelableExtra(AutofillConstants.EXTRA_CARD_NUMBER_ID);
        cardExpiryDateId = intent.getParcelableExtra(AutofillConstants.EXTRA_CARD_EXPIRY_DATE_ID);
        cardExpiryMonthId = intent.getParcelableExtra(AutofillConstants.EXTRA_CARD_EXPIRY_MONTH_ID);
        cardExpiryYearId = intent.getParcelableExtra(AutofillConstants.EXTRA_CARD_EXPIRY_YEAR_ID);
        cardSecurityCodeId = intent.getParcelableExtra(AutofillConstants.EXTRA_CARD_SECURITY_CODE_ID);
        cardholderNameId = intent.getParcelableExtra(AutofillConstants.EXTRA_CARDHOLDER_NAME_ID);
        identityNameId = intent.getParcelableExtra(AutofillConstants.EXTRA_IDENTITY_NAME_ID);
        identityPhoneId = intent.getParcelableExtra(AutofillConstants.EXTRA_IDENTITY_PHONE_ID);
        identityAddressId = intent.getParcelableExtra(AutofillConstants.EXTRA_IDENTITY_ADDRESS_ID);
        identityPostalId = intent.getParcelableExtra(AutofillConstants.EXTRA_IDENTITY_POSTAL_ID);
        identityCityId = intent.getParcelableExtra(AutofillConstants.EXTRA_IDENTITY_CITY_ID);
        identityRegionId = intent.getParcelableExtra(AutofillConstants.EXTRA_IDENTITY_REGION_ID);
        identityCountryId = intent.getParcelableExtra(AutofillConstants.EXTRA_IDENTITY_COUNTRY_ID);
        ArrayList<AutofillId> extrasFallbacks =
                intent.getParcelableArrayListExtra(AutofillConstants.EXTRA_FALLBACK_IDS);
        fallbackIds = extrasFallbacks != null ? extrasFallbacks : new ArrayList<>();
        webDomain = intent.getStringExtra(AutofillConstants.EXTRA_WEB_DOMAIN);
        preselectRecordId = intent.getStringExtra(AutofillConstants.EXTRA_PRESELECT_RECORD_ID);
        packageName = intent.getStringExtra(AutofillConstants.EXTRA_PACKAGE_NAME);
        if (otpId != null) {
            SecureLog.d(TAG, "OTP field present");
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        outState.putBoolean(STATE_HAS_PASSWORD_SET, hasPasswordSet);
        outState.putBoolean(STATE_HAS_INITIALIZED_ONCE, hasInitializedOnce);
        SecureLog.d(TAG, "Saved state - hasPasswordSet: " + hasPasswordSet);
    }

    @Override
    public void navigateToMasterPassword() {
        // Check if we're already showing MasterPasswordFragment
        Fragment currentFragment = getSupportFragmentManager().findFragmentById(R.id.fragment_container);
        if (currentFragment instanceof MasterPasswordFragment) {
            SecureLog.d(TAG, "Already on MasterPasswordFragment, skipping navigation");
            return;
        }

        Fragment fragment = new MasterPasswordFragment();
        replaceFragment(fragment, false);
    }

    @Override
    public void navigateToVaultSelection() {
        String recordType = CredentialItem.TYPE_LOGIN;
        if (hasCardFields()) {
            recordType = CredentialItem.TYPE_CREDIT_CARD;
        } else if (hasIdentityFields() && !hasLoginFields()) {
            recordType = CredentialItem.TYPE_IDENTITY;
        }
        replaceFragment(CombinedItemsFragment.newInstance(
                CombinedItemsFragment.MODE_ASSERTION,
                webDomain, packageName, null, null, recordType,
                otpId != null, preselectRecordId), true);
    }

    private boolean hasCardFields() {
        return cardNumberId != null
                || cardExpiryDateId != null
                || cardExpiryMonthId != null
                || cardExpiryYearId != null
                || cardSecurityCodeId != null
                || cardholderNameId != null;
    }

    private boolean hasIdentityFields() {
        return identityNameId != null
                || identityPhoneId != null
                || identityAddressId != null
                || identityPostalId != null
                || identityCityId != null
                || identityRegionId != null
                || identityCountryId != null;
    }

    private boolean hasLoginFields() {
        return usernameId != null
                || passwordId != null
                || otpId != null
                || (fallbackIds != null && !fallbackIds.isEmpty());
    }

    // Bottom sheet over the caller. Must float (see AutofillFillWindow).
    private void applyPartialHeightWindow() {
        try {
            android.view.Window window = getWindow();
            if (window == null) return;
            int screenHeight = getResources().getDisplayMetrics().heightPixels;
            int targetHeight = AutofillFillWindow.overlayHeightPx(screenHeight);
            android.view.WindowManager.LayoutParams params = window.getAttributes();
            params.width = AutofillFillWindow.overlayWidth();
            params.height = targetHeight;
            params.gravity = AutofillFillWindow.overlayGravity();
            params.dimAmount = AutofillFillWindow.DIM_AMOUNT;
            window.setAttributes(params);
            window.setLayout(AutofillFillWindow.overlayWidth(), targetHeight);
            window.addFlags(android.view.WindowManager.LayoutParams.FLAG_DIM_BEHIND);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                window.setDecorFitsSystemWindows(false);
            }
            window.setStatusBarColor(android.graphics.Color.TRANSPARENT);
            window.setNavigationBarColor(android.graphics.Color.TRANSPARENT);
            applyBottomNavBarInset();
        } catch (Exception e) {
            SecureLog.e(TAG, "Error applying partial-height window", e);
        }
    }

    private void applyBottomNavBarInset() {
        android.view.View root = findViewById(R.id.fragment_container);
        if (root == null) return;
        ViewCompat.setOnApplyWindowInsetsListener(root, (v, insets) -> {
            int bottom = insets.getInsets(WindowInsetsCompat.Type.navigationBars()).bottom;
            v.setPadding(v.getPaddingLeft(), v.getPaddingTop(), v.getPaddingRight(), bottom);
            return insets;
        });
    }

    @Override
    public void onCredentialSelected(CredentialItem credential) {
        if (credential.isCreditCard() || credential.isIdentity()
                || otpId == null || vaultClient == null) {
            completeCredentialFill(credential);
            return;
        }
        vaultClient.generateOtpCode(credential.getId()).whenComplete((code, error) -> {
            if (error == null && code != null) {
                credential.setOtpCode(code);
            } else if (error != null) {
                SecureLog.e(TAG, "OTP generate failed", error);
            }
            runOnUiThread(() -> completeCredentialFill(credential));
        });
    }

    private void completeCredentialFill(CredentialItem credential) {
        if (isFinishing() || isDestroyed()) {
            return;
        }
        Dataset.Builder datasetBuilder = new Dataset.Builder();

        RemoteViews presentation = new RemoteViews(getPackageName(), android.R.layout.simple_list_item_1);
        presentation.setTextViewText(android.R.id.text1, credential.getTitle());

        if (credential.isCreditCard()) {
            applyCardValues(datasetBuilder, credential, presentation);
        } else if (credential.isIdentity()) {
            applyIdentityValues(datasetBuilder, credential, presentation);
        } else {
            applyLoginValues(datasetBuilder, credential, presentation);
        }

        AutofillUnlockSession.get().touch();

        Dataset dataset;
        try {
            dataset = datasetBuilder.build();
        } catch (IllegalStateException e) {
            SecureLog.e(TAG, "No autofill targets on credential select", e);
            setResult(Activity.RESULT_CANCELED);
            finish();
            return;
        }

        Intent replyIntent = new Intent();
        replyIntent.putExtra(AutofillManager.EXTRA_AUTHENTICATION_RESULT, dataset);

        setResult(Activity.RESULT_OK, replyIntent);
        finish();
    }

    private void applyLoginValues(
            Dataset.Builder datasetBuilder,
            CredentialItem credential,
            RemoteViews presentation
    ) {
        Map<String, String> planned = LoginFillPlan.values(
                usernameId != null,
                passwordId != null,
                otpId != null,
                fallbackIds == null ? 0 : fallbackIds.size(),
                credential.getUsername(),
                credential.getPassword(),
                credential.getOtpCode()
        );
        if (planned.containsKey(LoginFillPlan.USERNAME) && usernameId != null) {
            datasetBuilder.setValue(
                    usernameId,
                    AutofillValue.forText(planned.get(LoginFillPlan.USERNAME)),
                    presentation
            );
        }
        if (planned.containsKey(LoginFillPlan.PASSWORD) && passwordId != null) {
            datasetBuilder.setValue(
                    passwordId,
                    AutofillValue.forText(planned.get(LoginFillPlan.PASSWORD)),
                    presentation
            );
        }
        if (planned.containsKey(LoginFillPlan.OTP) && otpId != null) {
            datasetBuilder.setValue(
                    otpId,
                    AutofillValue.forText(planned.get(LoginFillPlan.OTP)),
                    presentation
            );
        }
        if (planned.containsKey(LoginFillPlan.FALLBACK_0) && fallbackIds != null && !fallbackIds.isEmpty()) {
            datasetBuilder.setValue(
                    fallbackIds.get(0),
                    AutofillValue.forText(planned.get(LoginFillPlan.FALLBACK_0)),
                    presentation
            );
        }
        if (planned.containsKey(LoginFillPlan.FALLBACK_1) && fallbackIds != null && fallbackIds.size() >= 2) {
            datasetBuilder.setValue(
                    fallbackIds.get(1),
                    AutofillValue.forText(planned.get(LoginFillPlan.FALLBACK_1)),
                    presentation
            );
        }
    }

    private void applyIdentityValues(
            Dataset.Builder datasetBuilder,
            CredentialItem credential,
            RemoteViews presentation
    ) {
        Map<String, String> planned = IdentityFillPlan.values(
                identityNameId != null,
                identityPhoneId != null,
                identityAddressId != null,
                identityPostalId != null,
                identityCityId != null,
                identityRegionId != null,
                identityCountryId != null,
                credential.getFullName(),
                credential.getPhoneNumber(),
                credential.getAddress(),
                credential.getZip(),
                credential.getCity(),
                credential.getRegion(),
                credential.getCountry()
        );
        setIdentityValue(datasetBuilder, identityNameId, planned.get(IdentityFillPlan.NAME), presentation);
        setIdentityValue(datasetBuilder, identityPhoneId, planned.get(IdentityFillPlan.PHONE), presentation);
        setIdentityValue(datasetBuilder, identityAddressId, planned.get(IdentityFillPlan.ADDRESS), presentation);
        setIdentityValue(datasetBuilder, identityPostalId, planned.get(IdentityFillPlan.POSTAL), presentation);
        setIdentityValue(datasetBuilder, identityCityId, planned.get(IdentityFillPlan.CITY), presentation);
        setIdentityValue(datasetBuilder, identityRegionId, planned.get(IdentityFillPlan.REGION), presentation);
        setIdentityValue(datasetBuilder, identityCountryId, planned.get(IdentityFillPlan.COUNTRY), presentation);
    }

    private static void setIdentityValue(
            Dataset.Builder datasetBuilder,
            AutofillId id,
            String value,
            RemoteViews presentation
    ) {
        if (id == null || value == null) {
            return;
        }
        datasetBuilder.setValue(id, AutofillValue.forText(value), presentation);
    }

    private void applyCardValues(Dataset.Builder builder, CredentialItem credential, RemoteViews presentation) {
        if (cardNumberId != null) {
            String digits = credential.getCardNumber() != null
                    ? credential.getCardNumber().replaceAll("\\s", "")
                    : "";
            builder.setValue(cardNumberId, AutofillValue.forText(digits), presentation);
        }

        String expire = credential.getCardExpireDate();
        String[] expiryParts = splitExpiry(expire);
        if (cardExpiryDateId != null && expire != null) {
            builder.setValue(cardExpiryDateId, AutofillValue.forText(expire), presentation);
        }
        if (cardExpiryMonthId != null && expiryParts[0] != null) {
            builder.setValue(cardExpiryMonthId, AutofillValue.forText(expiryParts[0]), presentation);
        }
        if (cardExpiryYearId != null && expiryParts[1] != null) {
            builder.setValue(cardExpiryYearId, AutofillValue.forText(expiryParts[1]), presentation);
        }
        if (cardSecurityCodeId != null && credential.getCardSecurityCode() != null) {
            builder.setValue(cardSecurityCodeId,
                    AutofillValue.forText(credential.getCardSecurityCode()), presentation);
        }
        if (cardholderNameId != null && credential.getCardholderName() != null) {
            builder.setValue(cardholderNameId,
                    AutofillValue.forText(credential.getCardholderName()), presentation);
        }
    }

    private static String[] splitExpiry(String expire) {
        String[] out = new String[]{null, null};
        if (expire == null) return out;
        String trimmed = expire.trim();
        if (trimmed.isEmpty()) return out;
        String[] parts = trimmed.split("[/\\-\\s]");
        if (parts.length >= 2) {
            out[0] = parts[0];
            out[1] = parts[1];
            if (out[1].length() == 2) out[1] = "20" + out[1];
        } else if (trimmed.length() == 4) {
            out[0] = trimmed.substring(0, 2);
            out[1] = "20" + trimmed.substring(2);
        }
        return out;
    }

    @Override
    public void onPasskeySelected(CredentialItem credential) {
        if (!isPasskeyAssertion) {
            SecureLog.w(TAG, "onPasskeySelected called but not in passkey assertion mode");
            return;
        }
        completePasskeyAssertion(credential);
    }

    /**
     * Complete passkey assertion by signing with the private key and returning the response.
     */
    private void completePasskeyAssertion(CredentialItem credential) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            SecureLog.e(TAG, "Passkey assertion requires API 34+");
            onCancel();
            return;
        }

        CompletableFuture.runAsync(() -> {
            try {
                SecureLog.d(TAG, "Starting passkey assertion for credential: " + credential.getCredentialId());

                // Import the private key from the credential
                String privateKeyB64 = credential.getPrivateKeyBuffer();
                if (privateKeyB64 == null || privateKeyB64.isEmpty()) {
                    throw new Exception("No private key found in credential");
                }

                PrivateKey privateKey = PasskeyCrypto.importPrivateKey(privateKeyB64);

                // Build authenticator data for assertion
                String rpId = passkeyRpId != null ? passkeyRpId : webDomain;
                byte[] authData = AuthenticatorDataBuilder.buildForAssertion(rpId);

                // A privileged browser supplied the hash of its own clientDataJSON;
                // anyone else gets clientDataJSON bound to their apk-key-hash origin.
                if (passkeyCaller == null) {
                    throw new Exception("Passkey caller not identified");
                }
                byte[] clientDataHash;
                byte[] clientDataJSON;
                if (passkeyCaller.clientDataHash != null) {
                    clientDataHash = passkeyCaller.clientDataHash;
                    clientDataJSON = null; // The browser fills this in the final response
                } else if (passkeyChallenge != null && passkeyChallenge.length > 0) {
                    clientDataJSON = AuthenticatorDataBuilder.buildClientDataJSONForAssertion(
                            passkeyChallenge, passkeyCaller.origin);
                    clientDataHash = PasskeyCrypto.sha256(clientDataJSON);
                } else {
                    throw new Exception("No clientDataHash from the browser and no challenge in request");
                }

                // Sign the assertion
                String signature = PasskeyCrypto.signAssertion(privateKey, authData, clientDataHash);

                // Build response JSON
                JSONObject responseJson = new JSONObject();
                responseJson.put("id", credential.getCredentialId());
                responseJson.put("rawId", credential.getCredentialId());
                responseJson.put("type", "public-key");

                JSONObject responseBody = new JSONObject();
                responseBody.put("authenticatorData", Base64URLUtils.encode(authData));
                // Include clientDataJSON if we built it ourselves; otherwise empty (system fills it)
                responseBody.put("clientDataJSON",
                        clientDataJSON != null ? Base64URLUtils.encode(clientDataJSON) : "");
                responseBody.put("signature", signature);
                responseBody.put("userHandle", credential.getUserId() != null ? credential.getUserId() : "");
                responseJson.put("response", responseBody);

                JSONObject clientExtResults = new JSONObject();
                responseJson.put("clientExtensionResults", clientExtResults);
                responseJson.put("authenticatorAttachment", "platform");

                String jsonResponse = responseJson.toString();
                SecureLog.d(TAG, "Passkey assertion response built successfully");

                runOnUiThread(() -> {
                    try {
                        Intent resultData = new Intent();
                        androidx.credentials.PublicKeyCredential publicKeyCredential =
                                new androidx.credentials.PublicKeyCredential(jsonResponse);
                        androidx.credentials.GetCredentialResponse getCredentialResponse =
                                new androidx.credentials.GetCredentialResponse(publicKeyCredential);
                        androidx.credentials.provider.PendingIntentHandler.setGetCredentialResponse(
                                resultData, getCredentialResponse);

                        setResult(Activity.RESULT_OK, resultData);
                        finish();
                    } catch (Exception e) {
                        SecureLog.e(TAG, "Error setting passkey response: " + e.getMessage());
                        onCancel();
                    }
                });

            } catch (Exception e) {
                SecureLog.e(TAG, "Error completing passkey assertion: " + e.getMessage());
                e.printStackTrace();
                runOnUiThread(this::onCancel);
            }
        });
    }

    /**
     * Check if this activity is in passkey assertion mode.
     */
    public boolean isPasskeyAssertionMode() {
        return isPasskeyAssertion;
    }

    /**
     * Get the passkey RP ID for filtering credentials.
     */
    public String getPasskeyRpId() {
        return passkeyRpId;
    }

    @Override
    public void onCancel() {
        setResult(Activity.RESULT_CANCELED);
        finish();
    }

    private void replaceFragment(Fragment fragment, boolean addToBackStack) {
        FragmentTransaction transaction = getSupportFragmentManager().beginTransaction();
        transaction.setCustomAnimations(
            R.anim.slide_in_right,
            R.anim.slide_out_left,
            R.anim.slide_in_left,
            R.anim.slide_out_right
        );
        transaction.replace(R.id.fragment_container, fragment);

        if (addToBackStack) {
            transaction.addToBackStack(null);
        }

        transaction.commit();
    }

    @Override
    public void onBackPressed() {
        if (getSupportFragmentManager().getBackStackEntryCount() > 0) {
            getSupportFragmentManager().popBackStack();
        } else {
            onCancel();
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        // BiometricPrompt pauses this host without finishing it. Do not
        // close the worklet or strip the fill sheet here.
        if (AutofillHostTeardown.shouldReleaseWorklet(isFinishing())) {
            cleanup();
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (vaultClient == null && !isFinishing()) {
            initialize();
        }
    }

    /**
     * Initialize the vault client and navigate to appropriate screen
     */
    private void initialize() {
        if (vaultClient != null) {
            return; // Already initialized
        }

        vaultClient = new PearPassVaultClient(this, null, true);

        SecureLog.d(TAG, "Starting vault initialization...");
        VaultInitializer.initialize(vaultClient, new VaultInitializer.Callback() {
            @Override
            public void onSuccess(VaultInitializer.VaultInitState state) {
                runOnUiThread(() -> handleInitSuccess(state));
            }

            @Override
            public void onError(VaultInitializer.VaultInitError error, Exception exception) {
                SecureLog.e(TAG, "Initialization error: " + error + " - " + exception.getMessage());
                exception.printStackTrace();
                handleInitError(error, exception);
            }
        });
    }

    /**
     * Handle successful initialization
     */
    private void handleInitSuccess(VaultInitializer.VaultInitState state) {
        // Only navigate if we haven't already navigated
        if (!hasNavigated.compareAndSet(false, true)) {
            SecureLog.d(TAG, "Already navigated, skipping navigation");
            return;
        }

        this.hasPasswordSet = state.hasPasswordSet;
        this.isLoggedIn = state.isLoggedIn;
        this.isVaultOpen = state.isVaultOpen;
        this.isLoading = false;

        SecureLog.d(TAG, "User initialization complete");
        SecureLog.d(TAG, "  - hasPasswordSet: " + state.hasPasswordSet);
        SecureLog.d(TAG, "  - isLoggedIn: " + state.isLoggedIn);
        SecureLog.d(TAG, "  - isVaultOpen: " + state.isVaultOpen);

        // Set the appropriate flow based on password configuration
        if (!state.hasPasswordSet) {
            SecureLog.d(TAG, "Setting flow to missingConfiguration (passwordSet=false)");
            navigateToMissingConfiguration();
        } else if (!state.isLoggedIn) {
            if (AutofillUnlockSession.get().isUnlocked()) {
                SecureLog.d(TAG, "Session unlocked, skipping master password");
                navigateToVaultSelection();
            } else {
                SecureLog.d(TAG, "Setting flow to masterPassword (passwordSet=true, loggedIn=false)");
                navigateToMasterPassword();
            }
        } else {
            SecureLog.d(TAG, "User is logged in, navigating to vault selection");
            navigateToVaultSelection();
        }

        // Reset initialization state after flow is set
        isInitializing.set(false);
        initRetryCount = 0; // Reset retry counter on success
        hasInitializedOnce = true;
    }

    /**
     * Handle initialization error with retry logic for lock errors
     */
    private void handleInitError(VaultInitializer.VaultInitError error, Exception exception) {
        boolean isLockError = error == VaultInitializer.VaultInitError.VAULT_LOCKED;

        if (isLockError && initRetryCount < MAX_INIT_RETRIES) {
            // Database lock error - retry after a delay
            initRetryCount++;
            int delayMs = initRetryCount * 300; // 300ms, 600ms, 900ms, etc.

            SecureLog.w(TAG, "Database lock detected, retrying in " + delayMs + "ms (attempt " + initRetryCount + "/" + MAX_INIT_RETRIES + ")");

            runOnUiThread(() -> {
                isInitializing.set(false);
                // Keep loading state - don't set isLoading = false
            });

            // Retry after delay
            new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(() -> {
                SecureLog.d(TAG, "Retrying initialization after database lock");
                retryInitializeUser();
            }, delayMs);

            return;
        }

        // Not a lock error or max retries reached - handle normally
        if (isLockError) {
            SecureLog.e(TAG, "Max retries reached for database lock, showing error");
        }

        // Try to at least check if password is set
        boolean passwordSet = VaultInitializer.tryCheckPasswordSet(vaultClient);
        boolean couldCheckPassword = passwordSet || vaultClient != null;

        final boolean finalPasswordSet = passwordSet;
        final boolean finalCouldCheck = couldCheckPassword;
        final boolean finalIsLockError = isLockError;

        runOnUiThread(() -> {
            // Only navigate if we haven't already navigated
            if (!hasNavigated.compareAndSet(false, true)) {
                SecureLog.d(TAG, "Already navigated, skipping error navigation");
                return;
            }

            // Only update hasPasswordSet if we could actually check it
            // Otherwise keep the saved state or assume password is set (safer default)
            if (finalCouldCheck) {
                this.hasPasswordSet = finalPasswordSet;
            } else if (!hasInitializedOnce) {
                // No saved state and couldn't check - assume password is set
                // This is safer than assuming it's not set and showing onboarding
                this.hasPasswordSet = true;
                SecureLog.d(TAG, "Error handler - Could not verify password status, assuming set to avoid onboarding");
            }
            this.isLoggedIn = false;
            this.isVaultOpen = false;
            this.isLoading = false;

            // Only show missing configuration if we're CERTAIN password is not set
            if (!this.hasPasswordSet && finalCouldCheck) {
                SecureLog.d(TAG, "Error handler - Setting flow to missingConfiguration (passwordSet=false, confirmed)");
                navigateToMissingConfiguration();
            } else if (AutofillUnlockSession.get().isUnlocked()) {
                SecureLog.d(TAG, "Error handler - Session unlocked, showing cached logins");
                navigateToVaultSelection();
            } else if (this.hasPasswordSet && finalCouldCheck) {
                // Password is set and we confirmed it - show master password screen
                SecureLog.d(TAG, "Error handler - Setting flow to masterPassword (passwordSet=true, confirmed)");
                navigateToMasterPassword();
            } else if (finalIsLockError) {
                // Lock error and couldn't determine state - show vault locked error
                SecureLog.d(TAG, "Error handler - Vault locked by another instance, showing lock error");
                navigateToErrorBoundary(ErrorBoundaryFragment.ErrorType.VAULT_LOCKED_ERROR);
            } else {
                // Could not determine state reliably - show error boundary
                SecureLog.d(TAG, "Error handler - Could not reliably determine user state, showing error boundary");
                navigateToErrorBoundary(ErrorBoundaryFragment.ErrorType.VAULT_CLIENT_ERROR);
            }

            // Reset initialization state after flow is set
            isInitializing.set(false);
            initRetryCount = 0; // Reset retry counter
            hasInitializedOnce = true;
        });
    }

    /**
     * Retry user initialization (used for lock error retries)
     */
    private void retryInitializeUser() {
        if (vaultClient == null) {
            SecureLog.e(TAG, "Cannot retry initialization - vault client is null");
            return;
        }

        VaultInitializer.initializeUser(vaultClient)
            .whenComplete((state, error) -> {
                if (error != null) {
                    Exception ex = error instanceof Exception ?
                            (Exception) error : new Exception(error);
                    VaultInitializer.VaultInitError errorType = VaultInitializer.classifyError(ex);
                    handleInitError(errorType, ex);
                } else {
                    runOnUiThread(() -> handleInitSuccess(state));
                }
            });
    }

    /**
     * Navigate to missing configuration screen
     */
    public void navigateToMissingConfiguration() {
        // Check if we're already showing MissingConfigurationFragment
        Fragment currentFragment = getSupportFragmentManager().findFragmentById(R.id.fragment_container);
        if (currentFragment instanceof MissingConfigurationFragment) {
            SecureLog.d(TAG, "Already on MissingConfigurationFragment, skipping navigation");
            return;
        }

        Fragment fragment = new MissingConfigurationFragment();
        replaceFragment(fragment, false);
    }

    /**
     * Navigate to error boundary screen with a specific error type
     */
    public void navigateToErrorBoundary(ErrorBoundaryFragment.ErrorType errorType) {
        Fragment fragment = ErrorBoundaryFragment.newInstance(errorType);
        replaceFragment(fragment, false);
    }

    /**
     * Navigate to error boundary screen with custom error details
     */
    public void navigateToErrorBoundary(String icon, String title, String subtitle, String message) {
        Fragment fragment = ErrorBoundaryFragment.newInstance(icon, title, subtitle, message);
        replaceFragment(fragment, false);
    }

    /**
     * Get the vault client instance for fragments to use
     */
    public PearPassVaultClient getVaultClient() {
        return vaultClient;
    }

    /**
     * Cleanup when the activity is destroyed
     */
    @Override
    protected void onDestroy() {
        super.onDestroy();

        // Only cleanup if the activity is actually finishing
        // Don't cleanup if user just backgrounds the app - they might resume
        if (AutofillHostTeardown.shouldReleaseWorklet(isFinishing())) {
            AutofillHostTeardown.setFillHostVisible(false);
            SecureLog.d(TAG, "Activity is finishing, performing cleanup");
            cleanup();
        } else {
            SecureLog.d(TAG, "Activity destroyed but not finishing (might resume) - keeping vault client");
        }
    }

    /**
     * Cleanup the vault client resources
     */
    private void cleanup() {
        if (vaultClient == null) {
            return;
        }

        SecureLog.d(TAG, "Cleaning up vault client...");

        final PearPassVaultClient clientToClose = vaultClient;
        vaultClient = null; // Clear reference immediately to prevent reuse

        try {
            // Wait synchronously for cleanup to complete
            // We MUST wait to ensure the database is released before onResume creates a new worklet
            // Shutdown is now synchronous so it should complete quickly (< 500ms)
            clientToClose.closeAllInstances().get(500, java.util.concurrent.TimeUnit.MILLISECONDS);
            SecureLog.d(TAG, "Cleanup completed successfully");
        } catch (java.util.concurrent.TimeoutException e) {
            SecureLog.w(TAG, "Cleanup timed out after 500ms, continuing anyway");
        } catch (Exception e) {
            SecureLog.w(TAG, "Error during cleanup: " + e.getMessage());
        }
    }
}
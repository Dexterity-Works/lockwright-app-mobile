package com.pears.pass.autofill.service;

import android.app.PendingIntent;
import android.content.Intent;
import android.content.IntentSender;
import android.graphics.drawable.Icon;
import android.net.Uri;
import android.os.Build;
import android.os.CancellationSignal;
import android.service.autofill.AutofillService;
import android.service.autofill.Dataset;
import android.service.autofill.FillCallback;
import android.service.autofill.FillRequest;
import android.service.autofill.FillResponse;
import android.service.autofill.InlinePresentation;
import android.service.autofill.SaveCallback;
import android.service.autofill.SaveRequest;
import android.view.autofill.AutofillId;
import android.view.autofill.AutofillValue;
import android.widget.RemoteViews;
import android.widget.inline.InlinePresentationSpec;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.annotation.RequiresApi;
import androidx.autofill.inline.UiVersions;
import androidx.autofill.inline.v1.InlineSuggestionUi;

import com.pears.pass.autofill.data.AutofillUnlockSession;
import com.pears.pass.autofill.data.CredentialItem;
import com.pears.pass.autofill.ui.AuthenticationActivity;
import com.pears.pass.autofill.utils.AutofillConstants;
import com.pears.pass.autofill.utils.AutofillFillWindow;
import com.pears.pass.autofill.utils.AutofillHelper;
import com.pears.pass.autofill.utils.AutofillHostTeardown;
import com.pears.pass.autofill.utils.ChipFillDecision;
import com.pears.pass.autofill.utils.LoginFillPlan;
import com.pears.pass.autofill.utils.SecureLog;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RequiresApi(api = Build.VERSION_CODES.O)
public class PearPassAutofillService extends AutofillService {
    private static final String TAG = "PearPassAutofill";

    @Override
    public void onFillRequest(@NonNull FillRequest request, @NonNull CancellationSignal cancellationSignal, @NonNull FillCallback callback) {
        try {
            AutofillHelper.ParsedFields parsedFields = AutofillHelper.parseFillRequest(request);
            if (parsedFields == null) {
                callback.onSuccess(null);
                return;
            }

            boolean hasSpecificFields = parsedFields.hasUsernameField()
                    || parsedFields.hasPasswordField()
                    || parsedFields.hasOtpField()
                    || parsedFields.hasIdentityField();
            boolean hasCardFields = parsedFields.hasCardField();
            boolean hasFallbackFields = parsedFields.hasAnyFallbackField();

            if (!hasSpecificFields && !hasCardFields && !hasFallbackFields) {
                callback.onSuccess(null);
                return;
            }

            List<AutofillId> targetIds = parsedFields.getFillTargetIds();
            if (targetIds.isEmpty()) {
                callback.onSuccess(null);
                return;
            }

            if (!AutofillHostTeardown.shouldReplaceFillResponse()) {
                callback.onSuccess(null);
                return;
            }

            AutofillUnlockSession session = AutofillUnlockSession.get();
            boolean identityOnly = parsedFields.hasIdentityField()
                    && !parsedFields.hasUsernameField()
                    && !parsedFields.hasPasswordField()
                    && !parsedFields.hasOtpField();
            if (session.isUnlocked() && !hasCardFields && !identityOnly) {
                session.touch();
                FillResponse unlocked = buildUnlockedResponse(request, parsedFields, targetIds);
                if (unlocked != null) {
                    callback.onSuccess(unlocked);
                    return;
                }
                callback.onSuccess(buildLockedResponse(request, parsedFields, targetIds,
                        hasSpecificFields || hasCardFields, "Open"));
                return;
            }

            callback.onSuccess(buildLockedResponse(request, parsedFields, targetIds,
                    hasSpecificFields || hasCardFields, "Unlock to fill"));
        } catch (Exception e) {
            SecureLog.e(TAG, "onFillRequest failed", e);
            try {
                callback.onSuccess(null);
            } catch (Exception ignored) {
                // Callback may already have been invoked.
            }
        }
    }

    @Nullable
    private FillResponse buildUnlockedResponse(
            FillRequest request,
            AutofillHelper.ParsedFields parsedFields,
            List<AutofillId> targetIds
    ) {
        InlineRequest inline = readInlineRequest(request);
        int maxDatasets = inline != null ? Math.max(1, inline.maxCount) : 4;
        int loginSlots = maxDatasets > 1 ? maxDatasets - 1 : maxDatasets;

        List<CredentialItem> matches = AutofillUnlockSession.get().matchingLogins(
                parsedFields.getWebDomain(),
                parsedFields.getPackageName(),
                loginSlots
        );
        if (matches.isEmpty()) {
            return null;
        }

        int flags = pendingIntentFlags();
        int requestCode = requestCodeFor(parsedFields);
        FillResponse.Builder responseBuilder = new FillResponse.Builder();

        for (int i = 0; i < matches.size(); i++) {
            CredentialItem item = matches.get(i);
            String title = chipTitle(item);
            String subtitle = ChipFillDecision.subtitle(
                    item.getTitle(),
                    parsedFields.hasOtpField(),
                    item.hasOtp()
            );
            RemoteViews presentation = dropdownPresentation(title);
            InlinePresentation inlinePresentation = null;
            if (inline != null) {
                inlinePresentation = buildCredentialInline(
                        inline.specAt(i),
                        requestCode + 20 + i,
                        flags,
                        title,
                        subtitle
                );
            }
            if (ChipFillDecision.openAppForTotp(parsedFields.hasOtpField(), item.hasOtp())) {
                responseBuilder.addDataset(buildAuthDataset(
                        request, parsedFields, targetIds, requestCode + 40 + i, flags,
                        inline, title, subtitle, true, item.getId()
                ));
                continue;
            }
            Dataset.Builder datasetBuilder = new Dataset.Builder();
            applyLoginValues(datasetBuilder, parsedFields, targetIds, item, presentation, inlinePresentation);
            responseBuilder.addDataset(datasetBuilder.build());
        }

        if (maxDatasets > matches.size()) {
            responseBuilder.addDataset(buildAuthDataset(
                    request, parsedFields, targetIds, requestCode, flags,
                    inline,
                    "Lockwright",
                    "More",
                    hasSpecificFields(parsedFields),
                    null
            ));
        }

        return responseBuilder.build();
    }

    private FillResponse buildLockedResponse(
            FillRequest request,
            AutofillHelper.ParsedFields parsedFields,
            List<AutofillId> targetIds,
            boolean pinChip,
            String subtitle
    ) {
        int flags = pendingIntentFlags();
        int requestCode = requestCodeFor(parsedFields);
        Dataset authDataset = buildAuthDataset(
                request, parsedFields, targetIds, requestCode, flags,
                readInlineRequest(request),
                "Lockwright",
                subtitle,
                pinChip,
                null
        );
        return new FillResponse.Builder().addDataset(authDataset).build();
    }

    private Dataset buildAuthDataset(
            FillRequest request,
            AutofillHelper.ParsedFields parsedFields,
            List<AutofillId> targetIds,
            int requestCode,
            int flags,
            @Nullable InlineRequest inline,
            String title,
            String subtitle,
            boolean pinChip,
            @Nullable String preselectRecordId
    ) {
        Intent authIntent = new Intent(this, AuthenticationActivity.class);
        putFieldExtras(authIntent, parsedFields);
        if (preselectRecordId != null && !preselectRecordId.isEmpty()) {
            authIntent.putExtra(AutofillConstants.EXTRA_PRESELECT_RECORD_ID, preselectRecordId);
        }
        authIntent.setData(Uri.parse("pearpass://autofill/" + requestCode));

        IntentSender sender = PendingIntent.getActivity(this, requestCode, authIntent, flags).getIntentSender();
        RemoteViews presentation = dropdownPresentation(title + " — " + subtitle);
        InlinePresentation inlinePresentation = null;
        if (inline != null) {
            PendingIntent pendingIntent = PendingIntent.getActivity(this, requestCode + 1, authIntent, flags);
            inlinePresentation = slicePresentation(
                    inline.specAt(0), pendingIntent, title, subtitle, pinChip, android.R.drawable.ic_lock_lock);
        }

        Dataset.Builder datasetBuilder = new Dataset.Builder();
        for (AutofillId targetId : targetIds) {
            setDatasetValue(datasetBuilder, targetId,
                    AutofillConstants.PLACEHOLDER_PASSWORD, presentation, inlinePresentation);
        }
        datasetBuilder.setAuthentication(sender);
        return datasetBuilder.build();
    }

    private void applyLoginValues(
            Dataset.Builder datasetBuilder,
            AutofillHelper.ParsedFields parsedFields,
            List<AutofillId> targetIds,
            CredentialItem credential,
            RemoteViews presentation,
            @Nullable InlinePresentation inlinePresentation
    ) {
        boolean fillOtp = false;
        Map<String, String> planned = LoginFillPlan.values(
                parsedFields.getUsernameId() != null,
                parsedFields.getPasswordId() != null,
                parsedFields.getOtpId() != null,
                parsedFields.getFallbackFieldIds() != null
                        ? parsedFields.getFallbackFieldIds().size() : 0,
                credential.getUsername(),
                credential.getPassword(),
                credential.getOtpCode(),
                fillOtp
        );
        if (planned.containsKey(LoginFillPlan.USERNAME) && parsedFields.getUsernameId() != null) {
            setDatasetValue(datasetBuilder, parsedFields.getUsernameId(),
                    planned.get(LoginFillPlan.USERNAME), presentation, inlinePresentation);
        }
        if (planned.containsKey(LoginFillPlan.PASSWORD) && parsedFields.getPasswordId() != null) {
            setDatasetValue(datasetBuilder, parsedFields.getPasswordId(),
                    planned.get(LoginFillPlan.PASSWORD), presentation, inlinePresentation);
        }
        if (planned.containsKey(LoginFillPlan.OTP) && parsedFields.getOtpId() != null) {
            setDatasetValue(datasetBuilder, parsedFields.getOtpId(),
                    planned.get(LoginFillPlan.OTP), presentation, inlinePresentation);
        }
        List<AutofillId> fallbacks = parsedFields.getFallbackFieldIds();
        if (planned.containsKey(LoginFillPlan.FALLBACK_0) && fallbacks != null && !fallbacks.isEmpty()) {
            setDatasetValue(datasetBuilder, fallbacks.get(0),
                    planned.get(LoginFillPlan.FALLBACK_0), presentation, inlinePresentation);
        }
        if (planned.containsKey(LoginFillPlan.FALLBACK_1) && fallbacks != null && fallbacks.size() >= 2) {
            setDatasetValue(datasetBuilder, fallbacks.get(1),
                    planned.get(LoginFillPlan.FALLBACK_1), presentation, inlinePresentation);
        }
        if (!planned.isEmpty()) {
            return;
        }

        for (AutofillId targetId : targetIds) {
            setDatasetValue(datasetBuilder, targetId,
                    nullToEmpty(credential.getUsername()), presentation, inlinePresentation);
        }
    }

    private static void setDatasetValue(
            Dataset.Builder datasetBuilder,
            AutofillId targetId,
            String value,
            RemoteViews presentation,
            @Nullable InlinePresentation inlinePresentation
    ) {
        if (targetId == null) return;
        if (inlinePresentation != null) {
            datasetBuilder.setValue(targetId, AutofillValue.forText(value), presentation, inlinePresentation);
        } else {
            datasetBuilder.setValue(targetId, AutofillValue.forText(value), presentation);
        }
    }

    private RemoteViews dropdownPresentation(String text) {
        RemoteViews presentation = new RemoteViews(getPackageName(), android.R.layout.simple_list_item_1);
        presentation.setTextViewText(android.R.id.text1, text);
        return presentation;
    }

    @Nullable
    private InlinePresentation buildCredentialInline(
            InlinePresentationSpec spec,
            int requestCode,
            int flags,
            String title,
            String subtitle
    ) {
        if (spec == null) return null;
        Intent click = new Intent(AutofillConstants.INLINE_CLICK_ACTION);
        click.setPackage(getPackageName());
        click.setData(Uri.parse("pearpass://autofill/inline/" + requestCode));
        int immutable = flags;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            immutable = PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;
        }
        PendingIntent pendingIntent = PendingIntent.getBroadcast(this, requestCode, click, immutable);
        return slicePresentation(spec, pendingIntent, title, subtitle, true, android.R.drawable.ic_dialog_email);
    }

    @Nullable
    private InlinePresentation slicePresentation(
            InlinePresentationSpec spec,
            PendingIntent pendingIntent,
            String title,
            String subtitle,
            boolean pinned,
            int iconRes
    ) {
        if (spec == null) return null;
        if (!UiVersions.getVersions(spec.getStyle()).contains(UiVersions.INLINE_UI_VERSION_1)) {
            return null;
        }
        Icon icon = Icon.createWithResource(this, iconRes);
        android.app.slice.Slice slice = InlineSuggestionUi.newContentBuilder(pendingIntent)
                .setTitle(title)
                .setSubtitle(subtitle)
                .setStartIcon(icon)
                .setContentDescription(title)
                .build()
                .getSlice();
        return new InlinePresentation(slice, spec, pinned);
    }

    private static String chipTitle(CredentialItem item) {
        if (item.getUsername() != null && !item.getUsername().trim().isEmpty()) {
            return item.getUsername().trim();
        }
        if (item.getTitle() != null && !item.getTitle().trim().isEmpty()) {
            return item.getTitle().trim();
        }
        return AutofillConstants.UNKNOWN_CREDENTIAL;
    }

    private static String nullToEmpty(String value) {
        return value != null ? value : "";
    }

    private static boolean hasSpecificFields(AutofillHelper.ParsedFields parsedFields) {
        return parsedFields.hasUsernameField()
                || parsedFields.hasPasswordField()
                || parsedFields.hasOtpField()
                || parsedFields.hasCardField()
                || parsedFields.hasIdentityField();
    }

    private int pendingIntentFlags() {
        return AutofillFillWindow.authPendingIntentFlags(
                Build.VERSION.SDK_INT >= Build.VERSION_CODES.S);
    }

    private static void putFieldExtras(Intent authIntent, AutofillHelper.ParsedFields parsedFields) {
        authIntent.putExtra(AutofillConstants.EXTRA_USERNAME_ID, parsedFields.getUsernameId());
        authIntent.putExtra(AutofillConstants.EXTRA_PASSWORD_ID, parsedFields.getPasswordId());
        authIntent.putExtra(AutofillConstants.EXTRA_OTP_ID, parsedFields.getOtpId());
        authIntent.putExtra(AutofillConstants.EXTRA_CARD_NUMBER_ID, parsedFields.getCardNumberId());
        authIntent.putExtra(AutofillConstants.EXTRA_CARD_EXPIRY_DATE_ID, parsedFields.getCardExpiryDateId());
        authIntent.putExtra(AutofillConstants.EXTRA_CARD_EXPIRY_MONTH_ID, parsedFields.getCardExpiryMonthId());
        authIntent.putExtra(AutofillConstants.EXTRA_CARD_EXPIRY_YEAR_ID, parsedFields.getCardExpiryYearId());
        authIntent.putExtra(AutofillConstants.EXTRA_CARD_SECURITY_CODE_ID, parsedFields.getCardSecurityCodeId());
        authIntent.putExtra(AutofillConstants.EXTRA_CARDHOLDER_NAME_ID, parsedFields.getCardholderNameId());
        authIntent.putExtra(AutofillConstants.EXTRA_IDENTITY_NAME_ID, parsedFields.getIdentityNameId());
        authIntent.putExtra(AutofillConstants.EXTRA_IDENTITY_PHONE_ID, parsedFields.getIdentityPhoneId());
        authIntent.putExtra(AutofillConstants.EXTRA_IDENTITY_ADDRESS_ID, parsedFields.getIdentityAddressId());
        authIntent.putExtra(AutofillConstants.EXTRA_IDENTITY_POSTAL_ID, parsedFields.getIdentityPostalId());
        authIntent.putExtra(AutofillConstants.EXTRA_IDENTITY_CITY_ID, parsedFields.getIdentityCityId());
        authIntent.putExtra(AutofillConstants.EXTRA_IDENTITY_REGION_ID, parsedFields.getIdentityRegionId());
        authIntent.putExtra(AutofillConstants.EXTRA_IDENTITY_COUNTRY_ID, parsedFields.getIdentityCountryId());
        authIntent.putParcelableArrayListExtra(
                AutofillConstants.EXTRA_FALLBACK_IDS,
                new ArrayList<>(parsedFields.getFallbackFieldIds())
        );

        String webDomain = parsedFields.getWebDomain();
        String packageName = parsedFields.getPackageName();
        if (webDomain != null && !webDomain.isEmpty()) {
            authIntent.putExtra(AutofillConstants.EXTRA_WEB_DOMAIN, webDomain);
        }
        if (packageName != null && !packageName.isEmpty()) {
            authIntent.putExtra(AutofillConstants.EXTRA_PACKAGE_NAME, packageName);
        }
    }

    private static int requestCodeFor(AutofillHelper.ParsedFields fields) {
        int hash = 17;
        hash = 31 * hash + (fields.getUsernameId() != null ? fields.getUsernameId().hashCode() : 0);
        hash = 31 * hash + (fields.getPasswordId() != null ? fields.getPasswordId().hashCode() : 0);
        hash = 31 * hash + (fields.getOtpId() != null ? fields.getOtpId().hashCode() : 0);
        hash = 31 * hash + (fields.getWebDomain() != null ? fields.getWebDomain().hashCode() : 0);
        hash = 31 * hash + (fields.getPackageName() != null ? fields.getPackageName().hashCode() : 0);
        if (hash == Integer.MIN_VALUE) return 1;
        return Math.abs(hash);
    }

    @Nullable
    private static InlineRequest readInlineRequest(FillRequest request) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R || request.getInlineSuggestionsRequest() == null) {
            return null;
        }
        int max = request.getInlineSuggestionsRequest().getMaxSuggestionCount();
        if (max <= 0) return null;
        List<InlinePresentationSpec> specs = request.getInlineSuggestionsRequest().getInlinePresentationSpecs();
        if (specs == null || specs.isEmpty()) return null;
        return new InlineRequest(max, specs);
    }

    private static final class InlineRequest {
        final int maxCount;
        final List<InlinePresentationSpec> specs;

        InlineRequest(int maxCount, List<InlinePresentationSpec> specs) {
            this.maxCount = maxCount;
            this.specs = specs;
        }

        InlinePresentationSpec specAt(int index) {
            if (specs.isEmpty()) return null;
            int i = Math.min(index, specs.size() - 1);
            return specs.get(i);
        }
    }

    @Override
    public void onSaveRequest(@NonNull SaveRequest request, @NonNull SaveCallback callback) {
        callback.onSuccess();
    }

    @Override
    public void onConnected() {
        super.onConnected();
    }

    @Override
    public void onDisconnected() {
        super.onDisconnected();
    }
}

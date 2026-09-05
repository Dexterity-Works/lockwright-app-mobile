package com.pears.pass.autofill.utils;

import android.app.assist.AssistStructure;
import android.os.Build;
import android.service.autofill.FillContext;
import android.service.autofill.FillRequest;
import android.text.InputType;
import android.util.Pair;
import android.view.ViewStructure;
import android.view.autofill.AutofillId;

import androidx.annotation.RequiresApi;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@RequiresApi(api = Build.VERSION_CODES.O)
public class AutofillHelper {
    private static final String TAG = "AutofillHelper";

    private static final String[] CARD_NUMBER_KEYWORDS = {"cardnumber", "ccnumber", "cc-number", "card-number", "creditcard"};
    private static final String[] CARD_EXPIRY_KEYWORDS = {"expir", "exp-date", "cc-exp", "ccexp"};
    private static final String[] CARD_EXPIRY_MONTH_KEYWORDS = {"exp-month", "expmonth", "cc-exp-month", "ccexpmonth"};
    private static final String[] CARD_EXPIRY_YEAR_KEYWORDS = {"exp-year", "expyear", "cc-exp-year", "ccexpyear"};
    private static final String[] CARD_SECURITY_KEYWORDS = {"cvc", "cvv", "csc", "securitycode", "security-code", "cardcode"};
    private static final String[] CARDHOLDER_KEYWORDS = {"ccname", "cc-name", "cardholder", "card-holder", "cardholdername", "nameoncard"};

    public static class ParsedFields {
        private AutofillId usernameId;
        private AutofillId passwordId;
        private AutofillId otpId;
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
        private String packageName;
        private String webDomain;
        private final List<AutofillId> fallbackFieldIds = new ArrayList<>();
        private final List<Visit> visits = new ArrayList<>();

        public boolean hasUsernameField() {
            return usernameId != null;
        }

        public boolean hasPasswordField() {
            return passwordId != null;
        }

        public boolean hasCardField() {
            return cardNumberId != null
                    || cardExpiryDateId != null
                    || cardExpiryMonthId != null
                    || cardExpiryYearId != null
                    || cardSecurityCodeId != null
                    || cardholderNameId != null;
        }

        public boolean hasOtpField() {
            return otpId != null;
        }

        public boolean hasIdentityField() {
            return identityNameId != null
                    || identityPhoneId != null
                    || identityAddressId != null
                    || identityPostalId != null
                    || identityCityId != null
                    || identityRegionId != null
                    || identityCountryId != null;
        }

        public AutofillId getUsernameId() {
            return usernameId;
        }

        public AutofillId getPasswordId() {
            return passwordId;
        }

        public AutofillId getOtpId() {
            return otpId;
        }

        public AutofillId getCardNumberId() { return cardNumberId; }
        public AutofillId getCardExpiryDateId() { return cardExpiryDateId; }
        public AutofillId getCardExpiryMonthId() { return cardExpiryMonthId; }
        public AutofillId getCardExpiryYearId() { return cardExpiryYearId; }
        public AutofillId getCardSecurityCodeId() { return cardSecurityCodeId; }
        public AutofillId getCardholderNameId() { return cardholderNameId; }
        public AutofillId getIdentityNameId() { return identityNameId; }
        public AutofillId getIdentityPhoneId() { return identityPhoneId; }
        public AutofillId getIdentityAddressId() { return identityAddressId; }
        public AutofillId getIdentityPostalId() { return identityPostalId; }
        public AutofillId getIdentityCityId() { return identityCityId; }
        public AutofillId getIdentityRegionId() { return identityRegionId; }
        public AutofillId getIdentityCountryId() { return identityCountryId; }

        public String getPackageName() {
            return packageName;
        }

        public String getWebDomain() {
            return webDomain;
        }

        /**
         * Returns true if any editable text fields were found, even if they
         * couldn't be classified as username or password fields.
         */
        public boolean hasAnyFallbackField() {
            return !fallbackFieldIds.isEmpty();
        }

        public List<AutofillId> getFallbackFieldIds() {
            return fallbackFieldIds;
        }

        /**
         * Later FillContext wins when it actually has a value. Chrome often
         * sends a focused-field-only structure after a complete one; keep IDs
         * already found and overlay whatever the newer tree provides.
         */
        void mergeFrom(ParsedFields other) {
            if (other == null) return;
            if (other.usernameId != null) usernameId = other.usernameId;
            if (other.passwordId != null) passwordId = other.passwordId;
            if (other.otpId != null) otpId = other.otpId;
            if (other.cardNumberId != null) cardNumberId = other.cardNumberId;
            if (other.cardExpiryDateId != null) cardExpiryDateId = other.cardExpiryDateId;
            if (other.cardExpiryMonthId != null) cardExpiryMonthId = other.cardExpiryMonthId;
            if (other.cardExpiryYearId != null) cardExpiryYearId = other.cardExpiryYearId;
            if (other.cardSecurityCodeId != null) cardSecurityCodeId = other.cardSecurityCodeId;
            if (other.cardholderNameId != null) cardholderNameId = other.cardholderNameId;
            if (other.identityNameId != null) identityNameId = other.identityNameId;
            if (other.identityPhoneId != null) identityPhoneId = other.identityPhoneId;
            if (other.identityAddressId != null) identityAddressId = other.identityAddressId;
            if (other.identityPostalId != null) identityPostalId = other.identityPostalId;
            if (other.identityCityId != null) identityCityId = other.identityCityId;
            if (other.identityRegionId != null) identityRegionId = other.identityRegionId;
            if (other.identityCountryId != null) identityCountryId = other.identityCountryId;
            if (other.packageName != null && !other.packageName.isEmpty()) {
                packageName = other.packageName;
            }
            if (other.webDomain != null && !other.webDomain.isEmpty()) {
                webDomain = other.webDomain;
            }
            for (AutofillId id : other.fallbackFieldIds) {
                if (id != null && !fallbackFieldIds.contains(id)) {
                    fallbackFieldIds.add(id);
                }
            }
            visits.addAll(other.visits);
        }

        void pruneSpecificIdsFromFallbacks() {
            fallbackFieldIds.removeIf(id ->
                    Objects.equals(id, usernameId)
                            || Objects.equals(id, passwordId)
                            || Objects.equals(id, otpId)
                            || Objects.equals(id, cardNumberId)
                            || Objects.equals(id, cardExpiryDateId)
                            || Objects.equals(id, cardExpiryMonthId)
                            || Objects.equals(id, cardExpiryYearId)
                            || Objects.equals(id, cardSecurityCodeId)
                            || Objects.equals(id, cardholderNameId)
                            || Objects.equals(id, identityNameId)
                            || Objects.equals(id, identityPhoneId)
                            || Objects.equals(id, identityAddressId)
                            || Objects.equals(id, identityPostalId)
                            || Objects.equals(id, identityCityId)
                            || Objects.equals(id, identityRegionId)
                            || Objects.equals(id, identityCountryId));
        }

        public List<AutofillId> getFillTargetIds() {
            List<AutofillId> ids = new ArrayList<>();
            boolean hasSpecific = hasUsernameField() || hasPasswordField() || hasOtpField() || hasCardField() || hasIdentityField();
            if (hasSpecific) {
                addIfNotNull(ids, usernameId);
                addIfNotNull(ids, passwordId);
                addIfNotNull(ids, otpId);
                addIfNotNull(ids, cardNumberId);
                addIfNotNull(ids, cardExpiryDateId);
                addIfNotNull(ids, cardExpiryMonthId);
                addIfNotNull(ids, cardExpiryYearId);
                addIfNotNull(ids, cardSecurityCodeId);
                addIfNotNull(ids, cardholderNameId);
                addIfNotNull(ids, identityNameId);
                addIfNotNull(ids, identityPhoneId);
                addIfNotNull(ids, identityAddressId);
                addIfNotNull(ids, identityPostalId);
                addIfNotNull(ids, identityCityId);
                addIfNotNull(ids, identityRegionId);
                addIfNotNull(ids, identityCountryId);
            } else {
                ids.addAll(fallbackFieldIds);
            }
            return ids;
        }

        void applyPrecedingUsername() {
            if (usernameId != null || passwordId == null) return;
            List<FieldClassifier.OrderedField> order = new ArrayList<>();
            Map<String, AutofillId> byKey = new HashMap<>();
            for (int i = 0; i < visits.size(); i++) {
                Visit v = visits.get(i);
                String key = Integer.toString(i);
                byKey.put(key, v.id);
                order.add(new FieldClassifier.OrderedField(key, v.usernameCandidate, v.password));
            }
            String picked = FieldClassifier.pickPrecedingUsername(order);
            if (picked != null) {
                usernameId = byKey.get(picked);
            }
        }
    }

    private static final class Visit {
        final AutofillId id;
        final boolean usernameCandidate;
        final boolean password;

        Visit(AutofillId id, boolean usernameCandidate, boolean password) {
            this.id = id;
            this.usernameCandidate = usernameCandidate;
            this.password = password;
        }
    }

    private static void addIfNotNull(List<AutofillId> ids, AutofillId id) {
        if (id != null) ids.add(id);
    }

    /**
     * Merge every FillContext. Using only the last tree misses username or
     * password when a browser sends a focused-field stub after the full form.
     */
    public static ParsedFields parseFillRequest(FillRequest request) {
        if (request == null) return null;
        List<FillContext> contexts = request.getFillContexts();
        if (contexts == null || contexts.isEmpty()) return null;

        ParsedFields merged = new ParsedFields();
        boolean parsedAny = false;
        for (FillContext context : contexts) {
            if (context == null) continue;
            ParsedFields parsed = parseStructure(context.getStructure());
            if (parsed == null) continue;
            merged.mergeFrom(parsed);
            parsedAny = true;
        }
        if (!parsedAny) return null;
        merged.applyPrecedingUsername();
        merged.pruneSpecificIdsFromFallbacks();
        return merged;
    }

    public static ParsedFields parseStructure(AssistStructure structure) {
        if (structure == null) {
            return null;
        }

        ParsedFields fields = new ParsedFields();

        // Extract package name from the structure
        if (structure.getActivityComponent() != null) {
            fields.packageName = structure.getActivityComponent().getPackageName();
            SecureLog.d(TAG, "Extracted package name: " + fields.packageName);
        }

        int nodeCount = structure.getWindowNodeCount();
        for (int i = 0; i < nodeCount; i++) {
            AssistStructure.WindowNode windowNode = structure.getWindowNodeAt(i);
            AssistStructure.ViewNode rootViewNode = windowNode.getRootViewNode();
            parseViewNode(rootViewNode, fields);
        }

        fields.applyPrecedingUsername();
        return fields;
    }

    private static void parseViewNode(AssistStructure.ViewNode node, ParsedFields fields) {
        if (node == null) {
            return;
        }

        String[] autofillHints = node.getAutofillHints();
        int inputType = node.getInputType();
        AutofillId autofillId = node.getAutofillId();
        String webDomain = node.getWebDomain();
        FieldSignals signals = fromNode(node, autofillHints, inputType);

        if (webDomain != null && !webDomain.isEmpty()
                && (fields.webDomain == null || fields.webDomain.isEmpty())) {
            fields.webDomain = webDomain;
        }

        if (autofillId != null && isCardNumberField(autofillHints, node) && fields.cardNumberId == null) {
            fields.cardNumberId = autofillId;
            SecureLog.d(TAG, "Found card number field");
        } else if (autofillId != null && isCardExpiryMonthField(autofillHints, node) && fields.cardExpiryMonthId == null) {
            fields.cardExpiryMonthId = autofillId;
            SecureLog.d(TAG, "Found card expiry month field");
        } else if (autofillId != null && isCardExpiryYearField(autofillHints, node) && fields.cardExpiryYearId == null) {
            fields.cardExpiryYearId = autofillId;
            SecureLog.d(TAG, "Found card expiry year field");
        } else if (autofillId != null && isCardExpiryDateField(autofillHints, node) && fields.cardExpiryDateId == null) {
            fields.cardExpiryDateId = autofillId;
            SecureLog.d(TAG, "Found card expiry date field");
        } else if (autofillId != null && isCardSecurityCodeField(autofillHints, node) && fields.cardSecurityCodeId == null) {
            fields.cardSecurityCodeId = autofillId;
            SecureLog.d(TAG, "Found card security code field");
        } else if (autofillId != null && isCardholderNameField(autofillHints, node) && fields.cardholderNameId == null) {
            fields.cardholderNameId = autofillId;
            SecureLog.d(TAG, "Found cardholder name field");
        } else if (autofillId != null && FieldClassifier.isOtp(signals) && fields.otpId == null) {
            fields.otpId = autofillId;
            SecureLog.d(TAG, "Found OTP field");
        } else if (autofillId != null && FieldClassifier.isUsername(signals) && fields.usernameId == null) {
            fields.usernameId = autofillId;
            SecureLog.d(TAG, "Found username field");
        } else if (autofillId != null && FieldClassifier.isPassword(signals) && fields.passwordId == null) {
            fields.passwordId = autofillId;
            SecureLog.d(TAG, "Found password field");
        } else if (autofillId != null && FieldClassifier.isIdentity(signals)) {
            assignIdentity(fields, FieldClassifier.identityKind(signals), autofillId);
            SecureLog.d(TAG, "Found identity field");
        } else if (autofillId != null && isEditableTextField(inputType, node)) {
            // Collect any editable text field as a fallback target.
            // On first page load, browsers may not fully populate the AssistStructure
            // (missing HTML attributes, generic inputType), causing specific field detection
            // to fail. These fallback IDs ensure we still show the suggestion.
            fields.fallbackFieldIds.add(autofillId);
        }

        if (autofillId != null && (isEditableTextField(inputType, node)
                || FieldClassifier.isPassword(signals)
                || FieldClassifier.isUsername(signals))) {
            fields.visits.add(new Visit(
                    autofillId,
                    FieldClassifier.isUsernameCandidate(signals) && !FieldClassifier.isPassword(signals),
                    FieldClassifier.isPassword(signals)
            ));
        }

        for (int i = 0; i < node.getChildCount(); i++) {
            parseViewNode(node.getChildAt(i), fields);
        }
    }

    static FieldSignals fromNode(AssistStructure.ViewNode node, String[] hints, int inputType) {
        FieldSignals s = new FieldSignals();
        s.autofillHints = hints != null ? hints : new String[0];
        s.hintText = node.getHint() != null ? node.getHint().toString() : "";
        s.idEntry = node.getIdEntry() != null ? node.getIdEntry() : "";
        CharSequence desc = node.getContentDescription();
        s.contentDescription = desc != null ? desc.toString() : "";
        s.inputType = inputType;
        s.htmlType = emptyIfNull(getHtmlAttributeValue(node, "type"));
        s.htmlAutocomplete = emptyIfNull(getHtmlAttributeValue(node, "autocomplete"));
        s.htmlName = emptyIfNull(getHtmlAttributeValue(node, "name"));
        s.htmlClass = emptyIfNull(getHtmlAttributeValue(node, "class"));
        s.htmlPlaceholder = emptyIfNull(getHtmlAttributeValue(node, "placeholder"));
        s.htmlAriaLabel = emptyIfNull(getHtmlAttributeValue(node, "aria-label"));
        s.htmlVisibleAttr = getHtmlAttributeValue(node, "visible") != null;
        return s;
    }

    private static String emptyIfNull(String value) {
        return value == null ? "" : value;
    }

    private static void assignIdentity(ParsedFields fields, String kind, AutofillId id) {
        if (kind == null || id == null) return;
        switch (kind) {
            case "name":
                if (fields.identityNameId == null) fields.identityNameId = id;
                break;
            case "phone":
                if (fields.identityPhoneId == null) fields.identityPhoneId = id;
                break;
            case "address":
                if (fields.identityAddressId == null) fields.identityAddressId = id;
                break;
            case "postal":
                if (fields.identityPostalId == null) fields.identityPostalId = id;
                break;
            case "city":
                if (fields.identityCityId == null) fields.identityCityId = id;
                break;
            case "region":
                if (fields.identityRegionId == null) fields.identityRegionId = id;
                break;
            case "country":
                if (fields.identityCountryId == null) fields.identityCountryId = id;
                break;
            default:
                break;
        }
    }

    private static boolean matchesCardSignal(String[] hints, AssistStructure.ViewNode node,
                                             String androidHint, String[] htmlAutocompleteValues,
                                             String[] keywords) {
        if (hints != null) {
            for (String h : hints) {
                if (h == null) continue;
                if (androidHint != null && androidHint.equalsIgnoreCase(h)) return true;
                String hLower = h.toLowerCase();
                if (htmlAutocompleteValues != null) {
                    for (String v : htmlAutocompleteValues) {
                        if (hLower.equals(v)) return true;
                    }
                }
            }
        }

        String autocomplete = getHtmlAttributeValue(node, "autocomplete");
        if (autocomplete != null) {
            String lower = autocomplete.toLowerCase();
            if (htmlAutocompleteValues != null) {
                for (String v : htmlAutocompleteValues) {
                    if (lower.equals(v) || lower.endsWith(" " + v)) return true;
                }
            }
        }

        String hintText = node.getHint() != null ? node.getHint().toString().toLowerCase() : "";
        String idEntry = node.getIdEntry() != null ? node.getIdEntry().toLowerCase() : "";
        String name = getHtmlAttributeValue(node, "name");
        String nameLower = name != null ? name.toLowerCase() : "";

        return containsAnyTerm(hintText, keywords)
                || containsAnyTerm(idEntry, keywords)
                || containsAnyTerm(nameLower, keywords);
    }

    private static boolean isCardNumberField(String[] hints, AssistStructure.ViewNode node) {
        return matchesCardSignal(hints, node,
                android.view.View.AUTOFILL_HINT_CREDIT_CARD_NUMBER,
                new String[]{"cc-number"},
                CARD_NUMBER_KEYWORDS);
    }

    private static boolean isCardExpiryDateField(String[] hints, AssistStructure.ViewNode node) {
        return matchesCardSignal(hints, node,
                android.view.View.AUTOFILL_HINT_CREDIT_CARD_EXPIRATION_DATE,
                new String[]{"cc-exp"},
                CARD_EXPIRY_KEYWORDS);
    }

    private static boolean isCardExpiryMonthField(String[] hints, AssistStructure.ViewNode node) {
        return matchesCardSignal(hints, node,
                android.view.View.AUTOFILL_HINT_CREDIT_CARD_EXPIRATION_MONTH,
                new String[]{"cc-exp-month"},
                CARD_EXPIRY_MONTH_KEYWORDS);
    }

    private static boolean isCardExpiryYearField(String[] hints, AssistStructure.ViewNode node) {
        return matchesCardSignal(hints, node,
                android.view.View.AUTOFILL_HINT_CREDIT_CARD_EXPIRATION_YEAR,
                new String[]{"cc-exp-year"},
                CARD_EXPIRY_YEAR_KEYWORDS);
    }

    private static boolean isCardSecurityCodeField(String[] hints, AssistStructure.ViewNode node) {
        return matchesCardSignal(hints, node,
                android.view.View.AUTOFILL_HINT_CREDIT_CARD_SECURITY_CODE,
                new String[]{"cc-csc"},
                CARD_SECURITY_KEYWORDS);
    }

    private static boolean isCardholderNameField(String[] hints, AssistStructure.ViewNode node) {
        return matchesCardSignal(hints, node,
                null,
                new String[]{"cc-name"},
                CARDHOLDER_KEYWORDS);
    }

    private static String getHtmlAttributeValue(AssistStructure.ViewNode node, String attrName) {
        ViewStructure.HtmlInfo htmlInfo = node.getHtmlInfo();
        if (htmlInfo == null) return null;
        List<Pair<String, String>> attrs = htmlInfo.getAttributes();
        if (attrs == null) return null;
        return getHtmlAttribute(attrs, attrName);
    }

    /**
     * Get an HTML attribute value by name from the attributes list.
     */
    private static String getHtmlAttribute(List<Pair<String, String>> attributes, String name) {
        for (Pair<String, String> attr : attributes) {
            if (name.equalsIgnoreCase(attr.first)) {
                return attr.second;
            }
        }
        return null;
    }

    private static boolean containsAnyTerm(String text, String[] terms) {
        if (text == null || text.isEmpty()) {
            return false;
        }
        for (String term : terms) {
            if (text.contains(term)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Check if a node is an editable single-line text field (potential fill target).
     * Used as fallback when specific username/password detection fails.
     */
    private static boolean isEditableTextField(int inputType, AssistStructure.ViewNode node) {
        FieldSignals signals = fromNode(node, node.getAutofillHints(), inputType);
        if (FieldClassifier.isIgnored(signals)) {
            return false;
        }

        if (inputType == 0) {
            return false;
        }

        int inputClass = inputType & InputType.TYPE_MASK_CLASS;
        if (inputClass != InputType.TYPE_CLASS_TEXT
                && inputClass != InputType.TYPE_CLASS_PHONE
                && inputClass != InputType.TYPE_CLASS_NUMBER) {
            return false;
        }

        // Reject multi-line fields (text areas, comment boxes)
        boolean isMultiline = (inputType & InputType.TYPE_TEXT_FLAG_MULTI_LINE) != 0;
        return !isMultiline;
    }
}

#!/usr/bin/env bash
# Compile production FieldClassifier with the real test harness and run it.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

javac -d "$TMP" \
  "$ROOT/android-template/java/autofill/utils/FieldSignals.java" \
  "$ROOT/android-template/java/autofill/utils/FieldClassifier.java" \
  "$ROOT/test/FieldClassifierTest.java"

java -cp "$TMP" com.pears.pass.autofill.utils.FieldClassifierTest

javac -d "$TMP" \
  "$ROOT/android-template/java/autofill/utils/RecordStoreKeys.java" \
  "$ROOT/test/RecordStoreKeysTest.java"
java -cp "$TMP" com.pears.pass.autofill.utils.RecordStoreKeysTest

javac -d "$TMP" \
  "$ROOT/android-template/java/autofill/utils/VaultMigrationGate.java" \
  "$ROOT/test/VaultMigrationGateTest.java"
java -cp "$TMP" com.pears.pass.autofill.utils.VaultMigrationGateTest

javac -d "$TMP" \
  "$ROOT/android-template/java/autofill/utils/PasswordSetGate.java" \
  "$ROOT/test/PasswordSetGateTest.java"
java -cp "$TMP" com.pears.pass.autofill.utils.PasswordSetGateTest

javac -d "$TMP" \
  "$ROOT/android-template/java/autofill/utils/AutofillHostTeardown.java" \
  "$ROOT/test/AutofillHostTeardownTest.java"
java -cp "$TMP" com.pears.pass.autofill.utils.AutofillHostTeardownTest

javac -d "$TMP" \
  "$ROOT/android-template/java/autofill/utils/AutofillFillWindow.java" \
  "$ROOT/test/AutofillFillWindowTest.java"
java -cp "$TMP" com.pears.pass.autofill.utils.AutofillFillWindowTest

javac -d "$TMP" \
  "$ROOT/android-template/java/autofill/utils/VaultStoreReady.java" \
  "$ROOT/test/VaultStoreReadyTest.java"
java -cp "$TMP" com.pears.pass.autofill.utils.VaultStoreReadyTest

javac -d "$TMP" \
  "$ROOT/android-template/java/autofill/utils/LoginFillPlan.java" \
  "$ROOT/test/LoginFillPlanTest.java"
java -cp "$TMP" com.pears.pass.autofill.utils.LoginFillPlanTest

javac -d "$TMP" \
    "$ROOT/android-template/java/autofill/utils/ChipFillDecision.java" \
    "$ROOT/test/ChipFillDecisionTest.java"
java -cp "$TMP" com.pears.pass.autofill.utils.ChipFillDecisionTest

javac -d "$TMP" \
    "$ROOT/android-template/java/autofill/utils/UriMatchHelper.java" \
    "$ROOT/android-template/java/autofill/utils/AutofillSheetLoad.java" \
    "$ROOT/test/AutofillSheetLoadTest.java"
java -cp "$TMP" com.pears.pass.autofill.utils.AutofillSheetLoadTest

javac -d "$TMP" \
    "$ROOT/android-template/java/autofill/utils/FillLog.java" \
    "$ROOT/test/FillLogTest.java"
java -cp "$TMP" com.pears.pass.autofill.utils.FillLogTest

javac -d "$TMP" \
  "$ROOT/android-template/java/autofill/utils/UriMatchHelper.java" \
  "$ROOT/test/UriMatchHelperTest.java"
java -cp "$TMP" com.pears.pass.autofill.utils.UriMatchHelperTest

javac -d "$TMP" \
  "$ROOT/android-template/java/autofill/utils/UriMatchHelper.java" \
  "$ROOT/android-template/java/autofill/utils/PasskeyPickerPlan.java" \
  "$ROOT/test/PasskeyPickerPlanTest.java"
java -cp "$TMP" com.pears.pass.autofill.utils.PasskeyPickerPlanTest

javac -d "$TMP" \
  "$ROOT/android-template/java/autofill/utils/OtpCodeResponse.java" \
  "$ROOT/test/OtpCodeResponseTest.java"
java -cp "$TMP" com.pears.pass.autofill.utils.OtpCodeResponseTest

javac -d "$TMP" \
  "$ROOT/android-template/java/autofill/utils/IdentityFillPlan.java" \
  "$ROOT/test/IdentityFillPlanTest.java"
java -cp "$TMP" com.pears.pass.autofill.utils.IdentityFillPlanTest

javac -d "$TMP" \
  "$ROOT/android-template/java/autofill/utils/PasskeyCallerOrigin.java" \
  "$ROOT/android-template/java/autofill/utils/PrivilegedBrowsers.java" \
  "$ROOT/test/PasskeyCallerOriginTest.java"
java -cp "$TMP" com.pears.pass.autofill.utils.PasskeyCallerOriginTest

javac -d "$TMP" \
  "$ROOT/android-template/java/autofill/utils/AutofillConstants.java" \
  "$ROOT/android-template/java/autofill/utils/AutofillUnlockWindow.java" \
  "$ROOT/test/AutofillUnlockWindowTest.java"
java -cp "$TMP" com.pears.pass.autofill.utils.AutofillUnlockWindowTest

INIT="$ROOT/android-template/java/autofill/utils/VaultInitializer.java"
grep -q 'PasswordSetGate.decide' "$INIT"
grep -q 'VaultStoreReady.keepWaiting' "$INIT"

CLIENT="$ROOT/android-template/java/autofill/data/PearPassVaultClient.java"
grep -q 'RecordStoreKeys.recordKeyV2' "$CLIENT"
grep -q 'RecordStoreKeys.storedWebsites' "$CLIENT" || {
  echo "passkey save must store trimmed URIs, not prefix https" >&2
  exit 1
}
if grep -q 'formattedWebsites.add("https://" + lower)' "$CLIENT"; then
  echo "PearPassVaultClient must not glue https onto stored websites" >&2
  exit 1
fi
grep -q 'writeRecordDualStore' "$CLIENT"
grep -q 'RecordStoreKeys.fileKeyV2' "$CLIENT"
grep -q 'GET_VAULT_MIGRATION_STATUS(82)' "$CLIENT"
grep -q 'waitForVaultMigration' "$CLIENT"
grep -A20 'listCanonicalRecords()' "$CLIENT" | grep -q 'waitForVaultMigration'
grep -q 'GENERATE_OTP_CODES_BY_IDS(56)' "$CLIENT"
grep -q 'generateOtpCode' "$CLIENT"
grep -q 'OtpCodeResponse.codeFor' "$CLIENT"
grep -q 'includeOtpCodes' "$CLIENT" || {
  echo "autofill list must skip TOTP generation on ACTIVE_VAULT_LIST" >&2
  exit 1
}

AUTH="$ROOT/android-template/java/autofill/ui/AuthenticationActivity.java"
# BiometricPrompt pauses the fill host. Tearing down the worklet or UI
# there shows MissingConfiguration on first open and dismisses CombinedItems
# after fingerprint.
pause_body="$(awk '/void onPause\(/,/void onResume\(/' "$AUTH")"
printf '%s\n' "$pause_body" | grep -q 'AutofillHostTeardown.shouldReleaseWorklet(isFinishing())' || {
  echo "onPause must gate worklet teardown on AutofillHostTeardown.shouldReleaseWorklet(isFinishing())" >&2
  exit 1
}
printf '%s\n' "$pause_body" | grep -q 'hasPasswordSet = false' && {
  echo "onPause must not reset hasPasswordSet" >&2
  exit 1
}
printf '%s\n' "$pause_body" | grep -q 'remove(currentFragment)' && {
  echo "onPause must not remove the fill fragment" >&2
  exit 1
}
resume_body="$(awk '/void onResume\(/,/void initialize\(/' "$AUTH")"
printf '%s\n' "$resume_body" | grep -q 'LoadingFragment' && {
  echo "onResume must not replace the fill sheet with LoadingFragment" >&2
  exit 1
}
grep -q 'LoginFillPlan.values' "$AUTH"
grep -q 'LoginFillPlan.OTP' "$AUTH"
grep -q 'generateOtpCode' "$AUTH"
grep -q 'EXTRA_PRESELECT_RECORD_ID' "$AUTH"
grep -q 'EXTRA_IDENTITY_NAME_ID' "$AUTH"
grep -q 'IdentityFillPlan.values' "$AUTH"
grep -q 'TYPE_IDENTITY' "$AUTH"

grep -q 'AutofillHostTeardown.setFillHostVisible(true)' "$AUTH" || {
  echo "AuthenticationActivity must mark the fill host visible before fingerprint" >&2
  exit 1
}
grep -q 'AutofillHostTeardown.setFillHostVisible(false)' "$AUTH" || {
  echo "AuthenticationActivity must clear fill host visible only when finishing" >&2
  exit 1
}

SERVICE="$ROOT/android-template/java/autofill/service/PearPassAutofillService.java"
grep -q 'LoginFillPlan.values' "$SERVICE"
grep -q 'fillOtp' "$SERVICE"
grep -q 'ChipFillDecision.openAppForTotp' "$SERVICE"
grep -q 'EXTRA_PRESELECT_RECORD_ID' "$SERVICE"
grep -q 'AutofillHostTeardown.shouldReplaceFillResponse' "$SERVICE" || {
  echo "fill service must not replace a live Unlock to fill response" >&2
  exit 1
}
grep -q 'AutofillFillWindow.authPendingIntentFlags' "$SERVICE" || {
  echo "fill auth PI must use AutofillFillWindow.authPendingIntentFlags" >&2
  exit 1
}
if grep -q 'FLAG_CANCEL_CURRENT' "$SERVICE"; then
  echo "fill auth PI must not use FLAG_CANCEL_CURRENT" >&2
  exit 1
fi

COMBINED="$ROOT/android-template/java/autofill/ui/CombinedItemsFragment.java"
grep -q 'TYPE_IDENTITY' "$COMBINED"
grep -q 'fullName' "$COMBINED"
grep -q 'AutofillSheetLoad.searchQuery' "$COMBINED" || {
  echo "CombinedItems must read search text through AutofillSheetLoad.searchQuery" >&2
  exit 1
}
grep -q 'AutofillSheetLoad.isPreselect' "$COMBINED" || {
  echo "CombinedItems must auto-select keyboard-chip logins via AutofillSheetLoad.isPreselect" >&2
  exit 1
}
if grep -q 'maybeGenerateTotpCodes' "$COMBINED"; then
  echo "CombinedItems must not generate TOTP for the whole vault before showing the list" >&2
  exit 1
fi

grep -q 'pageUrlsForAutofill' "$COMBINED" || {
  echo "CombinedItems must match androidapp package URIs via pageUrlsForAutofill" >&2
  exit 1
}
grep -q 'AutofillSheetLoad.visibleFillLocation' "$COMBINED" || {
  echo "CombinedItems must show the page being matched in the search field" >&2
  exit 1
}
grep -q 'AutofillSheetLoad.matchesFillQuery' "$COMBINED" || {
  echo "CombinedItems must re-match when the user edits the fill location" >&2
  exit 1
}
grep -q 'AutofillSheetLoad.filterAsTypedQuery' "$COMBINED" || {
  echo "CombinedItems must not exclusive-search on the page prefill" >&2
  exit 1
}
grep -q 'AutofillSheetLoad.keepVaultWhenPagePrefillMisses' "$COMBINED" || {
  echo "CombinedItems must show Personal logins when github.com prefill matches none" >&2
  exit 1
}
grep -q 'AutofillSheetLoad.recordMatchesFilter' "$COMBINED" || {
  echo "CombinedItems must parse logins the same way the app does" >&2
  exit 1
}
grep -q 'AutofillSheetLoad.showEmptyAfterLoadFailure' "$COMBINED" || {
  echo "CombinedItems must not treat a locked database as an empty vault" >&2
  exit 1
}
grep -q 'AutofillSheetLoad.isTransientLoadFailure' "$COMBINED" || {
  echo "CombinedItems must not treat a dead worklet as an empty vault" >&2
  exit 1
}
grep -q 'AutofillSheetLoad.keepWaitingForRecords' "$COMBINED" || {
  echo "CombinedItems must wait for Personal logins after activate" >&2
  exit 1
}
grep -q 'AutofillSheetLoad.cacheUnlockSession' "$COMBINED" || {
  echo "CombinedItems must not cache an empty unlock session" >&2
  exit 1
}
grep -q 'applyingPrefill' "$COMBINED" || {
  echo "CombinedItems must not treat programmatic search prefill as typing" >&2
  exit 1
}

# #19: org.json messages carry the parsed text. Job files hold passkey
# private keys, so a parse error logs a fixed line, not e.getMessage().
SECURE_LOG="$ROOT/android-template/java/autofill/utils/SecureLog.java"
grep -q 'FillLog.errorLine' "$SECURE_LOG" || {
  echo "release SecureLog.e must not print the throwable message" >&2
  exit 1
}
JOBS="$ROOT/android-template/java/autofill/jobs/JobFileManager.java"
PASSKEY_REG="$ROOT/android-template/java/autofill/ui/PasskeyRegistrationActivity.java"
if grep -n 'Failed to parse job.*getMessage()' "$JOBS" "$COMBINED" "$PASSKEY_REG"; then
  echo "job parse errors must not log or rethrow the JSON exception message" >&2
  exit 1
fi

# #20: a reply cut short must not be retried as an empty vault, and the
# rest of an oversize reply must be drained, not left for the next command.
BARE="$ROOT/android-template/java/autofill/data/BareHelper.java"
grep -q 'assembly.broken()' "$BARE" || {
  echo "BareHelper must read an oversize reply to its end and stop on a broken frame" >&2
  exit 1
}
grep -A2 'AutofillSheetLoad.keepWaitingForRecords(' "$COMBINED" | grep -q 'records.size()' || {
  echo "CombinedItems must re-list only while the vault returns no records at all" >&2
  exit 1
}

# #23: a passkey response is bound to the app that asked. Only a privileged
# browser's clientDataHash is signed; everyone else gets an apk-key-hash origin.
grep -q 'PasskeyCaller.plan(' "$AUTH" || {
  echo "AuthenticationActivity must resolve the passkey caller through PasskeyCaller.plan" >&2
  exit 1
}
grep -q 'passkeyCaller.clientDataHash' "$AUTH" || {
  echo "AuthenticationActivity must sign only the hash PasskeyCaller allowed" >&2
  exit 1
}
if grep 'apk-key-hash' "$AUTH" | grep -q 'getPackageName()'; then
  echo "apk-key-hash origin must hash the caller's cert, not name our package" >&2
  exit 1
fi
grep -q 'PasskeyCaller.plan(' "$PASSKEY_REG" || {
  echo "PasskeyRegistrationActivity must resolve the passkey caller through PasskeyCaller.plan" >&2
  exit 1
}
if grep -q '"https://" + rpId' "$PASSKEY_REG"; then
  echo "passkey creation must use the caller's origin, not https:// + rpId" >&2
  exit 1
fi

# #27: FLAG_SECURE before setContentView, or the fill sheet shows in screenshots.
for f in "$AUTH" "$PASSKEY_REG"; do
  awk '/void onCreate\(/,/setContentView\(/' "$f" | grep -q 'FLAG_SECURE' || {
    echo "$(basename "$f") must set FLAG_SECURE before setContentView" >&2
    exit 1
  }
done

SESSION="$ROOT/android-template/java/autofill/data/AutofillUnlockSession.java"
grep -q 'pageUrlsForAutofill' "$SESSION" || {
  echo "Unlock session chips must match androidapp package URIs via pageUrlsForAutofill" >&2
  exit 1
}

# #27: the fill session locks with the app. Timing lives in AutofillUnlockWindow
# (cap + sliding TTL), the app's timeout reaches unlock(), lock() has callers.
grep -q 'AutofillUnlockWindow' "$SESSION" || {
  echo "AutofillUnlockSession must keep time through AutofillUnlockWindow" >&2
  exit 1
}
grep -q 'AutofillLockPrefs.autoLockTtlMs' "$COMBINED" || {
  echo "CombinedItems must unlock the session with the app's auto-lock timeout" >&2
  exit 1
}
MODULE="$ROOT/android-template/java/AutofillModule.kt"
grep -A3 'fun lockAutofillSession' "$MODULE" | grep -q 'AutofillUnlockSession.get().lock()' || {
  echo "AutofillModule.lockAutofillSession must lock the unlock session" >&2
  exit 1
}
grep -q 'AutofillLockPrefs.setAutoLockTimeoutMs' "$MODULE" || {
  echo "AutofillModule must mirror the app's auto-lock timeout for the fill sheet" >&2
  exit 1
}
SCREEN_OFF="$ROOT/android-template/java/autofill/utils/AutofillScreenOffLock.java"
grep -q 'ACTION_SCREEN_OFF' "$SCREEN_OFF" && grep -q 'AutofillUnlockSession.get().lock()' "$SCREEN_OFF" || {
  echo "AutofillScreenOffLock must lock the session on ACTION_SCREEN_OFF" >&2
  exit 1
}
MAIN_APP="$ROOT/../withAppConfig/src/android/withMainApplication.ts"
grep -q 'AutofillScreenOffLock.register(this)' "$MAIN_APP" || {
  echo "MainApplication must register AutofillScreenOffLock; the fill service is unbound between fills" >&2
  exit 1
}

IOS_CLIENT="$ROOT/ios-template/PearPassAutofillExtension/PearPassVaultClient.swift"
grep -q 'includeOtpCodes' "$IOS_CLIENT" || {
  echo "iOS autofill list must skip TOTP generation on ACTIVE_VAULT_LIST" >&2
  exit 1
}

MASTER="$ROOT/android-template/java/autofill/ui/MasterPasswordFragment.java"
grep -A20 'public void onResume()' "$MASTER" | grep -q 'isAuthenticatingBiometric' || {
  echo "onResume must not vaultsClose while fingerprint is in flight" >&2
  exit 1
}

HELPER="$ROOT/android-template/java/autofill/utils/AutofillHelper.java"
grep -q 'FieldClassifier.isPassword' "$HELPER"
grep -q 'FieldClassifier.isUsername' "$HELPER"
grep -q 'FieldClassifier.isOtp' "$HELPER"
grep -q 'FieldClassifier.isIdentity' "$HELPER"
grep -q 'applyPrecedingUsername' "$HELPER"

STYLES="$ROOT/android-template/res/values/autofill_styles.xml"
grep -q 'android:windowIsFloating">true' "$STYLES" || {
  echo "fill theme must float so Vivaldi stays visible under the sheet" >&2
  exit 1
}

grep -q 'AutofillFillWindow.overlayHeightPx' "$AUTH" || {
  echo "AuthenticationActivity must size the sheet through AutofillFillWindow" >&2
  exit 1
}
grep -q 'window.setLayout' "$AUTH" || {
  echo "AuthenticationActivity must setLayout so the fill sheet is MATCH_PARENT wide" >&2
  exit 1
}
grep -q 'AutofillFillWindow.overlayGravity' "$AUTH" || {
  echo "AuthenticationActivity must pin the fill sheet to the bottom" >&2
  exit 1
}
PASSKEY="$ROOT/android-template/java/autofill/ui/PasskeyRegistrationActivity.java"
grep -q 'AutofillFillWindow.overlayHeightPx' "$PASSKEY" || {
  echo "PasskeyRegistrationActivity must size the sheet through AutofillFillWindow" >&2
  exit 1
}
grep -q 'window.setLayout' "$PASSKEY" || {
  echo "PasskeyRegistrationActivity must setLayout so the fill sheet is MATCH_PARENT wide" >&2
  exit 1
}
grep -q 'AutofillFillWindow.overlayGravity' "$PASSKEY" || {
  echo "PasskeyRegistrationActivity must pin the fill sheet to the bottom" >&2
  exit 1
}

MANIFEST="$ROOT/src/android/withAndroidManifest.ts"
grep -q 'function applyFillHostActivityAttrs' "$MANIFEST" || {
  echo "manifest plugin must share fill-host activity attrs" >&2
  exit 1
}
grep -c 'applyFillHostActivityAttrs' "$MANIFEST" | grep -qx '5' || {
  echo "fill-host attrs must apply to new and existing Authentication and Passkey activities" >&2
  exit 1
}
grep -q "adjustPan" "$MANIFEST" || {
  echo "fill host must pan for IME, not resize" >&2
  exit 1
}
grep -qF 'keyboard|keyboardHidden' "$MANIFEST" || {
  echo "fill host must keep the activity across keyboard configChanges" >&2
  exit 1
}
grep -q "taskAffinity'] = '.autofill'" "$MANIFEST" || {
  echo "fill host must use a dedicated .autofill affinity so Unlock to fill does not bring the main app over Vivaldi" >&2
  exit 1
}
if grep -q "taskAffinity'] = ''" "$MANIFEST"; then
  echo "empty taskAffinity is dropped from the merged manifest and joins the app task" >&2
  exit 1
fi

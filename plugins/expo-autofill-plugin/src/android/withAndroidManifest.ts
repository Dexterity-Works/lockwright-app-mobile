import { ConfigPlugin, withAndroidManifest as withAndroidManifestMod } from '@expo/config-plugins';
import { AutofillPluginOptions } from '../index';

const AUTOFILL_THEME = '@style/Theme.Lockwright.Autofill.Fullscreen';

/** Empty affinity: fill must not join the main Lockwright task. */
function applyFillHostActivityAttrs(activity: any) {
  activity.$ = activity.$ || {};
  activity.$['android:theme'] = AUTOFILL_THEME;
  activity.$['android:taskAffinity'] = '';
  activity.$['android:excludeFromRecents'] = 'true';
  activity.$['android:exported'] = 'false';
  activity.$['android:windowSoftInputMode'] = 'adjustPan';
  activity.$['android:configChanges'] =
    'keyboard|keyboardHidden|orientation|screenSize|screenLayout|uiMode';
  activity.$['android:launchMode'] = 'singleTop';
}

export const withAndroidManifest: ConfigPlugin<AutofillPluginOptions> = (config, _options) => {
  return withAndroidManifestMod(config, (cfg) => {
    const mainApplication = cfg.modResults.manifest.application?.[0];
    if (!mainApplication) return cfg;

    // Add Autofill Service
    mainApplication.service = mainApplication.service || [];

    // Check if service already exists
    const serviceExists = mainApplication.service.some(
      (s: any) => s.$?.['android:name'] === '.autofill.service.PearPassAutofillService'
    );

    if (!serviceExists) {
      mainApplication.service.push({
        $: {
          'android:name': '.autofill.service.PearPassAutofillService',
          'android:permission': 'android.permission.BIND_AUTOFILL_SERVICE',
          'android:exported': 'true',
        },
        'intent-filter': [{
          action: [{ $: { 'android:name': 'android.service.autofill.AutofillService' } }],
        }],
        'meta-data': [{
          $: {
            'android:name': 'android.autofill',
            'android:resource': '@xml/autofill_service_config',
          },
        }],
      } as any);
    }

    // Add (or update) Authentication Activity
    mainApplication.activity = mainApplication.activity || [];

    const authActivity = mainApplication.activity.find(
      (a: any) => a.$?.['android:name'] === '.autofill.ui.AuthenticationActivity'
    );

    if (authActivity) {
      applyFillHostActivityAttrs(authActivity);
    } else {
      const activity = { $: { 'android:name': '.autofill.ui.AuthenticationActivity' } };
      applyFillHostActivityAttrs(activity);
      mainApplication.activity.push(activity as any);
    }

    // Add (or update) Passkey Registration Activity
    const passkeyActivity = mainApplication.activity.find(
      (a: any) => a.$?.['android:name'] === '.autofill.ui.PasskeyRegistrationActivity'
    );

    if (passkeyActivity) {
      applyFillHostActivityAttrs(passkeyActivity);
    } else {
      const activity = { $: { 'android:name': '.autofill.ui.PasskeyRegistrationActivity' } };
      applyFillHostActivityAttrs(activity);
      mainApplication.activity.push(activity as any);
    }

    // Add Credential Provider Service (Android 14+ passkey support)
    const credProviderExists = mainApplication.service.some(
      (s: any) => s.$?.['android:name'] === '.autofill.service.PearPassCredentialProviderService'
    );

    if (!credProviderExists) {
      mainApplication.service.push({
        $: {
          'android:name': '.autofill.service.PearPassCredentialProviderService',
          'android:enabled': 'true',
          'android:exported': 'true',
          'android:label': '@string/app_name',
          'android:permission': 'android.permission.BIND_CREDENTIAL_PROVIDER_SERVICE',
        },
        'intent-filter': [{
          action: [{ $: { 'android:name': 'android.service.credentials.CredentialProviderService' } }],
        }],
        'meta-data': [{
          $: {
            'android:name': 'android.credentials.provider',
            'android:resource': '@xml/credential_provider_config',
          },
        }],
      } as any);
    }

    return cfg;
  });
};

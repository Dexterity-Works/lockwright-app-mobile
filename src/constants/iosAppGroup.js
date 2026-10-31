import Constants from 'expo-constants'

// The app group comes from the resolved Expo config, so the dev variant
// (APP_VARIANT=dev) uses its own group and keychain access group.
export const IOS_APP_GROUP_ID =
  Constants.expoConfig?.ios?.entitlements?.[
    'com.apple.security.application-groups'
  ]?.[0] ?? 'group.works.dexterity.lockwright'

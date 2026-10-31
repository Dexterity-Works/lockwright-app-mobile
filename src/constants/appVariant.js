import { NativeModules, Platform } from 'react-native'

// Legacy modules expose constants as properties, interop modules through
// getConstants().
export const readNativeConstant = (module, key) =>
  module?.[key] ?? module?.getConstants?.()?.[key]

// The dev variant is the installed binary whose app ID ends in .dev. The Expo
// config is not used: it follows whatever APP_VARIANT Metro was started with.
export const isDevVariant = () => {
  const appId =
    Platform.OS === 'ios'
      ? readNativeConstant(NativeModules.AppGroupHelper, 'bundleIdentifier')
      : readNativeConstant(NativeModules.AutofillModule, 'applicationId')
  return typeof appId === 'string' && appId.endsWith('.dev')
}

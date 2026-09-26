import { NativeModules, Platform } from 'react-native'

const { CustomSplashScreen } = NativeModules

/**
 * Hides the native splash. On Android the splash is shown by the theme and
 * dismissed through our CustomSplashScreen module; iOS has nothing to do.
 */
export const hideAsync = async () => {
  if (Platform.OS === 'android' && CustomSplashScreen) {
    CustomSplashScreen.hide()
  }
  return true
}

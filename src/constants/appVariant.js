import Constants from 'expo-constants'

// Set by app.config.ts when the build ran with APP_VARIANT=dev.
export const isDevVariant = () =>
  Constants.expoConfig?.extra?.appVariant === 'dev'

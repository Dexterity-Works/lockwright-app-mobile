import { NativeModules } from 'react-native'

import { logger } from './logger'

/**
 * Checks if autofill is enabled for this app
 * @returns {Promise<boolean>} True if enabled, false otherwise
 */
export const isAutofillEnabled = async () => {
  if (!NativeModules.AutofillModule) {
    logger.error('AutofillModule not available')
    return false
  }

  try {
    const isEnabled = await NativeModules.AutofillModule.isAutofillEnabled()
    return isEnabled
  } catch (error) {
    logger.error('Failed to check autofill status:', error)
    return false
  }
}

/**
 * Opens the autofill settings
 * iOS: Opens credential provider settings (iOS 17+) or falls back to Settings URL
 * Android: Opens autofill service selection using ACTION_REQUEST_SET_AUTOFILL_SERVICE
 * @returns {Promise<{success: boolean, method: string}|boolean>} Object with success status and method, or false on error
 */
export const openAutofillSettings = async () => {
  if (!NativeModules.AutofillModule) {
    logger.error('AutofillModule not available')
    return false
  }

  try {
    const result = await NativeModules.AutofillModule.openAutofillSettings()
    return result
  } catch (error) {
    logger.error('Failed to open autofill settings:', error)
    return false
  }
}

/**
 * Requests to enable autofill
 * iOS: Shows system prompt to enable autofill (iOS 18+ only)
 * Android: Always returns false (no system prompt available)
 * @returns {Promise<boolean>} True if user enabled, false otherwise
 */
export const requestToEnableAutofill = async () => {
  if (!NativeModules.AutofillModule) {
    logger.error('AutofillModule not available')
    return false
  }

  try {
    const result = await NativeModules.AutofillModule.requestToEnableAutofill()
    return result
  } catch (error) {
    logger.error('Failed to request autofill enable:', error)
    return false
  }
}

/**
 * Drops the Android fill sheet's in-memory unlock session so autofill
 * locks with the app. No-op where the native method is missing (iOS).
 * @returns {Promise<boolean>} True when the native session was locked
 */
export const lockAutofillSession = async () => {
  const method = NativeModules.AutofillModule?.lockAutofillSession
  if (!method) {
    return false
  }

  try {
    await method()
    return true
  } catch (error) {
    logger.error('Failed to lock autofill session:', error)
    return false
  }
}

/**
 * Mirrors the app's auto-lock timeout to the Android fill sheet, which
 * cannot read SecureStore. Null (auto-lock off) is sent as -1 so native
 * falls back to its own default instead of never locking.
 * @param {number|null} timeoutMs
 * @returns {Promise<boolean>} True when native stored it
 */
export const setAutofillAutoLockTimeout = async (timeoutMs) => {
  const method = NativeModules.AutofillModule?.setAutoLockTimeout
  if (!method) {
    return false
  }

  try {
    await method(timeoutMs === null ? -1 : Number(timeoutMs))
    return true
  } catch (error) {
    logger.error('Failed to set autofill auto-lock timeout:', error)
    return false
  }
}

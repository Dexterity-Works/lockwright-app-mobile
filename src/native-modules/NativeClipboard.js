import { NativeModules } from 'react-native'

const { NativeClipboard } = NativeModules

const isNativeModuleAvailable = NativeClipboard !== null

const defaultImplementation = {
  isAvailable: () => Promise.resolve(false),
  setString: () => Promise.reject(new Error('NativeClipboard not available')),
  setStringWithExpiration: () =>
    Promise.reject(new Error('NativeClipboard not available')),
  clearClipboard: () =>
    Promise.reject(new Error('NativeClipboard not available')),
  clearIfCurrentMatches: () =>
    Promise.reject(new Error('NativeClipboard not available'))
}

/**
 * Native clipboard module for secure clipboard management
 * Provides automatic clipboard clearing functionality for both iOS and Android
 * @module NativeClipboard
 */
const NativeClipboardModule = isNativeModuleAvailable
  ? {
      /**
       * Check if the native clipboard module is available
       * @returns {Promise<boolean>} - Whether the module is available
       */
      isAvailable: async () => {
        try {
          return await NativeClipboard.isAvailable()
        } catch {
          return false
        }
      },

      /**
       * Set clipboard content that never expires, marked sensitive so it stays
       * out of clipboard history and previews
       * @param {string} text - Text to copy to clipboard
       * @returns {Promise<boolean>} - Success status
       */
      setString: async (text) => await NativeClipboard.setString(text),

      /**
       * Set clipboard content with automatic expiration
       * @param {string} text - Text to copy to clipboard
       * @param {number} seconds - Seconds after which to clear the clipboard
       * @returns {Promise<boolean>} - Success status
       */
      setStringWithExpiration: async (text, seconds = 30) =>
        await NativeClipboard.setStringWithExpiration(text, seconds),

      /**
       * Clear the clipboard immediately
       * @returns {Promise<boolean>} - Success status
       */
      clearClipboard: async () => await NativeClipboard.clearClipboard(),

      /**
       * Clear clipboard only if current content matches the provided text
       * @param {string} text - Text to match against current clipboard content
       * @returns {Promise<boolean>} - Whether clipboard was cleared
       */
      clearIfCurrentMatches: async (text) =>
        await NativeClipboard.clearIfCurrentMatches(text)
    }
  : defaultImplementation

export default NativeClipboardModule

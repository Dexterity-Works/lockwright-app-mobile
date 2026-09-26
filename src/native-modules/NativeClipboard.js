import { NativeModules } from 'react-native'

const { NativeClipboard } = NativeModules

/**
 * Native clipboard module for secure clipboard management
 * Provides automatic clipboard clearing functionality for both iOS and Android
 * @module NativeClipboard
 */
export default {
  /**
   * Set clipboard content that never expires, marked sensitive so it stays
   * out of clipboard history and previews (Android only)
   * @param {string} text - Text to copy to clipboard
   * @returns {Promise<boolean>} - Success status
   */
  setString: (text) => NativeClipboard.setString(text),

  /**
   * Set clipboard content with automatic expiration
   * @param {string} text - Text to copy to clipboard
   * @param {number} seconds - Seconds after which to clear the clipboard
   * @returns {Promise<boolean>} - Success status
   */
  setStringWithExpiration: (text, seconds = 30) =>
    NativeClipboard.setStringWithExpiration(text, seconds),

  /**
   * Clear the clipboard immediately
   * @returns {Promise<boolean>} - Success status
   */
  clearClipboard: () => NativeClipboard.clearClipboard(),

  /**
   * Clear clipboard only if current content matches the provided text
   * @param {string} text - Text to match against current clipboard content
   * @returns {Promise<boolean>} - Whether clipboard was cleared
   */
  clearIfCurrentMatches: (text) => NativeClipboard.clearIfCurrentMatches(text)
}

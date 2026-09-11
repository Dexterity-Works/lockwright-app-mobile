/**
 * Unlock to fill starts a second Bare worklet on the same pearpass/
 * files. The app worklet must drop those files when Android leaves
 * the UI, or fill lists an empty vault and Vivaldi cancels the host.
 */
export const shouldReleaseVaultForFill = (os, previousState, nextState) => {
  if (os !== 'android') return false
  if (previousState !== 'active') return false
  return nextState === 'background' || nextState === 'inactive'
}

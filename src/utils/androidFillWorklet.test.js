import { shouldReleaseVaultForFill } from './androidFillWorklet'

describe('shouldReleaseVaultForFill', () => {
  it('releases on Android background so the fill worklet can open pearpass/', () => {
    expect(shouldReleaseVaultForFill('android', 'active', 'background')).toBe(
      true
    )
  })

  it('releases on Android inactive when the fill host pauses MainActivity', () => {
    expect(shouldReleaseVaultForFill('android', 'active', 'inactive')).toBe(
      true
    )
  })

  it('does not release on iOS', () => {
    expect(shouldReleaseVaultForFill('ios', 'active', 'background')).toBe(false)
  })

  it('does not release while the app stays active', () => {
    expect(shouldReleaseVaultForFill('android', 'active', 'active')).toBe(false)
  })
})

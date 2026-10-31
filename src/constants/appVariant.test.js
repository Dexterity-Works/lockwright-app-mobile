const mockNative = (OS, NativeModules) => {
  jest.doMock('react-native', () => ({ NativeModules, Platform: { OS } }))
  return require('./appVariant').isDevVariant
}

describe('isDevVariant', () => {
  beforeEach(() => {
    jest.resetModules()
  })

  it('is true for an iOS binary whose bundle ID ends in .dev', () => {
    const isDevVariant = mockNative('ios', {
      AppGroupHelper: { bundleIdentifier: 'works.dexterity.lockwright.dev' }
    })

    expect(isDevVariant()).toBe(true)
  })

  it('is true for an Android package ending in .dev', () => {
    const isDevVariant = mockNative('android', {
      AutofillModule: {
        getConstants: () => ({
          applicationId: 'works.dexterity.lockwright.dev'
        })
      }
    })

    expect(isDevVariant()).toBe(true)
  })

  it('is false for the store app', () => {
    const isDevVariant = mockNative('android', {
      AutofillModule: { applicationId: 'works.dexterity.lockwright' }
    })

    expect(isDevVariant()).toBe(false)
  })

  it('is false when the native module is missing', () => {
    expect(mockNative('ios', {})()).toBe(false)
  })
})

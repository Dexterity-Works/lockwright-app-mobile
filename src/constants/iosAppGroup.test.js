const mockNative = (AppGroupHelper) => {
  jest.doMock('react-native', () => ({
    NativeModules: { AppGroupHelper },
    Platform: { OS: 'ios' }
  }))
}

describe('IOS_APP_GROUP_ID', () => {
  beforeEach(() => {
    jest.resetModules()
  })

  it('takes the app group the installed binary was built with', () => {
    mockNative({ appGroupIdentifier: 'group.works.dexterity.lockwright.dev' })

    expect(require('./iosAppGroup').IOS_APP_GROUP_ID).toBe(
      'group.works.dexterity.lockwright.dev'
    )
  })

  it('reads it through getConstants when the module exposes that', () => {
    mockNative({
      getConstants: () => ({
        appGroupIdentifier: 'group.works.dexterity.lockwright.dev'
      })
    })

    expect(require('./iosAppGroup').IOS_APP_GROUP_ID).toBe(
      'group.works.dexterity.lockwright.dev'
    )
  })

  it('falls back to the store app group without the native module', () => {
    mockNative(undefined)

    expect(require('./iosAppGroup').IOS_APP_GROUP_ID).toBe(
      'group.works.dexterity.lockwright'
    )
  })
})

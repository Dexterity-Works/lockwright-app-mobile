describe('IOS_APP_GROUP_ID', () => {
  beforeEach(() => {
    jest.resetModules()
  })

  it('takes the app group from the resolved Expo config', () => {
    jest.doMock('expo-constants', () => ({
      __esModule: true,
      default: {
        expoConfig: {
          ios: {
            entitlements: {
              'com.apple.security.application-groups': [
                'group.works.dexterity.lockwright.dev'
              ]
            }
          }
        }
      }
    }))

    expect(require('./iosAppGroup').IOS_APP_GROUP_ID).toBe(
      'group.works.dexterity.lockwright.dev'
    )
  })

  it('falls back to the store app group when the config has none', () => {
    jest.doMock('expo-constants', () => ({
      __esModule: true,
      default: { expoConfig: { extra: {} } }
    }))

    expect(require('./iosAppGroup').IOS_APP_GROUP_ID).toBe(
      'group.works.dexterity.lockwright'
    )
  })
})

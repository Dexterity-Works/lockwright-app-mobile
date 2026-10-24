import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { render, waitFor } from '@testing-library/react-native'
import { getMyDeviceId, useVault } from 'lockwright-lib-vault'
import { pearpassVaultClient } from 'lockwright-lib-vault/src/instances'

import { PairedDevicesScreen } from './index'
import messages from '../../../locales/en/messages'
import { rememberRevoked } from '../../../utils/revokedDevices'

i18n.load('en', messages)
i18n.activate('en')

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: jest.fn() })
}))

jest.mock('lockwright-lib-vault', () => ({
  getMyDeviceId: jest.fn(),
  useVault: jest.fn()
}))

jest.mock('lockwright-lib-vault/src/instances', () => ({
  pearpassVaultClient: {
    activeVaultGetEpochStatus: jest.fn(),
    on: jest.fn(),
    off: jest.fn()
  }
}))

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ bottom: 0 })
}))

jest.mock('../../../containers/BottomSheetRevokeAccessContent', () => ({
  BottomSheetRevokeAccessContent: () => null
}))

jest.mock('../../../containers/Layout', () => ({
  Layout: ({ children }) => children
}))

jest.mock('../../../containers/ScreenHeader/BackScreenHeader', () => ({
  BackScreenHeader: () => null
}))

jest.mock('lockwright-lib-ui-react-native-components/icons', () => {
  const Icon = () => null
  return new Proxy({}, { get: () => Icon })
})

jest.mock('lockwright-lib-ui-react-native-components', () => {
  const RN = require('react-native')
  return {
    Button: () => null,
    ContextMenu: () => null,
    NativeBottomSheet: ({ children }) => children ?? null,
    NavbarListItem: () => null,
    Text: ({ children }) => <RN.Text>{children}</RN.Text>,
    rawTokens: new Proxy({}, { get: () => 8 }),
    useBottomSheetClose: () => jest.fn(),
    useTheme: () => ({ theme: { colors: {} } })
  }
})

const renderScreen = () =>
  render(
    <I18nProvider i18n={i18n}>
      <PairedDevicesScreen />
    </I18nProvider>
  )

const status = (overrides = {}) => ({
  vaultId: 'v1',
  epoch: 'e2',
  legacy: false,
  members: ['d-me'],
  ...overrides
})

describe('PairedDevicesScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    getMyDeviceId.mockResolvedValue('d-me')
  })

  const useVaultWith = (vaultId) =>
    useVault.mockReturnValue({
      data: { id: vaultId, devices: [{ id: 'd-me', name: 'android 34' }] },
      refetch: jest.fn()
    })

  it('shows a removed device the key still seals to as rotating', async () => {
    useVaultWith('v1')
    rememberRevoked('v1', 'd-gone', 'Phone')
    pearpassVaultClient.activeVaultGetEpochStatus.mockResolvedValue(
      status({ members: ['d-me', 'd-gone', 'd-old'] })
    )

    const screen = renderScreen()

    await waitFor(() => screen.getByText('Phone'))
    screen.getByText('Removed device')
    expect(screen.getAllByText('Removed · key rotating')).toHaveLength(2)
  })

  it('shows when the key rotated once it leaves the device out', async () => {
    useVaultWith('v-rot')
    rememberRevoked('v-rot', 'd-gone', 'Phone')
    pearpassVaultClient.activeVaultGetEpochStatus.mockResolvedValue(
      status({ vaultId: 'v-rot' })
    )

    const screen = renderScreen()

    await waitFor(() => screen.getByText(/^Revoked · key rotated /))
    expect(screen.queryByText('Removed · key rotating')).toBeNull()
  })

  it('follows epoch status updates', async () => {
    useVaultWith('v-live')
    pearpassVaultClient.activeVaultGetEpochStatus.mockResolvedValue(
      status({ vaultId: 'v-live' })
    )

    const screen = renderScreen()
    await waitFor(() =>
      expect(pearpassVaultClient.on).toHaveBeenCalledWith(
        'epoch-status',
        expect.any(Function)
      )
    )
    expect(screen.queryByText('Removed device')).toBeNull()

    const onStatus = pearpassVaultClient.on.mock.calls.at(-1)[1]
    onStatus(status({ vaultId: 'v-live', members: ['d-me', 'd-x'] }))

    await waitFor(() => screen.getByText('Removed device'))
  })
})

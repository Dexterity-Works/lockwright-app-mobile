import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import { kickDevice } from 'lockwright-lib-vault'
import Toast from 'react-native-toast-message'

import { BottomSheetRevokeAccessContent } from './index'
import messages from '../../locales/en/messages'

i18n.load('en', messages)
i18n.activate('en')

const mockClose = jest.fn()

jest.mock('lockwright-lib-vault', () => ({ kickDevice: jest.fn() }))

jest.mock('react-native-toast-message', () => ({
  __esModule: true,
  default: { show: jest.fn() }
}))

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ bottom: 0 })
}))

jest.mock('../../utils/logger', () => ({ logger: { error: jest.fn() } }))

jest.mock('lockwright-lib-ui-react-native-components/icons', () => ({
  Close: () => null
}))

jest.mock('lockwright-lib-ui-react-native-components', () => {
  const RN = require('react-native')
  return {
    Button: ({ onClick, children, testID }) => (
      <RN.TouchableOpacity testID={testID} onPress={onClick}>
        <RN.Text>{children}</RN.Text>
      </RN.TouchableOpacity>
    ),
    Text: ({ children }) => <RN.Text>{children}</RN.Text>,
    rawTokens: new Proxy({}, { get: () => 8 }),
    useBottomSheetClose: () => mockClose,
    useTheme: () => ({ theme: { colors: {} } })
  }
})

const devices = [
  { id: 'd-old', name: 'Old laptop' },
  { id: 'd-tab', name: 'Tablet' }
]

const revoke = async (result) => {
  kickDevice.mockResolvedValue(result)
  const screen = render(
    <I18nProvider i18n={i18n}>
      <BottomSheetRevokeAccessContent
        vaultId="v1"
        targetDeviceId="d-gone"
        deviceName="Phone"
        devices={devices}
      />
    </I18nProvider>
  )
  fireEvent.press(screen.getByTestId('revoke-access-submit'))
  await waitFor(() => expect(Toast.show).toHaveBeenCalled())
  return { screen, text1: Toast.show.mock.calls[0][0].text1 }
}

const rotated = { rotated: true, id: 'e2', seq: 2, members: [], uncovered: [] }

describe('BottomSheetRevokeAccessContent', () => {
  beforeEach(() => jest.clearAllMocks())

  it('says the key rotates and what the device keeps', async () => {
    const { screen, text1 } = await revoke({
      results: [],
      failures: [],
      epoch: rotated
    })

    screen.getByText(
      'Revoking removes this device from the vault and rotates the vault key. It can no longer read items added or changed from now on.'
    )
    screen.getByText(
      'Anything it synced before now stays on that device. Revoking cannot delete it. Change passwords the device could see, especially if it was lost or stolen.'
    )
    screen.getByText(
      'Devices still on an older Lockwright version must update before they can read new items.'
    )
    expect(screen.queryByText(/anything synced later/)).toBeNull()
    expect(screen.queryByText(/new vault/)).toBeNull()
    expect(text1).toBe('"Phone" can no longer edit this vault.')
  })

  it('warns with the reason when the key did not rotate', async () => {
    const { text1 } = await revoke({
      results: [],
      failures: [{ targetDeviceId: 'd-gone', error: new Error('x') }],
      epoch: { rotated: false, reason: 'not-writable', uncovered: [] }
    })

    expect(text1).toBe(
      `Couldn't rotate the vault key: not-writable. "Phone" can still read new items.`
    )
  })

  it('warns when the rotation result is missing', async () => {
    const { text1 } = await revoke({
      results: [],
      failures: [
        {
          targetDeviceId: 'd-gone',
          error: new Error('epoch rotation failed: timeout')
        }
      ],
      epoch: null
    })

    expect(text1).toBe(
      `Couldn't rotate the vault key: timeout. "Phone" can still read new items.`
    )
  })

  it('names the devices the new key could not reach', async () => {
    const { text1 } = await revoke({
      results: [],
      failures: [],
      epoch: { ...rotated, uncovered: ['d-old', 'd-tab'] }
    })

    expect(text1).toBe(
      '"Phone" can no longer edit this vault. Old laptop, Tablet must open the vault on a current Lockwright version before they can read new items.'
    )
  })
})

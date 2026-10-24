import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import { kickDevice } from 'lockwright-lib-vault'
import Toast from 'react-native-toast-message'

import { BottomSheetRevokeAccessContent } from './index'
import messages from '../../locales/en/messages'
import { logger } from '../../utils/logger'

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

jest.mock('../../utils/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn() }
}))

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
  { id: 'd-tab', name: 'Tablet' },
  { id: 'd-ios-1', name: 'iPhone' },
  { id: 'd-ios-2', name: 'iPhone' }
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
  const { text1, visibilityTime } = Toast.show.mock.calls[0][0]
  return { screen, text1, visibilityTime }
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
      "Revoking removes this device from the vault and rotates the vault key. Once the key rotates, the device can't read items added or changed after that."
    )
    screen.getByText(
      "Items from before the key rotates aren't re-encrypted, so the device can still read them. Revoking cannot delete what it already synced. Change passwords the device could see, especially if it was lost or stolen."
    )
    screen.getByText(
      'Devices still on an older Lockwright version must update before they can read new items.'
    )
    expect(screen.queryByText(/anything synced later/)).toBeNull()
    expect(screen.queryByText(/new vault/)).toBeNull()
    expect(text1).toBe('"Phone" can no longer edit this vault.')
  })

  it('treats a key that already leaves the device out as rotated', async () => {
    const { text1, visibilityTime } = await revoke({
      results: [],
      failures: [],
      epoch: { rotated: false, reason: 'current', uncovered: [] }
    })

    expect(text1).toBe('"Phone" can no longer edit this vault.')
    expect(visibilityTime).toBeUndefined()
  })

  it('says another device will rotate when the rotation is pending', async () => {
    const { text1, visibilityTime } = await revoke({
      results: [],
      failures: [],
      epoch: { rotated: false, reason: 'pending', uncovered: [] }
    })

    expect(text1).toBe(
      '"Phone" can no longer edit this vault. Another device will rotate the vault key when it next syncs.'
    )
    expect(visibilityTime).toBe(8000)
  })

  it('says the device was unreachable when only the envelope failed', async () => {
    const { text1 } = await revoke({
      results: [],
      failures: [{ targetDeviceId: 'd-gone', error: new Error('offline') }],
      epoch: rotated
    })

    expect(text1).toBe(
      "Couldn't reach the device. It will lose edit access next time it comes online."
    )
  })

  it('keeps the sheet open when the device could not be removed', async () => {
    const { text1 } = await revoke({
      results: [],
      failures: [
        {
          targetDeviceId: 'd-gone',
          error: new Error('epoch rotation failed: looks like one, is not')
        }
      ],
      epoch: null
    })

    expect(text1).toBe("Couldn't revoke access. Please try again.")
    expect(mockClose).not.toHaveBeenCalled()
  })

  it('warns with the reason when the key did not rotate', async () => {
    const { text1, visibilityTime } = await revoke({
      results: [],
      failures: [
        {
          targetDeviceId: 'd-gone',
          kind: 'epoch',
          error: new Error('epoch rotation failed: not-writable')
        }
      ],
      epoch: { rotated: false, reason: 'not-writable', uncovered: [] }
    })

    expect(text1).toBe(
      `Couldn't rotate the vault key. This device can't write to the vault. "Phone" can still read new items.`
    )
    expect(visibilityTime).toBe(8000)
    expect(logger.warn).toHaveBeenCalledWith(
      'BottomSheetRevokeAccessContent',
      'vault key not rotated:',
      'not-writable'
    )
    expect(logger.error).not.toHaveBeenCalled()
  })

  it('says why when this device is not on the member list', async () => {
    const { text1 } = await revoke({
      results: [],
      failures: [],
      epoch: { rotated: false, reason: 'self-not-in-roster', uncovered: [] }
    })

    expect(text1).toBe(
      `Couldn't rotate the vault key. This device isn't on the vault's member list. "Phone" can still read new items.`
    )
  })

  it('says why when the vault has no rotating keys', async () => {
    const { text1 } = await revoke({
      results: [],
      failures: [],
      epoch: { rotated: false, reason: 'legacy', uncovered: [] }
    })

    expect(text1).toBe(
      `Couldn't rotate the vault key. The vault doesn't use rotating keys yet. "Phone" can still read new items.`
    )
  })

  it('keeps a thrown rotation error out of the toast', async () => {
    const error = new Error(
      'epoch rotation failed: activeVaultEnsureEpoch is not a function'
    )
    const { text1, visibilityTime } = await revoke({
      results: [],
      failures: [{ targetDeviceId: 'd-gone', kind: 'epoch', error }],
      epoch: null
    })

    expect(text1).not.toContain('activeVaultEnsureEpoch is not a function')
    expect(text1).toBe(
      `Couldn't rotate the vault key. "Phone" can still read new items.`
    )
    expect(visibilityTime).toBe(8000)
    expect(logger.error).toHaveBeenCalledWith(
      'BottomSheetRevokeAccessContent',
      'vault key not rotated:',
      error
    )
  })

  it('keeps a kickDevice throw out of the toast and logs it with its stack', async () => {
    const error = new Error('IPC request 83 failed: worklet closed')
    kickDevice.mockRejectedValue(error)
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

    expect(Toast.show.mock.calls[0][0].text1).toBe(
      "Couldn't revoke access. Please try again."
    )
    expect(logger.error).toHaveBeenCalledWith(
      'BottomSheetRevokeAccessContent',
      'kickDevice failed:',
      error
    )
    expect(mockClose).not.toHaveBeenCalled()
  })

  it('keeps an unknown skip reason out of the toast', async () => {
    const { text1 } = await revoke({
      results: [],
      failures: [],
      epoch: { rotated: false, reason: 'ring-box-open-failed', uncovered: [] }
    })

    expect(text1).toBe(
      `Couldn't rotate the vault key. "Phone" can still read new items.`
    )
    expect(logger.warn).toHaveBeenCalledWith(
      'BottomSheetRevokeAccessContent',
      'vault key not rotated:',
      'ring-box-open-failed'
    )
  })

  it('warns when the rotation result is missing', async () => {
    const { text1 } = await revoke({
      results: [],
      failures: [
        {
          targetDeviceId: 'd-gone',
          kind: 'epoch',
          error: new Error('epoch rotation failed: timeout')
        }
      ],
      epoch: null
    })

    expect(text1).toBe(
      `Couldn't rotate the vault key. "Phone" can still read new items.`
    )
  })

  it('warns without a reason when the rotation failure gives none', async () => {
    const { text1 } = await revoke({
      results: [],
      failures: [
        {
          targetDeviceId: 'd-gone',
          kind: 'epoch',
          error: new Error('epoch rotation failed: ')
        }
      ],
      epoch: null
    })

    expect(text1).toBe(
      `Couldn't rotate the vault key. "Phone" can still read new items.`
    )
  })

  it('names the devices the new key could not reach', async () => {
    const { text1, visibilityTime } = await revoke({
      results: [],
      failures: [],
      epoch: { ...rotated, uncovered: ['d-old', 'd-tab'] }
    })

    expect(text1).toBe(
      '"Phone" can no longer edit this vault. Old laptop, Tablet must open the vault on a current Lockwright version before they can read new items.'
    )
    expect(visibilityTime).toBe(8000)
  })

  it('names each uncovered device once and unknown ones generically', async () => {
    const { text1 } = await revoke({
      results: [],
      failures: [],
      epoch: { ...rotated, uncovered: ['d-old', 'd-old', 'd-x'] }
    })

    expect(text1).toBe(
      '"Phone" can no longer edit this vault. Old laptop, Unknown Device must open the vault on a current Lockwright version before they can read new items.'
    )
  })

  it('counts distinct devices that share a name', async () => {
    const { text1 } = await revoke({
      results: [],
      failures: [],
      epoch: { ...rotated, uncovered: ['d-ios-1', 'd-ios-2', 'd-tab'] }
    })

    expect(text1).toBe(
      '"Phone" can no longer edit this vault. iPhone (2), Tablet must open the vault on a current Lockwright version before they can read new items.'
    )
  })
})

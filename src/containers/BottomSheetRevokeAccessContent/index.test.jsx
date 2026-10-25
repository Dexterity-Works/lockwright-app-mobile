import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { act, fireEvent, render, waitFor } from '@testing-library/react-native'
import { kickDevice } from 'lockwright-lib-vault'
import { pearpassVaultClient } from 'lockwright-lib-vault/src/instances'
import Toast from 'react-native-toast-message'

import { BottomSheetRevokeAccessContent } from './index'
import messages from '../../locales/en/messages'
import { logger } from '../../utils/logger'
import { markKeyRotated, rememberRevoked } from '../../utils/revokedDevices'

i18n.load('en', messages)
i18n.activate('en')

const mockClose = jest.fn()

jest.mock('lockwright-lib-vault', () => ({ kickDevice: jest.fn() }))

jest.mock('lockwright-lib-vault/src/instances', () => ({
  pearpassVaultClient: {
    activeVaultGetEpochStatus: jest.fn(),
    activeVaultList: jest.fn(),
    activeVaultGet: jest.fn()
  }
}))

jest.mock('react-native-toast-message', () => ({
  __esModule: true,
  default: { show: jest.fn() }
}))

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ bottom: 0 })
}))

jest.mock('../../utils/revokedDevices', () => ({
  markKeyRotated: jest.fn(),
  rememberRevoked: jest.fn()
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

const renderSheet = () =>
  render(
    <I18nProvider i18n={i18n}>
      <BottomSheetRevokeAccessContent
        vaultId="v1"
        targetDeviceId="d-gone"
        deviceName="Phone"
        devices={devices}
      />
    </I18nProvider>
  )

const revoke = async (result) => {
  kickDevice.mockResolvedValue(result)
  const screen = renderSheet()
  await act(async () => {
    fireEvent.press(screen.getByTestId('revoke-access-submit'))
  })
  return screen
}

// Runs the status polls out to the deadline.
const pastDeadline = () =>
  act(async () => {
    await jest.advanceTimersByTimeAsync(20000)
  })

const rotated = { rotated: true, id: 'e2', seq: 2, members: [], uncovered: [] }

const status = (overrides = {}) => ({
  vaultId: 'v1',
  epoch: 'e2',
  seq: 2,
  legacy: false,
  canRead: true,
  revoked: false,
  members: ['d-old', 'd-tab'],
  uncovered: [],
  ...overrides
})

const pendingText =
  "Phone can't change this vault. The vault key will rotate when the vault next syncs. Until then it can still read new items."
const failedText =
  "Phone can't change this vault, but it can still read new items until the key rotates."

describe('BottomSheetRevokeAccessContent', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    pearpassVaultClient.activeVaultGetEpochStatus.mockResolvedValue(status())
    pearpassVaultClient.activeVaultList.mockResolvedValue(devices)
    pearpassVaultClient.activeVaultGet.mockResolvedValue({
      id: 'e2',
      createdAt: 1600000000000
    })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('shows the revoke text desktop and the extension use', () => {
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

    screen.getByText('Revoke Phone?')
    screen.getByText('Revoking this device:')
    screen.getByText(
      "removes it from the vault, so it can't add or change items"
    )
    screen.getByText(
      "rotates the vault key, so it can't read anything saved or changed after that"
    )
    screen.getByText("It doesn't:")
    screen.getByText(
      "erase what's already on the device. It can still read every item it synced before the key rotated."
    )
    screen.getByText(
      'If the device was lost or stolen, change the passwords it could see.'
    )
    expect(screen.queryByText(/re-encrypted/)).toBeNull()
    expect(screen.queryByText(/older Lockwright version/)).toBeNull()
    expect(screen.queryByText(/exposed/i)).toBeNull()
  })

  it('confirms only once the latest key leaves the device out', async () => {
    await revoke({ results: [], failures: [], epoch: rotated })

    await waitFor(() => expect(Toast.show).toHaveBeenCalled())
    expect(Toast.show.mock.calls[0][0].text1).toBe(
      'Phone revoked. Vault key rotated.'
    )
    expect(mockClose).toHaveBeenCalled()
    expect(rememberRevoked).toHaveBeenCalledWith('v1', 'd-gone', 'Phone')
    // When the epoch was written, not when this device saw it.
    expect(pearpassVaultClient.activeVaultGet).toHaveBeenCalledWith('epoch/e2')
    expect(markKeyRotated).toHaveBeenCalledWith('v1', 'd-gone', 1600000000000)
  })

  it('does not confirm while the new key still reaches a device off the roster', async () => {
    jest.useFakeTimers()
    // A member with an older roster rotated: the target's swept duplicate
    // is still sealed to.
    pearpassVaultClient.activeVaultGetEpochStatus.mockResolvedValue(
      status({ members: ['d-old', 'd-dup'] })
    )
    const screen = await revoke({ results: [], failures: [], epoch: rotated })
    await pastDeadline()

    expect(Toast.show).not.toHaveBeenCalled()
    expect(markKeyRotated).not.toHaveBeenCalled()
    expect(screen.getByText('Removed · key rotating')).toBeTruthy()
  })

  it('treats a key that already leaves the device out as rotated', async () => {
    await revoke({
      results: [],
      failures: [],
      epoch: { rotated: false, reason: 'current', uncovered: [] }
    })

    await waitFor(() => expect(Toast.show).toHaveBeenCalled())
    expect(Toast.show.mock.calls[0][0].text1).toBe(
      'Phone revoked. Vault key rotated.'
    )
  })

  it('shows the rotating state, not success, while the key still seals to the device', async () => {
    jest.useFakeTimers()
    pearpassVaultClient.activeVaultGetEpochStatus.mockResolvedValue(
      status({ members: ['d-old', 'd-gone'] })
    )
    const screen = await revoke({ results: [], failures: [], epoch: rotated })

    screen.getByText('Removed · key rotating')
    screen.getByText(pendingText)
    await pastDeadline()

    screen.getByText('Removed · key rotating')
    expect(screen.queryByText(/Revoked/)).toBeNull()
    expect(Toast.show).not.toHaveBeenCalled()
    expect(rememberRevoked).toHaveBeenCalledWith('v1', 'd-gone', 'Phone')
    expect(markKeyRotated).not.toHaveBeenCalled()
    expect(mockClose).not.toHaveBeenCalled()
    expect(
      pearpassVaultClient.activeVaultGetEpochStatus.mock.calls.length
    ).toBeGreaterThan(1)
  })

  it('confirms a rotation that lands while it waits', async () => {
    jest.useFakeTimers()
    pearpassVaultClient.activeVaultGetEpochStatus
      .mockResolvedValueOnce(status({ members: ['d-gone'] }))
      .mockResolvedValue(status({ epoch: 'e3', members: ['d-old'] }))
    await revoke({ results: [], failures: [], epoch: rotated })
    await pastDeadline()

    expect(Toast.show).toHaveBeenCalledTimes(1)
    expect(Toast.show.mock.calls[0][0].text1).toBe(
      'Phone revoked. Vault key rotated.'
    )
  })

  it('does not count a legacy vault or another vault as rotated', async () => {
    jest.useFakeTimers()
    pearpassVaultClient.activeVaultGetEpochStatus
      .mockResolvedValueOnce(status({ legacy: true, epoch: null, members: [] }))
      .mockResolvedValue(status({ vaultId: 'v2' }))
    const screen = await revoke({ results: [], failures: [], epoch: rotated })
    await pastDeadline()

    screen.getByText('Removed · key rotating')
    expect(Toast.show).not.toHaveBeenCalled()
  })

  it('shows the pending state when another device rotates the key', async () => {
    jest.useFakeTimers()
    pearpassVaultClient.activeVaultGetEpochStatus.mockResolvedValue(
      status({ members: ['d-gone'] })
    )
    const screen = await revoke({
      results: [],
      failures: [],
      epoch: { rotated: false, reason: 'pending', uncovered: [] }
    })
    await pastDeadline()

    screen.getByText('Removed · key rotating')
    screen.getByText(pendingText)
    expect(Toast.show).not.toHaveBeenCalled()
  })

  it('keeps the sheet open when the device could not be removed', async () => {
    await revoke({
      results: [],
      failures: [
        {
          targetDeviceId: 'd-gone',
          error: new Error('epoch rotation failed: looks like one, is not')
        }
      ],
      epoch: null
    })

    expect(Toast.show.mock.calls[0][0].text1).toBe(
      "Couldn't revoke access. Please try again."
    )
    expect(mockClose).not.toHaveBeenCalled()
  })

  it('shows the failure state when the key did not rotate', async () => {
    const screen = await revoke({
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

    screen.getByText('Removed · key not rotated')
    screen.getByText(failedText)
    expect(Toast.show).not.toHaveBeenCalled()
    expect(rememberRevoked).toHaveBeenCalledWith('v1', 'd-gone', 'Phone')
    expect(logger.warn).toHaveBeenCalledWith(
      'BottomSheetRevokeAccessContent',
      'vault key not rotated:',
      'not-writable'
    )
    expect(logger.error).not.toHaveBeenCalled()
  })

  it('keeps a thrown rotation error out of the sheet and logs it', async () => {
    const error = new Error(
      'epoch rotation failed: activeVaultEnsureEpoch is not a function'
    )
    const screen = await revoke({
      results: [],
      failures: [{ targetDeviceId: 'd-gone', kind: 'epoch', error }],
      epoch: null
    })

    screen.getByText('Removed · key not rotated')
    expect(screen.queryByText(/is not a function/)).toBeNull()
    expect(logger.error).toHaveBeenCalledWith(
      'BottomSheetRevokeAccessContent',
      'vault key not rotated:',
      error
    )
  })

  it('logs an unknown skip reason and shows the failure state', async () => {
    const screen = await revoke({
      results: [],
      failures: [],
      epoch: { rotated: false, reason: 'ring-box-open-failed', uncovered: [] }
    })

    screen.getByText('Removed · key not rotated')
    expect(logger.warn).toHaveBeenCalledWith(
      'BottomSheetRevokeAccessContent',
      'vault key not rotated:',
      'ring-box-open-failed'
    )
  })

  it('keeps a kickDevice throw out of the toast and logs it with its stack', async () => {
    const error = new Error('IPC request 83 failed: worklet closed')
    kickDevice.mockRejectedValue(error)
    const screen = renderSheet()
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

  it('names the devices the new key could not reach', async () => {
    await revoke({
      results: [],
      failures: [],
      epoch: { ...rotated, uncovered: ['d-old', 'd-tab'] }
    })

    await waitFor(() => expect(Toast.show).toHaveBeenCalled())
    const { text1, text2, visibilityTime } = Toast.show.mock.calls[0][0]
    expect(text1).toBe('Phone revoked. Vault key rotated.')
    expect(text2).toBe(
      "Old laptop, Tablet can't read new items until they open this vault once on a current Lockwright version."
    )
    expect(visibilityTime).toBe(8000)
  })

  it('names each uncovered device once and counts shared names', async () => {
    await revoke({
      results: [],
      failures: [],
      epoch: { ...rotated, uncovered: ['d-ios-1', 'd-ios-2', 'd-x', 'd-x'] }
    })

    await waitFor(() => expect(Toast.show).toHaveBeenCalled())
    expect(Toast.show.mock.calls[0][0].text2).toBe(
      "iPhone (2), Unknown Device can't read new items until they open this vault once on a current Lockwright version."
    )
  })
})

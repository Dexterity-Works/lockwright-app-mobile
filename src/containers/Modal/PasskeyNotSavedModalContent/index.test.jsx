import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { fireEvent, render } from '@testing-library/react-native'

import { PasskeyNotSavedModalContent } from './index'
import { useModal } from '../../../context/ModalContext'
import messages from '../../../locales/en/messages'

i18n.load('en', messages)
i18n.activate('en')

jest.mock('../../../context/ModalContext', () => ({
  useModal: jest.fn()
}))

jest.mock('lockwright-lib-ui-react-native-components', () => {
  const { View, Text: RNText, Pressable } = require('react-native')
  return {
    rawTokens: new Proxy({}, { get: () => 0 }),
    useTheme: () => ({
      theme: {
        colors: {
          colorSurfacePrimary: '#fff',
          colorBorderPrimary: '#000'
        }
      }
    }),
    PageHeader: ({ title }) => (
      <View>
        <RNText>{title}</RNText>
      </View>
    ),
    Text: ({ children }) => <RNText>{children}</RNText>,
    Button: ({ children, onClick, testID }) => (
      <Pressable testID={testID} onPress={onClick}>
        <RNText>{children}</RNText>
      </Pressable>
    )
  }
})

const renderModal = (props) =>
  render(<PasskeyNotSavedModalContent {...props} />, {
    wrapper: ({ children }) => (
      <I18nProvider i18n={i18n}>{children}</I18nProvider>
    )
  })

describe('PasskeyNotSavedModalContent', () => {
  const closeModal = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    useModal.mockReturnValue({ closeModal })
  })

  it('names each site and why its passkey was not saved', () => {
    const api = renderModal({
      passkeys: [
        { jobId: 'j1', site: 'github.com', keyMissing: true },
        { jobId: 'j2', site: 'example.com', keyMissing: false }
      ]
    })

    expect(
      api.getByText(
        "The passkey for github.com wasn't saved. This device didn't have the vault's current key."
      )
    ).toBeTruthy()
    expect(
      api.getByText(
        "The passkey for example.com wasn't saved. Lockwright couldn't write it to the vault."
      )
    ).toBeTruthy()
    expect(
      api.getByText(
        'The site may still list it. Remove it there, then create a new passkey.'
      )
    ).toBeTruthy()
  })

  it('closes on Understood', () => {
    const api = renderModal({
      passkeys: [{ jobId: 'j1', site: 'github.com', keyMissing: true }]
    })
    fireEvent.press(
      api.getByTestId('passkey-not-saved-modal-understood-button')
    )
    expect(closeModal).toHaveBeenCalledTimes(1)
  })
})

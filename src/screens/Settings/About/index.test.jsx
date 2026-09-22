import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import Toast from 'react-native-toast-message'

import { About } from './index'
import { messages } from '../../../locales/en/messages'

const mockGoBack = jest.fn()
const mockSetStringAsync = jest.fn()

i18n.load('en', messages)
i18n.activate('en')

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack
  })
}))

jest.mock('lockwright-lib-ui-react-native-components', () => {
  const RN = require('react-native')

  return {
    NavbarListItem: ({ label, additionalItems, onClick, testID }) => (
      <RN.Pressable testID={testID} onPress={onClick}>
        <RN.Text>{label}</RN.Text>
        {additionalItems}
      </RN.Pressable>
    ),
    Text: ({ children }) => <RN.Text>{children}</RN.Text>,
    Link: ({ children }) => <RN.Text>{children}</RN.Text>,
    PageHeader: ({ title, subtitle }) => (
      <RN.View>
        <RN.Text>{title}</RN.Text>
        {subtitle}
      </RN.View>
    ),
    useTheme: () => ({
      theme: {
        colors: { colorPrimary: '#B0D944', colorBorderPrimary: '#333' }
      }
    }),
    rawTokens: new Proxy({}, { get: () => 0 })
  }
})

jest.mock('../../../containers/Layout', () => {
  const RN = require('react-native')
  return {
    Layout: ({ children }) => <RN.View>{children}</RN.View>
  }
})

jest.mock('../../../containers/ScreenHeader/BackScreenHeader', () => {
  const RN = require('react-native')
  return {
    BackScreenHeader: ({ title }) => <RN.Text>{title}</RN.Text>
  }
})

jest.mock('../../../utils/appDisplayVersion', () => ({
  getDisplayVersion: () => '0.0.14-259299'
}))

jest.mock('expo-clipboard', () => ({
  setStringAsync: (...args) => mockSetStringAsync(...args)
}))

jest.mock('react-native-toast-message', () => ({
  show: jest.fn()
}))

describe('About', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSetStringAsync.mockResolvedValue(undefined)
  })

  it('copies the display version with hash when the version row is pressed', async () => {
    const { getByTestId, getByText } = render(
      <I18nProvider i18n={i18n}>
        <About />
      </I18nProvider>
    )

    expect(getByText('0.0.14-259299')).toBeTruthy()
    fireEvent.press(getByTestId('app-version-row'))
    expect(mockSetStringAsync).toHaveBeenCalledWith('0.0.14-259299')
    await waitFor(() =>
      expect(Toast.show).toHaveBeenCalledWith(
        expect.objectContaining({ text1: 'Copied!' })
      )
    )
  })
})

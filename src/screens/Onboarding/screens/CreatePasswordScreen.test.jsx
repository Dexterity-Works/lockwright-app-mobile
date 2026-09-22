import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { fireEvent, render } from '@testing-library/react-native'

import { CreatePasswordScreen } from './CreatePasswordScreen'
import { messages } from '../../../locales/en/messages'

i18n.load('en', messages)
i18n.activate('en')

const mockNavigate = jest.fn()
const mockSubmit = jest.fn()

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate
  })
}))

jest.mock('lockwright-lib-constants', () => ({
  TERMS_OF_USE: 'https://example.test/terms/',
  PRIVACY_POLICY: 'https://example.test/privacy/'
}))

jest.mock('lockwright-lib-ui-react-native-components', () => {
  const RN = require('react-native')

  return {
    Button: ({ children, onClick, disabled, 'data-testid': dataTestId }) => (
      <RN.Pressable
        testID={dataTestId}
        onPress={() => {
          if (!disabled) {
            onClick?.()
          }
        }}
      >
        <RN.Text>{children}</RN.Text>
      </RN.Pressable>
    ),
    Text: ({ children, style, 'data-testid': dataTestId }) => (
      <RN.Text testID={dataTestId} style={style}>
        {children}
      </RN.Text>
    ),
    Link: ({ children, href, onClick, 'data-testid': dataTestId }) => (
      <RN.Pressable
        testID={dataTestId}
        onPress={onClick}
        accessibilityRole="link"
        accessibilityHint={href}
      >
        <RN.Text>{children}</RN.Text>
      </RN.Pressable>
    ),
    AlertMessage: () => null,
    useTheme: () => ({
      theme: { colors: {} }
    }),
    rawTokens: new Proxy({}, { get: () => 0 })
  }
})

jest.mock('lockwright-lib-ui-react-native-components/icons', () => ({
  KeyboardArrowRightFilled: () => null
}))

jest.mock('../../../hooks/useKeyboardVisibility', () => ({
  useKeyboardVisibility: () => ({
    isKeyboardVisible: false
  })
}))

jest.mock('../../../utils/unsupportedFeatures', () => ({
  unsupportedFeaturesEnabled: () => true
}))

jest.mock('../hooks/usePasswordCreation', () => ({
  usePasswordCreation: () => ({
    passwordRegisterProps: { value: 'StrongVault#2026' },
    passwordConfirmRegisterProps: {
      value: 'StrongVault#2026',
      error: null
    },
    handlePasswordChange: jest.fn(),
    handlePasswordConfirmChange: jest.fn(),
    passwordIndicatorVariant: 'strong',
    passwordsMatch: true,
    canSubmit: true,
    isLoading: false,
    submit: mockSubmit,
    values: { password: 'StrongVault#2026' }
  })
}))

jest.mock('../../../containers/Auth/shared/AuthFlowFormLayout', () => {
  const RN = require('react-native')

  return {
    AuthFlowFormLayout: ({ title, subtitle, children, footer }) => (
      <RN.View>
        <RN.Text>{title}</RN.Text>
        <RN.Text>{subtitle}</RN.Text>
        {children}
        {footer}
      </RN.View>
    )
  }
})

jest.mock('../../../containers/Auth/shared/ConfirmablePasswordFields', () => {
  const RN = require('react-native')

  return {
    ConfirmablePasswordFields: () => (
      <RN.View testID="confirmable-password-fields" />
    )
  }
})

const renderWithProviders = (ui) =>
  render(<I18nProvider i18n={i18n}>{ui}</I18nProvider>)

describe('CreatePasswordScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('labels the legal link as the live privacy policy', () => {
    const { getByTestId } = renderWithProviders(<CreatePasswordScreen />)

    expect(getByTestId('onboarding-terms-link')).toHaveTextContent(
      'Lockwright Privacy Policy'
    )
    expect(getByTestId('onboarding-terms-link').props.accessibilityHint).toBe(
      'https://example.test/privacy/'
    )
  })

  it('navigates to transfer data flow from the subtitle link', () => {
    const { getByTestId } = renderWithProviders(<CreatePasswordScreen />)

    fireEvent.press(getByTestId('onboarding-transfer-data-link'))

    expect(mockNavigate).toHaveBeenCalledWith('Welcome', {
      state: 'enterMasterPassword'
    })
  })

  it('shows which accept rules the password already meets', () => {
    const { getByTestId } = renderWithProviders(<CreatePasswordScreen />)

    expect(getByTestId('password-accept-checklist')).toBeTruthy()
    expect(
      getByTestId('password-accept-rule-minLength').props.accessibilityState
    ).toEqual({ checked: true })
    expect(
      getByTestId('password-accept-rule-hasSymbols').props.accessibilityState
    ).toEqual({ checked: true })
  })

  it('does not create the vault until the lost-password warning is confirmed', () => {
    const { getByTestId, queryByTestId } = renderWithProviders(
      <CreatePasswordScreen />
    )

    expect(queryByTestId('lost-password-dialog')).toBeNull()

    fireEvent.press(getByTestId('onboarding-create-password-continue'))

    expect(mockSubmit).not.toHaveBeenCalled()
    expect(getByTestId('lost-password-dialog')).toBeTruthy()
  })

  it('continues to autofill onboarding after the lost-password warning is confirmed', () => {
    mockSubmit.mockImplementation((onSuccess) => onSuccess('Master#2026'))

    const { getByTestId } = renderWithProviders(<CreatePasswordScreen />)

    fireEvent.press(getByTestId('onboarding-create-password-continue'))
    fireEvent.press(getByTestId('lost-password-confirm'))

    expect(mockSubmit).toHaveBeenCalled()
    expect(mockNavigate).toHaveBeenCalledWith('OnboardingAutofill', {
      password: 'Master#2026'
    })
  })

  it('skips the warning on a later continue after it was already confirmed', () => {
    mockSubmit.mockImplementation(() => {})

    const { getByTestId, queryByTestId } = renderWithProviders(
      <CreatePasswordScreen />
    )

    fireEvent.press(getByTestId('onboarding-create-password-continue'))
    fireEvent.press(getByTestId('lost-password-confirm'))

    expect(mockSubmit).toHaveBeenCalledTimes(1)

    fireEvent.press(getByTestId('onboarding-create-password-continue'))

    expect(queryByTestId('lost-password-dialog')).toBeNull()
    expect(mockSubmit).toHaveBeenCalledTimes(2)
  })
})

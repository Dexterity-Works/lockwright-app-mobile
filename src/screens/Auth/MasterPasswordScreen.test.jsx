import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { render, waitFor } from '@testing-library/react-native'

import { MasterPasswordScreen } from './MasterPasswordScreen'

i18n.activate('en')

const mockGetItemAsync = jest.fn()
const mockUseBiometricsAuthentication = jest.fn()
const mockIsFacialRecognitionSupported = jest.fn()
const mockIsFingerprintSupported = jest.fn()

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    replace: jest.fn(),
    goBack: jest.fn()
  })
}))

jest.mock('lockwright-lib-ui-react-hooks', () => ({
  useForm: () => ({
    register: () => ({ value: '', onChange: jest.fn(), error: undefined }),
    handleSubmit: (fn) => () => fn({ password: '' }),
    setErrors: jest.fn(),
    values: { password: '' }
  })
}))

jest.mock('lockwright-utils-validator', () => ({
  Validator: {
    object: () => ({
      validate: () => ({})
    }),
    string: () => ({
      required: () => ({})
    })
  }
}))

jest.mock('lockwright-lib-ui-react-native-components', () => {
  const RN = require('react-native')

  return {
    AlertMessage: () => null,
    Button: ({ children, 'data-testid': dataTestId }) => (
      <RN.Pressable testID={dataTestId}>
        <RN.Text>{children}</RN.Text>
      </RN.Pressable>
    ),
    Link: ({ children, onClick, 'data-testid': dataTestId }) => (
      <RN.Pressable testID={dataTestId} onPress={onClick}>
        <RN.Text>{children}</RN.Text>
      </RN.Pressable>
    ),
    PasswordField: () => null,
    Text: ({ children }) => <RN.Text>{children}</RN.Text>,
    Title: ({ children }) => <RN.Text>{children}</RN.Text>,
    rawTokens: new Proxy({}, { get: () => 0 }),
    useTheme: () => ({
      theme: {
        colors: {
          colorTextSecondary: '#888',
          colorSurfacePrimary: '#111'
        }
      }
    })
  }
})

jest.mock('lockwright-lib-ui-react-native-components/icons', () => ({
  KeyboardArrowRightFilled: () => null
}))

jest.mock('lockwright-lib-vault', () => ({
  useUserData: () => ({
    logIn: jest.fn(),
    refreshMasterPasswordStatus: jest.fn()
  }),
  useVaults: () => ({
    initVaults: jest.fn()
  })
}))

jest.mock('lockwright-lib-vault/src/utils/buffer', () => ({
  clearBuffer: jest.fn(),
  stringToBuffer: jest.fn()
}))

jest.mock('expo-secure-store', () => ({
  getItemAsync: (...args) => mockGetItemAsync(...args)
}))

jest.mock('react-native-toast-message', () => ({
  show: jest.fn()
}))

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 })
}))

jest.mock('../../hooks/useBiometricsAuthentication', () => ({
  useBiometricsAuthentication: () => mockUseBiometricsAuthentication()
}))

jest.mock('../../hooks/useKeyboardVisibility', () => ({
  useKeyboardVisibility: () => ({ isKeyboardVisible: false })
}))

jest.mock('../../utils/biometricLogin', () => ({
  isFacialRecognitionSupported: (...args) =>
    mockIsFacialRecognitionSupported(...args),
  isFingerprintSupported: (...args) => mockIsFingerprintSupported(...args)
}))

jest.mock('../../utils/unsupportedFeatures', () => ({
  unsupportedFeaturesEnabled: () => false
}))

jest.mock('./hooks/useAutoSelectVault', () => ({
  useAutoSelectVault: () => ({ autoSelectVault: jest.fn() })
}))

jest.mock('../Onboarding/components/OnboardingLayout', () => {
  const RN = require('react-native')
  return {
    OnboardingLayout: ({ children }) => <RN.View>{children}</RN.View>
  }
})

const renderScreen = () =>
  render(
    <I18nProvider i18n={i18n}>
      <MasterPasswordScreen />
    </I18nProvider>
  )

describe('MasterPasswordScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetItemAsync.mockReturnValue(new Promise(() => {}))
  })

  it('opens the fingerprint prompt on first paint when biometrics are on', async () => {
    mockUseBiometricsAuthentication.mockReturnValue({
      isBiometricsEnabled: true,
      isBiometricsSupported: true,
      biometricTypes: [2]
    })
    mockIsFacialRecognitionSupported.mockReturnValue(false)
    mockIsFingerprintSupported.mockReturnValue(true)

    const { getByTestId } = renderScreen()

    await waitFor(() => {
      expect(mockGetItemAsync).toHaveBeenCalled()
    })
    expect(getByTestId('auth-biometric-retry')).toHaveTextContent(
      'Unlock with Fingerprint'
    )
    expect(getByTestId('auth-biometric-retry')).not.toHaveTextContent(
      'Try again with Fingerprint'
    )
  })

  it('says try again only after a failed fingerprint prompt', async () => {
    let rejectAuth
    mockGetItemAsync.mockReturnValue(
      new Promise((_, reject) => {
        rejectAuth = reject
      })
    )
    mockUseBiometricsAuthentication.mockReturnValue({
      isBiometricsEnabled: true,
      isBiometricsSupported: true,
      biometricTypes: [2]
    })
    mockIsFacialRecognitionSupported.mockReturnValue(false)
    mockIsFingerprintSupported.mockReturnValue(true)

    const { getByTestId } = renderScreen()

    await waitFor(() => {
      expect(getByTestId('auth-biometric-retry')).toHaveTextContent(
        'Unlock with Fingerprint'
      )
    })

    rejectAuth(new Error('canceled'))

    await waitFor(() => {
      expect(getByTestId('auth-biometric-retry')).toHaveTextContent(
        'Try again with Fingerprint'
      )
    })
  })

  it('shows a fingerprint control when the OS has enrolled biometrics even if the user skipped enable', () => {
    mockUseBiometricsAuthentication.mockReturnValue({
      isBiometricsEnabled: false,
      isBiometricsSupported: true,
      biometricTypes: [2]
    })
    mockIsFacialRecognitionSupported.mockReturnValue(false)
    mockIsFingerprintSupported.mockReturnValue(true)

    const { getByTestId } = renderScreen()

    expect(mockGetItemAsync).not.toHaveBeenCalled()
    expect(getByTestId('auth-biometric-setup')).toHaveTextContent(
      'Set up Fingerprint'
    )
  })

  it('does not open a fingerprint prompt when biometrics are off', () => {
    mockUseBiometricsAuthentication.mockReturnValue({
      isBiometricsEnabled: false,
      isBiometricsSupported: true,
      biometricTypes: [2]
    })
    mockIsFacialRecognitionSupported.mockReturnValue(false)
    mockIsFingerprintSupported.mockReturnValue(true)

    renderScreen()

    expect(mockGetItemAsync).not.toHaveBeenCalled()
  })
})

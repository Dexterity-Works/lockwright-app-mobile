import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { render } from '@testing-library/react-native'

import { BiometricsScreen } from './BiometricsScreen'
import { messages } from '../../../locales/en/messages'

i18n.load('en', messages)
i18n.activate('en')

const mockDispatch = jest.fn()
const mockUseBiometricsAuthentication = jest.fn()

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    dispatch: mockDispatch
  }),
  useRoute: () => ({
    params: { password: 'Master#2026' }
  }),
  CommonActions: {
    reset: (payload) => ({ type: 'RESET', payload })
  }
}))

jest.mock('lockwright-lib-ui-react-native-components', () => {
  const RN = require('react-native')

  return {
    Button: ({ children, onClick, 'data-testid': dataTestId }) => (
      <RN.Pressable testID={dataTestId} onPress={onClick}>
        <RN.Text>{children}</RN.Text>
      </RN.Pressable>
    ),
    Text: ({ children, 'data-testid': dataTestId }) => (
      <RN.Text testID={dataTestId}>{children}</RN.Text>
    ),
    Title: ({ children }) => <RN.Text>{children}</RN.Text>,
    useTheme: () => ({
      theme: { colors: { colorTextSecondary: '#888' } }
    })
  }
})

jest.mock('lockwright-lib-ui-react-native-components/icons', () => ({
  FaceId: () => null,
  Fingerprint: () => null
}))

jest.mock('lockwright-lib-vault', () => ({
  useVaults: () => ({
    data: [{ id: 'vault-1' }]
  }),
  useVault: () => ({
    refetch: jest.fn()
  })
}))

jest.mock('lockwright-lib-vault/src/utils/buffer', () => ({
  clearBuffer: jest.fn(),
  stringToBuffer: jest.fn()
}))

jest.mock('react-native-toast-message', () => ({
  show: jest.fn()
}))

jest.mock('rive-react-native', () => {
  const RN = require('react-native')
  return {
    __esModule: true,
    default: () => <RN.View testID="onboarding-biometrics-media" />
  }
})

jest.mock('../../../hooks/useBiometricsAuthentication', () => ({
  useBiometricsAuthentication: () => mockUseBiometricsAuthentication()
}))

jest.mock('../components/OnboardingLayout', () => {
  const RN = require('react-native')

  return {
    OnboardingLayout: ({ children, rightAction }) => (
      <RN.View>
        {rightAction ? (
          <RN.Pressable
            testID="onboarding-right-action"
            onPress={rightAction.onPress}
          >
            <RN.Text>{rightAction.label}</RN.Text>
          </RN.Pressable>
        ) : null}
        {children}
      </RN.View>
    )
  }
})

const renderScreen = () =>
  render(
    <I18nProvider i18n={i18n}>
      <BiometricsScreen />
    </I18nProvider>
  )

describe('BiometricsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('does not skip while biometric support is still being checked', () => {
    mockUseBiometricsAuthentication.mockReturnValue({
      enableBiometrics: jest.fn(),
      isBiometricsSupported: false,
      isBiometricsEnabled: false,
      hasCheckedSupport: false
    })

    const { getByTestId } = renderScreen()

    expect(mockDispatch).not.toHaveBeenCalled()
    expect(getByTestId('onboarding-biometrics-enable')).toBeTruthy()
  })

  it('stays on the offer when the OS has enrolled biometrics and the user has not enabled them', () => {
    mockUseBiometricsAuthentication.mockReturnValue({
      enableBiometrics: jest.fn(),
      isBiometricsSupported: true,
      isBiometricsEnabled: false,
      hasCheckedSupport: true
    })

    const { getByTestId, queryByTestId } = renderScreen()

    expect(mockDispatch).not.toHaveBeenCalled()
    expect(getByTestId('onboarding-biometrics-enable')).toBeTruthy()
    expect(queryByTestId('onboarding-right-action')).toBeNull()
    expect(getByTestId('onboarding-biometrics-skip')).toBeTruthy()
  })
})

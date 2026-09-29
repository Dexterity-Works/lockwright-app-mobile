import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { render } from '@testing-library/react-native'

import { DataLocalScreen } from './DataLocalScreen'
import { messages } from '../../../locales/en/messages'

i18n.load('en', messages)
i18n.activate('en')

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ replace: jest.fn() })
}))

jest.mock('lockwright-lib-ui-react-native-components', () => {
  const RN = require('react-native')

  return {
    Button: ({ children }) => <RN.Text>{children}</RN.Text>,
    Text: ({ children }) => <RN.Text>{children}</RN.Text>,
    Title: ({ children }) => <RN.Text>{children}</RN.Text>,
    useTheme: () => ({
      theme: {
        colors: { colorSurfacePrimary: '#000', colorTextPrimary: '#fff' }
      }
    })
  }
})

jest.mock('lockwright-lib-ui-react-native-components/icons', () => ({
  KeyboardArrowRightFilled: () => null
}))

jest.mock('../components/OnboardingLayout', () => ({
  OnboardingLayout: ({ children }) => children
}))

describe('DataLocalScreen', () => {
  it('shows the SVG vault animation instead of a video', () => {
    const screen = render(
      <I18nProvider i18n={i18n}>
        <DataLocalScreen />
      </I18nProvider>
    )

    expect(screen.getByTestId('vault-unlock-animation')).toBeTruthy()
    expect(screen.queryByTestId('onboarding-data-local-media')).toBeNull()
    screen.unmount()
  })
})

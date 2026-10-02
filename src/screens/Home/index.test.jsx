import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { fireEvent, render } from '@testing-library/react-native'

import { Home } from './index'
import { SharedFilterProvider } from '../../context/SharedFilterContext'
import messages from '../../locales/en/messages'

i18n.load('en', messages)
i18n.activate('en')

const mockNavigate = jest.fn()

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate })
}))

jest.mock('lockwright-lib-vault', () => ({
  RECORD_TYPES: { LOGIN: 'login', NOTE: 'note' },
  useRecords: () => ({ data: [] }),
  useVault: () => ({ data: { id: 'vault-1' } })
}))

jest.mock('lockwright-lib-ui-react-native-components', () => {
  const { Text, TouchableOpacity } = require('react-native')
  return {
    Button: ({ children, onClick, 'aria-label': label }) => (
      <TouchableOpacity accessibilityLabel={label} onPress={onClick}>
        <Text>{children}</Text>
      </TouchableOpacity>
    ),
    // The sheet stays closed: a trigger inside a menu only opens the menu.
    ContextMenu: ({ trigger }) => trigger,
    SearchField: () => null,
    Text: ({ children }) => <Text>{children}</Text>,
    Title: ({ children }) => <Text>{children}</Text>,
    rawTokens: {},
    useTheme: () => ({ theme: { colors: {} } })
  }
})

jest.mock(
  'lockwright-lib-ui-react-native-components/icons',
  () => new Proxy({}, { get: () => () => null })
)

jest.mock('../../containers/ContentHeader', () => {
  const { Text, TouchableOpacity } = require('react-native')
  return {
    ContentHeader: ({ onCategoryChange }) => (
      <TouchableOpacity onPress={() => onCategoryChange('login')}>
        <Text>Filter Logins</Text>
      </TouchableOpacity>
    )
  }
})

jest.mock('../../containers/ScreenHeader', () => ({
  ScreenHeader: ({ rightActions }) => rightActions
}))

jest.mock('../../containers/Layout', () => ({
  Layout: ({ header, children }) => (
    <>
      {header}
      {children}
    </>
  )
}))

jest.mock('../../containers/BottomSheetCategorySelectorContent', () => ({
  BottomSheetCategorySelectorContent: () => null
}))
jest.mock('../../containers/ItemList', () => ({ ItemList: () => null }))
jest.mock('../../containers/MultiSelectBar', () => ({
  MultiSelectBar: () => null
}))
jest.mock('../../svgs/ItemCardIllustration', () => ({
  ItemCardIllustration: () => null
}))
jest.mock('../../jobQueue', () => ({ useJobQueueProcessor: jest.fn() }))
jest.mock('../../hooks/useBackHandler', () => ({ useBackHandler: jest.fn() }))

const renderHome = () =>
  render(
    <I18nProvider i18n={i18n}>
      <SharedFilterProvider>
        <Home />
      </SharedFilterProvider>
    </I18nProvider>
  )

describe('Home add item', () => {
  beforeEach(() => mockNavigate.mockClear())

  it('leaves the type choice to the sheet when no type is selected', () => {
    const { getByLabelText, getByText } = renderHome()

    fireEvent.press(getByLabelText('Add item'))
    fireEvent.press(getByText('Add item'))

    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('opens the selected type create screen from + and the empty state', () => {
    const { getByLabelText, getByText } = renderHome()

    fireEvent.press(getByText('Filter Logins'))
    fireEvent.press(getByLabelText('Add item'))
    fireEvent.press(getByText('Add item'))

    expect(mockNavigate.mock.calls).toEqual([
      ['CreateRecord', { recordType: 'login' }],
      ['CreateRecord', { recordType: 'login' }]
    ])
  })
})

import { render, act, fireEvent } from '@testing-library/react-native'

import {
  SharedFilterProvider,
  useSharedFilter,
  INITIAL_STATE
} from './SharedFilterContext'

const TestConsumer = () => {
  const { state, setState } = useSharedFilter()
  return (
    <div>
      <div testID="folder">{state.folder}</div>
      <div testID="favorite">{state.isFavorite.toString()}</div>
      <div testID="sort">{state.sort}</div>
      <button
        testID="change-state"
        onPress={() =>
          setState({
            folder: 'Test Folder',
            isFavorite: true,
            sort: 'Name'
          })
        }
      >
        Change State
      </button>
    </div>
  )
}

describe('SharedFilterContext', () => {
  test('provides initial state correctly', () => {
    const { getByTestId } = render(
      <SharedFilterProvider>
        <TestConsumer />
      </SharedFilterProvider>
    )

    expect(getByTestId('folder').children[0]).toBe(INITIAL_STATE.folder)
    expect(getByTestId('favorite').children[0]).toBe(
      INITIAL_STATE.isFavorite.toString()
    )
    expect(getByTestId('sort').children[0]).toBe(INITIAL_STATE.sort)
  })

  test('updates state correctly when setState is called', () => {
    const { getByTestId } = render(
      <SharedFilterProvider>
        <TestConsumer />
      </SharedFilterProvider>
    )

    act(() => {
      fireEvent.press(getByTestId('change-state'))
    })

    expect(getByTestId('folder').children[0]).toBe('Test Folder')
    expect(getByTestId('favorite').children[0]).toBe('true')
  })

  test('useSharedFilter hook throws error when used outside of SharedFilterProvider', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error')
    consoleErrorSpy.mockImplementation(() => {})

    expect(() => render(<TestConsumer />)).toThrow()

    consoleErrorSpy.mockRestore()
  })

  test('keeps the same context value when the provider re-renders', () => {
    const seen = []
    const Consumer = () => {
      seen.push(useSharedFilter())
      return null
    }
    const { rerender } = render(
      <SharedFilterProvider>
        <Consumer />
      </SharedFilterProvider>
    )
    rerender(
      <SharedFilterProvider>
        <Consumer />
      </SharedFilterProvider>
    )

    expect(seen.length).toBeGreaterThan(1)
    expect(seen[seen.length - 1]).toBe(seen[0])
  })
})

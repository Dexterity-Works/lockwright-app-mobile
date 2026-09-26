import { useEffect } from 'react'

import { render, act } from '@testing-library/react-native'
import { Text } from 'react-native'

import { ModalProvider, useModal } from './ModalContext'

jest.mock('expo-blur', () => {
  const { View } = require('react-native')

  return {
    BlurView: (props) => <View {...props} />
  }
})

const TestComponent = ({ onMount }) => {
  const modalContext = useModal()

  useEffect(() => {
    if (onMount) onMount(modalContext)
  }, [onMount])

  return null
}

describe('ModalContext', () => {
  it('should provide the correct initial values', () => {
    let contextValue

    render(
      <ModalProvider>
        <TestComponent
          onMount={(value) => {
            contextValue = value
          }}
        />
      </ModalProvider>
    )

    expect(contextValue.isOpen).toBe(false)
    expect(typeof contextValue.openModal).toBe('function')
    expect(typeof contextValue.closeModal).toBe('function')
  })

  it('should open the modal with content', () => {
    let contextValue

    const { getByText } = render(
      <ModalProvider>
        <TestComponent
          onMount={(value) => {
            contextValue = value
          }}
        />
      </ModalProvider>
    )

    act(() => {
      contextValue.openModal(<Text>Modal Content</Text>)
    })

    expect(getByText('Modal Content')).toBeTruthy()
  })

  it('should close the modal', () => {
    let contextValue

    const { queryByText } = render(
      <ModalProvider>
        <TestComponent
          onMount={(value) => {
            contextValue = value
          }}
        />
      </ModalProvider>
    )

    act(() => {
      contextValue.openModal(<Text>Modal Content</Text>)
    })

    expect(queryByText('Modal Content')).toBeTruthy()

    act(() => {
      contextValue.closeModal()
    })

    expect(contextValue.isOpen).toBe(false)
    expect(queryByText('Modal Content')).toBeNull()
  })

  it('keeps the same context value when the provider re-renders', () => {
    const seen = []
    const Consumer = () => {
      seen.push(useModal())
      return null
    }
    const { rerender } = render(
      <ModalProvider>
        <Consumer />
      </ModalProvider>
    )
    rerender(
      <ModalProvider>
        <Consumer />
      </ModalProvider>
    )

    expect(seen.length).toBeGreaterThan(1)
    expect(seen[seen.length - 1]).toBe(seen[0])
  })
})

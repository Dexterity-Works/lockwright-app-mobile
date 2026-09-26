import { createContext, useState, useContext, useEffect, useMemo } from 'react'

import { View } from 'react-native'

import { LoadingOverlay } from '../components/LoadingOverlay'

const LoadingContext = createContext()

/**
 * @param {{
 *  children: import('react').ReactNode
 * }} props
 */
export const LoadingProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false)
  const value = useMemo(() => ({ isLoading, setIsLoading }), [isLoading])

  return (
    <LoadingContext.Provider value={value}>
      <View style={{ flex: 1 }}>
        {children}
        {isLoading && <LoadingOverlay />}
      </View>
    </LoadingContext.Provider>
  )
}

/**
 * @returns {{
 *  isLoading: boolean,
 *  setIsLoading: (isLoading: boolean) => void
 * }}
 */
export const useLoadingContext = () => useContext(LoadingContext)

/**
 * @param {{
 *  isLoading: boolean
 * }} props
 */
export const useGlobalLoading = ({ isLoading }) => {
  const { setIsLoading } = useLoadingContext()

  useEffect(() => {
    if (typeof isLoading !== 'boolean') {
      return
    }

    setIsLoading(isLoading)

    return () => {
      setIsLoading(false)
    }
  }, [isLoading])
}

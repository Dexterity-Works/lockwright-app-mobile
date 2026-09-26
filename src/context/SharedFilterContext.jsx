import { createContext, useContext, useMemo, useState } from 'react'

import { SORT_KEYS } from '../constants/sortOptions'

const SharedFilterContext = createContext()

export const INITIAL_STATE = {
  folder: 'allFolder',
  isFavorite: false,
  sort: SORT_KEYS.LAST_UPDATED_NEWEST
}

/**
 * @param {{
 *    children: React.ReactNode
 * }} props
 */
export const SharedFilterProvider = ({ children }) => {
  const [state, setState] = useState(INITIAL_STATE)
  const value = useMemo(() => ({ state, setState }), [state])

  return (
    <SharedFilterContext.Provider value={value}>
      {children}
    </SharedFilterContext.Provider>
  )
}

/**
 * @returns {{
 *   state: { folder: string, isFavorite: boolean, sort: string },
 *   setState: Function
 * }}
 */
export const useSharedFilter = () => useContext(SharedFilterContext)

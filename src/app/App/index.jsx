import { useEffect, useRef } from 'react'

import { rawTokens } from 'lockwright-lib-ui-react-native-components'
import { OtpRefreshProvider, useVault } from 'lockwright-lib-vault'
import { View } from 'react-native'
import Toast from 'react-native-toast-message'

import { Navigation } from '../Navigation'
import { useAutoLockWatcher } from './hooks/useAutoLockWatcher'
import { useRedirect } from './hooks/useRedirect'
import { ToastCard } from '../../components/ToastCard'
import { UpdateModalContent } from '../../containers/Modal/UpdateModalContent'
import { useBottomSheet } from '../../context/BottomSheetContext'
import { useGlobalLoading } from '../../context/LoadingContext'
import { useVaultAccessRevoked } from '../../hooks/useVaultAccessRevoked'
import { useVaultSchemaBoot } from '../../hooks/useVaultSchemaBoot'
import { useVersionCheck } from '../../hooks/useVersionCheck'

export const App = () => {
  useAutoLockWatcher()
  const { expand } = useBottomSheet()
  const { needsUpdate } = useVersionCheck()
  const hasOpenedUpdateModal = useRef(false)

  useEffect(() => {
    if (needsUpdate && !hasOpenedUpdateModal.current) {
      hasOpenedUpdateModal.current = true
      expand({ children: <UpdateModalContent />, locked: true })
    }
  }, [needsUpdate])

  useVaultAccessRevoked()
  const { isMigrationReady } = useVaultSchemaBoot()
  const { data: activeVault } = useVault()
  useGlobalLoading({
    isLoading: Boolean(activeVault?.id) && !isMigrationReady
  })

  const { initialRouteName, isLoading } = useRedirect()

  if (isLoading) {
    return null
  }

  return (
    <>
      <OtpRefreshProvider>
        <Navigation initialRouteName={initialRouteName} />
      </OtpRefreshProvider>

      <Toast
        config={{
          baseToast: ({ text1, renderLeadingIcon }) => (
            <ToastCard text1={text1} renderLeadingIcon={renderLeadingIcon} />
          ),
          alertToast: ({ props }) => (
            <View
              style={{ width: '100%', paddingHorizontal: rawTokens.spacing16 }}
            >
              {props?.render?.()}
            </View>
          )
        }}
      />
    </>
  )
}

import { useState, useRef, useCallback, useEffect } from 'react'

import { useLingui } from '@lingui/react/macro'
import * as Clipboard from 'expo-clipboard'
import * as SecureStore from 'expo-secure-store'
import { CLIPBOARD_CLEAR_TIMEOUT } from 'lockwright-lib-constants'
import { ContentCopy } from 'lockwright-lib-ui-react-native-components/icons'
import { Platform } from 'react-native'
import Toast from 'react-native-toast-message'
import { colors } from 'src/utils/colors'

import { IOS_APP_GROUP_ID } from '../constants/iosAppGroup'
import { SECURE_STORAGE_KEYS } from '../constants/secureStorageKeys'
import NativeClipboard from '../native-modules/NativeClipboard'

export const useCopyToClipboard = () => {
  const [isCopyToClipboardEnabled, setIsCopyToClipboardEnabled] =
    useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const timeoutRef = useRef(null)
  const { t } = useLingui()

  useEffect(() => {
    const loadOptIn = async () => {
      const optIn = await SecureStore.getItemAsync(
        SECURE_STORAGE_KEYS.COPY_TO_CLIPBOARD,
        {
          accessGroup: IOS_APP_GROUP_ID
        }
      )
      setIsCopyToClipboardEnabled(optIn !== 'false')
    }

    loadOptIn()

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const copyToClipboard = useCallback(
    async (text) => {
      if (!isCopyToClipboardEnabled) {
        Toast.show({
          type: 'baseToast',
          text1: t`Please turn on the Copy to clipboard action from your settings`,
          position: 'bottom',
          bottomOffset: 100
        })
        return false
      }

      if (!text?.length) {
        return false
      }

      try {
        const storedTimeout = await SecureStore.getItemAsync(
          SECURE_STORAGE_KEYS.CLIPBOARD_CLEAR_TIMEOUT
        )
        let clipboardTimeout = CLIPBOARD_CLEAR_TIMEOUT
        if (storedTimeout === 'null') clipboardTimeout = null
        else if (storedTimeout !== null)
          clipboardTimeout = Number(storedTimeout)

        if (clipboardTimeout === null) {
          // Android keeps clipboard history; the native module flags the
          // copy sensitive. iOS has no such flag, expo-clipboard is fine.
          if (Platform.OS === 'android') {
            await NativeClipboard.setString(text)
          } else {
            await Clipboard.setStringAsync(text)
          }
        } else {
          await NativeClipboard.setStringWithExpiration(
            text,
            clipboardTimeout / 1000
          )
        }

        setIsCopied(true)

        Toast.show({
          type: 'baseToast',
          text1: t`Copied!`,
          renderLeadingIcon: () => <ContentCopy color={colors.black.mode1} />,
          position: 'bottom',
          bottomOffset: 100
        })

        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
        }
        timeoutRef.current = setTimeout(() => setIsCopied(false), 2000)

        return true
      } catch {
        return false
      }
    },
    [isCopyToClipboardEnabled, t]
  )

  return { copyToClipboard, isCopied, isCopyToClipboardEnabled }
}

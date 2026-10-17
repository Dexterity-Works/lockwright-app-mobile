import { useState } from 'react'

import { useLingui } from '@lingui/react/macro'
import {
  Button,
  Text,
  rawTokens,
  useBottomSheetClose,
  useTheme
} from 'lockwright-lib-ui-react-native-components'
import { kickDevice } from 'lockwright-lib-vault'
import { StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Toast from 'react-native-toast-message'

import { TOAST_CONFIG } from '../../constants/toast'
import { logger } from '../../utils/logger'
import { SheetHeader } from '../BottomSheet/SheetHeader'

export const BottomSheetRevokeAccessContent = ({
  vaultId,
  targetDeviceId,
  deviceName,
  devices = []
}) => {
  const { t } = useLingui()
  const { theme } = useTheme()
  const close = useBottomSheetClose()
  const { bottom } = useSafeAreaInsets()
  const [isLoading, setIsLoading] = useState(false)

  const onRevoke = async () => {
    if (isLoading) return
    setIsLoading(true)
    let failures = []
    let epoch = null
    try {
      ;({ failures, epoch } = await kickDevice({ vaultId, targetDeviceId }))
    } catch (error) {
      logger.error(
        'BottomSheetRevokeAccessContent',
        'kickDevice failed:',
        error
      )
      Toast.show({
        type: 'baseToast',
        text1: t`Couldn't revoke access. Please try again.`,
        position: 'bottom',
        bottomOffset: TOAST_CONFIG.BOTTOM_OFFSET
      })
      setIsLoading(false)
      return
    }

    close()
    Toast.show({
      type: 'baseToast',
      text1: revokedMessage({ failures, epoch }),
      position: 'bottom',
      bottomOffset: TOAST_CONFIG.BOTTOM_OFFSET
    })
  }

  // 'current' means the latest key already leaves this device out.
  const revokedMessage = ({ failures, epoch }) => {
    if (!epoch || (!epoch.rotated && epoch.reason !== 'current')) {
      // kickDevice also lists the rotation as a failure, so the
      // unreachable-device message would be wrong here.
      const reason =
        epoch?.reason ??
        failures
          ?.at(-1)
          ?.error?.message?.replace(/^epoch rotation failed: /, '')
      return reason
        ? t`Couldn't rotate the vault key: ${reason}. "${deviceName}" can still read new items.`
        : t`Couldn't rotate the vault key. "${deviceName}" can still read new items.`
    }

    const revoked = failures?.length
      ? t`Couldn't reach the device. It will lose edit access next time it comes online.`
      : t`"${deviceName}" can no longer edit this vault.`
    if (!epoch.uncovered?.length) return revoked

    const names = epoch.uncovered
      .map((id) => devices.find((d) => d?.id === id)?.name ?? id)
      .join(', ')
    return `${revoked} ${t`${names} must open the vault on a current Lockwright version before they can read new items.`}`
  }

  return (
    <View style={[styles.container, { paddingBottom: bottom }]}>
      <SheetHeader
        title={t`Revoke access for ${deviceName}?`}
        onClose={close}
      />

      <View style={styles.content}>
        <View style={styles.body}>
          <View>
            <Text variant="label" color={theme.colors.colorTextSecondary}>
              {t`Revoking removes this device from the vault and rotates the vault key. It can no longer read items added or changed from now on.`}
            </Text>
            <Text variant="label" color={theme.colors.colorTextSecondary}>
              {t`Before you proceed, please note:`}
            </Text>
          </View>

          <View style={styles.bulletList}>
            <View style={styles.bulletRow}>
              <Text variant="label" style={styles.bulletGlyph}>
                {'•'}
              </Text>
              <Text variant="label" style={styles.bulletText}>
                {t`Anything it synced before now stays on that device. Revoking cannot delete it. Change passwords the device could see, especially if it was lost or stolen.`}
              </Text>
            </View>
            <View style={styles.bulletRow}>
              <Text variant="label" style={styles.bulletGlyph}>
                {'•'}
              </Text>
              <Text variant="label" style={styles.bulletText}>
                {t`Devices still on an older Lockwright version must update before they can read new items.`}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.actions}>
          <Button
            variant="destructive"
            size="medium"
            fullWidth
            isLoading={isLoading}
            onClick={onRevoke}
            testID="revoke-access-submit"
          >
            {t`Revoke Access`}
          </Button>
          <Button
            variant="secondary"
            size="medium"
            fullWidth
            disabled={isLoading}
            onClick={close}
            testID="revoke-access-cancel"
          >
            {t`Cancel`}
          </Button>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: '100%'
  },
  content: {
    paddingHorizontal: rawTokens.spacing16,
    paddingTop: rawTokens.spacing8,
    gap: rawTokens.spacing16
  },
  body: {
    gap: rawTokens.spacing12
  },
  bulletList: {
    gap: rawTokens.spacing12
  },
  bulletRow: {
    flexDirection: 'row',
    gap: rawTokens.spacing8
  },
  bulletGlyph: {
    width: rawTokens.spacing12
  },
  bulletText: {
    flex: 1
  },
  actions: {
    gap: rawTokens.spacing16
  }
})

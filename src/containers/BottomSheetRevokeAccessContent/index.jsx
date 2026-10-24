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

const Bullet = ({ children }) => (
  <View style={styles.bulletRow}>
    <Text variant="label" style={styles.bulletGlyph}>
      {'•'}
    </Text>
    <Text variant="label" style={styles.bulletText}>
      {children}
    </Text>
  </View>
)

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
      showRevokeFailed()
      return
    }

    // A null epoch with no rotation failure means the device was not removed.
    const rotationFailure = failures?.find((f) => f?.kind === 'epoch')
    if (!epoch && !rotationFailure) {
      logger.error(
        'BottomSheetRevokeAccessContent',
        'kickDevice did not remove the device:',
        failures?.at(-1)?.error
      )
      showRevokeFailed()
      return
    }

    close()
    const { text1, warning } = revokedMessage({
      failures,
      epoch,
      rotationFailure
    })
    Toast.show({
      type: 'baseToast',
      text1,
      position: 'bottom',
      bottomOffset: TOAST_CONFIG.BOTTOM_OFFSET,
      ...(warning && { visibilityTime: 8000 })
    })
  }

  const showRevokeFailed = () => {
    Toast.show({
      type: 'baseToast',
      text1: t`Couldn't revoke access. Please try again.`,
      position: 'bottom',
      bottomOffset: TOAST_CONFIG.BOTTOM_OFFSET
    })
    setIsLoading(false)
  }

  // 'current' means the latest key already leaves this device out.
  // 'pending' means another member rotates it when it syncs.
  const revokedMessage = ({ failures, epoch, rotationFailure }) => {
    const pending = epoch?.rotated === false && epoch.reason === 'pending'
    if (!epoch || (!epoch.rotated && epoch.reason !== 'current' && !pending)) {
      const reason =
        epoch?.reason ??
        rotationFailure?.error?.message?.replace(/^epoch rotation failed: /, '')
      // Only known skip reasons get copy. A thrown error's text stays in the log.
      const reasons = {
        'not-writable': t`This device can't write to the vault.`,
        'self-not-in-roster': t`This device isn't on the vault's member list.`,
        legacy: t`The vault doesn't use rotating keys yet.`
      }
      const known = Object.hasOwn(reasons, reason) ? reasons[reason] : null
      if (!known && rotationFailure?.error) {
        logger.error(
          'BottomSheetRevokeAccessContent',
          'vault key not rotated:',
          rotationFailure.error
        )
      } else {
        logger.warn(
          'BottomSheetRevokeAccessContent',
          'vault key not rotated:',
          reason
        )
      }
      return {
        warning: true,
        text1: known
          ? t`Couldn't rotate the vault key. ${known} "${deviceName}" can still read new items.`
          : t`Couldn't rotate the vault key. "${deviceName}" can still read new items.`
      }
    }

    const revoked = failures?.some((f) => !f?.kind)
      ? t`Couldn't reach the device. It will stop editing next time it comes online.`
      : t`"${deviceName}" can no longer edit this vault.`
    const parts = [revoked]
    if (pending) {
      parts.push(
        t`Another device will rotate the vault key when it next syncs.`
      )
    }
    if (!epoch.uncovered?.length) {
      return { warning: pending, text1: parts.join(' ') }
    }

    // Distinct devices can share a label ("iPhone"), so count them.
    const counts = new Map()
    for (const id of new Set(epoch.uncovered)) {
      const label = devices.find((d) => d?.id === id)?.name ?? t`Unknown Device`
      counts.set(label, (counts.get(label) ?? 0) + 1)
    }
    const names = [...counts]
      .map(([label, count]) => (count > 1 ? `${label} (${count})` : label))
      .join(', ')
    parts.push(
      t`${names} can't read new items until they open this vault once on a current Lockwright version.`
    )
    return { warning: true, text1: parts.join(' ') }
  }

  return (
    <View style={[styles.container, { paddingBottom: bottom }]}>
      <SheetHeader title={t`Revoke ${deviceName}?`} onClose={close} />

      <View style={styles.content}>
        <View style={styles.body}>
          <Text variant="label" color={theme.colors.colorTextSecondary}>
            {t`Revoking this device:`}
          </Text>
          <View style={styles.bulletList}>
            <Bullet>
              {t`removes it from the vault, so it can't add or change items`}
            </Bullet>
            <Bullet>
              {t`rotates the vault key, so it can't read anything saved or changed after that`}
            </Bullet>
          </View>
          <Text variant="label" color={theme.colors.colorTextSecondary}>
            {t`It doesn't:`}
          </Text>
          <View style={styles.bulletList}>
            <Bullet>
              {t`erase what's already on the device. It can still read every item it synced before the key rotated.`}
            </Bullet>
          </View>
          <Text variant="label" color={theme.colors.colorTextSecondary}>
            {t`If the device was lost or stolen, change the passwords it could see.`}
          </Text>
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

import { useEffect, useRef, useState } from 'react'

import { useLingui } from '@lingui/react/macro'
import {
  Button,
  Text,
  rawTokens,
  useBottomSheetClose,
  useTheme
} from 'lockwright-lib-ui-react-native-components'
import { kickDevice } from 'lockwright-lib-vault'
import { pearpassVaultClient } from 'lockwright-lib-vault/src/instances'
import { StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Toast from 'react-native-toast-message'

import { TOAST_CONFIG } from '../../constants/toast'
import { logger } from '../../utils/logger'
import { SheetHeader } from '../BottomSheet/SheetHeader'

const POLL_MS = 1000
const DEADLINE_MS = 15000

// The kick counts once this vault's latest key leaves the device out.
const rotatedPast = (status, vaultId, deviceId) =>
  status?.vaultId === vaultId &&
  !status.legacy &&
  !!status.epoch &&
  Array.isArray(status.members) &&
  !status.members.includes(deviceId)

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
  // 'confirm', then 'rotating' or 'failed' once the device is removed.
  const [phase, setPhase] = useState('confirm')
  const [waiting, setWaiting] = useState(false)
  const unmounted = useRef(false)
  useEffect(
    () => () => {
      unmounted.current = true
    },
    []
  )

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

    const pending = epoch?.rotated === false && epoch.reason === 'pending'
    if (!epoch || (!epoch.rotated && epoch.reason !== 'current' && !pending)) {
      logNotRotated(epoch, rotationFailure)
      setPhase('failed')
      return
    }

    setPhase('rotating')
    setWaiting(true)
    // 'pending': another member rotates when it syncs, so look once.
    const confirmed = await waitForRotation(pending ? 0 : DEADLINE_MS)
    if (unmounted.current) return
    setWaiting(false)
    if (!confirmed) return

    close()
    const text2 = uncoveredText(epoch.uncovered)
    Toast.show({
      type: 'baseToast',
      text1: t`${deviceName} revoked. Vault key rotated.`,
      ...(text2 && { text2, visibilityTime: 8000 }),
      position: 'bottom',
      bottomOffset: TOAST_CONFIG.BOTTOM_OFFSET
    })
  }

  const waitForRotation = async (deadlineMs) => {
    const until = Date.now() + deadlineMs
    for (;;) {
      try {
        const status = await pearpassVaultClient.activeVaultGetEpochStatus()
        if (rotatedPast(status, vaultId, targetDeviceId)) return true
      } catch (error) {
        logger.warn(
          'BottomSheetRevokeAccessContent',
          'epoch status read failed:',
          error?.message
        )
      }
      if (unmounted.current || Date.now() >= until) return false
      await new Promise((resolve) => setTimeout(resolve, POLL_MS))
    }
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

  // A thrown error's text stays in the log, with its stack.
  const logNotRotated = (epoch, rotationFailure) => {
    const reason =
      epoch?.reason ??
      rotationFailure?.error?.message?.replace(/^epoch rotation failed: /, '')
    const known = ['not-writable', 'self-not-in-roster', 'legacy']
    if (!known.includes(reason) && rotationFailure?.error) {
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
  }

  const uncoveredText = (uncovered) => {
    if (!uncovered?.length) return null
    // Distinct devices can share a label ("iPhone"), so count them.
    const counts = new Map()
    for (const id of new Set(uncovered)) {
      const label = devices.find((d) => d?.id === id)?.name ?? t`Unknown Device`
      counts.set(label, (counts.get(label) ?? 0) + 1)
    }
    const names = [...counts]
      .map(([label, count]) => (count > 1 ? `${label} (${count})` : label))
      .join(', ')
    return t`${names} can't read new items until they open this vault once on a current Lockwright version.`
  }

  if (phase !== 'confirm') {
    const failed = phase === 'failed'
    return (
      <View style={[styles.container, { paddingBottom: bottom }]}>
        <SheetHeader
          title={
            failed ? t`Removed · key not rotated` : t`Removed · key rotating`
          }
          onClose={close}
        />
        <View style={styles.content}>
          <Text variant="label" color={theme.colors.colorTextSecondary}>
            {failed
              ? t`${deviceName} can't change this vault, but it can still read new items until the key rotates.`
              : t`${deviceName} can't change this vault. The vault key will rotate when the vault next syncs. Until then it can still read new items.`}
          </Text>
          <Button
            variant="secondary"
            size="medium"
            fullWidth
            isLoading={waiting}
            onClick={close}
            testID="revoke-access-done"
          >
            {t`Done`}
          </Button>
        </View>
      </View>
    )
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

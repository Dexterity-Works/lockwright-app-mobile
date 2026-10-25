import { useEffect, useMemo, useState } from 'react'

import { useLingui } from '@lingui/react/macro'
import { useNavigation } from '@react-navigation/native'
import {
  Button,
  ContextMenu,
  NativeBottomSheet,
  NavbarListItem,
  rawTokens,
  Text,
  useBottomSheetClose,
  useTheme
} from 'lockwright-lib-ui-react-native-components'
import {
  DoNotDisturb,
  MoreVert
} from 'lockwright-lib-ui-react-native-components/icons'
import { getMyDeviceId, useVault } from 'lockwright-lib-vault'
import { pearpassVaultClient } from 'lockwright-lib-vault/src/instances'
import { Platform, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { BottomSheetRevokeAccessContent } from '../../../containers/BottomSheetRevokeAccessContent'
import { Layout } from '../../../containers/Layout'
import { BackScreenHeader } from '../../../containers/ScreenHeader/BackScreenHeader'
import {
  formatDeviceDate,
  getDeviceIcon
} from '../../../utils/devicePresentation'
import { logger } from '../../../utils/logger'
import { removedDevices } from '../../../utils/revokedDevices'

const RevokeActionMenu = ({ onRevoke }) => {
  const { t } = useLingui()
  const { theme } = useTheme()
  const close = useBottomSheetClose()
  const { bottom } = useSafeAreaInsets()

  return (
    <View style={{ paddingBottom: bottom }}>
      <NavbarListItem
        platform="mobile"
        icon={
          <DoNotDisturb color={theme.colors.colorSurfaceDestructiveElevated} />
        }
        label={t`Revoke Access`}
        variant="destructive"
        onClick={() => {
          close()
          onRevoke()
        }}
      />
    </View>
  )
}

export const PairedDevicesScreen = () => {
  const { t } = useLingui()
  const navigation = useNavigation()
  const { theme } = useTheme()
  const { data, refetch: refetchVault } = useVault()

  useEffect(() => {
    refetchVault()
  }, [])

  const currentDeviceName = useMemo(
    () => `${Platform.OS} ${Platform.Version}`,
    []
  )

  const [myDeviceId, setMyDeviceId] = useState(null)

  useEffect(() => {
    let cancelled = false
    getMyDeviceId()
      .then((id) => {
        if (!cancelled) setMyDeviceId(id ?? null)
      })
      .catch((error) => {
        logger.error('PairedDevicesScreen', 'getMyDeviceId failed:', error)
      })
    return () => {
      cancelled = true
    }
  }, [data?.devices])

  const isCurrentDevice = (device) => {
    if (!device) return false
    if (myDeviceId && device.id === myDeviceId) return true
    return device.name === currentDeviceName
  }

  const [revokeTarget, setRevokeTarget] = useState(null)

  // Read again after a revoke, and on every pushed status.
  const [epochStatus, setEpochStatus] = useState(null)
  useEffect(() => {
    let cancelled = false
    // A push is newer than the read started before it.
    let pushed = false
    const onStatus = (status) => {
      if (!cancelled) setEpochStatus(status)
    }
    const onPush = (status) => {
      pushed = true
      onStatus(status)
    }
    pearpassVaultClient
      .activeVaultGetEpochStatus()
      .then((status) => {
        if (!pushed) onStatus(status)
      })
      .catch((error) => {
        logger.warn('PairedDevicesScreen', 'epoch status failed:', error)
      })
    pearpassVaultClient.on?.('epoch-status', onPush)
    return () => {
      cancelled = true
      pearpassVaultClient.off?.('epoch-status', onPush)
    }
  }, [data?.id, revokeTarget])

  const getDeviceDisplayName = (deviceName) => {
    if (!deviceName) return t`Unknown Device`
    const lowerName = deviceName.toLowerCase()
    if (lowerName.startsWith('ios')) return t`iPhone`
    if (lowerName.startsWith('android')) return t`Android`
    return deviceName
  }

  const devices = data?.devices ?? []
  const vaultId = data?.id
  const removed = removedDevices(epochStatus, vaultId, devices)

  // As the revoke sheet's failed state: this device holds the key, so it
  // can rotate past the removed device itself.
  const rotateNow = async () => {
    try {
      await pearpassVaultClient.activeVaultEnsureEpoch({ start: true })
      setEpochStatus(await pearpassVaultClient.activeVaultGetEpochStatus())
    } catch (error) {
      logger.warn('PairedDevicesScreen', 'rotation failed:', error)
    }
  }
  const rotatedAt = (at) =>
    `${formatDeviceDate(at)} ${new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`

  return (
    <Layout
      scrollable
      contentStyle={styles.content}
      header={
        <BackScreenHeader
          title={t`Paired Devices`}
          onBack={() => navigation.goBack()}
        />
      }
    >
      {devices.length > 0 && (
        <View
          style={[
            styles.deviceList,
            { borderColor: theme.colors.colorBorderPrimary }
          ]}
        >
          {devices.map((device, index) => {
            const isLast = index === devices.length - 1
            const DeviceIcon = getDeviceIcon(device?.name)
            const displayName = getDeviceDisplayName(device?.name)
            const isSelf = isCurrentDevice(device)

            return (
              <View
                key={device.id ?? `${device.name}-${index}`}
                style={[
                  styles.deviceItem,
                  !isLast && {
                    borderBottomWidth: 1,
                    borderBottomColor: theme.colors.colorBorderPrimary
                  }
                ]}
              >
                <View
                  style={[
                    styles.deviceIconContainer,
                    {
                      backgroundColor:
                        theme.colors.colorSurfaceElevatedOnInteraction
                    }
                  ]}
                >
                  <DeviceIcon
                    color={theme.colors.colorAccentActive}
                    width={16}
                    height={16}
                  />
                </View>

                <View style={styles.deviceInfo}>
                  <Text variant="bodyEmphasized" numberOfLines={1}>
                    {displayName}
                  </Text>
                  <View style={styles.deviceDates}>
                    {device.createdAt && (
                      <Text
                        variant="caption"
                        color={theme.colors.colorTextSecondary}
                        numberOfLines={1}
                      >
                        {t`Paired on ${formatDeviceDate(device.createdAt)}`}
                      </Text>
                    )}
                  </View>
                </View>

                {!isSelf && device.id && (
                  <ContextMenu
                    trigger={
                      <Button
                        variant="tertiary"
                        size="small"
                        aria-label={t`Device actions`}
                        iconBefore={
                          <MoreVert color={theme.colors.colorTextPrimary} />
                        }
                      />
                    }
                  >
                    <RevokeActionMenu
                      onRevoke={() =>
                        setRevokeTarget({
                          deviceId: device.id,
                          deviceName: displayName
                        })
                      }
                    />
                  </ContextMenu>
                )}
              </View>
            )
          })}
          {removed.map((device) => (
            <View
              key={device.id}
              style={[
                styles.deviceItem,
                {
                  borderTopWidth: 1,
                  borderTopColor: theme.colors.colorBorderPrimary
                }
              ]}
            >
              <View style={styles.deviceInfo}>
                <Text variant="bodyEmphasized" numberOfLines={1}>
                  {device.name ?? t`Removed device`}
                </Text>
                <Text variant="caption" color={theme.colors.colorTextSecondary}>
                  {device.rotatedAt
                    ? t`Revoked · key rotated ${rotatedAt(device.rotatedAt)}`
                    : epochStatus?.canRead
                      ? t`Removed · key not rotated`
                      : t`Removed · key rotating`}
                </Text>
              </View>
              {!device.rotatedAt && epochStatus?.canRead && (
                <Button
                  variant="secondary"
                  size="small"
                  onClick={rotateNow}
                  testID={`paired-devices-rotate-${device.id}`}
                >
                  {t`Rotate key now`}
                </Button>
              )}
            </View>
          ))}
        </View>
      )}

      <NativeBottomSheet
        open={revokeTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRevokeTarget(null)
        }}
      >
        {revokeTarget && vaultId && (
          <BottomSheetRevokeAccessContent
            vaultId={vaultId}
            targetDeviceId={revokeTarget.deviceId}
            deviceName={revokeTarget.deviceName}
            devices={devices.map((device) => ({
              id: device.id,
              name: getDeviceDisplayName(device.name)
            }))}
          />
        )}
      </NativeBottomSheet>
    </Layout>
  )
}

const styles = StyleSheet.create({
  content: {
    padding: rawTokens.spacing16,
    gap: rawTokens.spacing16
  },
  deviceList: {
    borderWidth: 1,
    borderRadius: rawTokens.radius8,
    overflow: 'hidden'
  },
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: rawTokens.spacing12,
    gap: rawTokens.spacing12
  },
  deviceIconContainer: {
    width: 32,
    height: 32,
    borderRadius: rawTokens.radius8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  deviceInfo: {
    flex: 1,
    gap: 2,
    overflow: 'hidden'
  },
  deviceDates: {
    gap: 2
  }
})

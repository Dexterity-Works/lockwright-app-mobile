import { useEffect, useRef } from 'react'

import { useLingui } from '@lingui/react/macro'
import {
  CommonActions,
  useNavigation,
  useRoute
} from '@react-navigation/native'
import {
  Button,
  Text,
  Title,
  useTheme
} from 'lockwright-lib-ui-react-native-components'
import {
  FaceId,
  Fingerprint
} from 'lockwright-lib-ui-react-native-components/icons'
import { useVault, useVaults } from 'lockwright-lib-vault'
import {
  clearBuffer,
  stringToBuffer
} from 'lockwright-lib-vault/src/utils/buffer'
import { Dimensions, Platform, StyleSheet, View } from 'react-native'
import Toast from 'react-native-toast-message'
import Rive from 'rive-react-native'

import { NAVIGATION_ROUTES } from '../../../constants/navigation'
import { TOAST_CONFIG } from '../../../constants/toast'
import { useBiometricsAuthentication } from '../../../hooks/useBiometricsAuthentication'
import { logger } from '../../../utils/logger'
import { OnboardingLayout } from '../components/OnboardingLayout'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

const isIOS = Platform.OS === 'ios'

export const BiometricsScreen = () => {
  const { t } = useLingui()
  const navigation = useNavigation()
  const route = useRoute()
  const { theme } = useTheme()
  const {
    enableBiometrics,
    isBiometricsSupported,
    isBiometricsEnabled,
    hasCheckedSupport
  } = useBiometricsAuthentication()
  const { data: vaultsData } = useVaults()
  const { refetch: refetchVault } = useVault()
  const password = route.params?.password

  const biometricsChecked = useRef(false)

  // Skip only after the OS check finishes. The hook starts unsupported=false,
  // so a timed skip would hide this screen on every mid-range phone.
  useEffect(() => {
    if (!password) return
    if (!hasCheckedSupport) return
    if (biometricsChecked.current) return
    biometricsChecked.current = true
    if (!isBiometricsSupported || isBiometricsEnabled) {
      finishOnboarding()
    }
  }, [hasCheckedSupport, isBiometricsSupported, isBiometricsEnabled, password])

  const title = isIOS
    ? t`Unlock faster with Face ID`
    : t`Unlock faster with biometrics`
  const buttonLabel = isIOS ? t`Enable Face ID` : t`Enable biometrics`

  const enterApp = async () => {
    const firstVault = vaultsData?.[0]
    if (firstVault) {
      await refetchVault(firstVault.id)
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'MainTabNavigator' }]
        })
      )
    } else {
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [
            {
              name: 'Welcome',
              params: { state: NAVIGATION_ROUTES.SELECT_OR_LOAD }
            }
          ]
        })
      )
    }
  }

  const finishOnboarding = () => {
    enterApp()
  }

  const handleEnableBiometrics = async () => {
    if (!password) {
      finishOnboarding()
      return
    }

    const passwordBuffer = stringToBuffer(password)

    try {
      const result = await enableBiometrics()

      if (result?.error) {
        logger.error('Failed to enable biometric authentication:', result.error)
        Toast.show({
          type: 'baseToast',
          text1: t`Failed to enable biometric authentication.`,
          position: 'bottom',
          bottomOffset: TOAST_CONFIG.BOTTOM_OFFSET
        })
      }

      await enterApp()
    } catch (error) {
      logger.error('Error while enabling biometric authentication:', error)
      await enterApp()
    } finally {
      clearBuffer(passwordBuffer)
    }
  }

  return (
    <OnboardingLayout showLogo={false} topGradient>
      <View style={styles.container}>
        <View style={styles.topSection}>
          <View style={styles.riveContainer}>
            <Rive
              resourceName={isIOS ? 'face_id' : 'fingerprint'}
              autoplay
              style={styles.riveAnimation}
              testID="onboarding-biometrics-media"
            />
          </View>

          <View style={styles.copyContainer}>
            <View style={styles.titleContainer}>
              <Title data-testid="onboarding-biometrics-title">{title}</Title>
            </View>

            <View style={styles.descriptionContainer}>
              <Text
                as="p"
                color={theme.colors.colorTextSecondary}
                style={styles.description}
                data-testid="onboarding-biometrics-description"
              >
                {t`Use your fingerprint or face to securely unlock Lockwright and confirm actions. It's faster than entering your Master Password and works only with your approval.`}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <Button
            variant="primary"
            fullWidth
            onClick={handleEnableBiometrics}
            iconBefore={
              isIOS ? (
                <FaceId width={16} height={16} />
              ) : (
                <Fingerprint width={16} height={16} />
              )
            }
            data-testid="onboarding-biometrics-enable"
          >
            {buttonLabel}
          </Button>
          <Button
            variant="tertiary"
            fullWidth
            onClick={finishOnboarding}
            data-testid="onboarding-biometrics-skip"
          >
            {t`Not now`}
          </Button>
        </View>
      </View>
    </OnboardingLayout>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  topSection: {
    alignItems: 'center',
    paddingHorizontal: 31
  },
  riveContainer: {
    width: SCREEN_WIDTH * 0.9,
    height: SCREEN_WIDTH * 0.9,
    overflow: 'hidden',
    marginTop: 108
  },
  riveAnimation: {
    width: '100%',
    height: '100%'
  },
  buttonContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    width: '100%',
    gap: 8
  },
  copyContainer: {
    alignItems: 'center'
  },
  titleContainer: {
    marginBottom: 14,
    marginTop: 16
  },
  descriptionContainer: {
    alignItems: 'center',
    marginBottom: 30
  },
  description: {
    textAlign: 'center'
  }
})

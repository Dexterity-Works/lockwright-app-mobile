import { useEffect, useRef } from 'react'

import { useLingui } from '@lingui/react/macro'
import { useNavigation, useRoute } from '@react-navigation/native'
import {
  Button,
  Text,
  Title,
  useTheme
} from 'lockwright-lib-ui-react-native-components'
import { OpenInNew } from 'lockwright-lib-ui-react-native-components/icons'
import { AppState, Dimensions, Platform, StyleSheet, View } from 'react-native'

import { LogoLock } from '../../../svgs/LogoLock'
import {
  isAutofillEnabled,
  openAutofillSettings,
  requestToEnableAutofill
} from '../../../utils/AutofillModule'
import { logger } from '../../../utils/logger'
import { OnboardingLayout } from '../components/OnboardingLayout'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

export const AutofillScreen = () => {
  const { t } = useLingui()
  const navigation = useNavigation()
  const route = useRoute()
  const { theme } = useTheme()
  const password = route.params?.password

  const waitingForSettings = useRef(false)

  useEffect(() => {
    isAutofillEnabled().then((enabled) => {
      if (enabled) goToNext()
    })
  }, [])

  const goToNext = () => {
    navigation.navigate('OnboardingBiometrics', { password })
  }

  // Navigate to next screen when user returns from system settings
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (waitingForSettings.current && nextAppState === 'active') {
        waitingForSettings.current = false
        goToNext()
      }
    })

    return () => subscription.remove()
  }, [])

  const handleEnableAutofill = () => {
    waitingForSettings.current = true

    const useSystemPrompt =
      Platform.OS === 'ios' && parseInt(Platform.Version, 10) >= 18
    const openSettings = useSystemPrompt
      ? requestToEnableAutofill
      : openAutofillSettings

    openSettings()
      .then((_result) => {
        // If the system prompt resolved without leaving the app
        // (iOS 18+ in-app prompt, or already enabled), navigate directly
        if (!waitingForSettings.current) return
        if (AppState.currentState === 'active') {
          waitingForSettings.current = false
          goToNext()
        }
      })
      .catch((error) => {
        logger.error('Failed to enable autofill:', error)
        waitingForSettings.current = false
      })
  }

  return (
    <OnboardingLayout
      showLogo={false}
      rightAction={{ label: t`Not now`, onPress: goToNext }}
      topGradient
    >
      <View style={styles.container}>
        <View style={styles.topSection}>
          <View
            style={styles.riveContainer}
            data-testid="onboarding-autofill-media"
          >
            <View style={styles.autofillCard}>
              <View style={styles.autofillChip}>
                <LogoLock width={28} height={28} />
                <Text as="p" style={styles.autofillBrand}>
                  Lockwright
                </Text>
                <View style={styles.autofillRule} />
                <Text as="p" style={styles.autofillDots}>
                  {'••••••••'}
                </Text>
              </View>
              <View style={styles.autofillKeys}>
                {Array.from({ length: 21 }, (_, i) => (
                  <View key={i} style={styles.autofillKey} />
                ))}
              </View>
            </View>
          </View>

          <View style={styles.copyContainer}>
            <View style={styles.titleContainer}>
              <Title data-testid="onboarding-autofill-title">
                {t`Faster, safer sign-ins`}
              </Title>
            </View>

            <View style={styles.descriptionContainer}>
              <Text
                as="p"
                color={theme.colors.colorTextSecondary}
                style={styles.description}
                data-testid="onboarding-autofill-description"
              >
                {t`Allow autofill to sign in instantly on apps and websites. Lockwright fills your credentials securely, so you don't need to remember, copy, or retype passwords.`}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <Button
            variant="primary"
            fullWidth
            onClick={handleEnableAutofill}
            iconBefore={<OpenInNew width={16} height={16} />}
            data-testid="onboarding-autofill-enable"
          >
            {t`Turn on Autofill`}
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
    marginTop: 108,
    justifyContent: 'center',
    alignItems: 'center'
  },
  autofillCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#14161b',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2a2e36',
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 20,
    alignItems: 'center'
  },
  autofillChip: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#08090b',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2a2e36',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8
  },
  autofillBrand: {
    color: '#d4af77',
    fontSize: 16
  },
  autofillRule: {
    width: 1,
    height: 18,
    backgroundColor: '#2a2e36',
    marginHorizontal: 4
  },
  autofillDots: {
    color: '#8a8378',
    letterSpacing: 2,
    flex: 1
  },
  autofillKeys: {
    width: '100%',
    marginTop: 28,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6
  },
  autofillKey: {
    width: 28,
    height: 28,
    borderRadius: 4,
    backgroundColor: '#1c1f26'
  },
  buttonContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    width: '100%'
  },
  copyContainer: {
    alignItems: 'center'
  },
  titleContainer: {
    marginBottom: 14
  },
  descriptionContainer: {
    alignItems: 'center',
    marginBottom: 30
  },
  description: {
    textAlign: 'center'
  }
})

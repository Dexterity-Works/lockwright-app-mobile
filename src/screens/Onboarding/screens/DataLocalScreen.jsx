import { useLingui } from '@lingui/react/macro'
import { useNavigation } from '@react-navigation/native'
import {
  Button,
  useTheme,
  Text,
  Title
} from 'lockwright-lib-ui-react-native-components'
import { KeyboardArrowRightFilled } from 'lockwright-lib-ui-react-native-components/icons'
import { Dimensions, StyleSheet, View } from 'react-native'

import { DataLocalVideo } from './DataLocalVideo'
import { OnboardingLayout } from '../components/OnboardingLayout'
import { RadialGradientBackground } from '../components/RadialGradientBackground'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

export const DataLocalScreen = () => {
  const { t } = useLingui()
  const navigation = useNavigation()
  const { theme } = useTheme()
  const gradientColors = [
    { color: '#2a2418', offset: '0%' },
    { color: theme.colors.colorSurfacePrimary, offset: '100%', opacity: 0 }
  ]

  return (
    <OnboardingLayout>
      <View style={styles.container}>
        <View style={styles.topSection}>
          <RadialGradientBackground
            colors={gradientColors}
            style={styles.mediaContainer}
          >
            <DataLocalVideo />
          </RadialGradientBackground>

          <View style={styles.copyContainer}>
            <View style={styles.titleContainer}>
              <Title data-testid="onboarding-data-local-title">
                {t`Your data stays on your devices`}
              </Title>
            </View>

            <View style={styles.descriptionContainer}>
              <Text
                as="p"
                color={theme.colors.colorTextPrimary}
                style={styles.description}
                data-testid="onboarding-data-local-description"
              >
                {t`Your items are stored locally, not on our servers.\nOnly you have access to them.`}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <Button
            variant="primary"
            fullWidth
            onClick={() => navigation.replace('OnboardingSync')}
            iconAfter={<KeyboardArrowRightFilled />}
            data-testid="onboarding-data-local-continue"
          >
            {t`Continue`}
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
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 31
  },
  mediaContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: SCREEN_WIDTH / 1.4,
    height: SCREEN_WIDTH / 1.4
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
    marginTop: 22,
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

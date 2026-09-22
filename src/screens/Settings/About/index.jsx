import { useLingui } from '@lingui/react/macro'
import { useNavigation } from '@react-navigation/native'
import * as Clipboard from 'expo-clipboard'
import {
  PEARPASS_WEBSITE,
  PRIVACY_POLICY,
  TERMS_OF_USE
} from 'lockwright-lib-constants'
import {
  Link,
  NavbarListItem,
  PageHeader,
  rawTokens,
  Text,
  useTheme
} from 'lockwright-lib-ui-react-native-components'
import { Linking, StyleSheet, View } from 'react-native'
import Toast from 'react-native-toast-message'

import { Layout } from '../../../containers/Layout'
import { BackScreenHeader } from '../../../containers/ScreenHeader/BackScreenHeader'
import { getDisplayVersion } from '../../../utils/appDisplayVersion'

export const About = () => {
  const { t } = useLingui()
  const navigation = useNavigation()
  const { theme } = useTheme()
  const displayVersion = getDisplayVersion()

  const copyDisplayVersion = () => {
    void Clipboard.setStringAsync(displayVersion)
      .then(() => {
        Toast.show({
          type: 'baseToast',
          text1: t`Copied!`,
          position: 'bottom',
          bottomOffset: 100
        })
      })
      .catch(() => {})
  }

  return (
    <Layout
      scrollable
      hideFooter
      header={
        <BackScreenHeader
          title={t`Settings`}
          onBack={() => navigation.goBack()}
        />
      }
      contentStyle={styles.scrollContent}
    >
      <PageHeader
        title={t`App version`}
        subtitle={
          <>
            {t`Here you can find all the info about your app.`}
            {'\n'}
            {t`Check here to see the `}
            <Link
              href={TERMS_OF_USE}
              isExternal
              onClick={() => Linking.openURL(TERMS_OF_USE)}
            >
              {t`Terms of Use`}
            </Link>
            {t` and the `}
            <Link
              href={PRIVACY_POLICY}
              isExternal
              onClick={() => Linking.openURL(PRIVACY_POLICY)}
            >
              {t`Privacy Statement`}
            </Link>
            {t` and `}
            <Link
              href={PEARPASS_WEBSITE}
              isExternal
              onClick={() => Linking.openURL(PEARPASS_WEBSITE)}
            >
              {t`visit our website`}
            </Link>
            .
          </>
        }
      />

      <View
        style={[
          styles.versionContainer,
          { borderColor: theme.colors.colorBorderPrimary }
        ]}
      >
        <NavbarListItem
          testID="app-version-row"
          label={t`App version`}
          size="big"
          onClick={copyDisplayVersion}
          additionalItems={
            <Text variant="label" color={theme.colors.colorPrimary}>
              {displayVersion}
            </Text>
          }
        />
      </View>
    </Layout>
  )
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingTop: rawTokens.spacing24,
    gap: rawTokens.spacing20,
    flexGrow: 1
  },
  versionContainer: {
    borderWidth: 1,
    borderRadius: rawTokens.spacing12,
    overflow: 'hidden'
  }
})

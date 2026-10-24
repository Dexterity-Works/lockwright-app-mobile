import { useLingui } from '@lingui/react/macro'
import {
  Button,
  PageHeader,
  rawTokens,
  Text,
  useTheme
} from 'lockwright-lib-ui-react-native-components'
import { StyleSheet, View } from 'react-native'

import { useModal } from '../../../context/ModalContext'

/**
 * @param {{
 *   passkeys: Array<{ jobId: string, site: string, keyMissing: boolean }>
 * }} props
 */
export const PasskeyNotSavedModalContent = ({ passkeys }) => {
  const { closeModal } = useModal()
  const { t } = useLingui()
  const { theme } = useTheme()

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.colorSurfacePrimary,
          borderColor: theme.colors.colorBorderPrimary
        }
      ]}
      testID="passkey-not-saved-modal"
    >
      <View style={styles.content}>
        <PageHeader title={t`Passkey not saved`} />

        <View style={styles.body}>
          {passkeys.map(({ jobId, site, keyMissing }) => (
            <Text key={jobId} variant="label">
              {keyMissing
                ? t`The passkey for ${site} wasn't saved. This device didn't have the vault's current key.`
                : t`The passkey for ${site} wasn't saved. Lockwright couldn't write it to the vault.`}
            </Text>
          ))}
          <Text variant="label">
            {t`The site may still list it. Remove it there, then create a new passkey.`}
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.footer,
          { borderTopColor: theme.colors.colorBorderPrimary }
        ]}
      >
        <Button
          variant="primary"
          size="medium"
          fullWidth
          onClick={closeModal}
          testID="passkey-not-saved-modal-understood-button"
        >
          {t`Understood`}
        </Button>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: 480,
    borderWidth: 1,
    borderRadius: rawTokens.spacing20,
    overflow: 'hidden'
  },
  content: {
    padding: rawTokens.spacing16,
    gap: rawTokens.spacing20
  },
  body: {
    gap: rawTokens.spacing4
  },
  footer: {
    padding: rawTokens.spacing16,
    borderTopWidth: 1
  }
})

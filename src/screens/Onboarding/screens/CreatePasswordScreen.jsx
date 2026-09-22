import { useState } from 'react'

import { useLingui } from '@lingui/react/macro'
import { useNavigation } from '@react-navigation/native'
import { PRIVACY_POLICY } from 'lockwright-lib-constants'
import {
  AlertMessage,
  Button,
  Link,
  Text,
  rawTokens,
  useTheme
} from 'lockwright-lib-ui-react-native-components'
import { KeyboardArrowRightFilled } from 'lockwright-lib-ui-react-native-components/icons'
import { Keyboard, Modal, Pressable, StyleSheet, View } from 'react-native'

import { NAVIGATION_ROUTES } from '../../../constants/navigation'
import { AuthFlowFormLayout } from '../../../containers/Auth/shared/AuthFlowFormLayout'
import { ConfirmablePasswordFields } from '../../../containers/Auth/shared/ConfirmablePasswordFields'
import { useKeyboardVisibility } from '../../../hooks/useKeyboardVisibility'
import { getPasswordRuleTicks } from '../../../utils/passwordPolicy'
import { unsupportedFeaturesEnabled } from '../../../utils/unsupportedFeatures'
import { PasswordAcceptChecklist } from '../components/PasswordAcceptChecklist'
import { usePasswordCreation } from '../hooks/usePasswordCreation'

export const CreatePasswordScreen = () => {
  const { t } = useLingui()
  const navigation = useNavigation()
  const { theme } = useTheme()
  const { isKeyboardVisible } = useKeyboardVisibility()
  const [warningOpen, setWarningOpen] = useState(false)
  const [warningConfirmed, setWarningConfirmed] = useState(false)

  const {
    passwordRegisterProps,
    passwordConfirmRegisterProps,
    handlePasswordChange,
    handlePasswordConfirmChange,
    passwordIndicatorVariant,
    passwordsMatch,
    canSubmit,
    isLoading,
    submit,
    values
  } = usePasswordCreation()

  const handleTransferData = () => {
    navigation.navigate('Welcome', {
      state: NAVIGATION_ROUTES.ENTER_MASTER_PASSWORD
    })
  }

  const createVault = () => {
    submit((password) => {
      navigation.navigate('OnboardingAutofill', { password })
    })
  }

  const handleContinue = () => {
    if (!warningConfirmed) {
      setWarningOpen(true)
      return
    }

    createVault()
  }

  const handleConfirmWarning = () => {
    setWarningConfirmed(true)
    setWarningOpen(false)
    createVault()
  }

  return (
    <AuthFlowFormLayout
      title={t`Create Master password`}
      titleTestID="onboarding-create-password-title"
      subtitleTestID="onboarding-create-password-subtitle"
      subtitle={
        <>
          {t`This is the key to access Lockwright.`}{' '}
          {unsupportedFeaturesEnabled() ? (
            <>
              {t`Already using Lockwright?`}
              <Link
                onClick={handleTransferData}
                data-testid="onboarding-transfer-data-link"
              >
                {t`Transfer Data`}
              </Link>
            </>
          ) : null}
        </>
      }
      avoidBottomInset={isKeyboardVisible}
      footer={
        <>
          <View style={styles.termsContainer}>
            <Text
              as="p"
              variant="caption"
              color={theme.colors.colorTextSecondary}
              style={styles.termsText}
              data-testid="onboarding-terms-text"
            >
              {t`By clicking Continue, you confirm that you have read and agree to the`}{' '}
              <Link
                href={PRIVACY_POLICY}
                isExternal
                onClick={() => Keyboard.dismiss()}
                data-testid="onboarding-terms-link"
              >
                {t`Lockwright Privacy Policy`}
              </Link>
              .
            </Text>
          </View>

          <Button
            variant="primary"
            fullWidth
            onClick={handleContinue}
            disabled={!canSubmit}
            isLoading={isLoading}
            iconAfter={<KeyboardArrowRightFilled />}
            data-testid="onboarding-create-password-continue"
          >
            {t`Continue`}
          </Button>
        </>
      }
    >
      <View style={styles.formContainer}>
        <ConfirmablePasswordFields
          testID="onboarding-password-form"
          passwordField={{
            label: t`Password`,
            placeholderText: t`Enter Master Password`,
            value: passwordRegisterProps.value,
            onChangeText: handlePasswordChange,
            passwordIndicator: passwordIndicatorVariant,
            testID: 'onboarding-password-input'
          }}
          confirmPasswordField={{
            label: t`Repeat Password`,
            placeholderText: t`Repeat Master Password`,
            value: passwordConfirmRegisterProps.value,
            onChangeText: handlePasswordConfirmChange,
            passwordIndicator: passwordsMatch ? 'match' : undefined,
            variant: passwordConfirmRegisterProps.error ? 'error' : 'default',
            errorMessage: passwordConfirmRegisterProps.error,
            testID: 'onboarding-password-confirm-input'
          }}
        />
        <PasswordAcceptChecklist
          ticks={getPasswordRuleTicks(values?.password)}
          labels={{
            minLength: t`At least 8 characters`,
            hasLowerCase: t`One lowercase letter`,
            hasUpperCase: t`One uppercase letter`,
            hasNumbers: t`One number`,
            hasSymbols: t`One special character`
          }}
        />
        {passwordsMatch && (
          <AlertMessage
            variant="warning"
            size="small"
            description={t`Don't forget your Master password. It's the only way to access your vault.\nWe can't help recover it. Back it up securely.`}
            testID="onboarding-password-warning"
          />
        )}
      </View>
      {warningOpen ? (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={() => setWarningOpen(false)}
        >
          <Pressable
            style={styles.dialogBackdrop}
            onPress={() => setWarningOpen(false)}
            accessibilityRole="button"
            accessibilityLabel={t`Go back`}
          >
            <Pressable
              style={[
                styles.dialogCard,
                { backgroundColor: theme.colors.colorSurfacePrimary }
              ]}
              onPress={(event) => event.stopPropagation()}
              testID="lost-password-dialog"
            >
              <Text as="h3" style={styles.dialogTitle}>
                {t`We cannot reset this password`}
              </Text>
              <Text
                as="p"
                color={theme.colors.colorTextSecondary}
                style={styles.dialogBody}
              >
                {t`Other apps can email you a new password. Lockwright cannot. If you lose this Master password, the vault is gone. There is no recovery.`}
              </Text>
              <View style={styles.dialogActions}>
                <Button
                  variant="tertiary"
                  fullWidth
                  onClick={() => setWarningOpen(false)}
                  data-testid="lost-password-cancel"
                >
                  {t`Go back`}
                </Button>
                <Button
                  variant="primary"
                  fullWidth
                  onClick={handleConfirmWarning}
                  data-testid="lost-password-confirm"
                >
                  {t`I understand — create vault`}
                </Button>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </AuthFlowFormLayout>
  )
}

const styles = StyleSheet.create({
  formContainer: {
    gap: rawTokens.spacing12
  },
  termsContainer: {
    alignItems: 'center'
  },
  termsText: {
    textAlign: 'center'
  },
  dialogBackdrop: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: rawTokens.spacing16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)'
  },
  dialogCard: {
    borderRadius: rawTokens.spacing12,
    padding: rawTokens.spacing16,
    gap: rawTokens.spacing12
  },
  dialogTitle: {
    fontWeight: '600'
  },
  dialogBody: {
    lineHeight: 20
  },
  dialogActions: {
    gap: rawTokens.spacing8
  }
})

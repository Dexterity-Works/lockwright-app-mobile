import {
  Form,
  PasswordField,
  rawTokens
} from 'lockwright-lib-ui-react-native-components'
import { StyleSheet } from 'react-native'

export const ConfirmablePasswordFields = ({
  passwordField,
  confirmPasswordField,
  testID
}) => (
  <Form testID={testID} style={styles.form}>
    <PasswordField {...passwordField} />
    <PasswordField {...confirmPasswordField} />
  </Form>
)

const styles = StyleSheet.create({
  form: {
    gap: rawTokens.spacing12
  }
})

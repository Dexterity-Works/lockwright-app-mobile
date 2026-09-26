import { StyleSheet } from 'react-native'

import { rawTokens } from 'lockwright-lib-ui-react-native-components'

export const styles = StyleSheet.create({
  content: {
    paddingHorizontal: rawTokens.spacing16,
    gap: rawTokens.spacing24
  },
  titleContainer: {
    alignItems: 'center',
    gap: rawTokens.spacing8
  },
  passwordContainer: {
    gap: rawTokens.spacing24
  },
  linkContainer: {
    alignItems: 'center'
  },
  buttonContainer: {
    gap: rawTokens.spacing16
  }
})

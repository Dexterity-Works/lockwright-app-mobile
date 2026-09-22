import { StyleSheet } from 'react-native'
import { rawTokens } from 'lockwright-lib-ui-react-native-components'

export const styles = StyleSheet.create({
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: rawTokens.spacing4
  },
  imageCard: {
    borderRadius: rawTokens.spacing16,
    overflow: 'hidden',
    elevation: rawTokens.spacing4
  },
  styledImage: {
    width: '100%'
  }
})

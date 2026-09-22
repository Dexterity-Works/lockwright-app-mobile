import { rawTokens } from 'lockwright-lib-ui-react-native-components'
import { StyleSheet } from 'react-native'

export const styles = StyleSheet.create({
  container: {
    paddingHorizontal: rawTokens.spacing16,
    gap: rawTokens.spacing8
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center'
  },
  headerTitle: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center'
  },
  content: {
    gap: rawTokens.spacing16
  }
})

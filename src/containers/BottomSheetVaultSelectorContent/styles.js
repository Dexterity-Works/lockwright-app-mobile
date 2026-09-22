import { rawTokens } from 'lockwright-lib-ui-react-native-components'

export const createStyles = () => ({
  listItem: {
    paddingBlock: rawTokens.spacing16,
    paddingInline: rawTokens.spacing16
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rawTokens.spacing4
  }
})

import {
  Text,
  rawTokens,
  useTheme
} from 'lockwright-lib-ui-react-native-components'
import { useFavicon } from 'lockwright-lib-vault'
import { generateAvatarInitials } from 'lockwright-utils-avatar-initials'
import { Image, View } from 'react-native'

import { RECORD_COLOR_BY_TYPE } from '../../constants/recordColorByType'

export const RecordItemIcon = ({ record }) => {
  const { theme } = useTheme()
  const websiteDomain =
    record.type === 'login' ? record?.data?.websites?.[0] : null
  const { faviconSrc } = useFavicon({ url: websiteDomain })

  return (
    <View
      style={{
        width: 32,
        height: 32,
        borderRadius: rawTokens.radius8,
        overflow: 'hidden',
        backgroundColor: theme.colors.colorSurfaceHover,
        justifyContent: 'center',
        alignItems: 'center'
      }}
    >
      {faviconSrc ? (
        <Image
          source={{ uri: faviconSrc }}
          style={{ width: 32, height: 32, borderRadius: rawTokens.radius8 }}
          resizeMode="contain"
        />
      ) : (
        <Text
          variant="labelEmphasized"
          color={RECORD_COLOR_BY_TYPE[record.type]}
        >
          {generateAvatarInitials(record.data?.title)}
        </Text>
      )}
    </View>
  )
}

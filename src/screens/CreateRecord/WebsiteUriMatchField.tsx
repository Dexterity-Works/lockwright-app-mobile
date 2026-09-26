import { useState } from 'react'

import { useLingui } from '@lingui/react/macro'
import {
  Button,
  ContextMenu,
  InputField,
  NavbarListItem,
  useTheme
} from 'lockwright-lib-ui-react-native-components'
import {
  KeyboardArrowBottom,
  TrashOutlined
} from 'lockwright-lib-ui-react-native-components/icons'
import { StyleSheet, View } from 'react-native'

import { openAfterKeyboardDismiss } from '../../utils/openAfterKeyboardDismiss'
import { URI_MATCH_TYPES, type UriMatchType } from '../../utils/uriMatch/constants'

const URI_MATCH_OPTION_VALUES = Object.values(URI_MATCH_TYPES)

type Props = {
  index: number
  website: string
  matchType: UriMatchType
  canRemove: boolean
  onWebsiteChange: (value: string) => void
  onMatchTypeChange: (value: UriMatchType) => void
  onRemove: () => void
}

export const WebsiteUriMatchField = ({
  index,
  website,
  matchType,
  canRemove,
  onWebsiteChange,
  onMatchTypeChange,
  onRemove
}: Props) => {
  const { t } = useLingui()
  const { theme } = useTheme()
  const [open, setOpen] = useState(false)

  const uriMatchOptionLabels: Record<UriMatchType, string> = {
    [URI_MATCH_TYPES.DOMAIN]: t`Domain`,
    [URI_MATCH_TYPES.HOST]: t`Host`,
    [URI_MATCH_TYPES.STARTS_WITH]: t`Starts with`,
    [URI_MATCH_TYPES.EXACT]: t`Exact`
  }

  const selectedMatchType = URI_MATCH_OPTION_VALUES.includes(matchType)
    ? matchType
    : URI_MATCH_TYPES.DOMAIN

  const handleOpenChange = (next: boolean) => {
    if (next) {
      openAfterKeyboardDismiss(() => setOpen(true))
      return
    }
    setOpen(false)
  }

  return (
    <View style={styles.row}>
      <InputField
        label={t`Website`}
        value={website}
        placeholder={t`Enter Website`}
        onChangeText={onWebsiteChange}
        isGrouped
        testID={`website-multi-slot-input-slot-${index}`}
        rightSlot={
          canRemove ? (
            <Button
              size="small"
              variant="tertiary"
              aria-label={t`Delete website`}
              iconBefore={
                <TrashOutlined color={theme.colors.colorTextPrimary} />
              }
              onClick={onRemove}
            />
          ) : undefined
        }
      />
      <ContextMenu
        open={open}
        onOpenChange={handleOpenChange}
        testID={`website-uri-match-menu-${index}`}
        trigger={
          <Button
            variant="tertiary"
            size="small"
            iconAfter={
              <KeyboardArrowBottom color={theme.colors.colorTextSecondary} />
            }
          >
            {`${t`URI match`}: ${uriMatchOptionLabels[selectedMatchType]}`}
          </Button>
        }
      >
        {URI_MATCH_OPTION_VALUES.map((value) => (
          <NavbarListItem
            key={value}
            testID={`website-uri-match-${index}-${value}`}
            label={uriMatchOptionLabels[value]}
            selected={selectedMatchType === value}
            onClick={() => {
              onMatchTypeChange(value)
              setOpen(false)
            }}
          />
        ))}
      </ContextMenu>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    gap: 0
  }
})

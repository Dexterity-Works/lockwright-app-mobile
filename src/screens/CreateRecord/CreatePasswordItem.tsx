import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useLingui } from '@lingui/react/macro'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { useRecords } from 'lockwright-lib-vault'
import { formatDate } from 'lockwright-utils-date'
import {
  checkPassphraseStrength,
  checkPasswordStrength
} from 'lockwright-utils-password-check'
import {
  generatePassphrase,
  generatePassword
} from 'lockwright-utils-password-generator'
import {
  Button,
  PasswordIndicator,
  Radio,
  Slider,
  Text,
  Title,
  ToggleSwitch,
  rawTokens,
  useTheme
} from 'lockwright-lib-ui-react-native-components'
import { css } from 'react-strict-dom'
import { Pressable, StyleSheet, View } from 'react-native'

import { ScreenHeader } from '../../containers/ScreenHeader'
import { BackScreenHeader } from '../../containers/ScreenHeader/BackScreenHeader'
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard'
import { ContentCopy } from 'lockwright-lib-ui-react-native-components/icons'
import { Layout } from 'src/containers/Layout'
import {
  appendHistory,
  clearHistory,
  historyEntryLabels,
  loadHistory,
  markHistoryUsed
} from '../../utils/passwordGeneratorHistory'
import {
  DEFAULT_CHARACTER_COUNT,
  loadLastCharacterCount,
  saveLastCharacterCount
} from '../../utils/passwordGeneratorPrefs'

const PASSWORD_OPTIONS = {
  password: 'password',
  passphrase: 'passphrase'
} as const

type PasswordOption = (typeof PASSWORD_OPTIONS)[keyof typeof PASSWORD_OPTIONS]

const PASSWORD_CHARSET_KEYS = [
  'capitalLetters',
  'lowercaseLetters',
  'numbers',
  'specialCharacters'
] as const

type PasswordCharsetKey = (typeof PASSWORD_CHARSET_KEYS)[number]

type PasswordRules = {
  specialCharacters: boolean
  capitalLetters: boolean
  lowercaseLetters: boolean
  numbers: boolean
  characters: number
}

type PassphraseRules = {
  capitalLetters: boolean
  symbols: boolean
  numbers: boolean
  words: number
}

type HistoryUse = {
  contextLabel: string
  contextKind: 'site' | 'entry'
}

type HistoryEntry = {
  id: string
  value: string
  createdAt: number
  contextLabel?: string
  contextKind?: 'site' | 'entry'
  usedAt?: number
  uses?: HistoryUse[]
}

type HistoryContext = {
  contextLabel?: string
  contextKind?: 'site' | 'entry'
  uses?: HistoryUse[]
}

const HISTORY_DISPLAY_LIMIT = 20
const PASSWORD_LENGTH_MIN = 4
const PASSWORD_SLIDER_MAX = 128
const PASSPHRASE_WORDS_MIN = 6
const PASSPHRASE_WORDS_MAX = 36

const STRENGTH_TO_INDICATOR = {
  vulnerable: 'vulnerable',
  weak: 'decent',
  safe: 'strong'
} as const

const titleStyles = css.create({
  generatedPasswordTitle: {
    textAlign: 'center'
  }
})

const formatHistoryCreatedAt = (createdAt: number) => {
  const date = new Date(createdAt)
  return `${formatDate(date, 'yyyy-mm-dd', '.')} ${formatDate(date, 'hh-mi-ss', ':')}`
}

const renderHighlightedPassword = (
  text: string,
  numberColor: string,
  specialColor: string
) => {
  const parts = text.split(/(\d+|[^a-zA-Z\d\s])/g)

  return parts.map((part, index) => {
    if (!part) {
      return null
    }

    if (/^\d+$/.test(part)) {
      return (
        <Title
          key={`${part}-${index}`}
          style={{ color: numberColor } as never}
        >
          {part}
        </Title>
      )
    }

    if (/[^a-zA-Z\d\s]/.test(part)) {
      return (
        <Title
          key={`${part}-${index}`}
          style={{ color: specialColor } as never}
        >
          {part}
        </Title>
      )
    }

    return part
  })
}

type CreatePasswordItemProps = {
  route?: {
    params?: {
      onPasswordInsert?: (value: string) => void
      historyContext?: HistoryContext | null
      hideBack?: boolean
    }
  }
}

export const CreatePasswordItem = ({ route }: CreatePasswordItemProps) => {
  const navigation = useNavigation()
  const { t } = useLingui()
  const { theme } = useTheme()
  const { copyToClipboard } = useCopyToClipboard()
  const onPasswordInsert = route?.params?.onPasswordInsert
  const historyContext = route?.params?.historyContext
  const hideBack = route?.params?.hideBack === true

  const [selectedOption, setSelectedOption] = useState<PasswordOption>(
    PASSWORD_OPTIONS.password
  )
  const [selectedRules, setSelectedRules] = useState<{
    password: PasswordRules
    passphrase: PassphraseRules
  }>({
    password: {
      specialCharacters: true,
      capitalLetters: true,
      lowercaseLetters: true,
      numbers: true,
      characters: DEFAULT_CHARACTER_COUNT
    },
    passphrase: {
      capitalLetters: true,
      symbols: true,
      numbers: true,
      words: 8
    }
  })
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [generationNonce, setGenerationNonce] = useState(0)
  const { data: records } = useRecords({ shouldSkip: true })
  // A read that started before or during a write is stale. Only the latest write lands.
  const historyWrites = useRef({ started: 0, settled: 0 })

  const writeHistory = useCallback((write: () => Promise<unknown>) => {
    const seq = ++historyWrites.current.started
    const land = (entries: unknown) => {
      if (seq === historyWrites.current.started) {
        setHistory(entries as HistoryEntry[])
      }
    }
    void write()
      .then(land, () => loadHistory().then(land))
      .finally(() => {
        historyWrites.current.settled++
      })
  }, [])

  useFocusEffect(
    useCallback(() => {
      const { started, settled } = historyWrites.current
      if (started !== settled) return
      void loadHistory().then((entries) => {
        if (historyWrites.current.started === started) {
          setHistory(entries as HistoryEntry[])
        }
      })
    }, [])
  )

  useEffect(() => {
    let cancelled = false
    void loadLastCharacterCount().then((characters) => {
      if (cancelled) return
      setSelectedRules((prev) => {
        if (prev.password.characters === characters) return prev
        return {
          ...prev,
          password: { ...prev.password, characters }
        }
      })
    })
    return () => {
      cancelled = true
    }
  }, [])

  const generatedValue = useMemo(() => {
    if (selectedOption === PASSWORD_OPTIONS.passphrase) {
      return generatePassphrase(
        selectedRules.passphrase.capitalLetters,
        selectedRules.passphrase.symbols,
        selectedRules.passphrase.numbers,
        selectedRules.passphrase.words
      ).join('-')
    }

    return generatePassword(selectedRules.password.characters, {
      includeSpecialChars: selectedRules.password.specialCharacters,
      lowerCase: selectedRules.password.lowercaseLetters,
      upperCase: selectedRules.password.capitalLetters,
      numbers: selectedRules.password.numbers
    })
  }, [selectedOption, selectedRules, generationNonce])

  useEffect(() => {
    if (!generatedValue) return
    const timer = setTimeout(() => {
      writeHistory(() => appendHistory(generatedValue))
    }, 250)
    return () => clearTimeout(timer)
  }, [generatedValue, writeHistory])

  const strength = useMemo(() => {
    if (selectedOption === PASSWORD_OPTIONS.passphrase) {
      return checkPassphraseStrength(generatedValue.split('-'))
    }
    return checkPasswordStrength(generatedValue)
  }, [generatedValue, selectedOption])

  const indicatorVariant =
    STRENGTH_TO_INDICATOR[(strength as { type: string }).type] ?? 'vulnerable'

  const isAllPassphraseRulesSelected =
    selectedRules.passphrase.capitalLetters &&
    selectedRules.passphrase.symbols &&
    selectedRules.passphrase.numbers

  const handlePasswordRuleChange = (
    key: keyof PasswordRules,
    value: boolean | number
  ) => {
    setSelectedRules((prev) => {
      if (
        value === false &&
        PASSWORD_CHARSET_KEYS.includes(key as PasswordCharsetKey)
      ) {
        const othersOn = PASSWORD_CHARSET_KEYS.some(
          (charsetKey) => charsetKey !== key && prev.password[charsetKey]
        )
        if (!othersOn) return prev
      }

      return {
        ...prev,
        password: {
          ...prev.password,
          [key]: value
        }
      }
    })
    if (key === 'characters' && typeof value === 'number') {
      void saveLastCharacterCount(value)
    }
  }

  const handlePassphraseRuleChange = (
    key: keyof PassphraseRules,
    value: boolean | number
  ) => {
    setSelectedRules((prev) => ({
      ...prev,
      passphrase: {
        ...prev.passphrase,
        [key]: value
      }
    }))
  }

  const handlePassphraseToggle = (rule: 'all' | keyof PassphraseRules) => {
    if (rule === 'all') {
      const nextValue = !isAllPassphraseRulesSelected
      setSelectedRules((prev) => ({
        ...prev,
        passphrase: {
          ...prev.passphrase,
          capitalLetters: nextValue,
          symbols: nextValue,
          numbers: nextValue
        }
      }))
      return
    }

    handlePassphraseRuleChange(rule, !selectedRules.passphrase[rule])
  }

  const handlePrimaryAction = () => {
    if (onPasswordInsert) {
      if (historyContext?.uses?.length) {
        void markHistoryUsed(generatedValue, { uses: historyContext.uses })
      } else if (historyContext?.contextLabel && historyContext.contextKind) {
        void markHistoryUsed(generatedValue, {
          contextLabel: historyContext.contextLabel,
          contextKind: historyContext.contextKind
        })
      }
      onPasswordInsert(generatedValue)
      navigation.goBack()
      return
    }

    copyToClipboard(generatedValue)
  }

  const visibleHistory = history.slice(0, HISTORY_DISPLAY_LIMIT)

  return (
    <Layout
      scrollable
      disableKeyboardAvoidance
      contentStyle={styles.content}
      header={
        hideBack ? (
          <ScreenHeader
            centerSlot={
              <Text variant="bodyEmphasized">{t`Generator`}</Text>
            }
          />
        ) : (
          <BackScreenHeader
            title={onPasswordInsert ? t`New Password Item` : t`Generator`}
            onBack={() => navigation.goBack()}
          />
        )
      }
      footer={
        <View style={styles.footer}>
          <Button
            variant="secondary"
            fullWidth
            onClick={() => setGenerationNonce((n) => n + 1)}
            testID="password-generator-generate"
          >
            {t`Generate`}
          </Button>
          <Button
            variant="primary"
            fullWidth
            onClick={handlePrimaryAction}
            iconBefore={
              onPasswordInsert ? undefined : (
                <ContentCopy color={theme.colors.colorOnPrimary} />
              )
            }
          >
            {onPasswordInsert ? t`Use Password` : t`Copy Password`}
          </Button>
        </View>
      }
    >
      <View style={styles.section}>
        <Text variant="caption" color={theme.colors.colorTextSecondary}>
          {t`Generated Password`}
        </Text>

        <View
          style={[
            styles.groupedCard,
            {
              borderColor: theme.colors.colorBorderPrimary,
              backgroundColor: theme.colors.colorSurfacePrimary
            }
          ]}
        >
          <View
            style={[
              styles.generatedPasswordBlock,
              { borderBottomColor: theme.colors.colorBorderPrimary }
            ]}
          >
            <View style={styles.generatedPasswordText}>
              <Title as="h3" style={titleStyles.generatedPasswordTitle}>
                {renderHighlightedPassword(
                  generatedValue,
                  theme.colors.colorPrimary,
                  theme.colors.colorTextSecondary
                )}
              </Title>
            </View>

            <View style={styles.strengthRow}>
              <PasswordIndicator variant={indicatorVariant} />
            </View>
          </View>

          {[
            {
              key: PASSWORD_OPTIONS.passphrase,
              label: t`Memorable Password`,
              description: t`Memorable password using random words, numbers, and symbols.`
            },
            {
              key: PASSWORD_OPTIONS.password,
              label: t`Random Characters`,
              description: t`A fully random mix of letters, numbers, and symbols.`
            }
          ].map((option, index, options) => (
            <Pressable
              key={option.key}
              onPress={() => setSelectedOption(option.key)}
              style={[
                styles.optionRow,
                index < options.length - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: theme.colors.colorBorderPrimary
                }
              ]}
            >
              <View pointerEvents="none" style={styles.optionContent}>
                <Radio
                  builtIn
                  options={[
                    {
                      value: option.key,
                      label: option.label,
                      description: option.description
                    }
                  ]}
                  value={selectedOption === option.key ? option.key : undefined}
                />
              </View>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text variant="caption" color={theme.colors.colorTextSecondary}>
          {t`Password Length`}
        </Text>

        <View
          style={[
            styles.singleRowCard,
            {
              borderColor: theme.colors.colorBorderPrimary,
              backgroundColor: theme.colors.colorSurfacePrimary
            }
          ]}
        >
          <View style={styles.sliderRow}>
            <View style={styles.sliderLabel}>
              <Text variant="labelEmphasized" noWrap>
                {selectedOption === PASSWORD_OPTIONS.passphrase
                  ? `${selectedRules.passphrase.words} ${t`Words`}`
                  : `${selectedRules.password.characters} ${t`Chars`}`}
              </Text>
            </View>

            <View style={styles.slider}>
              <Slider
                minimumValue={
                  selectedOption === PASSWORD_OPTIONS.passphrase
                    ? PASSPHRASE_WORDS_MIN
                    : PASSWORD_LENGTH_MIN
                }
                maximumValue={
                  selectedOption === PASSWORD_OPTIONS.passphrase
                    ? PASSPHRASE_WORDS_MAX
                    : PASSWORD_SLIDER_MAX
                }
                step={1}
                value={
                  selectedOption === PASSWORD_OPTIONS.passphrase
                    ? selectedRules.passphrase.words
                    : Math.min(
                        selectedRules.password.characters,
                        PASSWORD_SLIDER_MAX
                      )
                }
                minimumTrackTintColor={theme.colors.colorPrimary}
                maximumTrackTintColor={
                  theme.colors.colorSurfaceElevatedOnInteraction
                }
                thumbTintColor={theme.colors.colorPrimary}
                onValueChange={(value) => {
                  if (selectedOption === PASSWORD_OPTIONS.passphrase) {
                    handlePassphraseRuleChange('words', value)
                    return
                  }

                  handlePasswordRuleChange('characters', value)
                }}
              />
            </View>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text variant="caption" color={theme.colors.colorTextSecondary}>
          {t`Password settings`}
        </Text>

        <View
          style={[
            styles.groupedCard,
            {
              borderColor: theme.colors.colorBorderPrimary,
              backgroundColor: theme.colors.colorSurfacePrimary
            }
          ]}
        >
          {selectedOption === PASSWORD_OPTIONS.passphrase
            ? [
                {
                  key: 'all',
                  label: t`Select all`,
                  value: isAllPassphraseRulesSelected
                },
                {
                  key: 'capitalLetters',
                  label: t`Capital letters`,
                  value: selectedRules.passphrase.capitalLetters
                },
                {
                  key: 'symbols',
                  label: t`Symbols`,
                  value: selectedRules.passphrase.symbols
                },
                {
                  key: 'numbers',
                  label: t`Numbers`,
                  value: selectedRules.passphrase.numbers
                }
              ].map((rule, index, rules) => (
                <View
                  key={rule.key}
                  style={[
                    styles.settingRow,
                    index < rules.length - 1 && {
                      borderBottomWidth: 1,
                      borderBottomColor: theme.colors.colorBorderPrimary
                    }
                  ]}
                >
                  <Text variant="bodyEmphasized">{rule.label}</Text>
                  <ToggleSwitch
                    checked={rule.value}
                    onChange={() =>
                      handlePassphraseToggle(
                        rule.key as 'all' | keyof PassphraseRules
                      )
                    }
                    aria-label={rule.label}
                  />
                </View>
              ))
            : [
                {
                  key: 'capitalLetters' as const,
                  label: t`Capital letters`,
                  value: selectedRules.password.capitalLetters
                },
                {
                  key: 'lowercaseLetters' as const,
                  label: t`Lowercase letters`,
                  value: selectedRules.password.lowercaseLetters
                },
                {
                  key: 'numbers' as const,
                  label: t`Numbers`,
                  value: selectedRules.password.numbers
                },
                {
                  key: 'specialCharacters' as const,
                  label: t`Special character (!&*)`,
                  value: selectedRules.password.specialCharacters
                }
              ].map((rule, index, rules) => (
                <View
                  key={rule.key}
                  testID={`password-generator-setting-${rule.key}`}
                  style={[
                    styles.settingRow,
                    index < rules.length - 1 && {
                      borderBottomWidth: 1,
                      borderBottomColor: theme.colors.colorBorderPrimary
                    }
                  ]}
                >
                  <Text variant="bodyEmphasized">{rule.label}</Text>
                  <ToggleSwitch
                    checked={rule.value}
                    onChange={() =>
                      handlePasswordRuleChange(rule.key, !rule.value)
                    }
                    aria-label={rule.label}
                  />
                </View>
              ))}
        </View>
      </View>

      <View style={styles.section} testID="password-generator-history">
        <View style={styles.historyHeader}>
          <Text variant="caption" color={theme.colors.colorTextSecondary}>
            {t`History`}
          </Text>
          {history.length > 0 && (
            <Button
              variant="tertiary"
              size="small"
              onClick={() => writeHistory(clearHistory)}
            >
              {t`Clear history`}
            </Button>
          )}
        </View>

        {visibleHistory.length === 0 ? (
          <Text variant="body" color={theme.colors.colorTextTertiary}>
            {t`No generated passwords yet`}
          </Text>
        ) : (
          visibleHistory.map((entry, index) => (
            <View
              key={entry.id}
              style={[
                styles.historyRow,
                index < visibleHistory.length - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: theme.colors.colorBorderPrimary
                }
              ]}
            >
              <View style={styles.historyMeta}>
                <Text variant="bodyEmphasized">{entry.value}</Text>
                <Text variant="caption" color={theme.colors.colorTextTertiary}>
                  {formatHistoryCreatedAt(entry.createdAt)}
                </Text>
                {historyEntryLabels(entry, records).map((label, labelIndex) => (
                  <Text
                    key={`${entry.id}-${labelIndex}`}
                    variant="caption"
                    color={theme.colors.colorTextTertiary}
                  >
                    {label}
                  </Text>
                ))}
              </View>
              <Button
                variant="tertiary"
                size="small"
                aria-label={t`Copy password`}
                iconBefore={<ContentCopy width={16} height={16} />}
                onClick={() => copyToClipboard(entry.value)}
              />
            </View>
          ))
        )}
      </View>
    </Layout>
  )
}

const styles = StyleSheet.create({
  footer: {
    gap: rawTokens.spacing12
  },
  content: {
    paddingTop: rawTokens.spacing16,
    paddingHorizontal: rawTokens.spacing16,
    paddingBottom: rawTokens.spacing16,
    gap: rawTokens.spacing24
  },
  section: {
    gap: rawTokens.spacing12
  },
  groupedCard: {
    borderWidth: 1,
    borderRadius: rawTokens.spacing8,
    overflow: 'hidden'
  },
  singleRowCard: {
    borderWidth: 1,
    borderRadius: rawTokens.spacing8,
    overflow: 'hidden',
    paddingHorizontal: rawTokens.spacing12,
    paddingVertical: rawTokens.spacing20
  },
  generatedPasswordBlock: {
    paddingHorizontal: rawTokens.spacing12,
    paddingVertical: rawTokens.spacing24,
    alignItems: 'center',
    gap: rawTokens.spacing16,
    borderBottomWidth: 1
  },
  generatedPasswordText: {
    alignItems: 'center'
  },
  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rawTokens.spacing4
  },
  optionRow: {
    paddingHorizontal: rawTokens.spacing12,
    paddingVertical: rawTokens.spacing12
  },
  optionContent: {
    flex: 1
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rawTokens.spacing12
  },
  sliderLabel: {
    minWidth: 72
  },
  slider: {
    flex: 1,
    height: rawTokens.spacing24
  },
  settingRow: {
    paddingHorizontal: rawTokens.spacing12,
    paddingVertical: rawTokens.spacing12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: rawTokens.spacing12
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: rawTokens.spacing12,
    paddingVertical: rawTokens.spacing12
  },
  historyMeta: {
    flex: 1,
    gap: rawTokens.spacing4
  }
})

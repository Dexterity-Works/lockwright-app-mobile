import { pearpassVaultClient } from 'lockwright-lib-vault/src/instances'
import { generateUniqueId } from 'lockwright-utils-generate-unique-id'

/**
 * Password generator history — shared vault key for extension / desktop / Android.
 *
 * Keep this contract in sync with
 * lockwright-app-desktop/src/utils/passwordGeneratorHistory.js
 * and the extension shared/utils/passwordGeneratorHistory.js
 *
 * Key: `app/password-generator-history`
 * Document: `{ entries: HistoryEntry[] }` (newest first)
 *
 * Contract:
 * - `appendHistory(value)` — unlabeled generate events (no context).
 * - `markHistoryUsed(value, { contextLabel, contextKind })` — stamp on USE only
 *   (fill/insert into a field or site), not bare Copy from the Generator page.
 */
export const PASSWORD_GENERATOR_HISTORY_KEY = 'app/password-generator-history'
export const PASSWORD_GENERATOR_HISTORY_MAX = 500

const emptyDoc = () => ({ entries: [] })

const normalizeEntries = (raw) => {
  if (Array.isArray(raw?.entries)) return raw.entries
  if (Array.isArray(raw)) return raw
  return []
}

export const loadHistory = async () => {
  try {
    const raw = await pearpassVaultClient.activeVaultGet(
      PASSWORD_GENERATOR_HISTORY_KEY
    )
    return normalizeEntries(raw)
  } catch {
    return []
  }
}

export const appendHistory = async (value) => {
  if (typeof value !== 'string' || !value) {
    return loadHistory()
  }

  const current = await loadHistory()
  if (current[0]?.value === value) {
    return current
  }

  const next = [
    { id: generateUniqueId(), value, createdAt: Date.now() },
    ...current
  ].slice(0, PASSWORD_GENERATOR_HISTORY_MAX)

  await pearpassVaultClient.activeVaultAdd(PASSWORD_GENERATOR_HISTORY_KEY, {
    entries: next
  })
  return next
}

export const markHistoryUsed = async (value, context = {}) => {
  if (typeof value !== 'string' || !value) {
    return loadHistory()
  }

  const contextLabel =
    typeof context.contextLabel === 'string' ? context.contextLabel.trim() : ''
  const contextKind = context.contextKind
  if (!contextLabel || (contextKind !== 'site' && contextKind !== 'entry')) {
    return loadHistory()
  }

  const current = await loadHistory()
  const usedAt = Date.now()
  const matchIndex = current.findIndex((entry) => entry.value === value)

  let next
  if (matchIndex === -1) {
    next = [
      {
        id: generateUniqueId(),
        value,
        createdAt: usedAt,
        contextLabel,
        contextKind,
        usedAt
      },
      ...current
    ].slice(0, PASSWORD_GENERATOR_HISTORY_MAX)
  } else {
    next = current.map((entry, index) =>
      index === matchIndex
        ? { ...entry, contextLabel, contextKind, usedAt }
        : entry
    )
  }

  await pearpassVaultClient.activeVaultAdd(PASSWORD_GENERATOR_HISTORY_KEY, {
    entries: next
  })
  return next
}

export const clearHistory = async () => {
  await pearpassVaultClient.activeVaultAdd(
    PASSWORD_GENERATOR_HISTORY_KEY,
    emptyDoc()
  )
  return []
}

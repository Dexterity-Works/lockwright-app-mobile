import { URI_MATCH_TYPES, type UriMatchType } from './constants'
import { normalizeUrl } from './normalizeUrl'
import { getRecordWebsiteValues, resolveUriMatchType } from './uriMatchSetting'

export { URI_MATCH_TYPES, type UriMatchType }
export { getRecordWebsiteValues }

const isUriMatchType = (value: unknown): value is UriMatchType =>
  value === URI_MATCH_TYPES.DOMAIN ||
  value === URI_MATCH_TYPES.HOST ||
  value === URI_MATCH_TYPES.STARTS_WITH ||
  value === URI_MATCH_TYPES.EXACT

const getHostname = (value?: string | null): string | null => {
  if (!value || typeof value !== 'string') return null
  const normalized = normalizeUrl(value, true)
  if (!normalized) return null
  try {
    return new URL(normalized).hostname.toLowerCase()
  } catch {
    return null
  }
}

/** Hostname + non-default port (Bitwarden host match key). */
const getHostWithPort = (value: string): string | null => {
  const normalized = normalizeUrl(value, true)
  if (!normalized) return null
  try {
    const url = new URL(normalized)
    const hostname = url.hostname.toLowerCase()
    if (!hostname) return null
    const port =
      url.port && url.port !== '80' && url.port !== '443' ? `:${url.port}` : ''
    return `${hostname}${port}`
  } catch {
    return null
  }
}

/**
 * Registrable-domain stand-in without tldts: equal host, or one host is a
 * subdomain of the other. Avoids last-two-label false positives on co.uk.
 * A bare label (com) is never the parent, so it cannot match every *.com.
 */
const matchesDomain = (pageUrl: string, website: string): boolean => {
  const pageHost = getHostname(pageUrl)
  const recordHost = getHostname(website)
  if (!pageHost || !recordHost) return false
  if (pageHost === recordHost) return true
  return (
    (recordHost.includes('.') && pageHost.endsWith(`.${recordHost}`)) ||
    (pageHost.includes('.') && recordHost.endsWith(`.${pageHost}`))
  )
}

/** androidapp://com.x → com.x (lowercase), else null. */
const getAndroidAppPackage = (value: string): string | null => {
  const match = /^(?:https?:\/\/)?androidapp:\/\/([^/]+)/i.exec(value.trim())
  return match ? match[1].toLowerCase() : null
}

const matchesHost = (pageUrl: string, website: string): boolean => {
  const pageHost = getHostWithPort(pageUrl)
  const recordHost = getHostWithPort(website)
  if (!pageHost || !recordHost) return false
  return pageHost === recordHost
}

const matchesStartsWith = (pageUrl: string, website: string): boolean => {
  const pageNormalized = normalizeUrl(pageUrl, true)
  const websiteNormalized = normalizeUrl(website, true)
  if (!pageNormalized || !websiteNormalized) return false
  return pageNormalized.startsWith(websiteNormalized)
}

const matchesExact = (pageUrl: string, website: string): boolean => {
  const pageNormalized = normalizeUrl(pageUrl, true)
  const websiteNormalized = normalizeUrl(website, true)
  if (!pageNormalized || !websiteNormalized) return false
  return pageNormalized === websiteNormalized
}

/**
 * True when the current page URL matches a stored website entry
 * under the given URI match type (Bitwarden-style).
 */
export const doesWebsiteMatchPage = (
  pageUrl: string,
  website: string | null | undefined,
  matchType: UriMatchType = URI_MATCH_TYPES.DOMAIN
): boolean => {
  if (!website) return false

  // An app is its exact package, never a website host or a longer package.
  const pagePackage = getAndroidAppPackage(pageUrl)
  const recordPackage = getAndroidAppPackage(website)
  if (pagePackage || recordPackage) return pagePackage === recordPackage

  const type = isUriMatchType(matchType) ? matchType : URI_MATCH_TYPES.DOMAIN

  switch (type) {
    case URI_MATCH_TYPES.HOST:
      return matchesHost(pageUrl, website)
    case URI_MATCH_TYPES.STARTS_WITH:
      return matchesStartsWith(pageUrl, website)
    case URI_MATCH_TYPES.EXACT:
      return matchesExact(pageUrl, website)
    case URI_MATCH_TYPES.DOMAIN:
    default:
      return matchesDomain(pageUrl, website)
  }
}

type RecordWithWebsites = {
  id?: string
  data?: {
    websites?: string[] | null
    uris?: Array<{ uri?: string; match?: string }> | null
    [key: string]: unknown
  } | null
}

export type RecordMatchOptions = {
  defaultMatchType?: UriMatchType
  getMatchTypeForWebsite?: (website: string) => UriMatchType
}

/** True when any of the record's website entries match the current page URL. */
export const recordMatchesCurrentSite = (
  record: RecordWithWebsites | null | undefined,
  pageUrl: string,
  options?: RecordMatchOptions
): boolean => {
  const websites = getRecordWebsiteValues(record)
  if (!websites.length) return false

  return websites.some((website) => {
    const hasVaultUris =
      Array.isArray(record?.data?.uris) && record.data.uris.length > 0
    const canResolveFromRecord = Boolean(record?.id || hasVaultUris)
    const matchType =
      options?.getMatchTypeForWebsite?.(website) ??
      (canResolveFromRecord && record
        ? resolveUriMatchType(record, website)
        : undefined) ??
      options?.defaultMatchType ??
      URI_MATCH_TYPES.DOMAIN

    return doesWebsiteMatchPage(pageUrl, website, matchType)
  })
}

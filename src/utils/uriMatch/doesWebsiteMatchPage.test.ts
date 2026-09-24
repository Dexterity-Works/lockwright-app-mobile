import { URI_MATCH_TYPES } from './constants'
import {
  doesWebsiteMatchPage,
  recordMatchesCurrentSite
} from './doesWebsiteMatchPage'

describe('doesWebsiteMatchPage', () => {
  describe('domain (default)', () => {
    it('matches a bare host stored without protocol', () => {
      expect(
        doesWebsiteMatchPage('https://example.com/login', 'example.com')
      ).toBe(true)
    })

    it('matches across www variants via same registrable domain', () => {
      expect(
        doesWebsiteMatchPage('https://www.example.com', 'example.com')
      ).toBe(true)
      expect(
        doesWebsiteMatchPage('https://example.com', 'www.example.com')
      ).toBe(true)
    })

    it('matches subdomain to parent via same eTLD+1', () => {
      expect(
        doesWebsiteMatchPage(
          'https://login.example.com/app',
          'https://example.com'
        )
      ).toBe(true)
    })

    it('matches equal hostnames even when getDomain is unavailable', () => {
      expect(
        doesWebsiteMatchPage('http://192.168.1.10/login', '192.168.1.10')
      ).toBe(true)
    })

    it('returns false for unrelated hosts', () => {
      expect(
        doesWebsiteMatchPage('https://example.com', 'https://evil-example.com')
      ).toBe(false)
    })

    it('does not let a bare TLD page match every site under it', () => {
      expect(doesWebsiteMatchPage('https://com', 'https://paypal.com')).toBe(
        false
      )
    })

    it('does not match an app package named like the site', () => {
      expect(
        doesWebsiteMatchPage('androidapp://paypal.com', 'https://paypal.com')
      ).toBe(false)
    })
  })

  describe('host', () => {
    it('matches exact hostname including www', () => {
      expect(
        doesWebsiteMatchPage(
          'https://www.example.com/path',
          'https://www.example.com',
          URI_MATCH_TYPES.HOST
        )
      ).toBe(true)
    })

    it('does not match different subdomain', () => {
      expect(
        doesWebsiteMatchPage(
          'https://login.example.com',
          'https://example.com',
          URI_MATCH_TYPES.HOST
        )
      ).toBe(false)
    })

    it('does not match www vs apex', () => {
      expect(
        doesWebsiteMatchPage(
          'https://www.example.com',
          'example.com',
          URI_MATCH_TYPES.HOST
        )
      ).toBe(false)
    })

    it('requires non-default port to match when present', () => {
      expect(
        doesWebsiteMatchPage(
          'https://example.com:8443/app',
          'https://example.com:8443',
          URI_MATCH_TYPES.HOST
        )
      ).toBe(true)
      expect(
        doesWebsiteMatchPage(
          'https://example.com:8443/app',
          'https://example.com',
          URI_MATCH_TYPES.HOST
        )
      ).toBe(false)
    })
  })

  describe('startsWith', () => {
    it('matches when normalized page URL starts with saved website', () => {
      expect(
        doesWebsiteMatchPage(
          'https://example.com/app/login',
          'https://example.com/app',
          URI_MATCH_TYPES.STARTS_WITH
        )
      ).toBe(true)
    })

    it('rejects when path is not a prefix', () => {
      expect(
        doesWebsiteMatchPage(
          'https://example.com/other',
          'https://example.com/app',
          URI_MATCH_TYPES.STARTS_WITH
        )
      ).toBe(false)
    })
  })

  describe('exact', () => {
    it('matches when normalizeUrl values are equal', () => {
      expect(
        doesWebsiteMatchPage(
          'https://example.com/path/',
          'https://example.com/path',
          URI_MATCH_TYPES.EXACT
        )
      ).toBe(true)
    })

    it('rejects path drift', () => {
      expect(
        doesWebsiteMatchPage(
          'https://example.com/path',
          'https://example.com/other',
          URI_MATCH_TYPES.EXACT
        )
      ).toBe(false)
    })
  })
})

describe('recordMatchesCurrentSite', () => {
  it('matches a host written only on data.uris when websites is empty', () => {
    expect(
      recordMatchesCurrentSite(
        {
          id: 'r1',
          data: {
            websites: [],
            uris: [{ uri: 'https://dashboard.stripe.com', match: 'host' }]
          }
        },
        'https://dashboard.stripe.com/login'
      )
    ).toBe(true)
  })

  it('uses vault uris match via resolveUriMatchType when record has uris', () => {
    expect(
      recordMatchesCurrentSite(
        {
          id: 'r1',
          data: {
            websites: ['https://example.com'],
            uris: [{ uri: 'https://example.com', match: 'host' }]
          }
        },
        'https://login.example.com'
      )
    ).toBe(false)

    expect(
      recordMatchesCurrentSite(
        {
          id: 'r1',
          data: {
            websites: ['https://example.com'],
            uris: [{ uri: 'https://example.com', match: 'baseDomain' }]
          }
        },
        'https://login.example.com'
      )
    ).toBe(true)
  })

  it('matches an androidapp URI only to the exact package', () => {
    expect(
      doesWebsiteMatchPage(
        'androidapp://com.paypal.evil',
        'androidapp://com.paypal',
        URI_MATCH_TYPES.STARTS_WITH
      )
    ).toBe(false)
  })

  it('matches an androidapp URI to the same app page', () => {
    expect(
      recordMatchesCurrentSite(
        {
          id: 'r1',
          data: {
            websites: ['androidapp://com.twitter.android'],
            uris: [
              { uri: 'androidapp://com.twitter.android', match: 'host' }
            ]
          }
        },
        'androidapp://com.twitter.android'
      )
    ).toBe(true)
  })
})

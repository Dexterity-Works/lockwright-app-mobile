import {
  markKeyRotated,
  rememberRevoked,
  removedDevices
} from './revokedDevices'

const status = (overrides = {}) => ({
  vaultId: 'v1',
  epoch: 'e2',
  legacy: false,
  members: ['d-me'],
  ...overrides
})

const roster = [{ id: 'd-me' }]

describe('removedDevices', () => {
  it('lists a device off the roster that the latest key still seals to', () => {
    expect(
      removedDevices(status({ members: ['d-me', 'd-x'] }), 'v1', roster)
    ).toEqual([{ id: 'd-x', name: null, rotatedAt: null }])
  })

  it('names a device revoked here and keeps it until the key leaves it out', () => {
    rememberRevoked('v2', 'd-gone', 'Phone')

    expect(
      removedDevices(
        status({ vaultId: 'v2', members: ['d-me', 'd-gone'] }),
        'v2',
        roster
      )
    ).toEqual([{ id: 'd-gone', name: 'Phone', rotatedAt: null }])
  })

  it('shows a revoked device as rotated, with when this device saw it', () => {
    rememberRevoked('v3', 'd-gone', 'Phone')
    markKeyRotated('v3', 'd-gone', 1700000000000)

    expect(removedDevices(status({ vaultId: 'v3' }), 'v3', roster)).toEqual([
      { id: 'd-gone', name: 'Phone', rotatedAt: 1700000000000 }
    ])
  })

  it('keeps a revoked device rotating while the key still reaches another removed device', () => {
    rememberRevoked('v8', 'd-gone', 'Phone')

    expect(
      removedDevices(
        status({ vaultId: 'v8', members: ['d-me', 'd-dup'] }),
        'v8',
        roster
      )
    ).toEqual([
      { id: 'd-gone', name: 'Phone', rotatedAt: null },
      { id: 'd-dup', name: null, rotatedAt: null }
    ])
  })

  it('stamps a rotation it first sees in the list', () => {
    rememberRevoked('v4', 'd-gone', 'Phone')
    const before = Date.now()

    const [row] = removedDevices(status({ vaultId: 'v4' }), 'v4', roster)

    expect(row.rotatedAt).toBeGreaterThanOrEqual(before)
  })

  it('keeps a revoked device rotating on a legacy vault', () => {
    rememberRevoked('v5', 'd-gone', 'Phone')

    expect(
      removedDevices(
        status({ vaultId: 'v5', legacy: true, epoch: null, members: [] }),
        'v5',
        roster
      )
    ).toEqual([{ id: 'd-gone', name: 'Phone', rotatedAt: null }])
  })

  it('reads nothing from another vault’s status', () => {
    rememberRevoked('v6', 'd-gone', 'Phone')

    expect(
      removedDevices(status({ members: ['d-gone'] }), 'v6', roster)
    ).toEqual([])
  })

  it('skips a device back on the roster', () => {
    expect(removedDevices(status({ members: ['d-me'] }), 'v1', roster)).toEqual(
      []
    )
  })
})

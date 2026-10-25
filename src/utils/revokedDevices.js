// Devices this app revoked, per vault. A kick drops the device's row, and the
// vault core keeps no rotation time, so Paired Devices takes the name and the
// time this device saw the key rotate from here. Memory only.
const byVault = new Map()

const entries = (vaultId) => {
  if (!byVault.has(vaultId)) byVault.set(vaultId, new Map())
  return byVault.get(vaultId)
}

export const rememberRevoked = (vaultId, deviceId, name) => {
  entries(vaultId).set(deviceId, { name, rotatedAt: null })
}

export const markKeyRotated = (vaultId, deviceId, at = Date.now()) => {
  const entry = entries(vaultId).get(deviceId)
  if (entry && !entry.rotatedAt) entry.rotatedAt = at
}

/**
 * Removed devices: off the roster but still sealed into the latest key, or
 * revoked here and since left out of it.
 * @param {{ vaultId: string, epoch: string | null, legacy: boolean, members: string[] } | null} status
 * @param {string} vaultId
 * @param {Array<{ id: string }>} devices
 * @returns {Array<{ id: string, name: string | null, rotatedAt: number | null }>}
 */
export const removedDevices = (status, vaultId, devices) => {
  if (!status || status.vaultId !== vaultId) return []
  const onRoster = new Set(devices.map((d) => d?.id))
  const sealed = new Set(status.members ?? [])
  // Rotated past the removal only when the key reaches roster devices
  // alone: a member with an older roster can still seal to a removed one.
  const rotated =
    !status.legacy &&
    !!status.epoch &&
    [...sealed].every((id) => onRoster.has(id))
  const known = entries(vaultId)
  const rows = []
  for (const id of new Set([...known.keys(), ...sealed])) {
    if (onRoster.has(id)) continue
    const entry = known.get(id)
    if (!rotated || sealed.has(id)) {
      rows.push({ id, name: entry?.name ?? null, rotatedAt: null })
    } else if (entry) {
      markKeyRotated(vaultId, id)
      rows.push({ id, name: entry.name, rotatedAt: entry.rotatedAt })
    }
  }
  return rows
}

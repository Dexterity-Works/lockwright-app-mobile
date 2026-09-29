import { existsSync, readdirSync, readFileSync } from 'fs'
import path from 'path'

const root = path.resolve(__dirname, '../../..')
const read = (file) => readFileSync(path.join(root, file), 'utf8')

const listFiles = (dir) => {
  if (!existsSync(dir)) return []
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    return entry.isDirectory() ? listFiles(full) : [full]
  })
}

describe('onboarding art', () => {
  it('uses the SVG vault instead of the lock videos', () => {
    const screen = read('src/screens/Onboarding/screens/DataLocalScreen.jsx')
    expect(screen).toMatch(/VaultUnlockAnimation/)
    expect(screen).not.toMatch(/DataLocalVideo|\.mov|\.mp4/)
  })

  it('does not depend on a video player', () => {
    const pkg = JSON.parse(read('package.json'))
    const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies })
    expect(
      deps.filter((name) => /^expo-(transparent-)?video$/.test(name))
    ).toEqual([])
    expect(read('app.json')).not.toMatch(/"expo-video"/)
  })

  it('does not ship the onboarding lock videos', () => {
    const assets = listFiles(path.join(root, 'assets'))
    expect(assets.filter((file) => /onboarding_lock/.test(file))).toEqual([])
  })
})

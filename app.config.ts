import { ConfigContext, ExpoConfig } from '@expo/config'
import { execSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

import {
  formatDisplayVersion,
  normalizeSha6
} from './src/utils/formatDisplayVersion.js'

function readGitSha6() {
  const env = process.env.LOCKWRIGHT_GIT_SHA
  if (env && env.trim()) {
    return normalizeSha6(env)
  }

  try {
    return normalizeSha6(execSync('git rev-parse HEAD', { encoding: 'utf8' }))
  } catch {
    return 'unknown'
  }
}

const APP_GROUPS = 'com.apple.security.application-groups'

// APP_VARIANT=dev builds a test app that installs next to the store app. It
// gets its own app ID, app group and keychain group, so it never sees the
// store app's vault, secure store or autofill data. Unset changes nothing.
function readAppVariant() {
  const variant = process.env.APP_VARIANT
  if (!variant) {
    return null
  }
  if (variant !== 'dev') {
    throw new Error(`APP_VARIANT must be unset or "dev", got "${variant}"`)
  }
  return variant
}

function withDevVariant(base: ExpoConfig): ExpoConfig {
  const config = structuredClone(base)
  const appId = `${config.ios!.bundleIdentifier}.dev`
  const appGroup = `group.${appId}`

  config.name = 'Lockwright Dev'
  config.icon = './assets/images/appIcons/app-icon-dev.png'
  config.android!.package = appId
  config.android!.adaptiveIcon!.foregroundImage =
    './assets/images/appIcons/adaptive-icon-dev.png'
  config.ios!.bundleIdentifier = appId
  config.ios!.scheme = 'lockwrightdev'
  config.ios!.entitlements![APP_GROUPS] = [appGroup]
  for (const extension of config.extra!.eas.build.experimental.ios
    .appExtensions) {
    extension.bundleIdentifier = `${appId}.${extension.targetName}`
    extension.entitlements[APP_GROUPS] = [appGroup]
    extension.entitlements['keychain-access-groups'] = [
      `$(AppIdentifierPrefix)${appId}`
    ]
  }
  return config
}

function androidAppIds(projectRoot: string) {
  const gradle = path.join(projectRoot, 'android/app/build.gradle')
  if (!existsSync(gradle)) {
    return []
  }
  const match = readFileSync(gradle, 'utf8').match(
    /applicationId\s+['"]([^'"]+)['"]/
  )
  return match ? [match[1]] : []
}

function iosAppIds(projectRoot: string, config: Partial<ExpoConfig>) {
  const iosDir = path.join(projectRoot, 'ios')
  if (!existsSync(iosDir)) {
    return []
  }
  const extensions: string[] = (
    config.extra?.eas?.build?.experimental?.ios?.appExtensions ?? []
  ).map((extension: { targetName: string }) => `.${extension.targetName}`)
  const ids: string[] = []
  for (const entry of readdirSync(iosDir)) {
    const pbxproj = path.join(iosDir, entry, 'project.pbxproj')
    if (!entry.endsWith('.xcodeproj') || !existsSync(pbxproj)) {
      continue
    }
    const text = readFileSync(pbxproj, 'utf8')
    for (const [, id] of text.matchAll(
      /PRODUCT_BUNDLE_IDENTIFIER = "?([^";\s]+)"?;/g
    )) {
      const suffix = extensions.find((name) => id.endsWith(name))
      ids.push(suffix ? id.slice(0, -suffix.length) : id)
    }
  }
  return ids
}

// expo run:* prebuilds only when the native folder is missing, so a folder
// left from the other variant would build that variant's app. A store build
// signed with the team replaces the App Store app and opens the real vault.
// Only run:* is checked: prebuild must be free to replace the folder, and
// Metro, Xcode and Gradle read this config without APP_VARIANT.
function assertNativeProjectMatches(
  projectRoot: string,
  config: Partial<ExpoConfig>
) {
  const command = process.argv.find(
    (arg) => arg === 'run:android' || arg === 'run:ios'
  )
  if (!command) {
    return
  }
  const ios = command === 'run:ios'
  const expected = ios ? config.ios?.bundleIdentifier : config.android?.package
  const found = ios
    ? iosAppIds(projectRoot, config)
    : androidAppIds(projectRoot)
  const stray = found.find((id) => id !== expected)
  if (stray) {
    const folder = ios ? 'ios/' : 'android/'
    const variant = process.env.APP_VARIANT ? 'APP_VARIANT=dev ' : ''
    throw new Error(
      `${folder} was prebuilt for ${stray}, but this run builds ${expected}. ` +
        `Run \`${variant}npx expo prebuild --platform ${ios ? 'ios' : 'android'} --clean\` first.`
    )
  }
}

export default ({ config: base, projectRoot }: ConfigContext): ExpoConfig => {
  const config = readAppVariant() ? withDevVariant(base as ExpoConfig) : base
  assertNativeProjectMatches(projectRoot, config)
  const distribution = process.env.PEARPASS_DISTRIBUTION || 'standard'
  const isNightly = distribution === 'nightly'
  const gitSha = readGitSha6()
  const appVersion = config.version || '0.0.1'

  const plugins = config.plugins ? [...config.plugins] : []
  plugins.push(['./plugins/withAndroidDistribution', { distribution }])
  plugins.push([
    './plugins/expo-autofill-plugin',
    {
      ios: {
        appGroupIdentifier: config.ios?.entitlements?.[APP_GROUPS]?.[0],
      },
      extensionBundlePath: 'bundles/autofill.bundle',
    },
  ])
  if (isNightly) {
    plugins.push('@sentry/react-native/expo')
  }

  return {
    ...config,
    name: config.name || 'Lockwright',
    slug: config.slug || 'pearpass-app-mobile',
    plugins,
    extra: {
      ...(config.extra || {}),
      distribution,
      gitSha,
      displayVersion: formatDisplayVersion(appVersion, gitSha)
    }
  }
}

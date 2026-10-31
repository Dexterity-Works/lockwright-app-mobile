import { ConfigContext, ExpoConfig } from '@expo/config'
import { execSync } from 'node:child_process'

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
  config.extra!.appVariant = 'dev'
  return config
}

export default ({ config: base }: ConfigContext): ExpoConfig => {
  const config = readAppVariant() ? withDevVariant(base as ExpoConfig) : base
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

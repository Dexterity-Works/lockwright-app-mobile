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

export default ({ config }: ConfigContext): ExpoConfig => {
  const distribution = process.env.PEARPASS_DISTRIBUTION || 'standard'
  const isNightly = distribution === 'nightly'
  const gitSha = readGitSha6()
  const appVersion = config.version || '0.0.1'

  const plugins = config.plugins ? [...config.plugins] : []
  plugins.push([
    './plugins/expo-autofill-plugin',
    {
      ios: {
        appGroupIdentifier: 'group.works.dexterity.lockwright',
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

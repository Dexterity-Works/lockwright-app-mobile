<p align="center">
  <img src="docs/logo.svg" alt="Lockwright" width="128"/>
</p>

# Lockwright Mobile

> Mobile app for Lockwright. Local vaults, peer-to-peer sync.

Site: [lockwright.dexterity.works](https://lockwright.dexterity.works)

Community fork of PearPass (Apache 2.0). Not affiliated with or endorsed by Tether Data or the Pears project.

---

## Table of Contents

- [Introduction](#introduction)
- [Features](#features)
- [Installation](#installation)
- [Changelog](CHANGELOG.md)
- [Usage Examples](#usage-examples)
- [Architecture](#architecture)
- [Starting the Application](#starting-the-application)
- [Prebuild](#prebuild)
- [Dev variant](#dev-variant)
- [Testing](#testing)
- [Dependencies](#dependencies)
- [Related Projects](#related-projects)
- [Contributing](#contributing)
- [Logging](#logging)
- [Error reporting](#error-reporting)
- [License](#license)

---

## Introduction

Lockwright encrypts the vault on this device. Devices sync with each other. There is no cloud account.

The on-disk vault at the fork point is PearPass's. Vault work in this tree aims to open those vaults in place. Test that on a copy.

---

## Features

- **Encrypted-at-rest storage.** Lockwright encrypts passwords, credit cards, secure notes, and custom fields before writing them to disk.
- **Biometric authentication.** Unlock your vault with fingerprint or face recognition.
- **Cross-device sync.** Credentials sync directly between your devices, with no central server.
- **Device revoke.** Revoking a device removes it from the vault and rotates the vault key, so it can't read anything saved or changed after that. It keeps every item it synced before the key rotated: if it was lost or stolen, change the passwords it could see.
- **Offline access.** Access your vault anytime, even without a network connection.
- **Password health.** Analyse password strength and identify weak passwords.
- **Random password generator.** Generate strong, unique passwords.
- **Easy-to-use interface.** A clean, intuitive design for managing credentials on the go.

---

## Installation

### Prerequisites

- **Node.js.** Check the required version in `.nvmrc` and verify with:

```bash
node --version
```

- **pnpm** `11.10.0` (`packageManager` in `package.json`)

### Steps

```bash
# 1. Clone the repository
git clone git@github.com:Thaoh/lockwright-app-mobile.git

# 2. Go to the cloned directory
cd lockwright-app-mobile

# 3. Install dependencies
pnpm install

# 4. Generate translation keys
pnpm run lingui:extract
pnpm run lingui:compile

# 5. Generate worklet bundles
pnpm run bundle-bare

# 6. Generate native iOS and Android directories (see Prebuild below)
npx expo prebuild --clean
```

In the Lockwright superproject, run `./scripts/fetch-packages.sh --layout` so `file:../pearpass-lib-vault` resolves.

---

## Usage Examples

[lockwright.dexterity.works](https://lockwright.dexterity.works) is the Lockwright site.

PearPass docs at [docs.pass.pears.com](https://docs.pass.pears.com) still describe setup, vault management, syncing, and the rest of the product at the fork point. They are not Lockwright docs.

---

## Architecture

This project uses **Expo Plugins** to manage native iOS and Android configurations. Git does not track the `ios/` and `android/` directories. Expo's prebuild system generates them dynamically.

### Key Points:

- Git ignores the native directories (`ios/` and `android/`).
- Expo plugins in the `plugins/` directory manage all native configurations.
- Running `npx expo prebuild --clean` generates the native directories with all necessary configurations.

---

## Starting the Application

Before starting the application, build it first. The build command produces bundles for iOS, iOS extension, and Android, and runs the custom prebuild:

```bash
# Build the application
pnpm run build

# Then start on your preferred platform
pnpm run ios      # For iOS
pnpm run android  # For Android
```

---

## Prebuild

This repo is Expo-managed. Prebuild generates the native `android/` and `ios/` folders; they are not committed.

### Standard (Play/normal) Android prebuild

```bash
pnpm run bundle-bare
npx expo prebuild --platform android --clean
```

### F-Droid Android prebuild

```bash
pnpm run bundle-bare
PEARPASS_DISTRIBUTION=fdroid npx expo prebuild --platform android --clean
```

More details:

- [`docs/fdroid/build.md`](docs/fdroid/build.md)
- [`docs/fdroid/version-check.md`](docs/fdroid/version-check.md)

---

## Dev variant

`APP_VARIANT=dev` builds Lockwright Dev, a test app that installs next to the store app and never shares its data. Unset, the build is the store app. Any other value fails the config.

| | Store app | Dev variant |
| --- | --- | --- |
| Name | Lockwright | Lockwright Dev, icon with a DEV band |
| Android package, iOS bundle ID | `works.dexterity.lockwright` | `works.dexterity.lockwright.dev` |
| iOS autofill extension | `works.dexterity.lockwright.PearPassAutoFillExtension` | `works.dexterity.lockwright.dev.PearPassAutoFillExtension` |
| iOS app group and keychain group | `group.works.dexterity.lockwright` | `group.works.dexterity.lockwright.dev` |
| iOS URL scheme | `pearpassappmobile` | `lockwrightdev` |

At run time the app trusts the installed binary, not the JS config. The app group and the dev check come from the native app ID (`AppGroupHelper` on iOS, `AutofillModule` on Android), so a dev client served by a plain `pnpm start` still uses its own group.

The dev variant also asks the vault worker to write a trace to `<storage dir>/logs/trace.jsonl`, next to the vault. A vault-core without the `traceFile` option ignores it.

```bash
pnpm run android:dev   # prebuild --clean with APP_VARIANT=dev, then run
pnpm run ios:dev
```

`expo run` prebuilds only when `android/` or `ios/` is missing. If the folder was prebuilt for the other variant, `expo run` stops with an error that names both app IDs and the `prebuild --clean` command to run. That covers `pnpm run android`, `pnpm run ios`, the `:dev` scripts, `expo run:android`, `expo run:ios`, `expo run android` and `expo run ios`. A bare `expo run` checks both folders, and so does `expo run --flag ios`, because Expo prompts for the platform when a flag comes before it. Without that check a store run would build the dev app, or a dev run the store app, which on iOS would replace the App Store install and open the real vault. `prebuild`, `expo start`, `react-native run-android`, `react-native run-ios`, Xcode and Gradle are not checked, so run `prebuild --clean` before any of them when switching variants.

EAS profiles: `development-dev` (dev client) and `preview-dev-apk` (release APK).

Steps only a person can do:

- **iOS.** In the Apple developer account, register the App IDs `works.dexterity.lockwright.dev` and `works.dexterity.lockwright.dev.PearPassAutoFillExtension` with the App Groups and AutoFill Credential Provider capabilities. Register the app group `group.works.dexterity.lockwright.dev` and assign it to both. Create provisioning profiles for both App IDs with the test devices on them.
- **iOS credentials.** EAS builds use local credentials. In `credentials.json` the iOS keys are Xcode target names: the dev main target is `LockwrightDev` (the store one is `Lockwright`) and the extension is `PearPassAutoFillExtension`. A dev build needs its own `credentials.json` with the dev profiles swapped in before `eas build`, and the store file put back after.
- **Android.** Nothing beyond a signing key. A debug build uses the debug key. The dev package is new to Play and to the phone, so any key works and the store app stays installed.

---

## Testing

### Unit Testing

Run unit tests with Jest:

```bash
pnpm test
```

### End-to-End Testing

Lockwright uses WebdriverIO + Appium for end-to-end testing on Android and iOS, with optional BrowserStack execution and Qase test management.

See [`e2e/SETUP_AND_RUN_GUIDE.md`](e2e/SETUP_AND_RUN_GUIDE.md) for the full setup and run instructions, and [`e2e/AUTOMATED_TEST_CASES.md`](e2e/AUTOMATED_TEST_CASES.md) for the test catalog.

---

## Dependencies

- [React Native](https://reactnative.dev/)
- [Expo](https://expo.dev/)
- [React](https://reactjs.org/)
- [React Navigation](https://reactnavigation.org/)
- [Lingui](https://lingui.dev/)
- [Redux](https://redux.js.org/)

---

## Related Projects

| Project | Description |
| --- | --- |
| [`lockwright-app-desktop`](https://github.com/Dexterity-Works/lockwright-app-desktop) | Desktop app for Lockwright |
| [`lockwright-app-browser-extension`](https://github.com/Dexterity-Works/lockwright-app-browser-extension) | Browser extension for Lockwright |
| [`lockwright-lib-vault`](https://github.com/Dexterity-Works/lockwright-lib-vault) | Vault management library |
| [`lockwright-lib-vault-core`](https://github.com/Dexterity-Works/lockwright-lib-vault-core) | Bare worker and client for Lockwright vaults |
| [`lockwright-lib-constants`](https://github.com/Dexterity-Works/lockwright-lib-constants) | Shared constants |
| [`lockwright-lib-ui-react-native-components`](https://github.com/Dexterity-Works/lockwright-lib-ui-react-native-components) | UI kit |

---

## Contributing

Issues and pull requests are welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md).

---

## Logging

Logging is off by default. When enabled, logs are written to the app's cache directory: `main.log` from the JS host (React Native side) and `core-logs.txt` from the Bare vault worker. The worker's sink redacts known sensitive fields (passwords, keys, tokens, etc.) before writing to `core-logs.txt`. The host logger does not redact, so treat anything passed to `logger.*` on the JS side as on-disk-visible in `main.log`.

Two ways to enable:

- **In-app toggle** (Settings → Diagnostics → **Enable logs**). Persists across launches. Toggling off stops writes but keeps existing log files; toggling back on resumes appending to the same files, so a session can span multiple toggles.
- **Nightly builds** (`PearPass-nightly`): logging defaults to `debug` on first launch so testers don't have to opt in. The toggle still works to disable it.

Logs can be shared via the Diagnostics screen **Share logs** action, which zips both files plus a small metadata file (app version, distribution channel).

---

## Error reporting

**Lockwright mobile is open source. Public releases and self-built versions never send any data anywhere. Sentry is only enabled on the nightly distribution channel for catching crashes during pre-release testing.**

Verifying:

- The gate is `isNightly()` from `src/constants/distribution.js`. Returns `false` unless the distribution channel is `nightly`.
- The Expo config plugin for Sentry is only loaded when `PEARPASS_DISTRIBUTION=nightly` at build time. `app.config.ts`. `app.json` has no Sentry plugin entry, so standard / F-Droid builds never include it.
- The Bare-side Sentry SDK (`sentry-bare`) is an optional peer dependency of `pearpass-lib-vault-core`. Public builds don't install it.

---

## License

Apache License 2.0. See `LICENSE.md` and `NOTICE.md`.

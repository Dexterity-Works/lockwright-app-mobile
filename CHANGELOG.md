# Changelog

All notable changes to Lockwright mobile are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Headings are App versions (`package.json` / `app.json` `expo.version`). Play versionCode is noted when it moves. Neither is the superproject Release tag.

Starts at 0.0.17, after the Lockwright package rename. Earlier history is git.

## [Unreleased]

## [0.0.27] - 2026-09-22

`BUMP_SHA`

### Changed

- Autofill logs a vault-list reply that does not fit one pipe read: the command, the byte length, and why parsing stopped. The browser crash is still open.

## [0.0.26] - 2026-09-21

`ec25ef988a7947ac468e58726b18eb0e70073196`

### Changed

- Play versionCode 16.

### Fixed

- Unlock-to-fill after fingerprint does not replace the live fill response. That replacement crashed the browser. Empty Personal after activate waits for logins instead of caching an empty unlock.

## [0.0.25] - 2026-09-15

`4e7c54e87feea739d4d360e35f6a9dbfc80e32da`

### Changed

- Play versionCode 15.

### Fixed

- Unlock-to-fill keeps the sheet when the vault worklet dies after unlock, instead of showing an empty Personal list.

## [0.0.24] - 2026-09-11

`4b889ab19581cd1c1393e5bbf0fdcf1cec0ad7a4`

### Changed

- Play versionCode 14.

### Fixed

- Unlock-to-fill lists the GitHub logins already in Personal. Backgrounding the app releases vault files so fill can read them.
- github.com still in the search field is the page, not a typed exclusive search.
- Fill sheet sits over Vivaldi: dedicated task, shorter height, full width.

## [0.0.23] - 2026-09-10

`f674ba47ac1c2ca5fdc674ebadbebc7563d40d7b`

### Changed

- Play versionCode 13.

### Fixed

- Unlock-to-fill keeps the sheet when the keyboard opens. Typing no longer drops the host into recents.
- Prefill of the page is not a typed search. A login titled GitHub still shows when the URI list missed the site.

## [0.0.22] - 2026-09-06

`f7ea6444b70cd14fb5d024072ae34de142c08eed`

### Changed

- Play versionCode 12.

### Fixed

- Unlock-to-fill floats over the browser. Vivaldi no longer minimizes under a full Lockwright window.
- Unlock-to-fill search field shows the page or app being matched. Edit it to find the login (type `github.com` when Vivaldi sent no page).
- Unlock-to-fill from Vivaldi (and other browsers) no longer guesses the browser vendor site when the page domain is missing.
- `androidapp://com.github.android` matches `github.com` in a browser.

## [0.0.21] - 2026-09-05

`0a5877bb714a8cae30fd19966cf6808e92c8b067`

### Changed

- Play versionCode 11.

### Fixed

- Login URIs store as typed. Edit unwraps glued `https://androidapp://` so Save writes the app URI.
- Unlock-to-fill matches `androidapp://` package URIs and searches website fields.

## [0.0.20] - 2026-09-05

`00ca6a1ef5fd79cab19fc35ea33d514a21e51c7d`

### Changed

- Unlock does not wait on Autobase catching up other writers.

## [0.0.19] - 2026-09-04

`5adbf7d9490cadf272f66864bba042717b44313e`

### Changed

- Play versionCode 8, then 9, then 10.

### Fixed

- Unlock-to-fill no longer generates a TOTP for every login before URI search.
- Authenticator asks for OTP codes. Home list does not.

## [0.0.18] - 2026-09-02

`ea23b521f63467ebebb11c3a1db471f11763ba37`

### Changed

- Play versionCode 6, then 7.

### Fixed

- Autofill sheet restyled with hatch brass.
- Unlock-to-fill stays open across a fingerprint prompt.

## [0.0.17] - 2026-09-02

`9da0527af89de74b9b5f37409c5b6fc339ac8e73`

### Fixed

- A locked initialized vault counts as set up. Unlock-to-fill setup no longer loops.

[unreleased]: https://github.com/Dexterity-Works/lockwright-app-mobile/compare/BUMP_SHA...HEAD
[0.0.27]: https://github.com/Dexterity-Works/lockwright-app-mobile/compare/ec25ef988a7947ac468e58726b18eb0e70073196...BUMP_SHA
[0.0.26]: https://github.com/Dexterity-Works/lockwright-app-mobile/compare/4e7c54e87feea739d4d360e35f6a9dbfc80e32da...ec25ef988a7947ac468e58726b18eb0e70073196
[0.0.25]: https://github.com/Dexterity-Works/lockwright-app-mobile/compare/4b889ab19581cd1c1393e5bbf0fdcf1cec0ad7a4...4e7c54e87feea739d4d360e35f6a9dbfc80e32da
[0.0.24]: https://github.com/Dexterity-Works/lockwright-app-mobile/compare/f674ba47ac1c2ca5fdc674ebadbebc7563d40d7b...4b889ab19581cd1c1393e5bbf0fdcf1cec0ad7a4
[0.0.23]: https://github.com/Dexterity-Works/lockwright-app-mobile/compare/f7ea6444b70cd14fb5d024072ae34de142c08eed...f674ba47ac1c2ca5fdc674ebadbebc7563d40d7b
[0.0.22]: https://github.com/Dexterity-Works/lockwright-app-mobile/compare/0a5877bb714a8cae30fd19966cf6808e92c8b067...f7ea6444b70cd14fb5d024072ae34de142c08eed
[0.0.21]: https://github.com/Dexterity-Works/lockwright-app-mobile/compare/00ca6a1ef5fd79cab19fc35ea33d514a21e51c7d...0a5877bb714a8cae30fd19966cf6808e92c8b067
[0.0.20]: https://github.com/Dexterity-Works/lockwright-app-mobile/compare/5adbf7d9490cadf272f66864bba042717b44313e...00ca6a1ef5fd79cab19fc35ea33d514a21e51c7d
[0.0.19]: https://github.com/Dexterity-Works/lockwright-app-mobile/compare/ea23b521f63467ebebb11c3a1db471f11763ba37...5adbf7d9490cadf272f66864bba042717b44313e
[0.0.18]: https://github.com/Dexterity-Works/lockwright-app-mobile/compare/9da0527af89de74b9b5f37409c5b6fc339ac8e73...ea23b521f63467ebebb11c3a1db471f11763ba37
[0.0.17]: https://github.com/Dexterity-Works/lockwright-app-mobile/compare/1f2fa5c1e1a77bc55ad6b41fd6568fc1567e6c4e...9da0527af89de74b9b5f37409c5b6fc339ac8e73
